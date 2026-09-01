# api/services/promo_code/promo_code_manager.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import secrets

from api.models.promo_code import PromoCode
from api.models.user import User
from api.repositories.promo_code_repository import PromoCodeRepository
from shared.schemas.promo_code_schema import PromoCodeCreate, PromoCodeUpdate
from .exceptions import (
    PromoCodeExistsError, PromoCodeEquipmentNotFoundError, 
    PromoCodeNotFoundError, PromoCodeDiscountLimitError
)
from .constants import DISCOUNT_LIMITS
from .interfaces import IPromoCodeManager


class PromoCodeManager(IPromoCodeManager):
    """Менеджер для CRUD операций с промокодами"""
    
    def __init__(self, db: AsyncSession, promo_code_repo: PromoCodeRepository):
        self.db = db
        self.promo_code_repo = promo_code_repo
    
    async def create_promo_code(self, promo_data: PromoCodeCreate, creator: User) -> PromoCode:
        """Создает новый промокод"""
        # Проверка лимитов скидки по роли
        self._validate_discount_limit(creator.role, promo_data.discount_percentage)
        
        # Проверка уникальности кода
        existing_promo = await self.promo_code_repo.get_by_code(promo_data.code)
        if existing_promo:
            raise PromoCodeExistsError()
        
        # Создание промокода через репозиторий
        try:
            new_promo_code = await self.promo_code_repo.create_with_relations(promo_data, creator.id)
            return new_promo_code
        except ValueError as e:
            if "оборудования не найдены" in str(e):
                raise PromoCodeEquipmentNotFoundError()
            raise
    
    async def get_all_promo_codes(self) -> List[PromoCode]:
        """Получает все промокоды с загрузкой связанных данных"""
        return await self.promo_code_repo.get_all_with_creator()
    
    async def get_promo_code_by_id(self, promo_code_id: int) -> Optional[PromoCode]:
        """Получает промокод по ID"""
        return await self.promo_code_repo.get_by_id_with_creator(promo_code_id)
    
    async def update_promo_code(self, promo_code_id: int, update_data: PromoCodeUpdate) -> PromoCode:
        """Обновляет существующий промокод"""
        try:
            updated_promo = await self.promo_code_repo.update_with_relations(promo_code_id, update_data)
            if not updated_promo:
                raise PromoCodeNotFoundError()
            return updated_promo
        except ValueError as e:
            if "оборудования не найдены" in str(e):
                raise PromoCodeEquipmentNotFoundError()
            raise
    
    async def delete_promo_code(self, promo_code_id: int) -> None:
        """Удаляет промокод"""
        promo_code = await self.promo_code_repo.get_by_id(promo_code_id)
        if not promo_code:
            raise PromoCodeNotFoundError()
        
        await self.promo_code_repo.delete(promo_code_id)
    
    async def generate_unique_code(self) -> str:
        """Генерирует уникальный код промокода"""
        while True:
            code = f"SALE-{secrets.token_hex(3).upper()}"
            existing_code = await self.promo_code_repo.get_by_code(code)
            if not existing_code:
                return code
    
    def _validate_discount_limit(self, role: str, discount_percentage: float) -> None:
        """Проверяет лимит скидки для роли пользователя"""
        if role in DISCOUNT_LIMITS and discount_percentage > DISCOUNT_LIMITS[role]:
            raise PromoCodeDiscountLimitError(role) 