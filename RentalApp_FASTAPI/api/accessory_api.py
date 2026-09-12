# api/accessory_api.py

from fastapi import APIRouter, Depends, HTTPException, Query
from dependency_injector.wiring import inject, Provide
from containers import Container
from api.services.accessory_service import AccessoryService
from api.models.user import User
from api.permissions import require_manager
from shared.schemas.accessory_schema import AccessoryCreate, AccessoryUpdate, AccessoryOut, AccessoryListResponse
from api.csrf import validate_csrf_dependency


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

router = APIRouter(prefix="/accessories", tags=["Аксессуары"])

# Dependency providers
@router.post("/", response_model=AccessoryOut, status_code=201)
@inject
async def create_accessory(
        accessory_in: AccessoryCreate,
        accessory_service: AccessoryService = Depends(Provide[Container.accessory_service]),
        current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Создать новый аксессуар (только для менеджеров/админов)"""
    return await accessory_service.create_accessory(accessory_in)

@router.get("/", response_model=AccessoryListResponse)
@inject
async def get_all_accessories(
        accessory_service: AccessoryService = Depends(Provide[Container.accessory_service]),
        skip: int = Query(0, ge=0, description="Сколько записей пропустить"),
        limit: int = Query(10, ge=1, le=500, description="Максимальное количество записей на странице"),
        search: str | None = Query(None, min_length=1, max_length=100, description="Поиск по названию и типу"),
        sort_by: str = Query("name", pattern="^(id|name|type|price)$", description="Колонка сортировки"),
        sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Направление сортировки"),
):
    """Получить список всех аксессуаров с пагинацией, поиском и сортировкой"""
    return await accessory_service.get_all_accessories_paginated(skip, limit, search=search, sort_by=sort_by, sort_order=sort_order)

@router.get("/{accessory_id}", response_model=AccessoryOut)
@inject
async def get_accessory_by_id(
        accessory_id: int, 
        accessory_service: AccessoryService = Depends(Provide[Container.accessory_service])
):
    """Получить аксессуар по ID"""
    return await accessory_service.get_accessory_by_id(accessory_id)

@router.put("/{accessory_id}", response_model=AccessoryOut)
@inject
async def update_accessory(
        accessory_id: int,
        accessory_in: AccessoryUpdate,
        accessory_service: AccessoryService = Depends(Provide[Container.accessory_service]),
        current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Обновить аксессуар (только для менеджеров/админов)"""
    return await accessory_service.update_accessory(accessory_id, accessory_in)

@router.delete("/{accessory_id}", status_code=204)
@inject
async def delete_accessory(
        accessory_id: int,
        accessory_service: AccessoryService = Depends(Provide[Container.accessory_service]),
        current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Удалить аксессуар (только для менеджеров/админов)"""
    await accessory_service.delete_accessory(accessory_id)
    return None