# api/services/dashboard/base.py

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, date
from typing import List

from api.models.rental import Rental
from api.models.reservation import Reservation
from shared.schemas.dashboard_schema import TodayFocusItem


class BaseDashboardService:
    """Базовый класс для сервисов панели управления с общими методами."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    def _determine_client_status(self, user_balance: float, completed_rentals_count: int) -> str:
        """Определяет статус клиента на основе количества завершенных аренд."""
        # Только VIP и Новый статусы, информация о долге через баланс
        if completed_rentals_count > 10:
            return 'vip'
        elif completed_rentals_count <= 2:
            return 'new'
        else:
            return None

    def _create_today_focus_item_from_reservation(self, reservation: Reservation, start_date: date = None, completed_rentals_count: int = 0, is_pending_pickup: bool = False) -> TodayFocusItem:
        """Создает TodayFocusItem из резервации."""
        # Создаем список названий оборудования
        equipment_list = [eq.name for eq in reservation.equipment]
        
        # Определяем статус клиента
        user_client_status = self._determine_client_status(reservation.user.balance, completed_rentals_count)
        
        return TodayFocusItem(
            id=reservation.id,
            user_name=reservation.user.full_name,
            user_phone=reservation.user.phone,
            user_telegram=reservation.user.telegram_username,
            user_status=reservation.user.status,
            user_balance=reservation.user.balance,
            equipment_list=equipment_list,
            user_id=reservation.user_id,
            order_type='reservation',
            scheduled_time=datetime.combine(reservation.start_date, datetime.min.time()),
            start_date=start_date or reservation.start_date,
            user_client_status=user_client_status,
            is_pending_pickup=is_pending_pickup
        )

    def _create_today_focus_item_from_rental(
        self, 
        rental: Rental, 
        details: str = "", 
        due_date: date = None, 
        days_overdue: int = None,
        completed_rentals_count: int = 0
    ) -> TodayFocusItem:
        """Создает TodayFocusItem из аренды."""
        # Создаем список названий оборудования
        equipment_list = [eq.name for eq in rental.equipment]
        
        # Определяем статус клиента
        user_client_status = self._determine_client_status(rental.user.balance, completed_rentals_count)
        
        return TodayFocusItem(
            id=rental.id,
            user_name=rental.user.full_name,
            user_phone=rental.user.phone,
            user_telegram=rental.user.telegram_username,
            user_status=rental.user.status,
            user_balance=rental.user.balance,
            equipment_list=equipment_list,
            user_id=rental.user_id,
            order_type='rental',
            scheduled_time=datetime.combine(rental.end_date, datetime.min.time()),
            due_date=due_date,
            days_overdue=days_overdue,
            user_client_status=user_client_status
        )
