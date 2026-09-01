# tests/services/test_balance_service.py
"""
Тесты для BalanceService - второго по важности модуля управления балансом пользователей.
Тестирует все операции с балансом: начисление, списание, получение баланса.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException, status

from api.services.balance_service import BalanceService
from api.models.user import User
from api.models.balance_history import BalanceHistory


class TestBalanceService:
    """Тесты для BalanceService."""

    @pytest.fixture
    def balance_service(self, mock_db_session):
        """Создает экземпляр BalanceService с моком БД."""
        from api.repositories.user_repository import UserRepository
        mock_user_repo = MagicMock(spec=UserRepository)
        return BalanceService(mock_db_session, mock_user_repo)

    @pytest.fixture
    def mock_user_with_balance(self):
        """Создает мок пользователя с балансом."""
        user = MagicMock(spec=User)
        user.id = 1
        user.email = "test@example.com"
        user.balance = 1000.0
        user.is_active = True
        return user

    @pytest.fixture
    def mock_balance_history(self):
        """Создает мок записи истории баланса."""
        balance_history = MagicMock(spec=BalanceHistory)
        balance_history.id = 1
        balance_history.user_id = 1
        balance_history.amount = -100.0
        balance_history.operation_type = "rental_debit"
        balance_history.description = "Test transaction"
        balance_history.rental_id = 1
        return balance_history

    # === ТЕСТЫ ДЛЯ add_transaction ===

    @pytest.mark.asyncio
    async def test_add_transaction_positive_amount_credit(self, balance_service, mock_db_session, 
                                                         mock_user_with_balance, mock_balance_history):
        """
        Тест добавления транзакции с положительной суммой (начисление).
        """
        # Arrange
        user_id = 1
        amount = 500.0
        operation_type = "deposit"
        description = "Пополнение баланса"
        rental_id = None
        
        # Мокаем поиск пользователя с блокировкой через репозиторий
        balance_service.user_repo.get_by_id_for_update = AsyncMock(return_value=mock_user_with_balance)
        
        # Мокаем создание записи истории
        mock_db_session.add.return_value = None

        # Act
        result = await balance_service.add_transaction(
            user_id, amount, operation_type, description, rental_id
        )

        # Assert
        # Проверяем, что баланс пользователя увеличился
        assert mock_user_with_balance.balance == 1500.0  # 1000 + 500
        
        # Проверяем, что запись была добавлена в сессию
        mock_db_session.add.assert_called_once()
        added_record = mock_db_session.add.call_args[0][0]
        assert isinstance(added_record, BalanceHistory)
        assert added_record.user_id == user_id
        assert added_record.amount == amount
        assert added_record.operation_type == operation_type
        assert added_record.description == description
        assert added_record.rental_id == rental_id

    @pytest.mark.asyncio
    async def test_add_transaction_negative_amount_debit(self, balance_service, mock_db_session, 
                                                        mock_user_with_balance):
        """
        Тест добавления транзакции с отрицательной суммой (списание).
        """
        # Arrange
        user_id = 1
        amount = -200.0
        operation_type = "rental_debit"
        description = "Списание за аренду"
        rental_id = 123
        
        # Мокаем поиск пользователя с блокировкой через репозиторий
        balance_service.user_repo.get_by_id_for_update = AsyncMock(return_value=mock_user_with_balance)
        
        # Мокаем создание записи истории
        mock_db_session.add.return_value = None

        # Act
        result = await balance_service.add_transaction(
            user_id, amount, operation_type, description, rental_id
        )

        # Assert
        # Проверяем, что баланс пользователя уменьшился
        assert mock_user_with_balance.balance == 800.0  # 1000 - 200
        
        # Проверяем, что запись была добавлена в сессию
        mock_db_session.add.assert_called_once()
        added_record = mock_db_session.add.call_args[0][0]
        assert added_record.amount == amount
        assert added_record.rental_id == rental_id

    @pytest.mark.asyncio
    async def test_add_transaction_user_not_found(self, balance_service, mock_db_session):
        """
        Тест обработки случая, когда пользователь не найден.
        """
        # Arrange
        user_id = 999  # Несуществующий пользователь
        amount = 100.0
        operation_type = "deposit"
        description = "Пополнение баланса"
        
        # Мокаем пустой результат поиска пользователя через репозиторий
        balance_service.user_repo.get_by_id_for_update = AsyncMock(return_value=None)
        balance_service.user_repo.get_by_id = AsyncMock(return_value=None)

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await balance_service.add_transaction(
                user_id, amount, operation_type, description
            )
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Пользователь не найден" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_add_transaction_with_rental_id(self, balance_service, mock_db_session, 
                                                 mock_user_with_balance):
        """
        Тест добавления транзакции с привязкой к аренде.
        """
        # Arrange
        user_id = 1
        amount = -300.0
        operation_type = "rental_debit"
        description = "Списание за аренду #123"
        rental_id = 123
        
        # Мокаем поиск пользователя с блокировкой через репозиторий
        balance_service.user_repo.get_by_id_for_update = AsyncMock(return_value=mock_user_with_balance)
        
        # Мокаем создание записи истории
        mock_db_session.add.return_value = None

        # Act
        result = await balance_service.add_transaction(
            user_id, amount, operation_type, description, rental_id
        )

        # Assert
        # Проверяем, что запись была добавлена с правильным rental_id
        mock_db_session.add.assert_called_once()
        added_record = mock_db_session.add.call_args[0][0]
        assert added_record.rental_id == rental_id

    @pytest.mark.asyncio
    async def test_add_transaction_zero_amount(self, balance_service, mock_db_session, 
                                              mock_user_with_balance):
        """
        Тест добавления транзакции с нулевой суммой.
        """
        # Arrange
        user_id = 1
        amount = 0.0
        operation_type = "adjustment"
        description = "Корректировка баланса"
        
        # Мокаем поиск пользователя с блокировкой через репозиторий
        balance_service.user_repo.get_by_id_for_update = AsyncMock(return_value=mock_user_with_balance)
        
        # Мокаем создание записи истории
        mock_db_session.add.return_value = None

        # Act
        result = await balance_service.add_transaction(
            user_id, amount, operation_type, description
        )

        # Assert
        # Проверяем, что баланс не изменился
        assert mock_user_with_balance.balance == 1000.0
        
        # Проверяем, что запись все равно была добавлена
        mock_db_session.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_add_transaction_large_amount(self, balance_service, mock_db_session, 
                                               mock_user_with_balance):
        """
        Тест добавления транзакции с большой суммой.
        """
        # Arrange
        user_id = 1
        amount = 10000.0
        operation_type = "large_deposit"
        description = "Крупное пополнение"
        
        # Мокаем поиск пользователя с блокировкой через репозиторий
        balance_service.user_repo.get_by_id_for_update = AsyncMock(return_value=mock_user_with_balance)
        
        # Мокаем создание записи истории
        mock_db_session.add.return_value = None

        # Act
        result = await balance_service.add_transaction(
            user_id, amount, operation_type, description
        )

        # Assert
        # Проверяем, что баланс увеличился на большую сумму
        assert mock_user_with_balance.balance == 11000.0  # 1000 + 10000

    # === ТЕСТЫ ДЛЯ get_balance_for_user ===

    @pytest.mark.asyncio
    async def test_get_balance_for_user_success(self, balance_service, mock_db_session, 
                                               mock_user_with_balance):
        """
        Тест успешного получения баланса пользователя.
        """
        # Arrange
        user_id = 1
        expected_balance = 1000.0
        
        # Мокаем поиск пользователя через репозиторий
        balance_service.user_repo.get_by_id = AsyncMock(return_value=mock_user_with_balance)

        # Act
        balance = await balance_service.get_balance_for_user(user_id)

        # Assert
        assert balance == expected_balance

    @pytest.mark.asyncio
    async def test_get_balance_for_user_not_found(self, balance_service, mock_db_session):
        """
        Тест получения баланса несуществующего пользователя.
        """
        # Arrange
        user_id = 999  # Несуществующий пользователь
        
        # Мокаем пустой результат поиска пользователя через репозиторий
        balance_service.user_repo.get_by_id = AsyncMock(return_value=None)

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await balance_service.get_balance_for_user(user_id)
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Пользователь не найден" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_balance_for_user_zero_balance(self, balance_service, mock_db_session):
        """
        Тест получения баланса пользователя с нулевым балансом.
        """
        # Arrange
        user_id = 1
        
        # Создаем пользователя с нулевым балансом
        user_with_zero_balance = MagicMock(spec=User)
        user_with_zero_balance.id = 1
        user_with_zero_balance.balance = 0.0
        
        # Мокаем поиск пользователя через репозиторий
        balance_service.user_repo.get_by_id = AsyncMock(return_value=user_with_zero_balance)

        # Act
        balance = await balance_service.get_balance_for_user(user_id)

        # Assert
        assert balance == 0.0

    @pytest.mark.asyncio
    async def test_get_balance_for_user_negative_balance(self, balance_service, mock_db_session):
        """
        Тест получения баланса пользователя с отрицательным балансом (долг).
        """
        # Arrange
        user_id = 1
        
        # Создаем пользователя с отрицательным балансом
        user_with_debt = MagicMock(spec=User)
        user_with_debt.id = 1
        user_with_debt.balance = -500.0
        
        # Мокаем поиск пользователя через репозиторий
        balance_service.user_repo.get_by_id = AsyncMock(return_value=user_with_debt)

        # Act
        balance = await balance_service.get_balance_for_user(user_id)

        # Assert
        assert balance == -500.0

    # === ИНТЕГРАЦИОННЫЕ ТЕСТЫ ===

    @pytest.mark.asyncio
    async def test_multiple_transactions_sequence(self, balance_service, mock_db_session, 
                                                 mock_user_with_balance):
        """
        Тест последовательности нескольких транзакций.
        """
        # Arrange
        user_id = 1
        initial_balance = mock_user_with_balance.balance
        
        # Мокаем поиск пользователя с блокировкой через репозиторий
        balance_service.user_repo.get_by_id_for_update = AsyncMock(return_value=mock_user_with_balance)
        
        # Мокаем создание записей истории
        mock_db_session.add.return_value = None

        # Act - выполняем последовательность транзакций
        await balance_service.add_transaction(user_id, 500.0, "deposit", "Пополнение")
        await balance_service.add_transaction(user_id, -200.0, "rental_debit", "Аренда")
        await balance_service.add_transaction(user_id, -100.0, "service_fee", "Комиссия")

        # Assert
        expected_balance = initial_balance + 500.0 - 200.0 - 100.0
        assert mock_user_with_balance.balance == expected_balance
        
        # Проверяем, что все транзакции были добавлены
        assert mock_db_session.add.call_count == 3

    @pytest.mark.asyncio
    async def test_transaction_with_special_characters_in_description(self, balance_service, 
                                                                     mock_db_session, mock_user_with_balance):
        """
        Тест транзакции с особыми символами в описании.
        """
        # Arrange
        user_id = 1
        amount = 100.0
        operation_type = "special"
        description = "Транзакция с символами: !@#$%^&*()_+-=[]{}|;':\",./<>?"
        
        # Мокаем поиск пользователя с блокировкой через репозиторий
        balance_service.user_repo.get_by_id_for_update = AsyncMock(return_value=mock_user_with_balance)
        
        # Мокаем создание записи истории
        mock_db_session.add.return_value = None

        # Act
        result = await balance_service.add_transaction(
            user_id, amount, operation_type, description
        )

        # Assert
        # Проверяем, что транзакция прошла успешно
        mock_db_session.add.assert_called_once()
        added_record = mock_db_session.add.call_args[0][0]
        assert added_record.description == description
