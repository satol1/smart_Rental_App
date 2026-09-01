# shared/schemas/discount_schema.py

from pydantic import BaseModel, ConfigDict, Field
from typing import List

class DiscountBase(BaseModel):
    min_days: int = Field(..., gt=0, description="Минимальное количество дней для применения скидки")
    discount_percentage: int = Field(..., gt=0, le=100, description="Процент скидки")

class DiscountCreate(DiscountBase):
    pass

class DiscountUpdate(DiscountBase):
    pass

class DiscountOut(DiscountBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class DiscountListResponse(BaseModel):
    items: List[DiscountOut]
    total: int