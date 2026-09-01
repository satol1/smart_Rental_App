"""
Тесты для user_profile_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container
from api.models.user import User


class TestUserProfileAPI:
    """Тесты для API профиля пользователя"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_user_service(self):
        """Мок сервиса пользователей"""
        service = AsyncMock()
        service.get_user_by_id = AsyncMock()
        service.update_user = AsyncMock()
        service.get_balance_history = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_user(self):
        """Мок текущего пользователя"""
        user = User()
        user.id = 1
        user.email = "test@example.com"
        user.full_name = "Test User"
        user.is_active = True
        return user

    def test_get_user_profile_success(self, client, mock_user_service, mock_current_user):
        """Тест успешного получения профиля пользователя"""
        # Arrange
        mock_user_service.get_user_by_id.return_value = mock_current_user
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.get("/api/user/profile")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == 1
            assert data["email"] == "test@example.com"
            assert data["full_name"] == "Test User"
            mock_user_service.get_user_by_id.assert_called_once()

    def test_get_user_profile_not_found(self, client, mock_user_service):
        """Тест получения профиля несуществующего пользователя"""
        # Arrange
        mock_user_service.get_user_by_id.return_value = None
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.get("/api/user/profile")
            
            # Assert
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert "Пользователь не найден" in data["detail"]

    def test_update_user_profile_success(self, client, mock_user_service, mock_current_user):
        """Тест успешного обновления профиля пользователя"""
        # Arrange
        update_data = {
            "full_name": "Updated Name",
            "phone": "+1234567890"
        }
        
        updated_user = User()
        updated_user.id = 1
        updated_user.email = "test@example.com"
        updated_user.full_name = "Updated Name"
        updated_user.phone = "+1234567890"
        
        mock_user_service.update_user.return_value = updated_user
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.put("/api/user/profile", json=update_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == 1
            assert data["full_name"] == "Updated Name"
            assert data["phone"] == "+1234567890"
            mock_user_service.update_user.assert_called_once()

    def test_get_balance_history_success(self, client, mock_user_service, mock_current_user):
        """Тест успешного получения истории баланса"""
        # Arrange
        mock_balance_history = [
            {"id": 1, "amount": 100.0, "description": "Пополнение"},
            {"id": 2, "amount": -50.0, "description": "Оплата аренды"}
        ]
        
        mock_user_service.get_balance_history.return_value = mock_balance_history
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.get("/api/user/balance-history")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]["amount"] == 100.0
            assert data[1]["amount"] == -50.0
            mock_user_service.get_balance_history.assert_called_once()




















