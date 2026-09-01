# api/settings_api.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.permissions import require_admin
from api.services.settings_service import SettingsService
from shared.schemas.setting_schema import SettingOut, SettingUpdate
# Удален импорт get_db_session


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

router = APIRouter(prefix="/admin/settings", tags=["Настройки"])

# Dependency providers
@router.get("/", response_model=List[SettingOut])
@inject
async def get_settings(
    _=Depends(require_admin),
    service: SettingsService = Depends(Provide[Container.settings_service])
):
    return await service.get_all_settings()

@router.put("/", status_code=204)
@inject
async def update_settings(
    settings_in: List[SettingUpdate], 
    _=Depends(require_admin),
    service: SettingsService = Depends(Provide[Container.settings_service])
):
    await service.update_settings(settings_in)
    return None
