# api/association_api.py

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.services.association_service import AssociationService
from api.models.user import User
from api.permissions import require_manager
from shared.schemas.association_schema import AssociationCreate, AssociationUpdate, AssociationOut, AssociationListResponse
from api.csrf import validate_csrf_dependency


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

router = APIRouter(prefix="/associations", tags=["Ассоциации"])

# Dependency providers
@router.get("/", response_model=AssociationListResponse)
@inject
async def get_all_associations(
        service: AssociationService = Depends(Provide[Container.association_service]),
        skip: int = Query(0, ge=0, description="Сколько записей пропустить"),
        limit: int = Query(10, ge=1, le=100, description="Максимальное количество записей на странице")
):
    """
    Получить список всех ассоциаций, отсортированных по порядку с пагинацией.
    Этот эндпоинт публичный и используется для фильтров на главной странице.
    """
    return await service.get_all_paginated(skip, limit)

@router.post("/", response_model=AssociationOut, status_code=201)
@inject
async def create_association(
        assoc_in: AssociationCreate,
        service: AssociationService = Depends(Provide[Container.association_service]),
        _current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Создать новую ассоциацию (Менеджер/Админ)."""
    return await service.create_new_association(assoc_in)

@router.put("/{assoc_id}", response_model=AssociationOut)
@inject
async def update_association(
        assoc_id: int,
        assoc_in: AssociationUpdate,
        service: AssociationService = Depends(Provide[Container.association_service]),
        _current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Обновить ассоциацию (Менеджер/Админ)."""
    return await service.update_association(assoc_id, assoc_in)

@router.delete("/{assoc_id}", status_code=204)
@inject
async def delete_association(
        assoc_id: int,
        service: AssociationService = Depends(Provide[Container.association_service]),
        _current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Удалить ассоциацию (Менеджер/Админ)."""
    await service.delete_association(assoc_id)
    return None