# api/reservation_api.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.services.order.reservation_service import ReservationLifecycleService
from api.services.reservation_query_service import ReservationQueryService
from shared.schemas.reservation_schema import (
    ReservationCreateRequest, ReservationUpdateRequest, ReservationResponse, ReservationItem,
    ReservationListResponse, PriceCalculationRequest, PriceCalculationResponse
)
from api.permissions import require_user
from api.models.user import User
from api.models.promo_code import PromoCode
from fastapi_csrf_protect import CsrfProtect

from api.services.financial_service import FinancialService
from api.services.promo_code_service import PromoCodeService
from api.services.discount_service import DiscountService


router = APIRouter(prefix="/reservations", tags=["Резервы (для пользователей)"])

# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

@router.post("/", response_model=ReservationResponse)
@inject
async def create_reservation(
        request: ReservationCreateRequest,
        current_user: User = Depends(require_user),
        csrf_protect: CsrfProtect = Depends(),
        service: ReservationLifecycleService = Depends(Provide[Container.reservation_lifecycle_service])
):
    """Создать резерв для текущего пользователя."""
    new_reservation = await service.create_user_reservation(request, current_user)
    
    # Подсчитываем количество аксессуаров
    accessory_count = 0
    if hasattr(new_reservation, 'accessory_links') and new_reservation.accessory_links:
        accessory_count = len(new_reservation.accessory_links)
    elif hasattr(new_reservation, 'selected_accessories') and new_reservation.selected_accessories:
        accessory_count = sum(len(accessories) for accessories in new_reservation.selected_accessories.values())
    
    return ReservationResponse(
        # Обязательные поля (обратная совместимость)
        reservation_id=new_reservation.id,
        message="Резерв успешно создан",
        
        # Дополнительные поля
        user_id=new_reservation.user_id,
        status=new_reservation.status,
        total_cost=getattr(new_reservation, 'total_cost', None),
        discount_amount=getattr(new_reservation, 'discount_amount', None),
        equipment_count=len(new_reservation.equipment_ids) if hasattr(new_reservation, 'equipment_ids') else 0,
        accessory_count=accessory_count,
        start_date=new_reservation.start_date.isoformat() if hasattr(new_reservation, 'start_date') and new_reservation.start_date else None,
        end_date=new_reservation.end_date.isoformat() if hasattr(new_reservation, 'end_date') and new_reservation.end_date else None
    )

@router.get("/", response_model=ReservationListResponse)
@router.get("/my", response_model=ReservationListResponse)
@inject
async def get_user_reservations(
        current_user: User = Depends(require_user),
        query_service: ReservationQueryService = Depends(Provide[Container.reservation_query_service]),
        status: Optional[str] = Query(None, description="Фильтр по статусу: active, completed, overdue"),
        search: Optional[str] = Query(None, description="Поиск по названию, бренду или типу оборудования"),
        sort: Optional[str] = Query(None, description="Сортировка: id_desc, id_asc, start_date_desc, start_date_asc, end_date_desc, end_date_asc, count_desc, count_asc"),
        skip: int = Query(0, ge=0, description="Количество записей для пропуска"),
        limit: int = Query(100, ge=1, le=100, description="Максимальное количество записей на странице")
):
    """Получить отфильтрованный и пагинированный список своих резервов."""
    items, total = await query_service.get_my_reservations(
        current_user, status, search, sort, skip, limit
    )
    return ReservationListResponse(items=items, total=total)

@router.delete("/{reservation_id}")
@inject
async def delete_reservation(
        reservation_id: int,
        current_user: User = Depends(require_user),
        csrf_protect: CsrfProtect = Depends(),
        service: ReservationLifecycleService = Depends(Provide[Container.reservation_lifecycle_service])
):
    """Удалить свой резерв."""
    await service.cancel_user_reservation(reservation_id, current_user)
    return {"message": "Резерв удалён"}

@router.put("/{reservation_id}", response_model=ReservationItem)
@inject
async def update_reservation(
        reservation_id: int,
        data: ReservationUpdateRequest,
        current_user: User = Depends(require_user),
        csrf_protect: CsrfProtect = Depends(),
        service: ReservationLifecycleService = Depends(Provide[Container.reservation_lifecycle_service])
):
    """Обновить свой резерв."""
    updated_reservation_orm = await service.update_user_reservation(reservation_id, data, current_user)
    
    # Возвращаем полный объект вместо короткого ответа.
    # FastAPI автоматически сериализует его с помощью ReservationItem.
    return updated_reservation_orm

@router.post("/calculate", response_model=PriceCalculationResponse)
@inject
async def calculate_price(
        request: PriceCalculationRequest,
        financial_service: FinancialService = Depends(Provide[Container.financial_service]),
        promo_code_service: PromoCodeService = Depends(Provide[Container.promo_code_service]),
        discount_service: DiscountService = Depends(Provide[Container.discount_service])
):
    """Рассчитывает стоимость резерва без его создания."""
    financial_service.validate_date_range(request.start_date, request.end_date)
    promo_code_obj: Optional[PromoCode] = None
    promo_message: Optional[str] = None

    preliminary_price_details = await financial_service.calculate_final_price(
        request.equipment_ids, request.selected_accessories,
        request.start_date, request.end_date, None
    )

    if request.promo_code:
        try:
            promo_code_obj = await promo_code_service.validate_promo_code_for_use(
                request.promo_code, preliminary_price_details.full_total,
                request.equipment_ids, None
            )
            promo_message = "Промокод успешно применен!"
        except HTTPException as e:
            promo_message = e.detail

    final_price_details = await financial_service.calculate_final_price(
        request.equipment_ids, request.selected_accessories,
        request.start_date, request.end_date, promo_code_obj
    )

    day_count = await financial_service.get_rental_days(request.start_date, request.end_date)
    promo_discount = promo_code_obj.discount_percentage if promo_code_obj else 0
    
    # Получаем скидку за продолжительность
    duration_discount_percentage = await discount_service.get_duration_discount_percentage(day_count)

    return PriceCalculationResponse(
        day_count=day_count,
        full_total=final_price_details.full_total,
        final_total=final_price_details.final_total,
        discount_amount=final_price_details.discount_amount,
        duration_discount_percentage=duration_discount_percentage,
        promo_discount_percentage=promo_discount,
        promo_code_message=promo_message
    )