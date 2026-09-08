"""
Тесты для admin_balance_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container
from api.models.user import User


class TestAdminBalanceAPI:
    """Тесты для API администрирования баланса"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_user_service(self):
        """Мок сервиса пользователей"""
        service = AsyncMock()
        service.get_user_by_id = AsyncMock()
        service.adjust_user_balance = AsyncMock()
        service.get_balance_history = AsyncMock()
        service.delete_balance_history_entry = AsyncMock()
        return service

    @pytest.fixture
    def mock_admin_user(self):
        """Мок пользователя-администратора"""
        user = User()
        user.id = 1
        user.email = "admin@example.com"
        user.role = "admin"
        user.is_active = True
        return user

    def test_get_user_balance_success(self, client, mock_user_service, mock_admin_user):
        """Тест успешного получения баланса пользователя"""
        # Arrange
        user_id = 2
        mock_user = User()
        mock_user.id = user_id
        mock_user.email = "user@example.com"
        mock_user.balance = 100.0
        
        mock_user_service.get_user_by_id.return_value = mock_user
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.get(f"/api/admin/users/{user_id}/balance")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == user_id
            assert data["balance"] == 100.0
            mock_user_service.get_user_by_id.assert_called_once_with(user_id)

    def test_adjust_user_balance_success(self, client, mock_user_service, mock_admin_user):
        """Тест успешного корректировки баланса пользователя"""
        # Arrange
        user_id = 2
        adjustment_data = {
            "amount": 50.0,
            "description": "Корректировка баланса"
        }
        
        mock_user_service.adjust_user_balance.return_value = {"message": "Баланс успешно скорректирован"}
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.post(f"/api/admin/users/{user_id}/balance/adjust", json=adjustment_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Баланс успешно скорректирован"
            mock_user_service.adjust_user_balance.assert_called_once()

    def test_get_balance_history_success(self, client, mock_user_service, mock_admin_user):
        """Тест успешного получения истории баланса"""
        # Arrange
        user_id = 2
        mock_history = [
            {"id": 1, "amount": 100.0, "description": "Пополнение"},
            {"id": 2, "amount": -50.0, "description": "Оплата аренды"}
        ]
        
        mock_user_service.get_balance_history.return_value = mock_history
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.get(f"/api/admin/users/{user_id}/balance-history")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]["amount"] == 100.0
            assert data[1]["amount"] == -50.0
            mock_user_service.get_balance_history.assert_called_once()

    def test_delete_balance_history_entry_success(self, client, mock_user_service, mock_admin_user):
        """Тест успешного удаления записи истории баланса"""
        # Arrange
        user_id = 2
        entry_id = 1
        
        mock_user_service.delete_balance_history_entry.return_value = {"message": "Запись удалена"}
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.delete(f"/api/admin/users/{user_id}/balance-history/{entry_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Запись удалена"
            mock_user_service.delete_balance_history_entry.assert_called_once()

    def test_get_user_balance_not_found(self, client, mock_user_service, mock_admin_user):
        """Тест получения баланса несуществующего пользователя"""
        # Arrange
        user_id = 999
        mock_user_service.get_user_by_id.return_value = None
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.get(f"/api/admin/users/{user_id}/balance")
            
            # Assert
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert "Пользователь не найден" in data["detail"]




















