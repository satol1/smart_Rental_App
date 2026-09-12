# api/repositories/reservation_base_repository.py

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date

from api.models.reservation import Reservation
from shared.schemas.reservation_schema import ReservationCreateRequest, ReservationUpdateRequest
from shared.constants.order_status import OrderStatus
from shared.utils.date_utils import get_business_today
from .base_repository import BaseRepository


class ReservationBaseRepository(BaseRepository[Reservation, ReservationCreateRequest, ReservationUpdateRequest]):
    """
    Базовый репозиторий для работы с резервами.
    Наследует базовые CRUD операции от BaseRepository.
    """

    def __init__(self, db: AsyncSession):
        """
        Инициализация репозитория резервов.
        
        Args:
            db: Асинхронная сессия базы данных
        """
        super().__init__(db, model=Reservation)
    
    async def delete(self, reservation_id: int) -> None:
        """
        Удаление резерва по ID.
        
        Args:
            reservation_id: ID резерва для удаления
        """
        reservation = await self.get_by_id(reservation_id)
        if reservation:
            await self.db.delete(reservation)
            await self.db.flush()
    
    async def count_active_reservations_by_user(self, user_id: int) -> int:
        """
        Подсчитывает количество активных резервов пользователя.
        
        Активный резерв определяется как:
        - Резерв со статусом ACTIVE
        - end_date >= сегодня (дата окончания еще не наступила)
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Количество активных резервов
        """
        today = get_business_today()
        result = await self.db.execute(
            select(func.count(Reservation.id)).filter(
                and_(
                    Reservation.user_id == user_id,
                    Reservation.status == OrderStatus.ACTIVE,
                    Reservation.end_date >= today
                )
            )
        )
        return result.scalar() or 0
    
    async def count_overdue_reservations_by_user(self, user_id: int, today: date) -> int:
        """
        Подсчитывает количество просроченных резервов пользователя.
        
        Просроченный резерв определяется как:
        - Резерв со статусом ACTIVE
        - start_date < сегодня (дата начала уже прошла)
        - rental is None (не был преобразован в аренду)
        
        Args:
            user_id: ID пользователя
            today: Текущая дата
            
        Returns:
            Количество просроченных резервов
        """
        from api.models.rental import Rental
        from sqlalchemy import not_
        
        # Используем NOT EXISTS для проверки отсутствия rental
        subquery = select(1).where(
            Rental.reservation_id == Reservation.id
        ).exists()
        
        result = await self.db.execute(
            select(func.count(Reservation.id)).filter(
                and_(
                    Reservation.user_id == user_id,
                    Reservation.status == OrderStatus.ACTIVE,
                    Reservation.start_date < today,
                    not_(subquery)  # rental не существует
                )
            )
        )
        return result.scalar() or 0