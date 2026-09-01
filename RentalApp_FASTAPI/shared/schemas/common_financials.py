# shared/schemas/common_financials.py

from pydantic import BaseModel
from typing import Optional


class FinancialsBase(BaseModel):
    """
    Базовая схема для финансовых данных, общих для аренд и резервов.
    Содержит стандартные поля для стоимости, скидок и промокодов.
    """
    total_cost: float
    discount_amount: float = 0.0
    promo_code: Optional[str] = None
    final_cost: Optional[float] = None
    accessories_cost: float = 0.0
    remaining_amount: float = 0.0
