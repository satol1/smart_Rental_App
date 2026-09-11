# api/repositories/rental_query_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select, and_, or_, func, case
from datetime import date
from typing import List, Optional, Tuple
import logging

from .rental_base_repository import RentalBaseRepository
from api.models.rental import Rental, RentalAccessory
from api.models.equipment import Equipment
from shared.constants.order_status import OrderStatus
from shared.services.period_service import PeriodService

logger = logging.getLogger(__name__)


class RentalQueryRepository(RentalBaseRepository):
    """
    Репозиторий для операций чтения и поиска аренд.
    Содержит методы для получения данных с фильтрацией, пагинацией и сортировкой.
    """
    
    def __init__(self, db: AsyncSession, period_service: PeriodService):
        super().__init__(db)
        self.period_service = period_service

    async def get_paginated_for_admin(
        self, 
        skip: int, 
        limit: int, 
        status: Optional[str] = None, 
        search: Optional[str] = None,
        period_type: Optional[str] = None,
        period_offset: int = 0
    ) -> Tuple[List[Rental], int]:
        """
        Получает пагинированный список аренд для админ-панели.
        Включает фильтрацию по статусу и поиск по имени/email клиента.
        
        Args:
            skip: Количество записей для пропуска
            limit: Максимальное количество записей
            status: Фильтр по статусу (active, overdue, completed)
            search: Поиск по имени/email клиента
            
        Returns:
            Кортеж (список аренд, общее количество)
        """
        # Создаем базовый запрос (без eager-опций — см. count ниже)
        base_query = select(Rental)

        # Применяем фильтрацию по статусу
        if status:
            today = date.today()
            if status == OrderStatus.ACTIVE:
                # Активные аренды (включая просроченные)
                base_query = base_query.filter(Rental.status == OrderStatus.ACTIVE)
            elif status == OrderStatus.OVERDUE:
                # Просроченные аренды (подкатегория активных)
                base_query = base_query.filter(
                    and_(
                        Rental.status == OrderStatus.ACTIVE,
                        Rental.end_date < today
                    )
                )
            elif status == OrderStatus.COMPLETED:
                base_query = base_query.filter(Rental.status == OrderStatus.COMPLETED)

        # Применяем поиск по пользователю
        if search:
            from api.models.user import User
            search_filter = or_(
                User.full_name.ilike(f"%{search.lower()}%"),
                User.email.ilike(f"%{search.lower()}%")
            )
            base_query = base_query.join(User).filter(search_filter)

        # Применяем фильтрацию по периоду
        if period_type:
            try:
                start_date, end_date = self.period_service.get_period_dates(period_type, period_offset)
                # Фильтр: аренда пересекается с периодом (start_date <= period_end AND end_date >= period_start)
                base_query = base_query.filter(
                    and_(
                        Rental.start_date <= end_date,
                        Rental.end_date >= start_date
                    )
                )
            except ValueError as e:
                # Логируем ошибку, но продолжаем без фильтрации по периоду
                logger.warning(f"Ошибка в параметрах периода: {e}")

        # Получаем общее количество.
        # ВАЖНО: count строится от базового select БЕЗ eager-опций:
        # joinedload коллекций (accessory_links) размножает строки, и total завышается.
        count_query = select(func.count()).select_from(base_query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Eager-загрузка: скалярные связи (user, created_by) — joinedload,
        # коллекции (equipment, accessory_links) — selectinload, чтобы избежать
        # декартова произведения в списковом запросе.
        base_query = base_query.options(
            joinedload(Rental.user),
            joinedload(Rental.created_by),
            selectinload(Rental.equipment).options(
                selectinload(Equipment.accessories),
                selectinload(Equipment.associations)
            ),
            selectinload(Rental.accessory_links).selectinload(RentalAccessory.accessory)
        )

        # Применяем пагинацию и сортировку
        # Сначала просроченные, затем по ID в убывающем порядке
        overdue_case = case(
            (and_(Rental.status == OrderStatus.ACTIVE, Rental.end_date < date.today()), 0),
            else_=1
        ).asc()

        base_query = base_query.order_by(overdue_case, Rental.id.desc())
        base_query = base_query.offset(skip).limit(limit)

        # Выполняем запрос
        result = await self.db.execute(base_query)
        rentals = result.unique().scalars().all()

        return rentals, total

    async def get_paginated_for_user(
        self, 
        user_id: int, 
        skip: int, 
        limit: int, 
        status: Optional[str] = None, 
        search: Optional[str] = None, 
        sort: Optional[str] = None
    ) -> Tuple[List[Rental], int]:
        """
        Получает пагинированный список аренд для конкретного пользователя.
        Включает фильтрацию, поиск по оборудованию и сортировку.
        
        Args:
            user_id: ID пользователя
            skip: Количество записей для пропуска
            limit: Максимальное количество записей
            status: Фильтр по статусу
            search: Поиск по названию оборудования
            sort: Тип сортировки
            
        Returns:
            Кортеж (список аренд, общее количество)
        """
        # Создаем базовый запрос (без eager-опций — см. count ниже)
        base_query = select(Rental).filter(Rental.user_id == user_id)

        # Применяем фильтрацию по статусу
        if status:
            today = date.today()
            if status == OrderStatus.ACTIVE:
                base_query = base_query.filter(Rental.status == OrderStatus.ACTIVE)
            elif status == OrderStatus.OVERDUE:
                base_query = base_query.filter(
                    and_(
                        Rental.status == OrderStatus.ACTIVE,
                        Rental.end_date < today
                    )
                )
            elif status == OrderStatus.COMPLETED:
                base_query = base_query.filter(Rental.status == OrderStatus.COMPLETED)

        # Применяем поиск по оборудованию
        if search:
            search_filter = or_(
                Rental.equipment.any(
                    func.lower(Equipment.name).contains(search.lower())
                ),
                Rental.equipment.any(
                    func.lower(Equipment.description).contains(search.lower())
                )
            )
            base_query = base_query.filter(search_filter)

        # Получаем общее количество.
        # ВАЖНО: count строится от базового select БЕЗ eager-опций:
        # joinedload коллекций (accessory_links) размножает строки, и total завышается.
        count_query = select(func.count()).select_from(base_query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Eager-загрузка: скалярные связи (user, created_by) — joinedload,
        # коллекции (equipment, accessory_links) — selectinload, чтобы избежать
        # декартова произведения в списковом запросе.
        base_query = base_query.options(
            joinedload(Rental.user),
            joinedload(Rental.created_by),
            selectinload(Rental.equipment).options(
                selectinload(Equipment.accessories),
                selectinload(Equipment.associations)
            ),
            selectinload(Rental.accessory_links).selectinload(RentalAccessory.accessory)
        )

        # Применяем сортировку
        if sort:
            if sort == "start_date_asc":
                base_query = base_query.order_by(Rental.start_date.asc())
            elif sort == "start_date_desc":
                base_query = base_query.order_by(Rental.start_date.desc())
            elif sort == "end_date_asc":
                base_query = base_query.order_by(Rental.end_date.asc())
            elif sort == "end_date_desc":
                base_query = base_query.order_by(Rental.end_date.desc())
            elif sort == "total_cost_asc":
                base_query = base_query.order_by(Rental.total_cost.asc())
            elif sort == "total_cost_desc":
                base_query = base_query.order_by(Rental.total_cost.desc())
            else:
                # По умолчанию: сначала просроченные, затем по ID в убывающем порядке
                overdue_case = case(
                    (and_(Rental.status == OrderStatus.ACTIVE, Rental.end_date < date.today()), 0),
                    else_=1
                ).asc()
                base_query = base_query.order_by(overdue_case, Rental.id.desc())
        else:
            # По умолчанию: сначала просроченные, затем по ID в убывающем порядке
            overdue_case = case(
                (and_(Rental.status == OrderStatus.ACTIVE, Rental.end_date < date.today()), 0),
                else_=1
            ).asc()
            base_query = base_query.order_by(overdue_case, Rental.id.desc())

        # Применяем пагинацию
        base_query = base_query.offset(skip).limit(limit)

        # Выполняем запрос
        result = await self.db.execute(base_query)
        rentals = result.unique().scalars().all()

        return rentals, total

    async def get_rentals_for_return_today(self, today: date) -> List[Rental]:
        """
        Получает аренды для возврата сегодня.
        
        Args:
            today: Дата для проверки
            
        Returns:
            Список аренд для возврата сегодня
        """
        query = select(Rental).options(
            joinedload(Rental.user),
            selectinload(Rental.equipment)
        ).filter(
            and_(
                Rental.end_date == today,
                Rental.status == OrderStatus.ACTIVE
            )
        )
        result = await self.db.execute(query)
        return result.unique().scalars().all()

    async def get_overdue_rentals(self, today: date) -> List[Rental]:
        """
        Получает просроченные аренды.
        
        Args:
            today: Текущая дата
            
        Returns:
            Список просроченных аренд
        """
        query = select(Rental).options(
            joinedload(Rental.user),
            selectinload(Rental.equipment)
        ).filter(
            and_(
                Rental.end_date < today,
                Rental.status == OrderStatus.ACTIVE
            )
        )
        result = await self.db.execute(query)
        return result.unique().scalars().all()

    async def get_user_completed_rentals_count(self, user_ids: List[int]) -> dict[int, int]:
        """
        Получает количество завершенных аренд для списка пользователей.
        
        Args:
            user_ids: Список ID пользователей
            
        Returns:
            Словарь {user_id: count}
        """
        if not user_ids:
            return {}
        
        query = select(
            Rental.user_id,
            func.count(Rental.id).label('completed_count')
        ).filter(
            and_(
                Rental.user_id.in_(user_ids),
                Rental.status == OrderStatus.COMPLETED
            )
        ).group_by(Rental.user_id)
        
        result = await self.db.execute(query)
        return {row.user_id: row.completed_count for row in result}
