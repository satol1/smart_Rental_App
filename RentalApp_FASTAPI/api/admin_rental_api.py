# api/admin_rental_api.py

from fastapi import APIRouter, Depends, Query, Response, status
from api.csrf import validate_csrf_dependency

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.permissions import require_manager, require_admin
from api.models.user import User
from api.services.rental.rental_query_service import RentalQueryService
from api.services.order.rental_service import RentalLifecycleService
from shared.schemas.rental_schema import (
    RentalOut, RentalListResponse, RentalCreateFromReservationRequest,
    RentalReturnRequest, RentalCreateFromScratchRequest,
    AdminRentalUpdate, RentalRevertRequest
)


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

router = APIRouter(prefix="/admin/rentals", tags=["Администрирование Аренд"])

# Dependency providers
@router.get("/", response_model=RentalListResponse)
@inject
async def get_all_rentals(
        current_user: User = Depends(require_manager),
        query_service: RentalQueryService = Depends(Provide[Container.rental_query_service]),
        status: str = Query(None, description="Фильтр по статусу: active, overdue, completed"),
        search: str = Query(None, description="Поиск по имени или email клиента"),
        period_type: str = Query(None, alias="periodType", description="Тип периода: week, month, quarter, year"),
        period_offset: int = Query(0, alias="periodOffset", description="Смещение периода (0 = текущий, -1 = предыдущий)"),
        skip: int = Query(0, ge=0),
        limit: int = Query(10, ge=1, le=100)
):
    """Получить список всех аренд с фильтрацией и пагинацией."""
    rentals_out, total = await query_service.get_paginated_rentals(
        skip, limit, status, search, period_type, period_offset
    )
    return RentalListResponse(
        items=rentals_out,
        total=total
    )


@router.post("/", response_model=RentalOut)
@inject
async def create_rental_from_scratch(
        request: RentalCreateFromScratchRequest,
        current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency),
        service: RentalLifecycleService = Depends(Provide[Container.rental_lifecycle_service]),
        query_service: RentalQueryService = Depends(Provide[Container.rental_query_service])
):
    """Создать новую аренду без предварительного резерва."""
    new_rental_orm = await service.create_rental_from_scratch(request, current_user)
    # Обогащаем данные перед отправкой клиенту
    enriched_rental = await query_service._enrich_rental_with_dynamic_fields(new_rental_orm)
    return enriched_rental


@router.put("/{rental_id}", response_model=RentalOut)
@inject
async def update_rental_details(
        rental_id: int,
        request: AdminRentalUpdate,
        current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency),
        service: RentalLifecycleService = Depends(Provide[Container.rental_lifecycle_service]),
        query_service: RentalQueryService = Depends(Provide[Container.rental_query_service])
):
    """Обновить детали существующей аренды."""
    updated_rental_orm = await service.update_rental_details_by_admin(rental_id, request, current_user)
    # Обогащаем данные перед отправкой клиенту
    enriched_rental = await query_service._enrich_rental_with_dynamic_fields(updated_rental_orm)
    return enriched_rental


@router.post("/from-reservation/{reservation_id}", response_model=RentalOut)
@inject
async def convert_reservation_to_rental(
        reservation_id: int,
        request: RentalCreateFromReservationRequest,
        current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency),
        service: RentalLifecycleService = Depends(Provide[Container.rental_lifecycle_service]),
        query_service: RentalQueryService = Depends(Provide[Container.rental_query_service])
):
    """Конвертировать резерв в аренду."""
    new_rental_orm = await service.convert_reservation_to_rental(reservation_id, request, current_user)
    # Обогащаем данные перед отправкой клиенту
    enriched_rental = await query_service._enrich_rental_with_dynamic_fields(new_rental_orm)
    return enriched_rental


@router.post("/{rental_id}/return", response_model=RentalOut)
@inject
async def return_rental(
        rental_id: int,
        request: RentalReturnRequest,
        current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency),
        service: RentalLifecycleService = Depends(Provide[Container.rental_lifecycle_service]),
        query_service: RentalQueryService = Depends(Provide[Container.rental_query_service])
):
    """Оформить возврат аренды."""
    returned_rental_orm = await service.return_rental(rental_id, request, current_user)
    # Обогащаем данные перед отправкой клиенту
    enriched_rental = await query_service._enrich_rental_with_dynamic_fields(returned_rental_orm)
    return enriched_rental


@router.post("/{rental_id}/revert-to-reservation", status_code=status.HTTP_204_NO_CONTENT)
@inject
async def revert_rental_to_reservation(
        rental_id: int,
        request: RentalRevertRequest,
        current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency),
        service: RentalLifecycleService = Depends(Provide[Container.rental_lifecycle_service])
):
    """
    Отменить выдачу аренды и вернуть ее в статус резерва.
    Доступно только в день создания аренды.
    Позволяет опционально вернуть внесенный аванс.
    """
    await service.revert_rental_to_reservation(rental_id, current_user, request)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{rental_id}", status_code=204)
@inject
async def delete_rental_by_admin(
        rental_id: int,
        current_user: User = Depends(require_admin),
        _csrf: None = Depends(validate_csrf_dependency),
        service: RentalLifecycleService = Depends(Provide[Container.rental_lifecycle_service])
):
    """Удалить аренду (только для администраторов)."""
    await service.delete_rental_by_admin(rental_id)
    return None