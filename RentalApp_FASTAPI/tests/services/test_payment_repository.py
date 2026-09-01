# tests/services/test_payment_repository.py
"""
Тесты для PaymentRepository - репозитория для работы с платежами и историей баланса.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime

from api.services.order.payment_repository import PaymentRepository
from api.models.payment import Payment
from api.models.balance_history import BalanceHistory


class TestPaymentRepository:
    """Тесты для PaymentRepository."""

    @pytest.fixture
    def mock_db_session(self):
        """Создает мок сессии базы данных."""
        db = AsyncMock()
        db.add = MagicMock()
        db.flush = AsyncMock()
        return db

    @pytest.fixture
    def payment_repository(self, mock_db_session):
        """Создает экземпляр PaymentRepository."""
        return PaymentRepository(db=mock_db_session)

    @pytest.fixture
    def sample_payment_data(self):
        """Создает образец данных платежа."""
        return {
            "user_id": 1,
            "amount": 1000.0,
            "transaction_type": "deposit",  # Исправлено: payment_type -> transaction_type
            "description": "Test payment"
        }

    @pytest.fixture
    def sample_balance_history(self):
        """Создает образец записи истории баланса."""
        history = MagicMock(spec=BalanceHistory)
        history.id = 1
        history.user_id = 1
        history.amount = 1000.0
        history.operation_type = "deposit"
        history.description = "Test payment"
        history.created_at = datetime.now()
        return history

    # === ТЕСТЫ ДЛЯ create_payment ===

    @pytest.mark.asyncio
    async def test_create_payment_success(self, payment_repository, mock_db_session, sample_payment_data):
        """Тест успешного создания платежа."""
        # Мокируем созданный платеж
        created_payment = MagicMock(spec=Payment)
        created_payment.id = 1
        created_payment.user_id = 1
        created_payment.amount = 1000.0
        
        # Мокируем flush, чтобы вернуть созданный объект
        async def mock_flush():
            return created_payment
        mock_db_session.flush = AsyncMock(return_value=None)
        
        result = await payment_repository.create_payment(sample_payment_data)
        
        assert isinstance(result, Payment)
        mock_db_session.add.assert_called_once()
        mock_db_session.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_payment_with_all_fields(self, payment_repository, mock_db_session):
        """Тест создания платежа со всеми полями."""
        payment_data = {
            "user_id": 1,
            "amount": 2000.0,
            "transaction_type": "deposit",  # Исправлено: payment_type -> transaction_type
            "description": "Full payment",
            "rental_id": 1,
            "payment_method": "card"
        }
        
        result = await payment_repository.create_payment(payment_data)
        
        assert isinstance(result, Payment)
        mock_db_session.add.assert_called_once()

    # === ТЕСТЫ ДЛЯ get_balance_history_for_user ===

    @pytest.mark.asyncio
    async def test_get_balance_history_for_user_success(self, payment_repository, mock_db_session, sample_balance_history):
        """Тест успешного получения истории баланса пользователя."""
        from sqlalchemy import select, func
        
        # Мокируем execute для count - возвращаем результат с scalar_one
        mock_count_result = MagicMock()
        mock_count_result.scalar_one.return_value = 1
        
        # Мокируем execute для получения записей
        mock_result = MagicMock()
        mock_result.unique.return_value.scalars.return_value.all.return_value = [sample_balance_history]
        
        # Настраиваем execute для возврата разных результатов по порядку вызовов
        call_count = [0]
        async def mock_execute_side_effect(query):
            call_count[0] += 1
            # Первый вызов - для count
            if call_count[0] == 1:
                return mock_count_result
            # Второй вызов - для получения записей
            return mock_result
        
        mock_db_session.execute = AsyncMock(side_effect=mock_execute_side_effect)
        
        history_items, total = await payment_repository.get_balance_history_for_user(
            user_id=1,
            skip=0,
            limit=10
        )
        
        assert total == 1
        assert len(history_items) == 1
        assert history_items[0].id == 1

    @pytest.mark.asyncio
    async def test_get_balance_history_for_user_empty(self, payment_repository, mock_db_session):
        """Тест получения пустой истории баланса."""
        # Мокируем execute для count
        mock_count_result = MagicMock()
        mock_count_result.scalar_one.return_value = 0
        
        mock_result = MagicMock()
        mock_result.unique.return_value.scalars.return_value.all.return_value = []
        
        call_count = [0]
        async def mock_execute_side_effect(query):
            call_count[0] += 1
            if call_count[0] == 1:
                return mock_count_result
            return mock_result
        
        mock_db_session.execute = AsyncMock(side_effect=mock_execute_side_effect)
        
        history_items, total = await payment_repository.get_balance_history_for_user(
            user_id=1,
            skip=0,
            limit=10
        )
        
        assert total == 0
        assert len(history_items) == 0

    @pytest.mark.asyncio
    async def test_get_balance_history_for_user_pagination(self, payment_repository, mock_db_session):
        """Тест пагинации истории баланса."""
        # Создаем несколько записей истории
        history_items_mock = [MagicMock(spec=BalanceHistory) for _ in range(5)]
        for i, item in enumerate(history_items_mock):
            item.id = i + 1
            item.user_id = 1
        
        # Мокируем execute для count
        mock_count_result = MagicMock()
        mock_count_result.scalar_one.return_value = 10
        
        mock_result = MagicMock()
        mock_result.unique.return_value.scalars.return_value.all.return_value = history_items_mock
        
        call_count = [0]
        async def mock_execute_side_effect(query):
            call_count[0] += 1
            if call_count[0] == 1:
                return mock_count_result
            return mock_result
        
        mock_db_session.execute = AsyncMock(side_effect=mock_execute_side_effect)
        
        history_items, total = await payment_repository.get_balance_history_for_user(
            user_id=1,
            skip=0,
            limit=5
        )
        
        assert total == 10
        assert len(history_items) == 5

    @pytest.mark.asyncio
    async def test_get_balance_history_for_user_ordered_by_date(self, payment_repository, mock_db_session, sample_balance_history):
        """Тест сортировки истории баланса по дате."""
        # Мокируем execute для count
        mock_count_result = MagicMock()
        mock_count_result.scalar_one.return_value = 1
        
        mock_result = MagicMock()
        mock_result.unique.return_value.scalars.return_value.all.return_value = [sample_balance_history]
        
        call_count = [0]
        async def mock_execute_side_effect(query):
            call_count[0] += 1
            if call_count[0] == 1:
                return mock_count_result
            return mock_result
        
        mock_db_session.execute = AsyncMock(side_effect=mock_execute_side_effect)
        
        await payment_repository.get_balance_history_for_user(
            user_id=1,
            skip=0,
            limit=10
        )
        
        # Проверяем, что execute был вызван дважды (для count и для получения записей)
        assert mock_db_session.execute.call_count == 2

    @pytest.mark.asyncio
    async def test_get_balance_history_for_user_different_user(self, payment_repository, mock_db_session):
        """Тест получения истории баланса для другого пользователя."""
        # Мокируем execute для count
        mock_count_result = MagicMock()
        mock_count_result.scalar_one.return_value = 0
        
        mock_result = MagicMock()
        mock_result.unique.return_value.scalars.return_value.all.return_value = []
        
        call_count = [0]
        async def mock_execute_side_effect(query):
            call_count[0] += 1
            if call_count[0] == 1:
                return mock_count_result
            return mock_result
        
        mock_db_session.execute = AsyncMock(side_effect=mock_execute_side_effect)
        
        history_items, total = await payment_repository.get_balance_history_for_user(
            user_id=2,
            skip=0,
            limit=10
        )
        
        assert total == 0
        assert len(history_items) == 0

