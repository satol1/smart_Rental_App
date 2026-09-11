# api/repositories/rental_repository_new.py

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from typing import List, Optional, Tuple, Dict
import logging

from .rental_base_repository import RentalBaseRepository
from .rental_query_repository import RentalQueryRepository
from .rental_command_repository import RentalCommandRepository
from .rental_financial_repository import RentalFinancialRepository
from api.models.rental import Rental

logger = logging.getLogger(__name__)


class RentalRepository(RentalBaseRepository):
    """
    Главный репозиторий для работы с арендами.
    Объединяет функциональность всех специализированных репозиториев.
    """

    def __init__(
        self,
        db: AsyncSession,
        query_repo: RentalQueryRepository,
        command_repo: RentalCommandRepository,
        financial_repo: RentalFinancialRepository,
    ):
        super().__init__(db)
        # Используем только инъекцию специализированных репозиториев
        self._query_repo = query_repo
        self._command_repo = command_repo
        self._financial_repo = financial_repo

    # Делегируем методы запросов к RentalQueryRepository
    async def get_paginated_for_admin(
        self, 
        skip: int, 
        limit: int, 
        status: Optional[str] = None, 
        search: Optional[str] = None,
        period_type: Optional[str] = None,
        period_offset: int = 0
    ) -> Tuple[List[Rental], int]:
        """Получает пагинированный список аренд для админ-панели."""
        return await self._query_repo.get_paginated_for_admin(skip, limit, status, search, period_type, period_offset)

    async def get_paginated_for_user(
        self, 
        user_id: int, 
        skip: int, 
        limit: int, 
        status: Optional[str] = None, 
        search: Optional[str] = None, 
        sort: Optional[str] = None
    ) -> Tuple[List[Rental], int]:
        """Получает пагинированный список аренд для пользователя."""
        return await self._query_repo.get_paginated_for_user(user_id, skip, limit, status, search, sort)

    async def get_rentals_for_return_today(self, today: date) -> List[Rental]:
        """Получает аренды для возврата сегодня."""
        return await self._query_repo.get_rentals_for_return_today(today)

    async def get_overdue_rentals(self, today: date) -> List[Rental]:
        """Получает просроченные аренды."""
        return await self._query_repo.get_overdue_rentals(today)

    async def get_user_completed_rentals_count(self, user_ids: List[int]) -> dict[int, int]:
        """Получает количество завершенных аренд для списка пользователей."""
        return await self._query_repo.get_user_completed_rentals_count(user_ids)

    # Делегируем методы команд к RentalCommandRepository
    def create_rental_from_reservation(
        self, 
        reservation, 
        manager, 
        deposit: float, 
        notes: Optional[str], 
        recalculated_cost: float, 
        recalculated_discount: float, 
        new_start_date, 
        prepayment_amount: float = 0.0,
        promo_code: Optional[str] = None
    ) -> Rental:
        """Создает аренду из резерва."""
        return self._command_repo.create_rental_from_reservation(
            reservation, manager, deposit, notes, 
            recalculated_cost, recalculated_discount, 
            new_start_date, prepayment_amount, promo_code
        )

    def create_rental_instance(
        self, 
        user, 
        manager, 
        start_date, 
        end_date, 
        equipment, 
        total_cost: float, 
        discount_amount: float = 0.0,
        promo_code: Optional[str] = None,
        deposit_amount: float = 0.0, 
        prepayment_amount: float = 0.0,
        notes_on_issue: Optional[str] = None
    ) -> Rental:
        """Создает экземпляр аренды."""
        return self._command_repo.create_rental_instance(
            user, manager, start_date, end_date, 
            equipment, total_cost, discount_amount, promo_code,
            deposit_amount, prepayment_amount, notes_on_issue
        )

    def add_accessory_to_rental(self, rental: Rental, equipment_id: int, accessory_id: int):
        """Добавляет аксессуар к аренде."""
        self._command_repo.add_accessory_to_rental(rental, equipment_id, accessory_id)

    async def add_accessories_to_rental_async(
        self, rental: Rental, selected_accessories: Dict[int, List[int]]
    ) -> None:
        """Добавляет аксессуары к аренде асинхронно без lazy loading."""
        await self._command_repo.add_accessories_to_rental_async(rental, selected_accessories)

    def finalize_rental_return(self, rental: Rental, return_date, notes: Optional[str], credit: float, surcharge: float = 0.0):
        """Завершает возврат аренды."""
        self._command_repo.finalize_rental_return(rental, return_date, notes, credit, surcharge)

    def update_rental_instance(self, rental: Rental, update_data: dict):
        """Обновляет экземпляр аренды."""
        self._command_repo.update_rental_instance(rental, update_data)

    def revert_rental_status_to_active(self, rental: Rental):
        """Возвращает статус аренды к активному резерву."""
        return self._command_repo.revert_rental_status_to_active(rental)

    # Делегируем финансовые методы к RentalFinancialRepository
    async def calculate_early_return_credit(self, rental: Rental, actual_return_date: date, planned_days: int) -> float:
        """Рассчитывает кредит за досрочный возврат аренды."""
        if not self._financial_repo:
            raise RuntimeError("RentalFinancialRepository не инициализирован")
        return await self._financial_repo.calculate_early_return_credit(rental, actual_return_date, planned_days)

    async def calculate_overdue_surcharge(self, rental: Rental, actual_return_date: date) -> float:
        """Рассчитывает штраф за просроченные дни аренды."""
        if not self._financial_repo:
            raise RuntimeError("RentalFinancialRepository не инициализирован")
        return await self._financial_repo.calculate_overdue_surcharge(rental, actual_return_date)

    def get_rental_equipment_ids(self, rental: Rental) -> List[int]:
        """Получает список ID оборудования в аренде."""
        return [eq.id for eq in rental.equipment]

    def get_rental_accessories_mapping(self, rental: Rental) -> dict:
        """Получает маппинг аксессуаров по оборудованию в аренде."""
        accessories_mapping = {}
        for link in rental.accessory_links:
            if link.equipment_id not in accessories_mapping:
                accessories_mapping[link.equipment_id] = []
            accessories_mapping[link.equipment_id].append(link.accessory_id)
        return accessories_mapping

    async def get_overlapping_for_availability_check(
        self,
        equipment_ids: List[int],
        start_date: date,
        end_date: date,
        exclude_rental_id: Optional[int] = None
    ) -> List[Rental]:
        """
        Получение аренд, пересекающихся с указанным периодом.
        Используется для проверки доступности оборудования.
        
        Args:
            equipment_ids: Список ID оборудования для проверки
            start_date: Дата начала периода
            end_date: Дата окончания периода
            exclude_rental_id: ID аренды для исключения
            
        Returns:
            Список аренд, пересекающихся с периодом
        """
        from sqlalchemy import select, and_, exists
        from sqlalchemy.orm import selectinload
        from api.models.rental import rental_equipment_association
        from shared.constants.order_status import OrderStatus
        
        # ОПТИМИЗАЦИЯ: Используем EXISTS вместо ANY для лучшей производительности
        query = select(Rental).options(
            selectinload(Rental.equipment)
        ).filter(
            Rental.end_date > start_date,
            Rental.start_date < end_date,
            Rental.status.in_([OrderStatus.ACTIVE, OrderStatus.OVERDUE])
        ).where(
            exists().where(
                and_(
                    rental_equipment_association.c.rental_id == Rental.id,
                    rental_equipment_association.c.equipment_id.in_(equipment_ids)
                )
            )
        )
        
        if exclude_rental_id:
            query = query.filter(Rental.id != exclude_rental_id)
        
        result = await self.db.execute(query)
        return result.unique().scalars().all()
    
    async def update_rental_end_date(self, rental_id: int, new_end_date: date) -> bool:
        """
        Обновляет дату окончания аренды.

        Args:
            rental_id: ID аренды
            new_end_date: Новая дата окончания

        Returns:
            True если обновление прошло успешно, False если аренда не найдена
        """
        from sqlalchemy import update
        from api.models.rental import Rental

        # TODO(этап 2.7 аудита): метод меняет дату БЕЗ анти-овербукинг проверки.
        # Потребитель — HolidayService._auto_extend_orders_on_holiday_creation
        # (продление аренд при создании выходного). Продление может создать
        # пересечение с другим резервом/арендой на это же оборудование.
        # Нужно прогонять новый интервал через OrderValidator.validate_equipment_availability
        # (с pg_advisory_xact_lock) и отклонять/разрешать конфликт явно.
        logger.warning(
            "[anti-overbooking] update_rental_end_date(rental_id=%s, new_end_date=%s): "
            "дата меняется без проверки пересечений (см. TODO этапа 2.7)",
            rental_id, new_end_date,
        )

        result = await self.db.execute(
            update(Rental)
            .where(Rental.id == rental_id)
            .values(end_date=new_end_date)
        )

        if result.rowcount > 0:
            # Коммитит DIContainerMiddleware; здесь только фиксируем в транзакции
            await self.db.flush()
            return True
        return False
    
    async def get_rentals_by_ids(self, rental_ids: List[int]) -> List[Rental]:
        """
        Получает аренды по списку ID.
        
        Args:
            rental_ids: Список ID аренд
            
        Returns:
            Список аренд
        """
        from sqlalchemy import select
        
        if not rental_ids:
            return []
            
        result = await self.db.execute(
            select(Rental).filter(Rental.id.in_(rental_ids))
        )
        return result.scalars().all()