# api/services/dashboard/dashboard_service.py

from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
import logging

from shared.schemas.dashboard_schema import DashboardSummaryResponse
from .focus_service import FocusService
from .kpi_service import KpiService
from .activity_service import ActivityService
from .equipment_service import EquipmentService
from api.repositories.dashboard_repository import DashboardRepository
from api.services.cache_service import (
    app_cache,
    DASHBOARD_SUMMARY_KEY,
    DASHBOARD_SUMMARY_TTL_SECONDS,
)

logger = logging.getLogger(__name__)


class DashboardService:
    """Основной сервис для сбора агрегированных данных для панели управления админки."""

    def __init__(self, 
                 db: AsyncSession,
                 dashboard_repo: DashboardRepository,
                 focus_service: FocusService,
                 kpi_service: KpiService,
                 activity_service: ActivityService,
                 equipment_service: EquipmentService):
        self.db = db
        self.dashboard_repo = dashboard_repo
        self.focus_service = focus_service
        self.kpi_service = kpi_service
        self.activity_service = activity_service
        self.equipment_service = equipment_service

    async def get_summary(self) -> DashboardSummaryResponse:
        """Получает сводную информацию для панели управления.

        Итоговый ответ кэшируется целиком (dashboard:summary, TTL 60с,
        redis-или-in-memory): агрегат собирается из многих репозиториев,
        и без кэша каждый запрос дёргает их все. Инвалидация — при
        мутациях резервов/аренд (см. invalidate_dashboard_summary).
        """
        cached = app_cache.get_json(DASHBOARD_SUMMARY_KEY)
        if cached is not None:
            try:
                return DashboardSummaryResponse.model_validate(cached)
            except Exception as exc:
                # Повреждённый кэш не должен ломать эндпоинт — пересобираем
                logger.warning("Кэш dashboard:summary повреждён (%s): пересобираем", exc)

        try:
            # Собираем все данные последовательно, чтобы избежать конфликтов сессий
            pickups_today = await self.focus_service.get_pickups_today()
            returns_today = await self.focus_service.get_returns_today()
            overdue_rentals = await self.focus_service.get_overdue_rentals()
            kpi_data = await self.kpi_service.get_kpi_data()
            recent_activity = await self.activity_service.get_recent_activity()
            popular_equipment = await self.equipment_service.get_popular_equipment()

            summary = DashboardSummaryResponse(
                pickups_today=pickups_today,
                returns_today=returns_today,
                overdue_rentals=overdue_rentals,
                kpi=kpi_data,
                recent_activity=recent_activity,
                popular_equipment=popular_equipment
            )

            app_cache.set_json(
                DASHBOARD_SUMMARY_KEY,
                summary.model_dump(mode="json"),
                DASHBOARD_SUMMARY_TTL_SECONDS,
            )
            return summary
        except Exception as e:
            logger.error(f"Ошибка при получении сводной информации: {e}", exc_info=True)
            raise
