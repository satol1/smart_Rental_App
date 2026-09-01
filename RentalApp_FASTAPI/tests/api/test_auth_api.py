"""
Тесты для auth_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi import HTTPException

from api.main_api import app
from containers import Container
from api.models.user import User


class TestAuthAPI:
    """Тесты для API аутентификации"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_auth_service(self):
        """Мок сервиса аутентификации"""
        service = AsyncMock()
        service.create_user = AsyncMock()
        service.authenticate_user = AsyncMock()
        service.create_access_token = AsyncMock()
        return service

    def test_register_user_success(self, client, mock_auth_service):
        """Тест успешной регистрации пользователя"""
        # Arrange
        sample_user_data = {
            "email": "test@example.com",
            "password": "password123",
            "full_name": "Test User"
        }
        
        mock_user = User()
        mock_user.id = 1
        mock_user.email = "test@example.com"
        mock_user.full_name = "Test User"
        mock_user.is_active = True
        
        mock_auth_service.create_user.return_value = mock_user
        
        # Override the dependency using container
        with app.container.auth_service.override(mock_auth_service):
            # Act
            response = client.post("/api/auth/register", json=sample_user_data)
            
            # Assert
            assert response.status_code == 201
            data = response.json()
            assert "message" in data
            assert data["message"] == "Пользователь успешно зарегистрирован"
            mock_auth_service.create_user.assert_called_once()

    def test_register_user_email_already_exists(self, client, mock_auth_service):
        """Тест регистрации пользователя с существующим email"""
        # Arrange
        sample_user_data = {
            "email": "existing@example.com",
            "password": "password123",
            "full_name": "Test User"
        }
        
        mock_auth_service.create_user.side_effect = ValueError("Email уже существует")
        
        # Override the dependency using container
        with app.container.auth_service.override(mock_auth_service):
            # Act
            response = client.post("/api/auth/register", json=sample_user_data)
            
            # Assert
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "Email уже существует" in data["detail"]

    def test_login_success(self, client, mock_auth_service):
        """Тест успешного входа"""
        # Arrange
        login_data = {
            "username": "test@example.com",
            "password": "password123"
        }
        
        mock_user = User()
        mock_user.id = 1
        mock_user.email = "test@example.com"
        mock_user.is_active = True
        
        mock_auth_service.authenticate_user.return_value = mock_user
        mock_auth_service.create_access_token.return_value = "test_token"
        
        # Override the dependency using container
        with app.container.auth_service.override(mock_auth_service):
            # Act
            response = client.post("/api/auth/token", data=login_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert "token_type" in data
            assert data["token_type"] == "bearer"

    def test_login_invalid_credentials(self, client, mock_auth_service):
        """Тест входа с неверными учетными данными"""
        # Arrange
        login_data = {
            "username": "test@example.com",
            "password": "wrongpassword"
        }
        
        mock_auth_service.authenticate_user.return_value = None
        
        # Override the dependency using container
        with app.container.auth_service.override(mock_auth_service):
            # Act
            response = client.post("/api/auth/token", data=login_data)
            
            # Assert
            assert response.status_code == 401
            data = response.json()
            assert "detail" in data
            assert "Неверные учетные данные" in data["detail"]