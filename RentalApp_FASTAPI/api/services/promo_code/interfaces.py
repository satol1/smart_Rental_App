# api/services/promo_code/interfaces.py

from abc import ABC, abstractmethod
from typing import Optional, List
from sqlalchemy.orm import Session

from api.models.promo_code import PromoCode
from api.models.user import User
from shared.schemas.promo_code_schema import PromoCodeCreate, PromoCodeUpdate, PromoCodeValidateResponse


class IPromoCodeValidator(ABC):
    """Интерфейс для валидатора промокодов"""
    
    @abstractmethod
    def validate_complete(self, code: str, order_amount: float, equipment_ids: List[int], user: Optional[User]) -> PromoCode:
        """Выполняет полную валидацию промокода"""
        pass


class IPromoCodeManager(ABC):
    """Интерфейс для менеджера промокодов"""
    
    @abstractmethod
    def create_promo_code(self, promo_data: PromoCodeCreate, creator: User) -> PromoCode:
        """Создает новый промокод"""
        pass
    
    @abstractmethod
    def get_all_promo_codes(self) -> List[PromoCode]:
        """Получает все промокоды"""
        pass
    
    @abstractmethod
    def get_promo_code_by_id(self, promo_code_id: int) -> Optional[PromoCode]:
        """Получает промокод по ID"""
        pass
    
    @abstractmethod
    def update_promo_code(self, promo_code_id: int, update_data: PromoCodeUpdate) -> PromoCode:
        """Обновляет промокод"""
        pass
    
    @abstractmethod
    def delete_promo_code(self, promo_code_id: int) -> None:
        """Удаляет промокод"""
        pass
    
    @abstractmethod
    def generate_unique_code(self) -> str:
        """Генерирует уникальный код"""
        pass


class IPromoCodeBusinessLogic(ABC):
    """Интерфейс для бизнес-логики промокодов"""
    
    @abstractmethod
    def validate_and_get_promo_code(self, code: str, order_amount: float, equipment_ids: List[int], user: Optional[User]) -> PromoCode:
        """Валидирует промокод и возвращает его"""
        pass
    
    @abstractmethod
    def create_validation_response(self, promo_code: PromoCode) -> PromoCodeValidateResponse:
        """Создает ответ для валидации"""
        pass
    
    @abstractmethod
    def record_promo_code_usage(self, promo_code: PromoCode, user: Optional[User]) -> None:
        """Записывает использование промокода"""
        pass
    
    @abstractmethod
    def calculate_discount_amount(self, base_amount: float, promo_code: PromoCode) -> float:
        """Рассчитывает сумму скидки"""
        pass
    
    @abstractmethod
    def validate_combined_discount(self, duration_discount: float, promo_discount: float) -> float:
        """Валидирует комбинированную скидку"""
        pass 