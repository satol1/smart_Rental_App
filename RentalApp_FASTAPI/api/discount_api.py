# api/discount_api.py

from fastapi import APIRouter, Depends, HTTPException, Query
from api.csrf import validate_csrf_dependency

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.models.user import User
from api.permissions import require_admin
from api.services.discount_service import DiscountService
from shared.schemas.discount_schema import DiscountCreate, DiscountUpdate, DiscountOut, DiscountListResponse


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

router = APIRouter(prefix="/discounts", tags=["Скидки за длительность"])

# Dependency providers
@router.get("/", response_model=DiscountListResponse)
@inject
async def get_all_discounts(
        service: DiscountService = Depends(Provide[Container.discount_service]),
        skip: int = Query(0, ge=0, description="Сколько записей пропустить"),
        limit: int = Query(10, ge=1, le=100, description="Максимальное количество записей на странице")
):
    """Получить все уровни скидок за длительность с пагинацией."""
    return await service.get_all_paginated(skip, limit)

@router.post("/", response_model=DiscountOut, status_code=201)
@inject
async def create_discount(
        discount_in: DiscountCreate,
        service: DiscountService = Depends(Provide[Container.discount_service]),
        current_user: User = Depends(require_admin),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Создать новый уровень скидки."""
    return await service.create_discount(discount_in)

@router.put("/{discount_id}", response_model=DiscountOut)
@inject
async def update_discount(
        discount_id: int,
        discount_in: DiscountUpdate,
        service: DiscountService = Depends(Provide[Container.discount_service]),
        current_user: User = Depends(require_admin),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Обновить существующий уровень скидки."""
    return await service.update_discount(discount_id, discount_in)

@router.delete("/{discount_id}", status_code=204)
@inject
async def delete_discount(
        discount_id: int,
        service: DiscountService = Depends(Provide[Container.discount_service]),
        current_user: User = Depends(require_admin),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Удалить уровень скидки."""
    await service.delete_discount(discount_id)
    return None