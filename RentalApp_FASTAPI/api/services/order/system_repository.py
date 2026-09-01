# api/services/order/system_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from typing import List, Optional
import logging

from api.models.holiday import Holiday
from api.models.promo_code import PromoCode
from api.models.setting import Setting
from api.repositories.system_repository import SystemRepository

logger = logging.getLogger(__name__)

class SystemService:
    """
    Сервис для работы с системными данными (праздники, промокоды, настройки).
    Теперь использует SystemRepository для доступа к данным.
    """
    
    def __init__(self, system_repo: SystemRepository):
        self.system_repo = system_repo

    # --- Методы для работы с праздниками ---
    
    async def is_holiday(self, check_date: date) -> bool:
        """Проверяет, является ли дата праздником."""
        return await self.system_repo.is_holiday(check_date)

    async def get_holidays_in_date_range(self, start_date: date, end_date: date) -> List[Holiday]:
        """Получает все праздники в указанном диапазоне дат."""
        return await self.system_repo.get_holidays_in_date_range(start_date, end_date)

    async def count_holidays_in_date_range(self, start_date: date, end_date: date) -> int:
        """Подсчитывает количество праздников в указанном диапазоне дат."""
        return await self.system_repo.count_holidays_in_date_range(start_date, end_date)

    # --- Методы для работы с промокодами ---
    
    async def get_promo_code_by_name(self, code: str) -> Optional[PromoCode]:
        """Получает промокод по названию."""
        return await self.system_repo.get_promo_code_by_name(code)

    async def get_promo_code_by_id(self, promo_code_id: int) -> Optional[PromoCode]:
        """Получает промокод по ID."""
        return await self.system_repo.get_promo_code_by_id(promo_code_id)

    # --- Методы для работы с настройками ---
    
    async def get_all_settings(self) -> List[Setting]:
        """Получает все настройки системы."""
        return await self.system_repo.get_all_settings()

    async def upsert_settings(self, settings_data: List[dict]):
        """Обновляет или создает настройки (UPSERT операция)."""
        await self.system_repo.upsert_settings(settings_data)
