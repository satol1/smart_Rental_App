# src/shared/schemas/balance_history_schema.py (НОВЫЙ ФАЙЛ)

from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional

class BalanceHistoryBase(BaseModel):
    amount: float
    operation_type: str
    description: Optional[str] = None
    created_at: datetime
    rental_id: Optional[int] = None

class BalanceHistoryOut(BalanceHistoryBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)

class BalanceHistoryListResponse(BaseModel):
    items: List[BalanceHistoryOut]
    total: int