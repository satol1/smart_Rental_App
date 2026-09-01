# shared/schemas/association_schema.py

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List

# Базовая схема с общими полями
class AssociationBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100, description="Название ассоциации")
    description: Optional[str] = Field(None, description="Внутреннее описание")
    sort_order: int = Field(0, description="Индекс для сортировки")

# Схема для создания новой ассоциации
class AssociationCreate(AssociationBase):
    equipment_ids: List[int] = Field([], description="Список ID связанного оборудования")

# Схема для обновления существующей ассоциации
class AssociationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = None
    sort_order: Optional[int] = None
    equipment_ids: Optional[List[int]] = None

# Схема для вывода данных из API.
# Самое важное: она включает `equipment_ids` для работы фильтра на фронтенде.
class AssociationOut(AssociationBase):
    id: int
    equipment_ids: List[int]

    model_config = ConfigDict(from_attributes=True)

# +++ ВОССТАНОВИТЬ ЭТОТ КЛАСС +++
# Эта схема нужна для отображения информации об ассоциации внутри схемы оборудования.
class AssociationSimple(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class AssociationListResponse(BaseModel):
    items: List[AssociationOut]
    total: int
