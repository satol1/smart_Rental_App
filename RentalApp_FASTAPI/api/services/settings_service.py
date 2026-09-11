# api/services/settings_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from api.models.setting import Setting
from shared.schemas.setting_schema import SettingUpdate
from api.services.order.system_repository import SystemService

class SettingsService:
    def __init__(self, db: AsyncSession, system_service: SystemService):
        self.db = db
        self.system_service = system_service

    async def get_all_settings(self) -> List[Setting]:
        return await self.system_service.get_all_settings()

    async def update_settings(self, settings_data: List[SettingUpdate]):
        if not settings_data:
            return
        
        settings_dict = [s.model_dump() for s in settings_data]
        await self.system_service.upsert_settings(settings_dict)
        # Транзакцию держит DIContainerMiddleware: здесь только flush,
        # чтобы настройки были видны в текущей сессии до конца запроса.
        await self.db.flush()
