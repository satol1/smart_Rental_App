# api/repositories/reservation_filter_repository.py

from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select, and_, or_, func, desc, asc
from datetime import date

from api.models.reservation import Reservation, ReservationAccessory, reservation_equipment_association
from api.models.equipment import Equipment
from api.models.user import User
from shared.constants.order_status import OrderStatus
from shared.services.period_service import PeriodService
from shared.utils.date_utils import get_business_today
from .reservation_base_repository import ReservationBaseRepository


class ReservationFilterRepository(ReservationBaseRepository):
    """
    Репозиторий для фильтрации и поиска резервов.
    Содержит методы для пагинации, поиска и сортировки резервов.
    """
    
    def __init__(self, db: AsyncSession, period_service: PeriodService):
        super().__init__(db)
        self.period_service = period_service

    async def get_paginated_for_user(
        self, 
        user_id: int, 
        skip: int, 
        limit: int, 
        status: Optional[str] = None,
        search: Optional[str] = None,
        sort: Optional[str] = None
    ) -> Tuple[List[Reservation], int]:
        """
        Получение пагинированного списка резервов пользователя с фильтрацией и сортировкой.
        
        Args:
            user_id: ID пользователя
            skip: Количество записей для пропуска
            limit: Максимальное количество записей
            status: Фильтр по статусу
            search: Поисковый запрос
            sort: Параметр сортировки
            
        Returns:
            Кортеж (список резервов, общее количество)
        """
        # Создаем базовый запрос
        query = select(Reservation).filter(Reservation.user_id == user_id)
        
        # Применяем фильтрацию по статусу
        query = self._apply_status_filter(query, status)
        
        # Применяем поиск по оборудованию
        if search:
            query = self._apply_equipment_search(query, search)
        
        # Получаем общее количество.
        # ВАЖНО: count строится от базового select БЕЗ eager-опций:
        # joinedload коллекций (accessory_links) размножает строки, и total завышается.
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()
        
        # Добавляем eager-загрузку: скалярные связи — joinedload,
        # коллекции (accessory_links, equipment) — selectinload, чтобы избежать
        # декартова произведения в списковом запросе.
        query = query.options(
            joinedload(Reservation.applied_promo_code),
            selectinload(Reservation.accessory_links).selectinload(ReservationAccessory.accessory),
            selectinload(Reservation.equipment).options(
                selectinload(Equipment.accessories),
                selectinload(Equipment.associations)
            ),
            joinedload(Reservation.rental)
        )
        
        # Применяем сортировку
        query = self._apply_sorting(query, sort)
        
        # Применяем пагинацию
        query = query.offset(skip).limit(limit)
        
        # Выполняем запрос
        result = await self.db.execute(query)
        reservations = result.unique().scalars().all()
        
        return reservations, total

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
        """
        Получение пагинированного списка резервов для админ-панели с фильтрацией.
        
        Args:
            skip: Количество записей для пропуска
            limit: Максимальное количество записей
            status: Фильтр по статусу
            search_query: Поисковый запрос по пользователю
            reservation_id: ID конкретного резерва
            
        Returns:
            Кортеж (список резервов, общее количество)
        """
        # Создаем базовый запрос (без eager-опций — см. count ниже)
        query = select(Reservation)
        
        # Применяем поиск по пользователю
        if search_query:
            query = self._apply_user_search(query, search_query)

        # Применяем фильтрацию по статусу (единая логика для user/admin списков)
        query = self._apply_status_filter(query, status)

        # Добавляем фильтр по ID, если указан
        if reservation_id:
            query = query.filter(Reservation.id == reservation_id)
        
        # Применяем фильтрацию по периоду
        if period_type:
            try:
                start_date, end_date = self.period_service.get_period_dates(period_type, period_offset)
                # Фильтр: резерв пересекается с периодом (start_date <= period_end AND end_date >= period_start)
                query = query.filter(
                    and_(
                        Reservation.start_date <= end_date,
                        Reservation.end_date >= start_date
                    )
                )
            except ValueError as e:
                # Логируем ошибку, но продолжаем без фильтрации по периоду
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Ошибка в параметрах периода: {e}")
        
        # Получаем общее количество.
        # ВАЖНО: count строится от базового select БЕЗ eager-опций:
        # joinedload коллекций (accessory_links) размножает строки, и total завышается.
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()
        
        # Eager-загрузка: скалярные связи — joinedload, коллекции — selectinload.
        query = query.options(
            joinedload(Reservation.user),
            joinedload(Reservation.applied_promo_code),
            selectinload(Reservation.accessory_links).selectinload(ReservationAccessory.accessory),
            selectinload(Reservation.equipment).options(
                selectinload(Equipment.accessories),
                selectinload(Equipment.associations)
            ),
            joinedload(Reservation.rental)
        )
        
        # Применяем сортировку и пагинацию
        query = query.order_by(Reservation.id.desc()).offset(skip).limit(limit)
        
        # Выполняем запрос
        result = await self.db.execute(query)
        reservations = result.unique().scalars().all()
        
        return reservations, total

    async def count_for_admin(
        self,
        status: Optional[str] = None,
        search_query: Optional[str] = None,
        reservation_id: Optional[int] = None,
        period_type: Optional[str] = None,
        period_offset: int = 0
    ) -> int:
        """Количество резервов по фильтрам админки — без eager-загрузки и limit.

        Прежний путь (get_paginated_for_admin(skip=0, limit=1)) выполнял полный
        eager-запрос ради одного числа и дублировал работу страницы.
        """
        query = select(Reservation)

        if search_query:
            query = self._apply_user_search(query, search_query)
        query = self._apply_status_filter(query, status)
        if reservation_id:
            query = query.filter(Reservation.id == reservation_id)
        if period_type:
            try:
                start_date, end_date = self.period_service.get_period_dates(period_type, period_offset)
                query = query.filter(
                    and_(
                        Reservation.start_date <= end_date,
                        Reservation.end_date >= start_date
                    )
                )
            except ValueError as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Ошибка в параметрах периода: {e}")

        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        return count_result.scalar_one()

    def _apply_status_filter(self, query, status: Optional[str]):
        """Применяет фильтрацию по статусу."""
        if not status:
            return query
            
        if status == OrderStatus.ACTIVE:
            return query.filter(
                Reservation.status == OrderStatus.ACTIVE,
                Reservation.end_date >= get_business_today()
            )
        elif status == OrderStatus.COMPLETED:
            return query.filter(
                Reservation.status.in_([
                    OrderStatus.FULFILLED, 
                    OrderStatus.CANCELLED, 
                    OrderStatus.OVERDUE
                ])
            )
        elif status == OrderStatus.OVERDUE:
            return query.filter(
                Reservation.status == OrderStatus.ACTIVE,
                Reservation.end_date < get_business_today()
            )
        else:
            return query.filter(Reservation.status == status)

    def _apply_equipment_search(self, query, search_term: str):
        """Применяет поиск по оборудованию."""
        search_pattern = f"%{search_term.lower()}%"
        
        # Применяем фильтр поиска через EXISTS подзапрос
        equipment_subquery = select(Equipment.id).filter(
            or_(
                Equipment.name.ilike(search_pattern),
                Equipment.brand.ilike(search_pattern),
                Equipment.equipment_type.ilike(search_pattern)
            )
        )
        
        return query.filter(
            Reservation.equipment.any(Equipment.id.in_(equipment_subquery))
        )

    def _apply_user_search(self, query, search_term: str):
        """Применяет поиск по пользователю."""
        search_pattern = f"%{search_term.lower()}%"
        return query.join(Reservation.user).filter(
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )

    # Соответствие значений сортировки из UI фронтенда (start_asc, ...) и
    # исторических имён (start_date_asc, ...) — принимаем оба варианта
    _SORT_ALIASES = {
        "start_asc": "start_date_asc",
        "start_desc": "start_date_desc",
        "end_asc": "end_date_asc",
        "end_desc": "end_date_desc",
    }

    def _apply_sorting(self, query, sort: Optional[str]):
        """Применяет сортировку."""
        if not sort:
            return query.order_by(Reservation.id.desc())

        sort = self._SORT_ALIASES.get(sort, sort)

        if sort == "start_date_asc":
            return query.order_by(Reservation.start_date.asc())
        elif sort == "start_date_desc":
            return query.order_by(Reservation.start_date.desc())
        elif sort == "end_date_asc":
            return query.order_by(Reservation.end_date.asc())
        elif sort == "end_date_desc":
            return query.order_by(Reservation.end_date.desc())
        elif sort == "created_at_asc":
            return query.order_by(Reservation.created_at.asc())
        elif sort == "created_at_desc":
            return query.order_by(Reservation.created_at.desc())
        elif sort == "id_asc":
            return query.order_by(Reservation.id.asc())
        elif sort == "id_desc":
            return query.order_by(Reservation.id.desc())
        elif sort in ("count_asc", "count_desc"):
            # Количество единиц оборудования в резерве — коррелированный подзапрос,
            # чтобы не ломать eager-стратегию основного запроса
            equipment_count = (
                select(func.count())
                .select_from(reservation_equipment_association)
                .where(reservation_equipment_association.c.reservation_id == Reservation.id)
                .correlate(Reservation)
                .scalar_subquery()
            )
            direction = asc if sort == "count_asc" else desc
            return query.order_by(direction(equipment_count), Reservation.id.desc())
        else:
            return query.order_by(Reservation.id.desc())
