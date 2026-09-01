# tests/services/test_user_service.py

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from fastapi import HTTPException

from api.services.user_service import UserService
from api.models.user import User
from api.models.payment import Payment
from api.models.balance_history import BalanceHistory
from shared.schemas.user_schema import AdminUserCreate, UserUpdate, UserPaymentRequest
from shared.constants.balance_operations import BalanceOperationType


class TestUserService:
    """Тесты для UserService."""

    @pytest.fixture
    def mock_db(self):
        """Создает мок базы данных."""
        db = AsyncMock()
        # Правильно мокируем async context manager
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=db)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        db.begin_nested = AsyncMock(return_value=mock_context)
        db.commit = AsyncMock()
        db.refresh = AsyncMock()
        return db

    @pytest.fixture
    def sample_admin_user_data(self):
        """Создает тестовые данные для создания админом."""
        return AdminUserCreate(
            full_name="Admin User",
            email="admin@example.com",
            password="AdminPassword123",
            phone="+1234567890",
            telegram_username="adminuser",
            role="manager",
            privacy_policy_accepted=True,
            terms_accepted=True
        )

    @pytest.fixture
    def sample_user(self):
        """Создает тестового пользователя."""
        # Создаем реальный объект User вместо мока для Pydantic валидации
        from api.models.user import User
        user = User()
        user.id = 1
        user.full_name = "Test User"
        user.email = "test@example.com"
        user.phone = "+1234567890"
        user.telegram_username = "testuser"
        user.role = "user"
        user.is_active = True
        user.status = "Активный"
        user.balance = 1000.0
        user.notes = "Test user"
        user.privacy_policy_accepted = True
        user.terms_accepted = True
        user.email_verified = True
        user.created_at = datetime.now()
        user.updated_at = datetime.now()
        return user

    @pytest.fixture
    def sample_user_update(self):
        """Создает тестовые данные для обновления пользователя."""
        return UserUpdate(
            full_name="Updated User",
            phone="+0987654321",
            telegram_username="updateduser"
        )

    @pytest.fixture
    def sample_payment_request(self):
        """Создает тестовый запрос на платеж."""
        return UserPaymentRequest(
            amount=500.0,
            payment_method="card",
            description="Test payment"
        )

    @pytest.fixture
    def user_service(self, mock_db):
        """Создает экземпляр UserService с моками."""
        mock_repo = AsyncMock()
        mock_balance_service = AsyncMock()
        mock_balance_history_repo = AsyncMock()
        mock_payment_repo = AsyncMock()
        mock_order_validator = MagicMock()
        
        return UserService(
            db=mock_db, 
            user_repo=mock_repo, 
            balance_service=mock_balance_service, 
            balance_history_repo=mock_balance_history_repo,
            payment_repo=mock_payment_repo,
            order_validator=mock_order_validator
        )

    @pytest.mark.asyncio
    async def test_create_admin_user_success(self, user_service, mock_db, sample_admin_user_data, sample_user):
        """Тест успешного создания пользователя админом."""
        # Arrange
        user_service.user_repo.get_by_email.return_value = None
        
        mock_db.add = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        
        # Act
        result = await user_service.create_admin_user(sample_admin_user_data)

        # Assert
        user_service.user_repo.get_by_email.assert_called_once_with(sample_admin_user_data.email)
        user_service.order_validator.validate_user_email_unique.assert_called_once()
        mock_db.add.assert_called_once()
        mock_db.flush.assert_called_once()
        mock_db.refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_admin_user_email_exists(self, user_service, mock_db, sample_admin_user_data, sample_user):
        """Тест создания пользователя с существующим email."""
        # Arrange
        user_service.user_repo.get_by_email.return_value = sample_user
        
        # Настраиваем order_validator в user_service
        user_service.order_validator.validate_user_email_unique.side_effect = HTTPException(
            status_code=409, 
            detail="Email уже зарегистрирован"
        )

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await user_service.create_admin_user(sample_admin_user_data)

        assert exc_info.value.status_code == 409
        assert "Email уже зарегистрирован" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_update_user_success(self, user_service, mock_db, sample_user, sample_user_update):
        """Тест успешного обновления пользователя."""
        # Arrange
        mock_db.commit = AsyncMock()
        
        # Act
        result = await user_service.update_user(sample_user, sample_user_update)

        # Assert
        assert result is not None
        # Commit выполняется middleware, не в сервисе

    @pytest.mark.asyncio
    async def test_process_user_payment_success(self, user_service, mock_db, sample_user, sample_payment_request):
        """Тест успешной обработки платежа пользователя."""
        # Arrange
        user_id = 1
        manager = sample_user
        
        # Настраиваем моки в user_service
        user_service.user_repo.get_by_id.return_value = sample_user
        user_service.balance_service.add_transaction.return_value = None
        
        mock_db.add = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        # Act
        result = await user_service.process_user_payment(user_id, sample_payment_request, manager)

        # Assert
        assert result is not None
        user_service.user_repo.get_by_id.assert_called_once_with(user_id)
        user_service.balance_service.add_transaction.assert_called_once()
        user_service.payment_repo.create_payment.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_user_payment_user_not_found(self, user_service, mock_db, sample_payment_request, sample_user):
        """Тест обработки платежа для несуществующего пользователя."""
        # Arrange
        user_id = 999
        manager = sample_user
        
        # Настраиваем моки в user_service
        user_service.user_repo.get_by_id.return_value = None

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await user_service.process_user_payment(user_id, sample_payment_request, manager)

        assert exc_info.value.status_code == 404
        assert "Пользователь не найден" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_create_admin_user_database_error(self, user_service, mock_db, sample_admin_user_data):
        """Тест создания пользователя с ошибкой базы данных."""
        # Arrange
        with patch('api.services.user_service.UserRepository') as mock_repo_class:
            with patch('api.services.order.order_validator.OrderValidator') as mock_validator_class:
                mock_repo = AsyncMock()
                mock_repo.get_by_email.return_value = None
                mock_repo_class.return_value = mock_repo
                
                mock_validator = AsyncMock()
                mock_validator_class.return_value = mock_validator
                
                mock_db.add = MagicMock()
                mock_db.flush = AsyncMock(side_effect=Exception("Database error"))

                # Act & Assert
                with pytest.raises(HTTPException) as exc_info:
                    await user_service.create_admin_user(sample_admin_user_data)

                assert exc_info.value.status_code == 500
                assert "Внутренняя ошибка сервера" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_update_user_by_admin_success(self, user_service, mock_db, sample_user):
        """Тест успешного обновления пользователя админом."""
        from shared.schemas.user_schema import AdminUserUpdate
        
        admin_user = MagicMock(spec=User)
        admin_user.role = "admin"
        
        update_data = AdminUserUpdate(
            full_name="Updated Admin User",
            role="manager"
        )
        
        # Настраиваем моки в user_service
        user_service.user_repo.get_by_id.return_value = sample_user
        user_service.user_repo.update_admin.return_value = sample_user
        
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        
        result = await user_service.update_user_by_admin(1, update_data, admin_user)
        
        assert result is not None
        user_service.user_repo.get_by_id.assert_called_once_with(1)
        user_service.user_repo.update_admin.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_user_by_admin_user_not_found(self, user_service, mock_db):
        """Тест обновления несуществующего пользователя админом."""
        from shared.schemas.user_schema import AdminUserUpdate
        
        admin_user = MagicMock(spec=User)
        admin_user.role = "admin"
        
        update_data = AdminUserUpdate(full_name="Updated User")
        
        # Настраиваем моки в user_service
        user_service.user_repo.get_by_id.return_value = None
        
        with pytest.raises(HTTPException) as exc_info:
            await user_service.update_user_by_admin(999, update_data, admin_user)
        
        assert exc_info.value.status_code == 404
        assert "Пользователь не найден" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_update_user_by_admin_non_admin_role_change(self, user_service, mock_db, sample_user):
        """Тест попытки изменения роли не-админом."""
        from shared.schemas.user_schema import AdminUserUpdate
        
        non_admin_user = MagicMock(spec=User)
        non_admin_user.role = "manager"
        
        update_data = AdminUserUpdate(role="admin")
        
        with patch('api.services.user_service.UserRepository') as mock_repo_class:
            mock_repo = AsyncMock()
            mock_repo.get_by_id.return_value = sample_user
            mock_repo_class.return_value = mock_repo
            
            with pytest.raises(HTTPException) as exc_info:
                await user_service.update_user_by_admin(1, update_data, non_admin_user)
            
            assert exc_info.value.status_code == 403
            assert "Только администратор может изменять роль" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_balance_history_for_user(self, user_service, mock_db):
        """Тест получения истории баланса пользователя."""
        user_id = 1
        skip = 0
        limit = 10
        
        mock_history = [MagicMock(spec=BalanceHistory) for _ in range(3)]
        total_count = 3
        
        # Настраиваем мок из фикстуры
        user_service.payment_repo.get_balance_history_for_user = AsyncMock(return_value=(mock_history, total_count))
        
        result = await user_service.get_balance_history_for_user(user_id, skip, limit)
        
        assert result == (mock_history, total_count)
        user_service.payment_repo.get_balance_history_for_user.assert_called_once_with(user_id, skip, limit)

    @pytest.mark.asyncio
    async def test_adjust_user_balance_success(self, user_service, mock_db, sample_user):
        """Тест успешной корректировки баланса пользователя."""
        admin_user = MagicMock(spec=User)
        admin_user.role = "admin"
        admin_user.full_name = "Admin User"
        
        amount = 100.0
        description = "Test adjustment"
        
        # Настраиваем моки в user_service
        user_service.user_repo.get_by_id.return_value = sample_user
        user_service.balance_service.add_transaction.return_value = None
        
        # Мокируем async context manager для begin_nested
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=mock_db)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db.begin_nested = MagicMock(return_value=mock_context)
        mock_db.refresh = AsyncMock()
        mock_db.commit = AsyncMock()
        
        # Мокируем UserOut.model_validate чтобы избежать проблем с Pydantic
        with patch('api.services.user_service.UserOut') as mock_user_out:
            mock_user_out_instance = MagicMock()
            mock_user_out.model_validate.return_value = mock_user_out_instance
            
            result = await user_service.adjust_user_balance(1, amount, description, admin_user)
            
            assert result is not None
            user_service.balance_service.add_transaction.assert_called_once()
            mock_user_out.model_validate.assert_called_once()

    @pytest.mark.asyncio
    async def test_adjust_user_balance_negative_amount(self, user_service, mock_db, sample_user):
        """Тест корректировки баланса с отрицательной суммой."""
        admin_user = MagicMock(spec=User)
        admin_user.role = "admin"
        admin_user.full_name = "Admin User"
        
        amount = -50.0
        description = "Penalty"
        
        # Настраиваем моки в user_service
        user_service.user_repo.get_by_id.return_value = sample_user
        user_service.balance_service.add_transaction.return_value = None
        
        # Мокируем async context manager для begin_nested
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=mock_db)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db.begin_nested = MagicMock(return_value=mock_context)
        mock_db.refresh = AsyncMock()
        mock_db.commit = AsyncMock()
        
        # Мокируем UserOut.model_validate чтобы избежать проблем с Pydantic
        with patch('api.services.user_service.UserOut') as mock_user_out:
            mock_user_out_instance = MagicMock()
            mock_user_out.model_validate.return_value = mock_user_out_instance
            
            result = await user_service.adjust_user_balance(1, amount, description, admin_user)
            
            assert result is not None
            # Проверяем, что был вызван MANUAL_DEBIT для отрицательной суммы
            call_args = user_service.balance_service.add_transaction.call_args
            assert call_args[1]['operation_type'] == BalanceOperationType.MANUAL_DEBIT
            mock_user_out.model_validate.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_balance_history_entry_success(self, user_service, mock_db):
        """Тест успешного удаления записи истории баланса."""
        history_id = 1
        user_id = 1
        
        mock_history_entry = MagicMock(spec=BalanceHistory)
        mock_history_entry.user_id = user_id
        
        mock_user = MagicMock(spec=User)
        mock_user.balance = 1000.0
        
        # Настраиваем моки в фикстуре user_service
        user_service.balance_history_repo.get_by_id.return_value = mock_history_entry
        user_service.user_repo.get_by_id.return_value = mock_user
        
        # Мокируем async context manager для begin_nested
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=mock_db)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db.begin_nested = MagicMock(return_value=mock_context)
        
        await user_service.delete_balance_history_entry(history_id)
        
        user_service.balance_history_repo.get_by_id.assert_called_once_with(history_id)
        user_service.user_repo.get_by_id.assert_called_once_with(user_id)

    @pytest.mark.asyncio
    async def test_delete_balance_history_entry_not_found(self, user_service, mock_db):
        """Тест удаления несуществующей записи истории баланса."""
        history_id = 999
        
        # Настраиваем моки в фикстуре user_service
        user_service.balance_history_repo.get_by_id.return_value = None
        
        # Мокируем async context manager для begin_nested
        mock_context = MagicMock()
        mock_context.__aenter__ = AsyncMock(return_value=mock_db)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db.begin_nested = MagicMock(return_value=mock_context)
        
        with pytest.raises(HTTPException) as exc_info:
            await user_service.delete_balance_history_entry(history_id)
        
        assert exc_info.value.status_code == 404
        assert "Запись в истории баланса не найдена" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_block_user_success(self, user_service, mock_db, sample_user):
        """Тест успешной блокировки пользователя."""
        # Arrange
        user_id = 1
        current_user = MagicMock(spec=User)
        current_user.id = 2  # Другой пользователь
        
        user_to_block = MagicMock(spec=User)
        user_to_block.id = user_id
        user_to_block.email = "test@example.com"
        user_to_block.is_active = True
        
        user_service.user_repo.get_by_id.return_value = user_to_block
        mock_db.commit = AsyncMock()
        
        # Act
        result = await user_service.block_user(user_id, current_user)
        
        # Assert
        assert result["message"] == "Пользователь test@example.com заблокирован"
        assert user_to_block.is_active is False
        user_service.user_repo.get_by_id.assert_called_once_with(user_id)
        # Commit выполняется middleware, не в сервисе

    @pytest.mark.asyncio
    async def test_block_user_self_block_error(self, user_service, mock_db, sample_user):
        """Тест ошибки при попытке заблокировать самого себя."""
        # Arrange
        user_id = 1
        current_user = MagicMock(spec=User)
        current_user.id = 1  # Тот же пользователь
        
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await user_service.block_user(user_id, current_user)
        
        assert exc_info.value.status_code == 400
        assert "Нельзя заблокировать самого себя" in exc_info.value.detail
        user_service.user_repo.get_by_id.assert_not_called()
        mock_db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_block_user_not_found(self, user_service, mock_db, sample_user):
        """Тест блокировки несуществующего пользователя."""
        # Arrange
        user_id = 999
        current_user = MagicMock(spec=User)
        current_user.id = 2
        
        user_service.user_repo.get_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await user_service.block_user(user_id, current_user)
        
        assert exc_info.value.status_code == 404
        assert "Пользователь не найден" in exc_info.value.detail
        mock_db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_unblock_user_success(self, user_service, mock_db, sample_user):
        """Тест успешной разблокировки пользователя."""
        # Arrange
        user_id = 1
        
        user_to_unblock = MagicMock(spec=User)
        user_to_unblock.id = user_id
        user_to_unblock.email = "test@example.com"
        user_to_unblock.is_active = False
        
        user_service.user_repo.get_by_id.return_value = user_to_unblock
        mock_db.commit = AsyncMock()
        
        # Act
        result = await user_service.unblock_user(user_id)
        
        # Assert
        assert result["message"] == "Пользователь test@example.com разблокирован"
        assert user_to_unblock.is_active is True
        user_service.user_repo.get_by_id.assert_called_once_with(user_id)
        # Commit выполняется middleware, не в сервисе

    @pytest.mark.asyncio
    async def test_unblock_user_not_found(self, user_service, mock_db, sample_user):
        """Тест разблокировки несуществующего пользователя."""
        # Arrange
        user_id = 999
        user_service.user_repo.get_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await user_service.unblock_user(user_id)
        
        assert exc_info.value.status_code == 404
        assert "Пользователь не найден" in exc_info.value.detail
        mock_db.commit.assert_not_called()