# shared/schemas/calendar_schema.py

from datetime import date
from typing import Optional, Dict, Union, List
from pydantic import BaseModel, ConfigDict # ❗️ Импортируем ConfigDict


class EquipmentStatusResponse(BaseModel):
    equipment_id: int
    status: str
    details: str
    name: str | None = None
    equipment_type: str | None = None
    brand: str | None = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    # ❗️ ИЗМЕНЕНИЕ: Config заменен на model_config, orm_mode на from_attributes
    model_config = ConfigDict(from_attributes=True)


class DayStatusItem(BaseModel):
    status: str
    group_id: Optional[str] = None
    is_user_reservation: bool = False
    user_id: Optional[int] = None
    order_type: Optional[str] = None


class EquipmentDayStatusesResponse(BaseModel):
    equipment_day_statuses: Dict[int, Dict[str, Union[str, DayStatusItem]]]


class CalendarEventResponse(BaseModel):
    id: str
    title: str
    start: str
    end: str
    resourceId: int
    status: str


class EquipmentStatusListResponse(BaseModel):
    items: List[EquipmentStatusResponse]
    total: int


class CalendarEventListResponse(BaseModel):
    items: List[CalendarEventResponse]
    total: int


# Схемы для публичных данных календаря
class PublicOrderDetails(BaseModel):
    """Минимальные публичные данные о заказе для неавторизованных пользователей"""
    id: int
    order_type: str  # "reservation" или "rental"
    equipment_id: Optional[int] = None  # Может быть None для заказов без оборудования
    start_date: date
    end_date: date
    status: str
    equipment_name: Optional[str] = None
    equipment_type: Optional[str] = None
    equipment_brand: Optional[str] = None


class PublicOrderDetailsResponse(BaseModel):
    """Ответ с данными о заказе (публичными или расширенными в зависимости от прав доступа)"""
    order: Union['AdminReservationOut', 'AdminRentalOut', PublicOrderDetails]
    is_owner: bool = False
    has_extended_access: bool = False


# Импорты для forward references
from .reservation_schema import AdminReservationOut
from .rental_schema import RentalOut as AdminRentalOut