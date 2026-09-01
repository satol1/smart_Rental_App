# api/repositories/balance_history_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from api.models.balance_history import BalanceHistory
from .base_repository import BaseRepository

class BalanceHistoryRepository(BaseRepository[BalanceHistory, None, None]):
    """Репозиторий для работы с историей баланса."""
    def __init__(self, db: AsyncSession):
        super().__init__(db, model=BalanceHistory)
    
    async def get_user_balance_sum(self, user_id: int) -> float:
        """Получает сумму всех транзакций пользователя."""
        result = await self.db.execute(
            select(func.sum(BalanceHistory.amount)).where(BalanceHistory.user_id == user_id)
        )
        return float(result.scalar_one_or_none() or 0.0)
