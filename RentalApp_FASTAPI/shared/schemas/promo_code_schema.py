# shared/schemas/promo_code_schema.py
from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import Optional, List
from datetime import datetime

# --- Схемы для администрирования ---

class PromoCodeBase(BaseModel):
    code: str = Field(..., description="Уникальный код, например, 'SUMMER20'", max_length=50)
    description: Optional[str] = Field(None, description="Описание для внутреннего использования")
    discount_percentage: float = Field(..., gt=0, le=50, description="Процент скидки (1-50)")
    is_active: bool = True
    valid_from: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = Field(None, gt=0, description="Общий лимит использований")
    max_uses_per_user: Optional[int] = Field(None, gt=0, description="Лимит на одного пользователя")
    min_order_amount: Optional[float] = Field(None, gt=0, description="Минимальная сумма заказа")
    specific_to_user_id: Optional[int] = None
    applicable_to_equipment_ids: Optional[List[int]] = None
    applicable_to_equipment_types: Optional[List[str]] = None

class PromoCodeCreate(PromoCodeBase):
    pass

class PromoCodeUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    discount_percentage: Optional[float] = Field(None, gt=0, le=50)
    is_active: Optional[bool] = None
    valid_from: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = Field(None, gt=0)
    max_uses_per_user: Optional[int] = Field(None, gt=0)
    min_order_amount: Optional[float] = Field(None, gt=0)
    specific_to_user_id: Optional[int] = None
    applicable_to_equipment_ids: Optional[List[int]] = None
    applicable_to_equipment_types: Optional[List[str]] = None

class PromoCodeOut(PromoCodeBase):
    id: int
    times_used: int
    created_at: datetime
    created_by_id: int
    # creator_email: Optional[EmailStr] = None # Для удобства отображения в админке

    model_config = ConfigDict(from_attributes=True)

    # Убираем кастомный from_orm - используем стандартную сериализацию
    # creator_email будет заполняться через property в модели или в репозитории

# --- Схемы для публичной валидации ---

class PromoCodeValidateRequest(BaseModel):
    code: str
    # Эти поля нужны для проверки условий промокода
    order_amount: float
    equipment_ids: List[int]

class PromoCodeValidateResponse(BaseModel):
    code: str
    discount_percentage: float
    message: str


class PromoCodeListResponse(BaseModel):
    items: List[PromoCodeOut]
    total: int