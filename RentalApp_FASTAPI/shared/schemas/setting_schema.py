# shared/schemas/setting_schema.py
from pydantic import BaseModel, ConfigDict
from typing import List

class SettingOut(BaseModel):
    key: str
    value: str
    model_config = ConfigDict(from_attributes=True)

class SettingUpdate(BaseModel):
    key: str
    value: str
