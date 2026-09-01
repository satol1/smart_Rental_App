# shared/schemas/holiday_schema.py

from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from typing import Literal, List

class HolidayBase(BaseModel):
    """Базовая схема для выходного дня."""
    date: date
    description: str | None = None

class HolidayCreate(HolidayBase):
    """Схема для создания нового выходного дня."""
    force: bool = False

class HolidayOut(HolidayBase):
    """Схема для отображения данных о выходном дне из БД."""
    created_at: datetime | None = None
    created_by_id: int

    model_config = ConfigDict(from_attributes=True)

# +++ НАЧАЛО: НОВЫЕ СХЕМЫ +++
class RecurringHolidayRuleCreate(BaseModel):
    """Схема для создания правила еженедельных выходных."""
    day_of_week: int = Field(..., ge=0, le=6, description="День недели (0=Понедельник, 6=Воскресенье)")
    start_date: date
    end_date: date
    description: str

class HolidayRuleOut(BaseModel):
    """Схема для отображения правил в админке."""
    id: int
    rule_type: str
    description: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HolidayListResponse(BaseModel):
    items: List[HolidayOut]
    total: int


class HolidayRuleListResponse(BaseModel):
    items: List[HolidayRuleOut]
    total: int
# +++ КОНЕЦ: НОВЫЕ СХЕМЫ +++