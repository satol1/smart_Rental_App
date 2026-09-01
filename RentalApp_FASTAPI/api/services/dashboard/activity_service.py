# api/services/dashboard/activity_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from shared.schemas.dashboard_schema import ActivityFeedItem
from api.repositories.dashboard_repository import DashboardRepository
from .base import BaseDashboardService


class ActivityService(BaseDashboardService):
    """Сервис для ленты активности панели управления."""
    
    def __init__(self, db: AsyncSession, dashboard_repo: DashboardRepository):
        super().__init__(db)
        self.dashboard_repo = dashboard_repo
    
    async def get_recent_activity(self) -> List[ActivityFeedItem]:
        """Получает последние события в системе."""
        return await self.dashboard_repo.get_recent_activity(7)
