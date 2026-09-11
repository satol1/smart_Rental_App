# api/calendar_api.py

from fastapi import APIRouter, Query, Depends, HTTPException
from datetime import date, timedelta
from typing import List, Optional
import logging

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.services.availability import AvailabilityService
from api.models.user import User as ApiUser

from shared.schemas.calendar_schema import (
    EquipmentDayStatusesResponse,
    CalendarEventListResponse,
    PublicOrderDetailsResponse,
    EquipmentStatusListResponse,
)

# Импортируем зависимости из отдельного модуля
from api.dependencies import get_current_user_optional
from api.permissions import require_user
from api.services.calendar_service import CalendarService
from api.services.calendar_view_service import CalendarViewService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar", tags=["Календарь"])


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])


@router.get("/view", response_model=EquipmentStatusListResponse)
@inject
async def get_calendar_view(
        start_date: date = Query(..., alias="start"),
        end_date: date = Query(..., alias="end"),
        equipment_ids: List[int] = Query(None, alias="ids"),
        exclude_reservation_id: Optional[int] = Query(None, alias="exclude_reservation_id"),
        calendar_view_service: CalendarViewService = Depends(Provide[Container.calendar_view_service])
):
    """Возвращает статусы оборудования за период (сборка ответа — в CalendarViewService)."""
    return await calendar_view_service.get_equipment_status_list(
        start_date=start_date,
        end_date=end_date,
        equipment_ids=equipment_ids,
        exclude_reservation_id=exclude_reservation_id,
    )


@router.get("/day-statuses", response_model=EquipmentDayStatusesResponse)
@inject
async def get_calendar_day_statuses(
        start_date: date = Query(..., alias="start"),
        end_date: date = Query(..., alias="end"),
        equipment_ids: List[int] = Query(None, alias="ids"),
        exclude_reservation_id: Optional[int] = Query(None, alias="exclude_reservation_id"),
        current_user: Optional[ApiUser] = Depends(get_current_user_optional),
        availability_service: AvailabilityService = Depends(Provide[Container.availability_service]),
        calendar_view_service: CalendarViewService = Depends(Provide[Container.calendar_view_service])
):
    logger.info(f"Запрос статусов для {len(equipment_ids) if equipment_ids else 'всего'} ед. оборудования с {start_date} по {end_date}")

    try:
        if start_date == end_date:
            end_date = end_date + timedelta(days=1)
            logger.debug(f"Конечная дата скорректирована: {end_date}")

        equipment_ids = await calendar_view_service.resolve_equipment_ids(equipment_ids)
        logger.debug(f"Получены ID оборудования: {equipment_ids}")
        
        if not equipment_ids:
            logger.info("Список оборудования пуст, возвращаем пустой результат")
            return {"equipment_day_statuses": {}}

        current_user_id: Optional[int] = current_user.id if current_user else None
        logger.debug(f"ID текущего пользователя: {current_user_id}")

        # Создаем новый экземпляр AvailabilityService для каждого запроса
        logger.info(f"Вызываем availability_service.get_daily_statuses для {len(equipment_ids)} ед. оборудования")
        statuses = await availability_service.get_daily_statuses(
            equipment_ids=equipment_ids,
            start_date=start_date,
            end_date=end_date,
            exclude_reservation_id=exclude_reservation_id,
            current_user_id=current_user_id
        )

        logger.info(f"Успешно получены статусы для {len(statuses)} ед. оборудования.")
        return {"equipment_day_statuses": statuses}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Критическая ошибка в get_calendar_day_statuses: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера при получении статусов календаря.")


@router.get("/events", response_model=CalendarEventListResponse)
@inject
async def get_calendar_events(
        start: date = Query(..., alias="start"),
        end: date = Query(..., alias="end"),
        equipment_ids: List[int] = Query(None, alias="ids"),
        skip: int = Query(0, ge=0, description="Сколько записей пропустить"),
        limit: int = Query(10, ge=1, le=100, description="Максимальное количество записей на странице"),
        current_user: ApiUser = Depends(require_user),
        availability_service: AvailabilityService = Depends(Provide[Container.availability_service]),
        calendar_view_service: CalendarViewService = Depends(Provide[Container.calendar_view_service])
):
    # События содержат данные о заказах клиентов: только для авторизованных,
    # ФИО в заголовке — только для менеджеров и админов.
    include_client_name = current_user.role in ("manager", "admin")

    equipment_ids = await calendar_view_service.resolve_equipment_ids(equipment_ids)

    events = await availability_service.get_calendar_events(
        equipment_ids=equipment_ids,
        start_date=start,
        end_date=end,
        include_client_name=include_client_name,
    )

    total_events = len(events)
    paginated_events = events[skip:skip + limit]

    return CalendarEventListResponse(
        items=paginated_events,
        total=total_events
    )


@router.get("/order-details/{order_type}/{order_id}", response_model=PublicOrderDetailsResponse)
@inject
async def get_order_details(
        order_type: str,
        order_id: int,
        calendar_service: CalendarService = Depends(Provide[Container.calendar_service]),
        current_user: Optional[ApiUser] = Depends(get_current_user_optional)
):
    """
    Получает детали заказа (резерв или аренда) с учетом прав доступа.
    Для неавторизованных пользователей возвращает только публичные данные.
    """
    return await calendar_service.get_order_details(order_type, order_id, current_user)