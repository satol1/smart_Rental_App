# shared/schemas/reservation_schema.py

from pydantic import BaseModel, ConfigDict, Field
from datetime import date
from typing import List, Optional, Dict, Literal

from .user_schema import UserOut
from .accessory_schema import AccessoryOut
from .common_financials import FinancialsBase


class ReservationAccessoryDetail(BaseModel):
    equipment_id: int
    accessory: AccessoryOut
    model_config = ConfigDict(from_attributes=True)


class ReservationCreateRequest(BaseModel):
    equipment_ids: List[int]
    start_date: date
    end_date: date
    selected_accessories: Optional[Dict[int, List[int]]] = None
    promo_code: Optional[str] = None

class ReservationUpdateRequest(BaseModel):
    equipment_ids: List[int]
    start_date: date
    end_date: date
    selected_accessories: Optional[Dict[int, List[int]]] = None
    promo_code: Optional[str] = None
    confirm_date_adjustment: bool = False

class ReservationResponse(BaseModel):
    # Обязательные поля (обратная совместимость)
    reservation_id: int
    message: str
    
    # Дополнительные поля (опциональные для обратной совместимости)
    user_id: Optional[int] = None
    status: Optional[str] = None
    total_cost: Optional[float] = None
    discount_amount: Optional[float] = None
    equipment_count: Optional[int] = None
    accessory_count: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class ReservationItem(FinancialsBase):
    id: int
    user_id: int
    equipment_ids: List[int]
    start_date: date
    end_date: date
    status: Literal['active', 'fulfilled', 'cancelled', 'overdue']
    accessory_links: List[ReservationAccessoryDetail] = []
    rental_id: Optional[int] = Field(None, validation_alias='rental.id')

    model_config = ConfigDict(from_attributes=True)


class AdminReservationOut(ReservationItem):
    user_info: UserOut
    model_config = ConfigDict(from_attributes=True)

class AdminReservationCreateRequest(ReservationCreateRequest):
    user_id: int

class AdminReservationListResponse(BaseModel):
    items: List[AdminReservationOut]
    total: int

class ReservationListResponse(BaseModel):
    items: List[ReservationItem]
    total: int

class PriceCalculationRequest(BaseModel):
    equipment_ids: List[int]
    start_date: date
    end_date: date
    selected_accessories: Optional[Dict[int, List[int]]] = None
    promo_code: Optional[str] = None

class PriceCalculationResponse(BaseModel):
    day_count: int
    full_total: float
    final_total: float
    discount_amount: float
    duration_discount_percentage: int
    promo_discount_percentage: float
    promo_code_message: Optional[str] = None

class ReservationBulkDeleteRequest(BaseModel):
    """Схема для запроса на массовое удаление резервов."""
    reservation_ids: List[int]