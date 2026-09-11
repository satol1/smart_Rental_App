# api/services/reservation_query_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Tuple
import logging

from api.models.user import User
from shared.schemas.reservation_schema import AdminReservationOut, ReservationItem
from api.services.financial_service import FinancialService
from api.repositories import ReservationRepository
from shared.services.period_service import PeriodService

logger = logging.getLogger(__name__)

class ReservationQueryService:
    """
    Единый сервис для выполнения операций чтения (Query) данных о резервах.
    Теперь делегирует работу с данными ReservationRepository.
    """

    def __init__(self, db: AsyncSession, financial_service: FinancialService, reservation_repo: ReservationRepository):
        self.db = db
        self.financial_service = financial_service
        self.reservation_repo = reservation_repo

    async def get_my_reservations(
        self, 
        user: User, 
        status: Optional[str] = None,
        search: Optional[str] = None,
        sort: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[ReservationItem], int]:
        """Получает отфильтрованный и пагинированный список резервов для текущего пользователя."""
        
        # Делегируем получение данных репозиторию
        reservations_orm, total = await self.reservation_repo.get_paginated_for_user(
            user_id=user.id,
            skip=skip,
            limit=limit,
            status=status,
            search=search,
            sort=sort
        )
        
        # Обрабатываем статусы и преобразуем в DTO через FinancialService
        items_dto = []
        for r_orm in reservations_orm:
            try:
                item_dto = await self.financial_service.enrich_order_with_financials(r_orm)
                items_dto.append(item_dto)
            except Exception as e:
                logger.error(f"Ошибка обогащения резерва ID {r_orm.id}: {e}")
                # Fallback: простая валидация
                item_dto = ReservationItem.model_validate(r_orm)
                items_dto.append(item_dto)
        
        return items_dto, total

    async def get_admin_reservations_count(self, status: Optional[str] = None, search_query: Optional[str] = None, period_type: Optional[str] = None, period_offset: int = 0) -> int:
        """Получает общее количество резервов с учетом фильтров для админ-панели."""
        # Делегируем получение данных репозиторию
        _, total = await self.reservation_repo.get_paginated_for_admin(
            skip=0,
            limit=1,  # Нам нужно только количество
            status=status,
            search_query=search_query,
            period_type=period_type,
            period_offset=period_offset
        )
        return total

    async def get_paginated_admin_reservations(self, skip: int, limit: int, status: Optional[str] = None, search_query: Optional[str] = None, reservation_id: Optional[int] = None, period_type: Optional[str] = None, period_offset: int = 0) -> List[AdminReservationOut]:
        """Получает страницу резервов с пагинацией для админ-панели."""
        # Делегируем получение данных репозиторию
        reservations_orm, _ = await self.reservation_repo.get_paginated_for_admin(
            skip=skip,
            limit=limit,
            status=status,
            search_query=search_query,
            reservation_id=reservation_id,
            period_type=period_type,
            period_offset=period_offset
        )

        result = []
        skipped = 0
        for r_orm in reservations_orm:
            if not r_orm.user:
                # Осиротевший резерв не должен молча исчезать из списка: считаем
                # и логируем, чтобы расхождение len(items) != total было объяснимо
                skipped += 1
                logger.warning(
                    "Резерв #%s без пользователя исключён из админ-списка", r_orm.id
                )
                continue
            try:
                # Используем FinancialService для обогащения админ-резерва
                final_output = await self.financial_service._enrich_admin_reservation_with_financials(r_orm)
                result.append(final_output)
            except Exception as e:
                logger.error(f"Ошибка валидации админ-резерва ID {r_orm.id}: {e}", exc_info=True)
                # Fallback на сырую схему: запись остаётся в списке, а не теряется
                try:
                    result.append(AdminReservationOut.model_validate(r_orm))
                except Exception:
                    skipped += 1
                    logger.error(
                        "Резерв #%s: сырая сериализация тоже не удалась — запись потеряна",
                        r_orm.id, exc_info=True,
                    )
        if skipped:
            logger.error(
                "Админ-список резервов: потеряно записей %d из %d на странице",
                skipped, len(reservations_orm),
            )
        return result