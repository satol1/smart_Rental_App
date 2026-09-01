# shared/schemas/pack_schema.py

from __future__ import annotations
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime, date

if TYPE_CHECKING:
    from .equipment_schema import EquipmentOut

# Упрощенная схема оборудования для пачек (без связанных данных)
class EquipmentSimple(BaseModel):
    id: int
    equipment_type: str
    brand: str
    name: str
    serial_number: Optional[str] = None
    condition: str
    daily_rate: float
    notes: Optional[str] = None
    description: Optional[str] = None
    last_maintenance: Optional[date] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None
    short_description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PackBase(BaseModel):
    name: str
    description: Optional[str] = None


class PackCreate(PackBase):
    equipment_ids: List[int]

    @field_validator('equipment_ids')
    @classmethod
    def validate_equipment_ids(cls, v):
        if not v:
            raise ValueError('Список оборудования не может быть пустым')
        return v


class PackUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    equipment_ids: Optional[List[int]] = None

    @field_validator('equipment_ids')
    @classmethod
    def validate_equipment_ids(cls, v):
        # В обновлении разрешаем пустой список для очистки пачки
        return v


class PackOut(PackBase):
    id: int
    equipment: List[EquipmentSimple] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicPackOut(BaseModel):
    """Схема для публичного каталога - содержит все необходимые рассчитанные поля."""
    id: int
    entity_type: str = "pack"  # Поле-дискриминатор для фронтенда
    name: str
    equipment_type: str
    brand: str
    image_url: Optional[str] = None  # URL картинки первого элемента пачки
    total_count: int
    available_count: int
    min_daily_rate: float
    cheapest_available_id: Optional[int] = None
    equipment_ids: List[int] = []  # Список ID всего оборудования в пачке

    model_config = ConfigDict(from_attributes=True)
