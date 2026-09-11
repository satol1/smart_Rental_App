# api/user_profile_api.py

from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from typing import Optional

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.permissions import require_user
from api.models.user import User as PermissionUser
from api.services.rental.rental_query_service import RentalQueryService
from shared.schemas.rental_schema import RentalListResponse
from shared.schemas.user_schema import UserUpdate, UserOut, validate_password_strength
from shared.schemas.balance_history_schema import BalanceHistoryOut, BalanceHistoryListResponse
from api.csrf import validate_csrf_dependency
# Удален импорт get_db_session
from api.services.user_service import UserService


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

router = APIRouter(prefix="/user", tags=["Профиль пользователя"])

# Dependency providers
@router.get("/rentals", response_model=RentalListResponse)
@inject
async def get_my_rentals(
        current_user: PermissionUser = Depends(require_user),
        service: RentalQueryService = Depends(Provide[Container.rental_query_service]),
        status: Optional[str] = Query(None, description="Фильтр по статусу: active, completed, overdue"),
        search: Optional[str] = Query(None, description="Поиск по названию, бренду или типу оборудования"),
        sort: Optional[str] = Query(None, description="Сортировка: id_desc, id_asc, start_date_desc, start_date_asc, end_date_desc, end_date_asc, count_desc, count_asc"),
        skip: int = Query(0, ge=0, description="Количество записей для пропуска"),
        limit: int = Query(10, ge=1, le=100, description="Максимальное количество записей на странице")
):
    """
    Возвращает отфильтрованный и пагинированный список аренд для текущего авторизованного пользователя.
    """
    rentals_out, total = await service.get_rentals_for_user(
        current_user, skip, limit, status, search, sort
    )
    return RentalListResponse(
        items=rentals_out,
        total=total
    )


@router.get("/balance-history", response_model=BalanceHistoryListResponse)
@inject
async def get_my_balance_history(
        current_user: PermissionUser = Depends(require_user),
        skip: int = Query(0, ge=0),
        limit: int = Query(15, ge=1, le=100),
        user_service: UserService = Depends(Provide[Container.user_service])
):
    """
    Возвращает историю транзакций по балансу для текущего пользователя.
    """
    history_orm, total = await user_service.get_balance_history_for_user(current_user.id, skip, limit)
    return BalanceHistoryListResponse(
        items=[BalanceHistoryOut.model_validate(h) for h in history_orm],
        total=total
    )


@router.put("/", response_model=UserOut)
@inject
async def update_my_profile(
        data: UserUpdate,
        current_user: PermissionUser = Depends(require_user),
        _csrf: None = Depends(validate_csrf_dependency),
        user_service: UserService = Depends(Provide[Container.user_service])
):
    """
    Обновляет профиль (ФИО, email, телефон) текущего пользователя.
    ЗАГЛУШКА: Смена email в будущем потребует подтверждения по почте.
    """
    return await user_service.update_user(current_user, data)


@router.put("/change-password")
@inject
async def change_password(
        password_data: dict,
        current_user: PermissionUser = Depends(require_user),
        _csrf: None = Depends(validate_csrf_dependency),
        user_service: UserService = Depends(Provide[Container.user_service])
):
    """
    Изменяет пароль текущего пользователя.
    """
    current_password = password_data.get("current_password")
    new_password = password_data.get("new_password")

    if not current_password or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Требуются current_password и new_password"
        )

    # Сложность нового пароля — те же правила, что при регистрации
    try:
        validate_password_strength(new_password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Слабый пароль: {e}"
        )

    await user_service.change_password(current_user.id, current_password, new_password)
    
    return {"message": "Пароль успешно изменен"}


@router.post("/confirm-email-change", summary="Подтвердить смену email (заглушка)")
async def confirm_email_change(
        token: str,
        current_user: PermissionUser = Depends(require_user),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """
    ЗАГЛУШКА: В будущем здесь будет логика подтверждения смены email по токену.
    Сейчас просто возвращает сообщение о том, что функционал в разработке.
    """
    return {
        "message": "Функционал подтверждения смены email находится в разработке",
        "status": "not_implemented"
    }
