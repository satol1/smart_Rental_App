# api/services/rental/rental_query_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from decimal import Decimal
from api.services.financial_service import to_decimal
from typing import Optional, List, Tuple
import logging

from api.models.rental import Rental
from api.models.user import User
from shared.schemas.rental_schema import RentalOut
from api.services.financial_service import FinancialService
from api.repositories import RentalRepository
from shared.constants.order_status import OrderStatus

logger = logging.getLogger(__name__)

class RentalQueryService:
    """
    Сервис для выполнения операций чтения (Query) данных об арендах.
    Теперь делегирует работу с данными RentalRepository.
    """

    def __init__(self, db: AsyncSession, financial_service: FinancialService, rental_repo: RentalRepository):
        self.db = db
        self.financial_service = financial_service
        self.rental_repo = rental_repo


    async def enrich_rental_with_dynamic_fields(self, rental: Rental) -> RentalOut:
        """Обогащает объект аренды динамическими полями через FinancialService."""
        rental_out = RentalOut.model_validate(rental)
        today = date.today()

        if rental.status == OrderStatus.ACTIVE and rental.end_date < today:
            rental_out.status = OrderStatus.OVERDUE

        if rental_out.status == OrderStatus.OVERDUE:
            rental_out.overdue_days = self.financial_service.calculate_overdue_days(rental, today)
            # Расчёты FinancialService возвращают Decimal; поля схемы — float
            rental_out.overdue_surcharge = float(
                await self.financial_service.calculate_overdue_surcharge(rental, today)
            )
        elif rental.status == OrderStatus.ACTIVE:
            rental_out.days_remaining = (rental.end_date - today).days

        accessories_cost = sum(
            (to_decimal(link.accessory.price) for link in rental.accessory_links if link.accessory and link.accessory.price),
            Decimal("0"),
        )
        rental_out.accessories_cost = float(accessories_cost)
        # Используем централизованный метод из FinancialService
        rental_out.remaining_amount = float(self.financial_service.calculate_remaining_amount(rental))

        return rental_out

    async def get_rentals_for_user(
        self, 
        user: User, 
        skip: int, 
        limit: int,
        status: Optional[str] = None,
        search: Optional[str] = None,
        sort: Optional[str] = None
    ) -> Tuple[List[RentalOut], int]:
        """Получает отфильтрованный и пагинированный список аренд для конкретного пользователя."""
        
        # Делегируем получение данных репозиторию
        rentals_orm, total = await self.rental_repo.get_paginated_for_user(
            user_id=user.id,
            skip=skip,
            limit=limit,
            status=status,
            search=search,
            sort=sort
        )
        
        # Обогащаем данные через FinancialService
        try:
            enriched_rentals = [await self.enrich_rental_with_dynamic_fields(r) for r in rentals_orm]
            return enriched_rentals, total
        except Exception as e:
            logger.error(f"Ошибка в enrich_rental_with_dynamic_fields: {e}", exc_info=True)
            # Fallback: возвращаем простые объекты
            simple_rentals = [RentalOut.model_validate(r) for r in rentals_orm]
            return simple_rentals, total

    async def get_paginated_rentals(self, skip: int, limit: int, status_filter: Optional[str], search: Optional[str], period_type: Optional[str] = None, period_offset: int = 0) -> Tuple[List[RentalOut], int]:
        """Получает отфильтрованный и пагинированный список всех аренд."""
        
        # Делегируем получение данных репозиторию
        rentals_orm, total = await self.rental_repo.get_paginated_for_admin(
            skip=skip,
            limit=limit,
            status=status_filter,
            search=search,
            period_type=period_type,
            period_offset=period_offset
        )

        try:
            enriched_rentals = [await self.enrich_rental_with_dynamic_fields(r) for r in rentals_orm]
            return enriched_rentals, total
        except Exception as e:
            logger.error(f"Ошибка в enrich_rental_with_dynamic_fields: {e}", exc_info=True)
            simple_rentals = [RentalOut.model_validate(r) for r in rentals_orm]
            return simple_rentals, total