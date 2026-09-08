# api/services/promo_code/promo_code_validator.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from api.repositories.promo_code_repository import PromoCodeRepository
    from api.repositories.equipment_repository import EquipmentRepository
from datetime import datetime, timezone

from api.models.promo_code import PromoCode, promo_code_usages, promo_code_equipment_association, PromoCodeApplicableType
from api.models.user import User
from api.models.equipment import Equipment
from .exceptions import (
    PromoCodeNotFoundError, PromoCodeInactiveError, PromoCodeNotStartedError,
    PromoCodeExpiredError, PromoCodeUsageLimitExceededError, PromoCodeMinOrderAmountError,
    PromoCodeInvalidEquipmentError, PromoCodeInvalidEquipmentTypeError,
    PromoCodePersonalCodeForbiddenError, PromoCodeUserUsageLimitError
)
from .interfaces import IPromoCodeValidator


class PromoCodeValidator(IPromoCodeValidator):
    """Валидатор промокодов с разделением ответственности по типам проверок"""
    
    def __init__(self, db: AsyncSession, promo_code_repo: 'PromoCodeRepository', equipment_repo: 'EquipmentRepository'):
        self.db = db
        self.promo_code_repo = promo_code_repo
        self.equipment_repo = equipment_repo
    
    async def validate_basic_existence(self, code: str) -> PromoCode:
        """Проверяет существование промокода"""
        promo_code = await self.promo_code_repo.get_by_code(code)
        if not promo_code:
            raise PromoCodeNotFoundError()
        return promo_code
    
    def validate_status_and_dates(self, promo_code: PromoCode) -> None:
        """Проверяет активность и сроки действия промокода"""
        if not promo_code.is_active:
            raise PromoCodeInactiveError()
        
        now_utc = datetime.now(timezone.utc)
        
        if promo_code.valid_from and promo_code.valid_from > now_utc:
            raise PromoCodeNotStartedError()
        
        if promo_code.expires_at and promo_code.expires_at < now_utc:
            raise PromoCodeExpiredError()
    
    def validate_usage_limits(self, promo_code: PromoCode) -> None:
        """Проверяет лимиты использования промокода"""
        if promo_code.max_uses is not None and promo_code.times_used >= promo_code.max_uses:
            raise PromoCodeUsageLimitExceededError()
    
    def validate_order_amount(self, promo_code: PromoCode, order_amount: float) -> None:
        """Проверяет минимальную сумму заказа"""
        if promo_code.min_order_amount is not None and order_amount < promo_code.min_order_amount:
            raise PromoCodeMinOrderAmountError(promo_code.min_order_amount)
    
    async def validate_equipment_applicability(self, promo_code: PromoCode, equipment_ids: List[int]) -> None:
        """Проверяет применимость к оборудованию"""
        # Используем репозиторий для получения связанных данных
        applicable_equipment_ids = await self.promo_code_repo.get_applicable_equipment_ids(promo_code.id)
        
        if applicable_equipment_ids and not any(eid in equipment_ids for eid in applicable_equipment_ids):
            raise PromoCodeInvalidEquipmentError()
        
        # Проверка по типам оборудования
        applicable_types = await self.promo_code_repo.get_applicable_equipment_types(promo_code.id)
        
        if applicable_types:
            equipment_in_cart = await self.equipment_repo.get_by_ids(equipment_ids)
            equipment_types_in_cart = {eq.equipment_type for eq in equipment_in_cart}
            if not any(eq_type in equipment_types_in_cart for eq_type in applicable_types):
                raise PromoCodeInvalidEquipmentTypeError()
    
    async def validate_user_permissions(self, promo_code: PromoCode, user: Optional[User], skip_usage_limits: bool = False) -> None:
        """Проверяет права пользователя на использование промокода"""
        # Проверка персонального промокода
        if promo_code.specific_to_user_id:
            if not user or user.id != promo_code.specific_to_user_id:
                raise PromoCodePersonalCodeForbiddenError()

        # Проверка лимита использований на пользователя
        if promo_code.max_uses_per_user and user and not skip_usage_limits:
            user_uses_count = await self.promo_code_repo.get_user_usage_count(user.id, promo_code.id)
            if user_uses_count >= promo_code.max_uses_per_user:
                raise PromoCodeUserUsageLimitError()

    async def validate_complete(
        self,
        code: str,
        order_amount: float,
        equipment_ids: List[int],
        user: Optional[User],
        skip_usage_limits: bool = False
    ) -> PromoCode:
        """Выполняет полную валидацию промокода.

        skip_usage_limits=True — для перевалидации промокода, уже применённого
        к редактируемому заказу: его собственное использование записано в счётчиках,
        и повторная проверка лимитов отвергла бы его же самого.
        """
        promo_code = await self.validate_basic_existence(code)
        self.validate_status_and_dates(promo_code)
        if not skip_usage_limits:
            self.validate_usage_limits(promo_code)
        self.validate_order_amount(promo_code, order_amount)
        await self.validate_equipment_applicability(promo_code, equipment_ids)
        await self.validate_user_permissions(promo_code, user, skip_usage_limits=skip_usage_limits)

        return promo_code 