# shared/schemas/accessory_schema.py

from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class AccessoryBase(BaseModel):
    name: str
    accessory_type: Optional[str] = "Прочее"
    price: Optional[float] = 0.0
    description: Optional[str] = None

class AccessoryCreate(AccessoryBase):
    pass

class AccessoryUpdate(AccessoryBase):
    pass

class AccessoryOut(AccessoryBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class AccessoryListResponse(BaseModel):
    items: List[AccessoryOut]
    total: int