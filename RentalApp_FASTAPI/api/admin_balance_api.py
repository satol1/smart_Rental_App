# api/admin_balance_api.py

from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.permissions import require_manager, require_admin
from api.models.user import User as PermissionUser
from shared.schemas.user_schema import UserPaymentRequest, AdminBalanceAdjustmentRequest, UserOut
from shared.schemas.balance_history_schema import BalanceHistoryOut, BalanceHistoryListResponse
from api.csrf import validate_csrf_dependency
# Удален импорт get_db_session
from api.services.user_service import UserService


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

router = APIRouter(prefix="/admin/users", tags=["Управление балансом пользователей"])

# Dependency providers
@router.get("/{user_id}/balance-history", response_model=BalanceHistoryListResponse, summary="Получить историю баланса пользователя (Менеджер)")
@inject
async def get_user_balance_history_by_admin(
        user_id: int,
        current_user: PermissionUser = Depends(require_manager),
        skip: int = Query(0, ge=0),
        limit: int = Query(15, ge=1, le=100),
        # 🟢 ВНЕДРЯЕМ ЭКЗЕМПЛЯР СЕРВИСА-КЛАССА БЕЗ ПЕРЕДАЧИ СЕССИИ 🟢
        user_service: UserService = Depends(Provide[Container.user_service])
):
    """
    Возвращает историю транзакций по балансу для указанного пользователя.
    """
    try:
        # Сервис уже имеет сессию, полученную через DI
        history_orm, total = await user_service.get_balance_history_for_user(user_id, skip, limit)
        return BalanceHistoryListResponse(
            items=[BalanceHistoryOut.model_validate(h) for h in history_orm],
            total=total
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{user_id}/add-payment", response_model=UserOut, summary="Добавить платеж и пополнить баланс (Менеджер)")
@inject
async def add_payment_to_user(
        user_id: int,
        payment_data: UserPaymentRequest,
        current_user: PermissionUser = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency),
        user_service: UserService = Depends(Provide[Container.user_service])
):
    """
    Регистрирует реальный платеж от пользователя и пополняет его внутренний баланс.
    """
    try:
        return await user_service.process_user_payment(user_id, payment_data, current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{user_id}/adjust-balance", response_model=UserOut, summary="Ручная корректировка баланса (Менеджер)")
@inject
async def adjust_user_balance(
        user_id: int,
        adjustment_data: AdminBalanceAdjustmentRequest,
        current_user: PermissionUser = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency),
        user_service: UserService = Depends(Provide[Container.user_service])
):
    """
    Выполняет ручную корректировку баланса пользователя (начисление бонусов, списание штрафов и т.д.).
    Доступно только для менеджеров и администраторов.
    """
    return await user_service.adjust_user_balance(user_id, adjustment_data.amount, adjustment_data.description, current_user)


@router.delete("/balance-history/{history_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Удалить запись из истории баланса (Админ)")
@inject
async def delete_balance_history_entry(
    history_id: int,
    current_user: PermissionUser = Depends(require_admin),
    _csrf: None = Depends(validate_csrf_dependency),
    user_service: UserService = Depends(Provide[Container.user_service])
):
    """
    Удаляет одну запись из истории баланса пользователя и пересчитывает его итоговый баланс.
    Доступно только для администраторов.
    """
    await user_service.delete_balance_history_entry(history_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
