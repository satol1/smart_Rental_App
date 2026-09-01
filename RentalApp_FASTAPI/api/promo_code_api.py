# api/promo_code_api.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.permissions import require_manager
from api.dependencies import get_user_by_token
from api.models.user import User
from api.repositories.user_repository import UserRepository
from shared.schemas.promo_code_schema import (
    PromoCodeCreate, PromoCodeUpdate, PromoCodeOut,
    PromoCodeValidateRequest, PromoCodeValidateResponse,
    PromoCodeListResponse
)
from fastapi.security import OAuth2PasswordBearer
from fastapi_csrf_protect import CsrfProtect
from api.services.promo_code.promo_code_manager import PromoCodeManager
from api.services.promo_code import PromoCodeBusinessLogic

router = APIRouter(prefix="/promocodes", tags=["Промокоды"])

# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


@router.post("/", response_model=PromoCodeOut, status_code=status.HTTP_201_CREATED)
@inject
async def create_promo_code(
        promo_in: PromoCodeCreate,
        current_user: User = Depends(require_manager),
        _csrf_protect: CsrfProtect = Depends(),
        manager: PromoCodeManager = Depends(Provide[Container.promo_code_manager])
):
    """
    Создает новый промокод. (Менеджеры <= 20%, Админы <= 50%)
    """
    try:
        new_promo_code = await manager.create_promo_code(promo_in, current_user)
        return PromoCodeOut.model_validate(new_promo_code)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/", response_model=PromoCodeListResponse)
@inject
async def get_all_promo_codes(
        _current_user: User = Depends(require_manager),
        skip: int = Query(0, ge=0, description="Сколько записей пропустить"),
        limit: int = Query(10, ge=1, le=100, description="Максимальное количество записей на странице"),
        manager: PromoCodeManager = Depends(Provide[Container.promo_code_manager])
):
    """Получить список всех промокодов с пагинацией (только для менеджеров/админов)"""
    try:
        promo_codes = await manager.get_all_promo_codes()
        
        # Применяем пагинацию к результату
        total_promo_codes = len(promo_codes)
        paginated_promo_codes = promo_codes[skip:skip + limit]
        
        return PromoCodeListResponse(
            items=[PromoCodeOut.model_validate(pc) for pc in paginated_promo_codes],
            total=total_promo_codes
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{promo_code_id}", response_model=PromoCodeOut)
@inject
async def get_promo_code_by_id(
        promo_code_id: int,
        _current_user: User = Depends(require_manager),
        manager: PromoCodeManager = Depends(Provide[Container.promo_code_manager])
):
    """Получить промокод по ID (только для менеджеров/админов)"""
    try:
        promo_code = await manager.get_promo_code_by_id(promo_code_id)
        if not promo_code:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Промокод не найден")
        return PromoCodeOut.model_validate(promo_code)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/generate/new-code", response_model=dict)
@inject
async def generate_promo_code(
        _current_user: User = Depends(require_manager),
        manager: PromoCodeManager = Depends(Provide[Container.promo_code_manager])
):
    """Генерирует уникальный код промокода"""
    try:
        generated_code = await manager.generate_unique_code()
        return {"generated_code": generated_code}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.put("/{promo_code_id}", response_model=PromoCodeOut)
@inject
async def update_promo_code(
        promo_code_id: int,
        promo_in: PromoCodeUpdate,
        _current_user: User = Depends(require_manager),
        _csrf_protect: CsrfProtect = Depends(),
        manager: PromoCodeManager = Depends(Provide[Container.promo_code_manager])
):
    """Обновляет существующий промокод (только для менеджеров/админов)."""
    try:
        updated_promo_code = await manager.update_promo_code(promo_code_id, promo_in)
        return PromoCodeOut.model_validate(updated_promo_code)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/{promo_code_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
async def delete_promo_code(
        promo_code_id: int,
        _current_user: User = Depends(require_manager),
        _csrf_protect: CsrfProtect = Depends(),
        manager: PromoCodeManager = Depends(Provide[Container.promo_code_manager])
):
    """Удаляет промокод"""
    try:
        await manager.delete_promo_code(promo_code_id)
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/validate", response_model=PromoCodeValidateResponse)
@inject
async def validate_promo_code_endpoint(
        request: PromoCodeValidateRequest,
        token: str = Depends(optional_oauth2_scheme),
        business_logic: PromoCodeBusinessLogic = Depends(Provide[Container.promo_code_business_logic]),
        user_repo: UserRepository = Depends(Provide[Container.user_repo])
):
    """
    Проверяет валидность промокода с учетом всех условий.
    """
    try:
        current_user = None
        if token:
            current_user = await get_user_by_token(token, user_repo)
        
        promo_code = await business_logic.validate_and_get_promo_code(
            code=request.code,
            order_amount=request.order_amount,
            equipment_ids=request.equipment_ids,
            user=current_user
        )
        
        return business_logic.create_validation_response(promo_code)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))