# api/services/promo_code_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from api.models.promo_code import PromoCode
from api.models.user import User
from .promo_code import PromoCodeBusinessLogic


class PromoCodeService:
    """Сервис для работы с промокодами"""
    
    def __init__(self, db: AsyncSession, business_logic: PromoCodeBusinessLogic):
        self.db = db
        self.business_logic = business_logic

    async def validate_promo_code_for_use(
            self,
            code: str,
            order_amount: float,
            equipment_ids: List[int],
            user: Optional[User]
    ) -> PromoCode:
        """
        Централизованная функция для полной серверной валидации промокода.
        Возвращает объект PromoCode в случае успеха или выбрасывает HTTPException.
        
        Эта функция является фасадом для новой архитектуры промокодов.
        """
        return await self.business_logic.validate_and_get_promo_code(code, order_amount, equipment_ids, user)