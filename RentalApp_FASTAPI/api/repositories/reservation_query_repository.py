# api/repositories/reservation_query_repository.py

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select, and_
from datetime import date

from api.models.reservation import Reservation, ReservationAccessory
from api.models.equipment import Equipment
from shared.constants.order_status import OrderStatus
from .reservation_base_repository import ReservationBaseRepository


class ReservationQueryRepository(ReservationBaseRepository):
    """
    Репозиторий для выполнения запросов на получение данных резервов.
    Содержит методы для получения резервов с различными уровнями детализации.
    """

    async def get_by_id_with_details(self, reservation_id: int) -> Optional[Reservation]:
        """
        Получение резерва по ID с предзагрузкой всех связанных данных.
        
        Использует eager loading для избежания проблемы N+1 запросов.
        Предзагружает все необходимые связи:
        - Reservation.user
        - Reservation.equipment (включая accessories и associations)
        - Reservation.accessory_links (включая accessory)
        - Reservation.rental
        - Reservation.applied_promo_code
        
        Args:
            reservation_id: ID резерва
            
        Returns:
            Резерв с предзагруженными связями или None, если не найден
        """
        query = select(Reservation).options(
            # Предзагрузка пользователя
            joinedload(Reservation.user),
            
            # Предзагрузка оборудования с вложенными связями
            selectinload(Reservation.equipment).options(
                selectinload(Equipment.accessories),
                selectinload(Equipment.associations)
            ),
            
            # Предзагрузка связей аксессуаров с самими аксессуарами
            joinedload(Reservation.accessory_links).joinedload(ReservationAccessory.accessory),
            
            # Предзагрузка аренды
            joinedload(Reservation.rental),
            
            # Предзагрузка промокода
            joinedload(Reservation.applied_promo_code)
        ).filter(Reservation.id == reservation_id)
        
        result = await self.db.execute(query)
        return result.unique().scalar_one_or_none()

    async def find_by_ids(self, reservation_ids: List[int]) -> List[Reservation]:
        """
        Поиск резервов по списку ID с предзагрузкой связей.
        
        Args:
            reservation_ids: Список ID резервов
            
        Returns:
            Список резервов с предзагруженными связями
        """
        if not reservation_ids:
            return []
            
        query = select(Reservation).options(
            # Предзагрузка основных связей для списка
            joinedload(Reservation.user),
            selectinload(Reservation.equipment),
            joinedload(Reservation.rental),
            joinedload(Reservation.applied_promo_code)
        ).filter(Reservation.id.in_(reservation_ids))
        
        result = await self.db.execute(query)
        return result.unique().scalars().all()

    async def get_reservations_by_user_id(self, user_id: int, status_filter: Optional[str] = None) -> List[Reservation]:
        """
        Получение резервов пользователя с опциональной фильтрацией по статусу.
        
        Args:
            user_id: ID пользователя
            status_filter: Опциональный фильтр по статусу
            
        Returns:
            Список резервов пользователя
        """
        query = select(Reservation).options(
            joinedload(Reservation.applied_promo_code),
            joinedload(Reservation.accessory_links).joinedload(ReservationAccessory.accessory),
            selectinload(Reservation.equipment).options(
                selectinload(Equipment.accessories),
                selectinload(Equipment.associations)
            ),
            joinedload(Reservation.rental)
        ).filter(Reservation.user_id == user_id)
        
        # Применяем фильтр по статусу, если указан
        if status_filter:
            if status_filter == OrderStatus.ACTIVE:
                query = query.filter(
                    Reservation.status == OrderStatus.ACTIVE,
                    Reservation.end_date >= date.today()
                )
            elif status_filter == OrderStatus.COMPLETED:
                query = query.filter(
                    Reservation.status.in_([
                        OrderStatus.FULFILLED, 
                        OrderStatus.CANCELLED, 
                        OrderStatus.OVERDUE
                    ])
                )
            elif status_filter == OrderStatus.OVERDUE:
                query = query.filter(
                    Reservation.status == OrderStatus.ACTIVE,
                    Reservation.end_date < date.today()
                )
            else:
                query = query.filter(Reservation.status == status_filter)
        
        result = await self.db.execute(query)
        return result.unique().scalars().all()

    async def get_reservations_for_calendar(self, start_date: date, end_date: date, order_id: Optional[int] = None) -> List[Reservation]:
        """
        Получение резервов для календаря в указанном диапазоне дат.
        
        Args:
            start_date: Начальная дата диапазона
            end_date: Конечная дата диапазона
            order_id: Опциональный ID конкретного заказа
            
        Returns:
            Список резервов для отображения в календаре
        """
        # Коллекции — selectinload: joinedload на коллекции даёт декартово
        # произведение строк (резерв × оборудование × аксессуары)
        query = select(Reservation).options(
            selectinload(Reservation.equipment).options(
                selectinload(Equipment.accessories),
                selectinload(Equipment.associations)
            ),
            joinedload(Reservation.user),
            selectinload(Reservation.accessory_links).selectinload(ReservationAccessory.accessory),
            joinedload(Reservation.applied_promo_code)
        ).filter(
            and_(
                Reservation.start_date <= end_date,
                Reservation.end_date >= start_date
            )
        )
        
        # Если указан конкретный ID заказа
        if order_id:
            query = query.filter(Reservation.id == order_id)
        
        result = await self.db.execute(query)
        return result.unique().scalars().all()

    async def get_reservations_for_pickup_today(self, today: date) -> List[Reservation]:
        """
        Получение резервов для выдачи сегодня.
        
        Args:
            today: Дата для проверки
            
        Returns:
            Список резервов, которые должны быть выданы сегодня
        """
        query = select(Reservation).options(
            joinedload(Reservation.user),
            selectinload(Reservation.equipment)
        ).filter(
            and_(
                Reservation.start_date <= today,
                Reservation.end_date >= today,
                Reservation.status == OrderStatus.ACTIVE
            )
        )
        
        result = await self.db.execute(query)
        return result.unique().scalars().all()
