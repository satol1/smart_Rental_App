# api/admin_tasks_api.py

"""
Эндпоинты для управления фоновыми задачами и регламентными процедурами.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any

from api.permissions import require_admin
from api.models.user import User
from api.services.background_runner import run_overdue_check_once, background_scheduler

router = APIRouter(prefix="/admin/tasks", tags=["Фоновые задачи и регламентные процедуры"])


@router.post("/run-overdue-checker", summary="Запуск проверки просроченных резервов вручную")
async def trigger_overdue_checker(
    current_user: User = Depends(require_admin),
) -> Dict[str, Any]:
    """
    Запускает проверку просроченных резервов и блокировку нарушителей по требованию администратора.
    """
    result = await run_overdue_check_once()
    return result


@router.get("/scheduler-status", summary="Статус фонового планировщика")
async def get_scheduler_status(
    current_user: User = Depends(require_admin),
) -> Dict[str, Any]:
    """
    Возвращает текущий статус планировщика фоновых задач и результат последнего выполнения.
    """
    return {
        "is_running": background_scheduler.is_running,
        "last_run_time": background_scheduler.last_run_time.isoformat() if background_scheduler.last_run_time else None,
        "last_run_result": background_scheduler.last_run_result,
    }
