# shared/schemas/brand_system_schema.py

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List

class BrandSystemBase(BaseModel):
    """Базовая схема для Системы Бренда."""
    name: str = Field(..., min_length=2, max_length=100, description="Имя системы, видимое пользователю (напр. Canon)")
    description: Optional[str] = Field(None, description="Внутреннее описание для администратора")

class BrandSystemCreate(BrandSystemBase):
    """Схема для создания Системы Бренда с привязкой оборудования."""
    equipment_ids: List[int] = Field([], description="Список ID оборудования для явной привязки")

class BrandSystemUpdate(BaseModel):
    """Схема для обновления Системы Бренда. Все поля опциональны."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    equipment_ids: Optional[List[int]] = None

class BrandSystemOut(BrandSystemBase):
    """Схема для вывода данных из API."""
    id: int
    # Используем свойство equipment_ids из модели, которое будет вычислено
    equipment_ids: List[int] = Field(default_factory=list, description="Список ID явно привязанного оборудования")

    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def from_orm_with_equipment_ids(cls, obj):
        """Создает экземпляр схемы с правильным equipment_ids."""
        data = {
            "id": obj.id,
            "name": obj.name,
            "description": obj.description,
            "equipment_ids": [eq.id for eq in obj.equipment] if obj.equipment else []
        }
        return cls(**data)

class BrandSystemSimple(BaseModel):
    """Упрощенная схема для систем брендов в фильтрах."""
    id: int
    name: str
    
    model_config = ConfigDict(from_attributes=True)

class BrandSystemListResponse(BaseModel):
    """Схема для ответа со списком систем и пагинацией."""
    items: List[BrandSystemOut]
    total: int