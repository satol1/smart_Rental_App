# api/admin_dashboard_api.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.permissions import require_manager
from api.models.user import User
from api.services.dashboard_service import DashboardService
from shared.schemas.dashboard_schema import DashboardSummaryResponse


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

router = APIRouter(prefix="/admin", tags=["admin-dashboard"])

# Dependency providers
@router.get("/dashboard-summary", response_model=DashboardSummaryResponse)
@inject
async def get_dashboard_summary(
    current_user: User = Depends(require_manager),
    dashboard_service: DashboardService = Depends(Provide[Container.dashboard_service])
) -> DashboardSummaryResponse:
    """
    Получает сводную информацию для панели управления админки.
    
    Возвращает агрегированные данные включая:
    - Задачи на сегодня (выдачи, возвраты, просрочки)
    - Ключевые показатели (доход, новые аренды, коэффициент использования, новые пользователи)
    - Последние события в системе
    - Популярное оборудование
    """
    return await dashboard_service.get_summary()
