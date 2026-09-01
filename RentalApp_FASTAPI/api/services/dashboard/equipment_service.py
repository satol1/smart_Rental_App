# api/services/dashboard/equipment_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import logging

from shared.schemas.dashboard_schema import PopularEquipmentItem
from api.repositories.dashboard_repository import DashboardRepository
from .base import BaseDashboardService

logger = logging.getLogger(__name__)


class EquipmentService(BaseDashboardService):
    """Сервис для работы с популярным оборудованием панели управления."""
    
    def __init__(self, db: AsyncSession, dashboard_repo: DashboardRepository):
        super().__init__(db)
        self.dashboard_repo = dashboard_repo
    
    async def get_popular_equipment(self) -> List[PopularEquipmentItem]:
        """Получает топ-12 самого популярного оборудования с выручкой."""
        try:
            return await self.dashboard_repo.get_popular_equipment(30)
            
        except Exception as e:
            logger.error(f"Ошибка при получении популярного оборудования: {e}", exc_info=True)
            # Возвращаем пустой список в случае ошибки
            return []
