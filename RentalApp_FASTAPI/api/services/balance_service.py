# api/services/balance_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
import logging

from api.models.balance_history import BalanceHistory
from api.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)

class BalanceService:
    def __init__(self, db: AsyncSession, user_repo: UserRepository):
        self.db = db
        self.user_repo = user_repo

    async def add_transaction(
            self,
            user_id: int,
            amount: float,
            operation_type: str,
            description: str,
            rental_id: int | None = None
    ) -> BalanceHistory:
        """
        Добавляет транзакцию в сессию, создавая запись в истории и обновляя баланс пользователя.
        Amount: положительное число для начисления, отрицательное для списания.
        Управление транзакцией (commit/rollback) остается за вызывающим сервисом.
        """
        # Используем репозиторий для получения пользователя с блокировкой
        user = await self.user_repo.get_by_id_for_update(user_id)
        if not user:
            # Если пользователь заблокирован другим запросом, пробуем без блокировки
            user = await self.user_repo.get_by_id(user_id)
            if not user:
                logger.error(f"Попытка провести транзакцию для несуществующего пользователя ID={user_id}")
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден.")
            else:
                logger.warning(f"Пользователь ID={user_id} заблокирован другим запросом, используем без блокировки")

        # 1. Создаем запись в истории
        new_history_entry = BalanceHistory(
            user_id=user_id,
            amount=amount,
            operation_type=operation_type,
            description=description,
            rental_id=rental_id
        )
        self.db.add(new_history_entry)

        # 2. Атомарно обновляем кэшированное значение баланса
        user.balance += amount

        logger.info(f"Транзакция для пользователя ID={user_id} на сумму {amount} ({operation_type}) добавлена в сессию. Новый баланс: {user.balance}")
        return new_history_entry

    async def get_balance_for_user(self, user_id: int) -> float:
        """Возвращает текущий баланс пользователя."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден.")
        return user.balance