# tests/services/test_auth_service.py

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from fastapi import HTTPException

from api.services.auth_service import AuthService
from api.services.security_audit_service import SecurityAuditService
from api.services.brute_force_protection_service import BruteForceProtectionService
from api.models.user import User
from shared.schemas.user_schema import UserCreate
from api.repositories.user_repository import UserRepository


class TestAuthService:
    """Тесты для AuthService."""

    @pytest.fixture
    def mock_user_repo(self):
        """Создает мок репозитория пользователей."""
        repo = AsyncMock(spec=UserRepository)
        repo.db = AsyncMock()
        return repo

    @pytest.fixture
    def sample_user_data(self):
        """Создает тестовые данные пользователя."""
        return UserCreate(
            full_name="Test User",
            email="test@example.com",
            password="TestPassword123",
            phone="+1234567890",
            telegram_username="testuser",
            privacy_policy_accepted=True,
            terms_accepted=True
        )

    @pytest.fixture
    def sample_user(self):
        """Создает тестового пользователя."""
        user = MagicMock(spec=User)
        user.id = 1
        user.full_name = "Test User"
        user.email = "test@example.com"
        user.hashed_password = "hashed_password"
        user.phone = "+1234567890"
        user.telegram_username = "testuser"
        user.role = "user"
        user.is_active = True
        user.status = "Активный"
        user.balance = 0.0
        user.notes = "Создан автоматически при регистрации"
        user.email_verified = True
        return user

    @pytest.fixture
    def auth_service(self, mock_user_repo):
        """Создает экземпляр AuthService с зависимостями-заглушками."""
        mock_audit = MagicMock(spec=SecurityAuditService)
        mock_bruteforce = MagicMock(spec=BruteForceProtectionService)
        return AuthService(mock_user_repo, mock_audit, mock_bruteforce)

    @pytest.mark.asyncio
    async def test_create_user_success(self, auth_service, mock_user_repo, sample_user_data, sample_user):
        """Тест успешного создания пользователя."""
        # Arrange
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create.return_value = sample_user

        # Act
        result = await auth_service.create_user(sample_user_data)

        # Assert
        assert result == sample_user
        mock_user_repo.get_by_email.assert_called_once_with(sample_user_data.email)
        mock_user_repo.create.assert_called_once()
        mock_user_repo.db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_user_email_already_exists(self, auth_service, mock_user_repo, sample_user_data, sample_user):
        """Тест создания пользователя с существующим email."""
        # Arrange
        mock_user_repo.get_by_email.return_value = sample_user

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.create_user(sample_user_data)

        assert exc_info.value.status_code == 400
        assert f"Пользователь с email {sample_user_data.email} уже существует" in exc_info.value.detail
        mock_user_repo.db.rollback.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_user_repository_error(self, auth_service, mock_user_repo, sample_user_data):
        """Тест создания пользователя с ошибкой репозитория."""
        # Arrange
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create.side_effect = Exception("Database error")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.create_user(sample_user_data)

        assert exc_info.value.status_code == 500
        assert "Ошибка сервера при регистрации" in exc_info.value.detail
        mock_user_repo.db.rollback.assert_called_once()

    @pytest.mark.asyncio
    async def test_authenticate_user_success(self, auth_service, mock_user_repo, sample_user):
        """Тест успешной аутентификации пользователя."""
        # Arrange
        email = "test@example.com"
        password = "testpassword123"
        mock_user_repo.get_by_email.return_value = sample_user

        with patch('api.services.auth_service.verify_password', return_value=True):
            # Act
            result = await auth_service.authenticate_user(email, password)

            # Assert
            assert result == sample_user
            mock_user_repo.get_by_email.assert_called_once_with(email)

    @pytest.mark.asyncio
    async def test_authenticate_user_wrong_password(self, auth_service, mock_user_repo, sample_user):
        """Тест аутентификации с неправильным паролем."""
        # Arrange
        email = "test@example.com"
        password = "wrongpassword"
        mock_user_repo.get_by_email.return_value = sample_user

        with patch('api.services.auth_service.verify_password', return_value=False):
            # Act
            result = await auth_service.authenticate_user(email, password)

            # Assert
            assert result is None

    @pytest.mark.asyncio
    async def test_authenticate_user_not_found(self, auth_service, mock_user_repo):
        """Тест аутентификации несуществующего пользователя."""
        # Arrange
        email = "nonexistent@example.com"
        password = "testpassword123"
        mock_user_repo.get_by_email.return_value = None

        # Act
        result = await auth_service.authenticate_user(email, password)

        # Assert
        assert result is None

    def test_create_access_token_default_expiry(self, auth_service):
        """Тест создания токена доступа с дефолтным временем истечения."""
        # Arrange
        data = {"sub": "test@example.com", "user_id": 1}

        with patch('api.services.auth_service.settings') as mock_settings:
            mock_settings.SECRET_KEY.get_secret_value.return_value = "test_secret"
            
            with patch('api.services.auth_service.jwt.encode') as mock_jwt_encode:
                mock_jwt_encode.return_value = "test_token"

                # Act
                result = auth_service.create_access_token(data)

                # Assert
                assert result == "test_token"
                mock_jwt_encode.assert_called_once()
                call_args = mock_jwt_encode.call_args
                assert call_args[0][0]["sub"] == "test@example.com"
                assert call_args[0][0]["user_id"] == 1
                assert "exp" in call_args[0][0]

    def test_create_access_token_custom_expiry(self, auth_service):
        """Тест создания токена доступа с кастомным временем истечения."""
        # Arrange
        data = {"sub": "test@example.com", "user_id": 1}
        custom_expiry = timedelta(hours=2)

        with patch('api.services.auth_service.settings') as mock_settings:
            mock_settings.SECRET_KEY.get_secret_value.return_value = "test_secret"
            
            with patch('api.services.auth_service.jwt.encode') as mock_jwt_encode:
                mock_jwt_encode.return_value = "test_token"

                # Act
                result = auth_service.create_access_token(data, custom_expiry)

                # Assert
                assert result == "test_token"
                mock_jwt_encode.assert_called_once()
                call_args = mock_jwt_encode.call_args
                assert call_args[0][0]["sub"] == "test@example.com"
                assert call_args[0][0]["user_id"] == 1
                assert "exp" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_create_user_rollback_on_http_exception(self, auth_service, mock_user_repo, sample_user_data):
        """Тест отката транзакции при HTTP исключении."""
        # Arrange
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create.side_effect = HTTPException(status_code=400, detail="Test error")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.create_user(sample_user_data)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Test error"
        mock_user_repo.db.rollback.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_user_data_preparation(self, auth_service, mock_user_repo, sample_user_data, sample_user):
        """Тест правильной подготовки данных пользователя при создании."""
        # Arrange
        mock_user_repo.get_by_email.return_value = None
        mock_user_repo.create.return_value = sample_user

        # Act
        result = await auth_service.create_user(sample_user_data)

        # Assert
        mock_user_repo.create.assert_called_once()
        call_args = mock_user_repo.create.call_args[0][0]
        
        # Проверяем, что данные правильно подготовлены
        assert call_args.full_name == sample_user_data.full_name
        assert call_args.email == sample_user_data.email
        assert call_args.password == sample_user_data.password
        assert call_args.phone == sample_user_data.phone
        assert call_args.telegram_username == sample_user_data.telegram_username
        assert call_args.privacy_policy_accepted == sample_user_data.privacy_policy_accepted
        assert call_args.terms_accepted == sample_user_data.terms_accepted
        # Проверяем, что все обязательные поля UserCreate присутствуют
        # UserCreate содержит только базовые поля для регистрации
        assert hasattr(call_args, 'full_name')
        assert hasattr(call_args, 'email')
        assert hasattr(call_args, 'password')
        assert hasattr(call_args, 'phone')
        assert hasattr(call_args, 'telegram_username')
        assert hasattr(call_args, 'privacy_policy_accepted')
        assert hasattr(call_args, 'terms_accepted')
