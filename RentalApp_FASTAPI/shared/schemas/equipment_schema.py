# shared/schemas/equipment_schema.py

from __future__ import annotations
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List, Union
from datetime import date, datetime # ✅ ИЗМЕНЕНИЕ: импортируем date вместо datetime
# ✅ ДОБАВЛЕН ИМПОРТ
from .accessory_schema import AccessoryOut
from .association_schema import AssociationSimple
from .brand_system_schema import BrandSystemSimple
from .pack_schema import PublicPackOut


class EquipmentCreate(BaseModel):
    equipment_type: str
    brand: str
    name: str
    serial_number: Optional[str] = None
    condition: Optional[str] = "Великолепно"
    daily_rate: Optional[float] = 0.0
    notes: Optional[str] = None
    description: Optional[str] = None
    # ✅ ИЗМЕНЕНИЕ: Тип поля изменен с datetime на date
    last_maintenance: Optional[date] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None
    short_description: Optional[str] = None


class EquipmentCreateOut(BaseModel):
    """Схема для ответа при создании оборудования (без связей)"""
    id: int
    entity_type: str = "equipment"
    equipment_type: str
    brand: str
    name: str
    serial_number: Optional[str] = None
    condition: str
    daily_rate: float
    notes: Optional[str] = None
    description: Optional[str] = None
    # ✅ ИЗМЕНЕНИЕ: Тип поля изменен с datetime на date
    last_maintenance: Optional[date] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None
    short_description: Optional[str] = None

    @field_validator('last_maintenance', mode='before')
    @classmethod
    def validate_last_maintenance(cls, v):
        """Валидатор для поля last_maintenance - обеспечивает корректный формат даты."""
        if v is None:
            return None
        if isinstance(v, str):
            try:
                # Пытаемся преобразовать строку в дату
                return datetime.fromisoformat(v.replace('Z', '+00:00')).date()
            except (ValueError, AttributeError):
                # Если не удается преобразовать, возвращаем None
                return None
        if isinstance(v, datetime):
            return v.date()
        return v

    model_config = ConfigDict(from_attributes=True)


class EquipmentOut(BaseModel):
    id: int
    entity_type: str = "equipment"  # ✅ ДОБАВЛЯЕМ entity_type для консистентности
    equipment_type: str
    brand: str
    name: str
    serial_number: Optional[str] = None
    condition: str
    daily_rate: float
    notes: Optional[str] = None
    description: Optional[str] = None
    # ✅ ИЗМЕНЕНИЕ: Тип поля изменен с datetime на date
    last_maintenance: Optional[date] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None
    short_description: Optional[str] = None
    # ✅ ДОБАВЛЕНО ПОЛЕ ДЛЯ ОТОБРАЖЕНИЯ ПРИВЯЗАННЫХ АКСЕССУАРОВ
    accessories: Optional[List[AccessoryOut]] = None
    # ✅ ДОБАВЛЕНО ПОЛЕ ДЛЯ ОТОБРАЖЕНИЯ ПРИВЯЗАННЫХ АССОЦИАЦИЙ
    associations: Optional[List[AssociationSimple]] = None

    @field_validator('last_maintenance', mode='before')
    @classmethod
    def validate_last_maintenance(cls, v):
        """Валидатор для поля last_maintenance - обеспечивает корректный формат даты."""
        if v is None:
            return None
        if isinstance(v, str):
            try:
                # Пытаемся преобразовать строку в дату
                return datetime.fromisoformat(v.replace('Z', '+00:00')).date()
            except (ValueError, AttributeError):
                # Если не удается преобразовать, возвращаем None
                return None
        if isinstance(v, datetime):
            return v.date()
        return v

    model_config = ConfigDict(from_attributes=True)


class EquipmentUpdateExtended(BaseModel):
    equipment_type: Optional[str] = None
    brand: Optional[str] = None
    name: Optional[str] = None
    serial_number: Optional[str] = None
    condition: Optional[str] = None
    daily_rate: Optional[float] = None
    notes: Optional[str] = None
    description: Optional[str] = None
    # ✅ Это поле уже было правильным (date), оставляем как есть
    last_maintenance: Optional[date] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None
    short_description: Optional[str] = None
    # ✅ ДОБАВЛЕНО ПОЛЕ ДЛЯ ПЕРЕДАЧИ ID АКСЕССУАРОВ ПРИ ОБНОВЛЕНИИ
    accessory_ids: Optional[List[int]] = None
    # ✅ ДОБАВЛЕНО ПОЛЕ ДЛЯ ПЕРЕДАЧИ ID АССОЦИАЦИЙ ПРИ ОБНОВЛЕНИИ
    association_ids: Optional[List[int]] = None

    model_config = ConfigDict(from_attributes=True)


class EquipmentTreeItem(BaseModel):
    label: str
    value: Optional[int] = None
    children: List[EquipmentTreeItem] = []
    model_config = ConfigDict(from_attributes=True)


class EquipmentAvailabilityStatus(BaseModel):
    has_active_reservations: bool
    has_active_rentals: bool
    active_reservations_count: int
    active_rentals_count: int
    model_config = ConfigDict(from_attributes=True)


class AvailableFilters(BaseModel):
    types: List[str]
    brands: List[BrandSystemSimple]
    associations: List[AssociationSimple]
    model_config = ConfigDict(from_attributes=True)


# ✅ СОЗДАЕМ Union-тип для элементов каталога
CatalogItem = Union[PublicPackOut, EquipmentOut]


class EquipmentListResponse(BaseModel):
    items: List[CatalogItem]  # ✅ Теперь здесь единый список
    # поле packs больше не нужно, так как они теперь внутри items
    total: int
    availableFilters: AvailableFilters


class EquipmentCopyRequest(BaseModel):
    """Схема для запроса копирования оборудования"""
    # Поля, которые можно изменить при копировании
    name: Optional[str] = None
    serial_number: Optional[str] = None
    notes: Optional[str] = None
    # Остальные поля копируются как есть
    
    model_config = ConfigDict(from_attributes=True)


class EquipmentTreeListResponse(BaseModel):
    items: List[EquipmentTreeItem]
    total: int