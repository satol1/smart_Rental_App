# api/services/promo_code/factory.py

from sqlalchemy.ext.asyncio import AsyncSession
from .promo_code_validator import PromoCodeValidator
from .promo_code_manager import PromoCodeManager
from .promo_code_business_logic import PromoCodeBusinessLogic


class PromoCodeServiceFactory:
    """Фабрика для создания сервисов промокодов"""
    
    @staticmethod
    def create_validator(db: AsyncSession) -> PromoCodeValidator:
        """Создает валидатор промокодов"""
        return PromoCodeValidator(db)
    
    @staticmethod
    def create_manager(db: AsyncSession) -> PromoCodeManager:
        """Создает менеджер промокодов"""
        return PromoCodeManager(db)
    
    @staticmethod
    def create_business_logic(db: AsyncSession) -> PromoCodeBusinessLogic:
        """Создает бизнес-логику промокодов"""
        return PromoCodeBusinessLogic(db)
    
    @staticmethod
    def create_all_services(db: AsyncSession) -> tuple[PromoCodeValidator, PromoCodeManager, PromoCodeBusinessLogic]:
        """Создает все сервисы промокодов"""
        validator = PromoCodeValidator(db)
        manager = PromoCodeManager(db)
        business_logic = PromoCodeBusinessLogic(db)
        
        return validator, manager, business_logic 