# api/repositories/reservation_repository.py

from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from api.models.reservation import Reservation
from shared.schemas.reservation_schema import ReservationCreateRequest, ReservationUpdateRequest
from shared.services.period_service import PeriodService
from .reservation_base_repository import ReservationBaseRepository
from .reservation_query_repository import ReservationQueryRepository
from .reservation_filter_repository import ReservationFilterRepository
from .reservation_availability_repository import ReservationAvailabilityRepository


class ReservationRepository(ReservationBaseRepository):
    """
    Основной репозиторий для работы с резервами.
    
    Объединяет функциональность всех специализированных репозиториев:
    - ReservationBaseRepository: базовые CRUD операции
    - ReservationQueryRepository: методы получения данных с деталями
    - ReservationFilterRepository: методы фильтрации и поиска
    - ReservationAvailabilityRepository: методы проверки доступности
    
    Этот класс предоставляет единую точку входа для всех операций с резервами,
    сохраняя при этом логическое разделение ответственности.
    """

    def __init__(self, db: AsyncSession, period_service: PeriodService, query_repo: ReservationQueryRepository, filter_repo: ReservationFilterRepository, availability_repo: ReservationAvailabilityRepository):
        """
        Инициализация репозитория резервов.
        
        Args:
            db: Асинхронная сессия базы данных
            period_service: Сервис для работы с временными периодами
            query_repo: Репозиторий для запросов резерваций
            filter_repo: Репозиторий для фильтрации резерваций
            availability_repo: Репозиторий для проверки доступности
        """
        super().__init__(db)
        
        # Используем только инъекцию специализированных репозиториев
        self._query_repo = query_repo
        self._filter_repo = filter_repo
        self._availability_repo = availability_repo

    # Делегируем методы из ReservationQueryRepository
    async def get_by_id_with_details(self, reservation_id: int) -> Optional[Reservation]:
        return await self._query_repo.get_by_id_with_details(reservation_id)

    async def find_by_ids(self, reservation_ids: List[int]) -> List[Reservation]:
        return await self._query_repo.find_by_ids(reservation_ids)

    async def get_reservations_by_user_id(self, user_id: int, status_filter: Optional[str] = None) -> List[Reservation]:
        return await self._query_repo.get_reservations_by_user_id(user_id, status_filter)

    async def get_reservations_for_calendar(self, start_date: date, end_date: date, order_id: Optional[int] = None) -> List[Reservation]:
        return await self._query_repo.get_reservations_for_calendar(start_date, end_date, order_id)

    async def get_reservations_for_pickup_today(self, today: date) -> List[Reservation]:
        return await self._query_repo.get_reservations_for_pickup_today(today)


    # Делегируем методы из ReservationFilterRepository
    async def get_paginated_for_user(
        self, 
        user_id: int, 
        skip: int, 
        limit: int, 
        status: Optional[str] = None,
        search: Optional[str] = None,
        sort: Optional[str] = None
    ) -> Tuple[List[Reservation], int]:
        return await self._filter_repo.get_paginated_for_user(user_id, skip, limit, status, search, sort)

    async def get_paginated_for_admin(
        self,
        skip: int,
        limit: int,
        status: Optional[str] = None,
        search_query: Optional[str] = None,
        reservation_id: Optional[int] = None,
        period_type: Optional[str] = None,
        period_offset: int = 0
    ) -> Tuple[List[Reservation], int]:
        return await self._filter_repo.get_paginated_for_admin(skip, limit, status, search_query, reservation_id, period_type, period_offset)

    # Делегируем методы из ReservationAvailabilityRepository
    async def get_reservations_for_availability_check(
        self, 
        equipment_ids: List[int], 
        start_date: date, 
        end_date: date, 
        exclude_reservation_id: Optional[int] = None
    ) -> List[Reservation]:
        return await self._availability_repo.get_reservations_for_availability_check(
            equipment_ids, start_date, end_date, exclude_reservation_id
        )

    async def check_equipment_availability(
        self,
        equipment_ids: List[int],
        start_date: date,
        end_date: date,
        exclude_reservation_id: Optional[int] = None
    ) -> bool:
        return await self._availability_repo.check_equipment_availability(
            equipment_ids, start_date, end_date, exclude_reservation_id
        )

    async def get_equipment_conflicts(
        self,
        equipment_ids: List[int],
        start_date: date,
        end_date: date,
        exclude_reservation_id: Optional[int] = None
    ) -> List[Reservation]:
        return await self._availability_repo.get_equipment_conflicts(
            equipment_ids, start_date, end_date, exclude_reservation_id
        )
    
    async def update_reservation_end_date(self, reservation_id: int, new_end_date: date) -> bool:
        """
        Обновляет дату окончания резерва.

        Args:
            reservation_id: ID резерва
            new_end_date: Новая дата окончания

        Returns:
            True если обновление прошло успешно, False если резерв не найден
        """
        import logging
        from sqlalchemy import update
        from api.models.reservation import Reservation

        # Метод меняет дату без собственной проверки занятости: вызывающая
        # сторона (HolidayService._auto_extend_orders_on_holiday_creation)
        # обязана прогнать интервал через OrderValidator.validate_equipment_availability
        # (advisory-лок) ДО вызова — этап 2.1 аудита 2026-09-12.
        logging.getLogger(__name__).debug(
            "[anti-overbooking] update_reservation_end_date(reservation_id=%s, new_end_date=%s): "
            "валидация интервала выполнена вызывающей стороной",
            reservation_id, new_end_date,
        )

        result = await self.db.execute(
            update(Reservation)
            .where(Reservation.id == reservation_id)
            .values(end_date=new_end_date)
        )

        if result.rowcount > 0:
            # Коммитит DIContainerMiddleware; здесь только фиксируем в транзакции
            await self.db.flush()
            return True
        return False
    
    async def get_reservations_by_ids(self, reservation_ids: List[int]) -> List[Reservation]:
        """
        Получает резервы по списку ID.
        
        Args:
            reservation_ids: Список ID резервов
            
        Returns:
            Список резервов
        """
        from sqlalchemy import select
        
        if not reservation_ids:
            return []
            
        result = await self.db.execute(
            select(Reservation).filter(Reservation.id.in_(reservation_ids))
        )
        return result.scalars().all()
    
    # Методы для подсчета резервов (делегируются к базовому репозиторию)
    async def count_active_reservations_by_user(self, user_id: int) -> int:
        """Подсчитывает количество активных резервов пользователя."""
        return await super().count_active_reservations_by_user(user_id)
    
    async def count_overdue_reservations_by_user(self, user_id: int, today: date) -> int:
        """Подсчитывает количество просроченных резервов пользователя."""
        return await super().count_overdue_reservations_by_user(user_id, today)