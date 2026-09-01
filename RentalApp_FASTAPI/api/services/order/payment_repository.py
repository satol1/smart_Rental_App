# api/services/order/payment_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Tuple
import logging

from api.models.payment import Payment

logger = logging.getLogger(__name__)

class PaymentRepository:
    """
    Репозиторий для работы с платежами и историей баланса.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_payment(self, payment_data: dict) -> Payment:
        """Создает новый платеж."""
        payment = Payment(**payment_data)
        self.db.add(payment)
        await self.db.flush()
        return payment

    async def get_balance_history_for_user(self, user_id: int, skip: int, limit: int) -> Tuple[List, int]:
        """Получает историю баланса пользователя с пагинацией."""
        from api.models.balance_history import BalanceHistory
        
        # Получаем общее количество записей
        count_result = await self.db.execute(
            select(func.count(BalanceHistory.id)).filter(BalanceHistory.user_id == user_id)
        )
        total = count_result.scalar_one() or 0
        
        # Получаем записи с пагинацией
        history_result = await self.db.execute(
            select(BalanceHistory)
            .filter(BalanceHistory.user_id == user_id)
            .order_by(BalanceHistory.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        history_items = history_result.unique().scalars().all()
        
        return history_items, total
