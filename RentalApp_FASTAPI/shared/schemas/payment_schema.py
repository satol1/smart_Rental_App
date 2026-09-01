# shared/schemas/payment_schema.py

from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class PaymentBase(BaseModel):
    amount: float
    payment_method: str
    description: Optional[str] = None
    rental_id: Optional[int] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None

class PaymentOut(PaymentBase):
    id: int
    user_id: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

