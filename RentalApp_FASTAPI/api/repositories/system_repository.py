# api/repositories/system_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date
from typing import List, Optional
import logging

from api.models.holiday import Holiday
from api.models.promo_code import PromoCode
from api.models.setting import Setting

logger = logging.getLogger(__name__)


class SystemRepository:
    """
    Репозиторий для работы с системными данными (праздники, промокоды, настройки).
    Инкапсулирует все SQL запросы для системных сущностей.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- Методы для работы с праздниками ---
    
    async def is_holiday(self, check_date: date) -> bool:
        """Проверяет, является ли дата праздником."""
        result = await self.db.execute(select(Holiday).filter(Holiday.date == check_date))
        return result.scalar_one_or_none() is not None

    async def get_holidays_in_date_range(self, start_date: date, end_date: date) -> List[Holiday]:
        """Получает все праздники в указанном диапазоне дат."""
        result = await self.db.execute(
            select(Holiday).filter(
                Holiday.date >= start_date,
                Holiday.date <= end_date
            )
        )
        return result.unique().scalars().all()

    async def count_holidays_in_date_range(self, start_date: date, end_date: date) -> int:
        """Подсчитывает количество праздников в указанном диапазоне дат."""
        result = await self.db.execute(
            select(func.count(Holiday.date)).filter(
                Holiday.date > start_date,
                Holiday.date < end_date
            )
        )
        return result.scalar_one() or 0

    # --- Методы для работы с промокодами ---
    
    async def get_promo_code_by_name(self, code: str) -> Optional[PromoCode]:
        """Получает промокод по названию."""
        result = await self.db.execute(select(PromoCode).filter(PromoCode.code == code))
        return result.unique().scalar_one_or_none()

    async def get_promo_code_by_id(self, promo_code_id: int) -> Optional[PromoCode]:
        """Получает промокод по ID."""
        result = await self.db.execute(select(PromoCode).filter(PromoCode.id == promo_code_id))
        return result.unique().scalar_one_or_none()

    # --- Методы для работы с настройками ---
    
    async def get_all_settings(self) -> List[Setting]:
        """Получает все настройки системы."""
        result = await self.db.execute(select(Setting))
        return result.unique().scalars().all()

    async def upsert_settings(self, settings_data: List[dict]):
        """Обновляет или создает настройки (UPSERT операция)."""
        from sqlalchemy.dialects.postgresql import insert
        
        if not settings_data:
            return
        
        insert_stmt = insert(Setting).values(settings_data)
        do_update_stmt = insert_stmt.on_conflict_do_update(
            index_elements=['key'],
            set_=dict(value=insert_stmt.excluded.value)
        )
        await self.db.execute(do_update_stmt)
        await self.db.flush()
