# api/admin_reservation_api.py

from fastapi import APIRouter, Depends, Query, HTTPException, Response, status, Body
import logging

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.permissions import require_manager
from api.models.user import User
from api.services.order.reservation_service import ReservationLifecycleService
from api.services.reservation_query_service import ReservationQueryService
from shared.schemas.reservation_schema import (
    AdminReservationCreateRequest,
    ReservationResponse,
    ReservationUpdateRequest,
    AdminReservationListResponse,
    ReservationBulkDeleteRequest,
    AdminReservationOut
)
from shared.schemas.rental_schema import (
    RentalCreateFromReservationRequest,
    RentalOut
)
from api.services.order.rental_service import RentalLifecycleService
from api.services.rental.rental_query_service import RentalQueryService
from fastapi_csrf_protect import CsrfProtect


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

router = APIRouter(prefix="/admin/reservations", tags=["Администрирование Резервов"])

# Dependency providers
logger = logging.getLogger(__name__)


@router.post("/delete-many", status_code=status.HTTP_204_NO_CONTENT)
@inject
async def delete_multiple_reservations(
        request: ReservationBulkDeleteRequest = Body(...),
        _current_user: User = Depends(require_manager),
        _csrf_protect: CsrfProtect = Depends(),
        service: ReservationLifecycleService = Depends(Provide[Container.reservation_lifecycle_service])
):
    """Массово удалить резервы по их ID."""
    try:
        await service.bulk_cancel_admin_reservations(request.reservation_ids)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        logger.error(f"Error during bulk deletion service call: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка сервера при удалении резервов."
        )

@router.get("/", response_model=AdminReservationListResponse)
@inject
async def get_all_reservations(
        _current_user: User = Depends(require_manager),
        query_service: ReservationQueryService = Depends(Provide[Container.reservation_query_service]),
        status: str = Query(None, description="Фильтр по статусу резерва ('active' или 'completed')"),
        search: str = Query(None, description="Поиск по имени или email пользователя"),
        period_type: str = Query(None, alias="periodType", description="Тип периода: week, month, quarter, year"),
        period_offset: int = Query(0, alias="periodOffset", description="Смещение периода (0 = текущий, -1 = предыдущий)"),
        skip: int = Query(0, ge=0, description="Сколько записей пропустить"),
        limit: int = Query(10, ge=1, le=100, description="Максимальное количество записей на странице")
):
    """Получить все резервы с информацией о пользователях с пагинацией."""
    total_reservations = await query_service.get_admin_reservations_count(
        status=status, 
        search_query=search,
        period_type=period_type,
        period_offset=period_offset
    )
    paginated_reservations = await query_service.get_paginated_admin_reservations(
        skip=skip,
        limit=limit,
        status=status,
        search_query=search,
        period_type=period_type,
        period_offset=period_offset
    )
    return AdminReservationListResponse(
        items=paginated_reservations,
        total=total_reservations
    )

@router.post("/", response_model=ReservationResponse)
@inject
async def create_reservation_for_user(
        request: AdminReservationCreateRequest,
        _current_user: User = Depends(require_manager),
        _csrf_protect: CsrfProtect = Depends(),
        service: ReservationLifecycleService = Depends(Provide[Container.reservation_lifecycle_service])
):
    """Создать резерв для конкретного пользователя."""
    new_reservation = await service.create_admin_reservation(request)
    return ReservationResponse(reservation_id=new_reservation.id, message="Резерв успешно создан")

# --- ✅ ГЛАВНОЕ ИЗМЕНЕНИЕ ЗДЕСЬ ---
@router.put("/{reservation_id}", response_model=AdminReservationOut)
@inject
async def update_any_reservation(
        reservation_id: int,
        data: ReservationUpdateRequest,
        _current_user: User = Depends(require_manager),
        _csrf_protect: CsrfProtect = Depends(),
        service: ReservationLifecycleService = Depends(Provide[Container.reservation_lifecycle_service])
):
    """Обновить любой резерв по его ID."""
    # 1. Выполняем команду обновления. Сервис возвращает ПОЛНОСТЬЮ обновленный
    #    объект ORM со всеми загруженными связями (user, equipment и т.д.).
    updated_reservation_orm = await service.update_admin_reservation(reservation_id, data)

    # 2. Просто возвращаем этот объект. FastAPI, благодаря `response_model=AdminReservationOut`
    #    и `from_attributes=True` в схеме, сам корректно преобразует его в нужный JSON,
    #    включая все вложенные объекты, такие как `user_info`.
    return updated_reservation_orm
# --- КОНЕЦ ИЗМЕНЕНИЙ ---

@router.delete("/{reservation_id}", status_code=204)
@inject
async def delete_any_reservation(
        reservation_id: int,
        _current_user: User = Depends(require_manager),
        _csrf_protect: CsrfProtect = Depends(),
        service: ReservationLifecycleService = Depends(Provide[Container.reservation_lifecycle_service])
):
    """Удалить любой резерв по его ID."""
    await service.cancel_admin_reservation(reservation_id)
    return None


@router.post("/{reservation_id}/convert-to-rental", response_model=RentalOut)
@inject
async def convert_reservation_to_rental(
        reservation_id: int,
        request: RentalCreateFromReservationRequest,
        current_user: User = Depends(require_manager),
        _csrf_protect: CsrfProtect = Depends(),
        rental_service: RentalLifecycleService = Depends(Provide[Container.rental_lifecycle_service]),
        query_service: RentalQueryService = Depends(Provide[Container.rental_query_service])
):
    """Конвертировать резерв в аренду."""
    new_rental_orm = await rental_service.convert_reservation_to_rental(reservation_id, request, current_user)
    # Обогащаем данные перед отправкой клиенту
    enriched_rental = await query_service._enrich_rental_with_dynamic_fields(new_rental_orm)
    return enriched_rental