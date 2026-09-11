# api/brand_system_api.py

from fastapi import APIRouter, Depends, Query, Response, status
from api.csrf import validate_csrf_dependency
from dependency_injector.wiring import inject, Provide
from containers import Container
from api.permissions import require_manager
from api.models.user import User
from api.services.brand_system_service import BrandSystemService
from shared.schemas.brand_system_schema import (
    BrandSystemOut, BrandSystemCreate, BrandSystemUpdate, BrandSystemListResponse
)


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

router = APIRouter(prefix="/brand-systems", tags=["Системы Брендов"])

# Dependency providers
@router.get("/", response_model=BrandSystemListResponse)
@inject
async def get_all(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    service: BrandSystemService = Depends(Provide[Container.brand_system_service]),
):
    systems, total = await service.get_all_paginated(skip, limit)
    return BrandSystemListResponse(items=systems, total=total)

@router.post("/", response_model=BrandSystemOut, status_code=status.HTTP_201_CREATED)
@inject
async def create(
    data: BrandSystemCreate,
    service: BrandSystemService = Depends(Provide[Container.brand_system_service]),
    current_user: User = Depends(require_manager),
    _csrf: None = Depends(validate_csrf_dependency),
):
    return await service.create(data)

@router.put("/{system_id}", response_model=BrandSystemOut)
@inject
async def update(
    system_id: int,
    data: BrandSystemUpdate,
    service: BrandSystemService = Depends(Provide[Container.brand_system_service]),
    current_user: User = Depends(require_manager),
    _csrf: None = Depends(validate_csrf_dependency),
):
    return await service.update(system_id, data)

@router.delete("/{system_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
async def delete(
    system_id: int,
    service: BrandSystemService = Depends(Provide[Container.brand_system_service]),
    current_user: User = Depends(require_manager),
    _csrf: None = Depends(validate_csrf_dependency),
):
    await service.delete(system_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
