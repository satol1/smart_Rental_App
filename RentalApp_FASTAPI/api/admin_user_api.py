# api/admin_user_api.py

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.permissions import require_manager, require_admin
from api.models.user import User as PermissionUser
from api.repositories.user_repository import UserRepository
from shared.schemas.user_schema import AdminUserCreate, AdminUserUpdate, UserOut, UserListResponse
from api.csrf import validate_csrf_dependency
# Удален импорт get_db_session
from api.services.user_service import UserService

router = APIRouter(prefix="/admin/users", tags=["Администрирование пользователей"])

# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])
@router.post("/", response_model=UserOut, status_code=201, summary="Создать пользователя (Админ)")
@inject
async def create_user_by_admin(
        user_data: AdminUserCreate,
        current_user: PermissionUser = Depends(require_admin),
        _csrf: None = Depends(validate_csrf_dependency),
        user_service: UserService = Depends(Provide[Container.user_service])
):
    """
    Создает нового пользователя с указанной ролью.
    Доступно только для пользователей с ролью 'admin'.
    """
    new_user = await user_service.create_admin_user(user_data)
    return new_user


@router.get("/", response_model=UserListResponse, summary="Получить всех пользователей (Менеджер)")
@inject
async def get_all_users(
        repo: UserRepository = Depends(Provide[Container.user_repo]),
        current_user: PermissionUser = Depends(require_manager),
        skip: int = Query(0, ge=0, description="Сколько записей пропустить"),
        limit: int = Query(10, ge=1, le=100, description="Максимальное количество записей на странице"),
        search: str | None = Query(None, min_length=1, max_length=100, description="Поиск по ФИО, email и телефону"),
        sort_by: str = Query("created_desc", pattern="^(created|created_desc|name|name_desc|email|email_desc)$", description="Ключ сортировки"),
):
    """
    Получает список всех пользователей в системе с пагинацией, поиском и сортировкой.
    Доступно для пользователей с ролью 'manager' и 'admin'.
    """
    users_orm, total_users = await repo.get_all_paginated(skip, limit, search=search, sort_by=sort_by)

    return UserListResponse(
        items=[UserOut.model_validate(user) for user in users_orm],
        total=total_users
    )


@router.get("/{user_id}", response_model=UserOut, summary="Получить пользователя по ID (Менеджер)")
@inject
async def get_user_by_id(
        user_id: int,
        repo: UserRepository = Depends(Provide[Container.user_repo]),
        current_user: PermissionUser = Depends(require_manager)
):
    """
    Получает данные конкретного пользователя по ID.
    Доступно для пользователей с ролью 'manager' и 'admin'.
    """
    user_orm = await repo.get_by_id(user_id)
    if not user_orm:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    return UserOut.model_validate(user_orm)


@router.put("/{user_id}", response_model=UserOut, summary="Обновить пользователя (Менеджер/Админ)")
@inject
async def update_user_by_admin_or_manager(
        user_id: int,
        data: AdminUserUpdate,
        current_user: PermissionUser = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency),
        user_service: UserService = Depends(Provide[Container.user_service])
):
    """
    Обновляет данные пользователя. Менеджеры могут обновлять все, кроме роли.
    Администраторы могут обновлять все, включая роль. Email не меняется.
    """
    return await user_service.update_user_by_admin(user_id, data, current_user)


@router.put("/{user_id}/block", summary="Заблокировать пользователя (Админ)")
@inject
async def block_user(
        user_id: int,
        current_user: PermissionUser = Depends(require_admin),
        _csrf: None = Depends(validate_csrf_dependency),
        user_service: UserService = Depends(Provide[Container.user_service])
):
    """
    Деактивирует (блокирует) пользователя.
    Доступно только для пользователей с ролью 'admin'.
    """
    return await user_service.block_user(user_id, current_user)


@router.put("/{user_id}/unblock", summary="Разблокировать пользователя (Админ)")
@inject
async def unblock_user(
        user_id: int,
        current_user: PermissionUser = Depends(require_admin),
        _csrf: None = Depends(validate_csrf_dependency),
        user_service: UserService = Depends(Provide[Container.user_service])
):
    """
    Активирует (разблокирует) пользователя.
    Доступно только для пользователей с ролью 'admin'.
    """
    return await user_service.unblock_user(user_id)


@router.delete("/{user_id}", summary="Удалить пользователя (Админ)")
@inject
async def delete_user(
        user_id: int,
        user_service: UserService = Depends(Provide[Container.user_service]),
        current_user: PermissionUser = Depends(require_admin),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """
    Полностью удаляет пользователя из базы данных.
    Это необратимое действие!
    Доступно только для пользователей с ролью 'admin'.
    """
    return await user_service.delete_user(user_id, current_user)
