# api/services/promo_code/promo_code_business_logic.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from datetime import datetime, timezone

from api.models.promo_code import PromoCode, promo_code_usages
from api.models.user import User
from shared.schemas.promo_code_schema import PromoCodeValidateResponse
from .promo_code_validator import PromoCodeValidator
from .constants import MAX_COMBINED_DISCOUNT
from .interfaces import IPromoCodeBusinessLogic


class PromoCodeBusinessLogic(IPromoCodeBusinessLogic):
    """Бизнес-логика для работы с промокодами"""
    
    def __init__(self, db: AsyncSession, validator: PromoCodeValidator, promo_code_repo: 'PromoCodeRepository'):
        self.db = db
        self.validator = validator
        self.promo_code_repo = promo_code_repo
    
    async def validate_and_get_promo_code(
        self,
        code: str,
        order_amount: float,
        equipment_ids: List[int],
        user: Optional[User],
        skip_usage_limits: bool = False
    ) -> PromoCode:
        """
        Валидирует промокод и возвращает его объект.
        Основной метод для валидации промокодов.

        skip_usage_limits=True — при перевалидации промокода, уже применённого
        к редактируемому/конвертируемому заказу (его использование уже учтено).
        """
        return await self.validator.validate_complete(
            code, order_amount, equipment_ids, user, skip_usage_limits=skip_usage_limits
        )
    
    def create_validation_response(self, promo_code: PromoCode) -> PromoCodeValidateResponse:
        """Создает ответ для валидации промокода"""
        return PromoCodeValidateResponse(
            code=promo_code.code,
            discount_percentage=promo_code.discount_percentage,
            message="Промокод успешно применен!"
        )
    
    async def record_promo_code_usage(self, promo_code: PromoCode, user: Optional[User]) -> None:
        """
        Записывает использование промокода пользователем.
        Увеличивает счетчик использований.

        Вызывается в той же транзакции, что и создание заказа (коммитит middleware).
        """
        from .exceptions import PromoCodeUsageLimitExceededError

        incremented = await self.promo_code_repo.increment_usage_counter(promo_code.id)
        if not incremented:
            # Лимит исчерпан между валидацией и записью (параллельный заказ)
            raise PromoCodeUsageLimitExceededError()

        if user:
            await self.promo_code_repo.record_promo_code_usage(
                user.id,
                promo_code.id,
                datetime.now(timezone.utc)
            )

    async def release_promo_code_usage(self, promo_code_id: int, user_id: Optional[int]) -> None:
        """
        Освобождает использование промокода при отмене резерва/удалении аренды:
        уменьшает общий счетчик (не ниже нуля) и удаляет последнюю запись
        об использовании пользователем.
        """
        await self.promo_code_repo.decrement_usage_counter(promo_code_id)

        if user_id:
            await self.promo_code_repo.remove_latest_promo_code_usage(user_id, promo_code_id)
    
    def calculate_discount_amount(self, base_amount: float, promo_code: PromoCode) -> float:
        """Рассчитывает сумму скидки по промокоду"""
        return base_amount * (promo_code.discount_percentage / 100)
    
    def calculate_final_amount_with_promo(self, base_amount: float, promo_code: PromoCode) -> float:
        """Рассчитывает финальную сумму с учетом скидки по промокоду"""
        discount_amount = self.calculate_discount_amount(base_amount, promo_code)
        return base_amount - discount_amount
    
    def validate_combined_discount(self, duration_discount: float, promo_discount: float) -> float:
        """
        Проверяет и корректирует комбинированную скидку.
        Возвращает итоговый процент скидки.
        """
        total_discount = duration_discount + promo_discount
        if total_discount > MAX_COMBINED_DISCOUNT:
            return MAX_COMBINED_DISCOUNT
        return total_discount
    
    def get_promo_code_statistics(self, promo_code: PromoCode) -> dict:
        """Получает статистику использования промокода"""
        total_uses = promo_code.times_used
        max_uses = promo_code.max_uses
        usage_percentage = (total_uses / max_uses * 100) if max_uses and max_uses > 0 else None
        
        return {
            'total_uses': total_uses,
            'max_uses': max_uses,
            'usage_percentage': usage_percentage,
            'is_fully_used': bool(max_uses and total_uses >= max_uses),
            'remaining_uses': max_uses - total_uses if max_uses else None
        }
    
    def is_promo_code_expired(self, promo_code: PromoCode) -> bool:
        """Проверяет, истек ли срок действия промокода"""
        if not promo_code.expires_at:
            return False
        
        now_utc = datetime.now(timezone.utc)
        return promo_code.expires_at < now_utc
    
    def is_promo_code_active(self, promo_code: PromoCode) -> bool:
        """Проверяет, активен ли промокод (включая сроки действия)"""
        if not promo_code.is_active:
            return False
        
        now_utc = datetime.now(timezone.utc)
        
        # Проверка даты начала действия
        if promo_code.valid_from and promo_code.valid_from > now_utc:
            return False
        
        # Проверка даты окончания действия
        if promo_code.expires_at and promo_code.expires_at < now_utc:
            return False
        
        return True 