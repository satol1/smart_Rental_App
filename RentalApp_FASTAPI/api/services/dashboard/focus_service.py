
# api/services/dashboard/focus_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select, and_, func
from datetime import date
from typing import List, Dict

from api.models.rental import Rental
from api.models.reservation import Reservation
from api.models.user import User
from api.models.equipment import Equipment
from shared.schemas.dashboard_schema import TodayFocusItem
from api.services.financial_service import FinancialService
from api.repositories.dashboard_repository import DashboardRepository
from shared.constants.order_status import OrderStatus
from .base import BaseDashboardService


class FocusService(BaseDashboardService):
    """Сервис для виджета 'Сегодня в фокусе' - выдачи, возвраты, просрочки."""
    
    def __init__(self, db: AsyncSession, dashboard_repo: DashboardRepository, financial_service: FinancialService):
        super().__init__(db)
        self.financial_service = financial_service
        self.dashboard_repo = dashboard_repo
    
    async def _get_user_completed_rentals_count(self, user_ids: List[int]) -> Dict[int, int]:
        """Получает количество завершенных аренд для списка пользователей."""
        return await self.dashboard_repo.get_user_completed_rentals_count(user_ids)
    
    
    async def get_pickups_today(self) -> List[TodayFocusItem]:
        """Получает активные резервации для выдачи (не просроченные и не выданные)."""
        today = date.today()
        
        reservations = await self.dashboard_repo.get_today_pickups(today)

        # Получаем уникальные ID пользователей
        user_ids = list(set(reservation.user_id for reservation in reservations))
        completed_rentals_count = await self._get_user_completed_rentals_count(user_ids)

        return [
            self._create_today_focus_item_from_reservation(
                reservation, 
                reservation.start_date,
                completed_rentals_count.get(reservation.user_id, 0),
                is_pending_pickup=reservation.start_date < today
            ) 
            for reservation in reservations
        ]

    async def get_returns_today(self) -> List[TodayFocusItem]:
        """Получает аренды на сегодня для возврата."""
        today = date.today()
        
        rentals = await self.dashboard_repo.get_today_returns(today)

        # Получаем уникальные ID пользователей
        user_ids = list(set(rental.user_id for rental in rentals))
        completed_rentals_count = await self._get_user_completed_rentals_count(user_ids)

        return [
            self._create_today_focus_item_from_rental(
                rental, 
                "",  # details больше не используется
                completed_rentals_count=completed_rentals_count.get(rental.user_id, 0)
            ) 
            for rental in rentals
        ]

    async def get_overdue_rentals(self) -> List[TodayFocusItem]:
        """Получает просроченные аренды."""
        today = date.today()
        
        rentals = await self.dashboard_repo.get_overdue_rentals(today)

        # Получаем уникальные ID пользователей
        user_ids = list(set(rental.user_id for rental in rentals))
        completed_rentals_count = await self._get_user_completed_rentals_count(user_ids)

        result_items = []
        for rental in rentals:
            days_overdue = (today - rental.end_date).days
            # Используем централизованный метод из FinancialService
            remaining_amount = self.financial_service.calculate_remaining_amount(rental)
            
            item = self._create_today_focus_item_from_rental(
                rental,
                "",  # details больше не используется
                due_date=rental.end_date,
                days_overdue=days_overdue,
                completed_rentals_count=completed_rentals_count.get(rental.user_id, 0)
            )
            result_items.append(item)
        
        return result_items
