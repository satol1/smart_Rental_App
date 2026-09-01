# shared/schemas/rental_schema.py

from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import date, datetime
from typing import List, Optional, Dict

from .user_schema import UserOut
from .equipment_schema import EquipmentOut
from .accessory_schema import AccessoryOut
from .common_financials import FinancialsBase

class RentalBase(BaseModel):
    start_date: date
    end_date: date
    deposit_amount: float = 0.0
    notes_on_issue: Optional[str] = None
    status: str

class RentalAccessoryDetail(BaseModel):
    equipment_id: int
    accessory: AccessoryOut
    model_config = ConfigDict(from_attributes=True)

class RentalOut(RentalBase, FinancialsBase):
    id: int
    user_id: int
    created_by_id: int
    reservation_id: Optional[int] = None
    actual_return_date: Optional[date] = None
    prepayment_amount: float = 0.0
    notes_on_return: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user: UserOut
    created_by: UserOut
    equipment: List[EquipmentOut]

    # Используем имя поля 'accessory_links' как в модели SQLAlchemy
    # чтобы избежать несоответствий при передаче данных.
    accessory_links: List[RentalAccessoryDetail] = []

    # Динамически вычисляемые поля
    days_remaining: Optional[int] = None
    overdue_days: Optional[int] = None
    overdue_surcharge: Optional[float] = None

    # Убираем populate_by_name, так как alias больше не используется
    model_config = ConfigDict(from_attributes=True)

    @field_validator('start_date', 'end_date', 'actual_return_date', mode='before')
    @classmethod
    def convert_datetime_to_date(cls, v):
        if isinstance(v, datetime):
            return v.date()
        return v

class RentalListResponse(BaseModel):
    items: List[RentalOut]
    total: int

# --- Схемы для запросов ---

class RentalCreateFromReservationRequest(BaseModel):
    """Схема для создания аренды из резерва."""
    notes_on_issue: Optional[str] = None
    deposit_amount: float = Field(0.0, ge=0)
    prepayment_amount: float = Field(0.0, ge=0)
    force_issue_on_holiday: bool = Field(False, description="Подтверждение выдачи в выходной день")

class RentalCreateFromScratchRequest(BaseModel):
    """Схема для создания аренды "с нуля"."""
    user_id: int
    equipment_ids: List[int] = Field(..., min_length=1)
    start_date: date
    end_date: date
    selected_accessories: Optional[Dict[int, List[int]]] = None
    promo_code: Optional[str] = None
    deposit_amount: float = Field(0.0, ge=0)
    prepayment_amount: float = Field(0.0, ge=0)  # Добавлено для консистентности
    notes_on_issue: Optional[str] = None
    force_issue_on_holiday: bool = Field(False, description="Подтверждение выдачи в выходной день")

class AdminRentalUpdate(BaseModel):
    """Схема для обновления аренды администратором."""
    # Поля для активных аренд (active, overdue)
    end_date: Optional[date] = None
    prepayment_amount: Optional[float] = Field(None, ge=0)
    promo_code: Optional[str] = None
    
    # Поля для завершенных аренд (completed)
    actual_return_date: Optional[date] = None
    status: Optional[str] = None
    final_cost: Optional[float] = Field(None, ge=0)
    notes_on_return: Optional[str] = None
    
    # Общие поля
    deposit_amount: Optional[float] = Field(None, ge=0)
    notes_on_issue: Optional[str] = None

class RentalReturnRequest(BaseModel):
    """Схема для оформления возврата."""
    actual_return_date: date
    notes_on_return: Optional[str] = None
    accessories_returned_confirmation: bool = Field(..., description="Подтверждение, что все аксессуары возвращены")
    # Удаляем поля payment_amount и payment_description, так как платеж обрабатывается отдельно

    @classmethod
    def today(cls):
        return cls(actual_return_date=date.today())

class RentalRevertRequest(BaseModel):
    """Схема для запроса на отмену выдачи аренды."""
    refund_prepayment: bool = Field(
        False, 
        description="Флаг, указывающий, нужно ли возвращать (списывать) внесенный аванс с баланса клиента."
    )