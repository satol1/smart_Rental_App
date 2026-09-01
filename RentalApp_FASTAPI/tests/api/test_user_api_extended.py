"""
Расширенные тесты для user_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import datetime

from api.main_api import app
from containers import Container


class TestUserAPIExtended:
    """Расширенные тесты для API пользователей"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_user_service(self):
        """Мок сервиса пользователей"""
        service = AsyncMock()
        service.get_all_users_paginated = AsyncMock()
        service.get_user_by_id = AsyncMock()
        service.update_user_by_admin = AsyncMock()
        service.block_user = AsyncMock()
        service.unblock_user = AsyncMock()
        service.get_user_profile = AsyncMock()
        service.update_user_profile = AsyncMock()
        service.get_balance_history_for_user = AsyncMock()
        service.adjust_user_balance = AsyncMock()
        service.delete_balance_history_entry = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_admin_user(self):
        """Мок пользователя-администратора"""
        from api.models.user import User
        user = User()
        user.id = 1
        user.email = "admin@test.com"
        user.role = "admin"
        user.full_name = "Admin User"
        user.is_active = True
        return user

    @pytest.fixture
    def mock_current_user(self):
        """Мок обычного пользователя"""
        from api.models.user import User
        user = User()
        user.id = 2
        user.email = "user@test.com"
        user.role = "user"
        user.full_name = "Regular User"
        user.is_active = True
        return user

    def test_get_all_users_admin_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешного получения всех пользователей администратором"""
        # Arrange
        mock_users = [
            {
                "id": 2,
                "email": "user1@test.com",
                "full_name": "User One",
                "role": "user",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": 3,
                "email": "user2@test.com",
                "full_name": "User Two",
                "role": "user",
                "is_active": False,
                "created_at": "2024-01-02T00:00:00Z"
            }
        ]
        
        mock_user_service.get_all_users_paginated.return_value = (mock_users, 2)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/users/")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 2
                assert data["total_count"] == 2
                assert data["items"][0]["email"] == "user1@test.com"
                assert data["items"][1]["email"] == "user2@test.com"
                mock_user_service.get_all_users_paginated.assert_called_once()

    def test_get_user_by_id_admin_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешного получения пользователя по ID администратором"""
        # Arrange
        user_id = 2
        mock_user = {
            "id": user_id,
            "email": "user1@test.com",
            "full_name": "User One",
            "role": "user",
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        mock_user_service.get_user_by_id.return_value = mock_user
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get(f"/api/admin/users/{user_id}")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == user_id
                assert data["email"] == "user1@test.com"
                assert data["full_name"] == "User One"
                assert data["role"] == "user"
                assert data["is_active"] is True
                mock_user_service.get_user_by_id.assert_called_once_with(user_id)

    def test_update_user_by_admin_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешного обновления пользователя администратором"""
        # Arrange
        user_id = 2
        update_data = {
            "full_name": "Updated User One",
            "is_active": False,
            "role": "manager"
        }
        
        mock_updated_user = {
            "id": user_id,
            "email": "user1@test.com",
            "full_name": "Updated User One",
            "role": "manager",
            "is_active": False,
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        mock_user_service.update_user_by_admin.return_value = mock_updated_user
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.put(f"/api/admin/users/{user_id}", json=update_data)
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == user_id
                assert data["email"] == "user1@test.com"
                assert data["full_name"] == "Updated User One"
                assert data["role"] == "manager"
                assert data["is_active"] is False
                mock_user_service.update_user_by_admin.assert_called_once()

    def test_block_user_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешной блокировки пользователя"""
        # Arrange
        user_id = 2
        mock_block_result = {"message": "User blocked successfully"}
        
        mock_user_service.block_user.return_value = mock_block_result
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post(f"/api/admin/users/{user_id}/block")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["message"] == "User blocked successfully"
                mock_user_service.block_user.assert_called_once_with(user_id)

    def test_unblock_user_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешной разблокировки пользователя"""
        # Arrange
        user_id = 2
        mock_unblock_result = {"message": "User unblocked successfully"}
        
        mock_user_service.unblock_user.return_value = mock_unblock_result
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post(f"/api/admin/users/{user_id}/unblock")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["message"] == "User unblocked successfully"
                mock_user_service.unblock_user.assert_called_once_with(user_id)

    def test_get_user_profile_success(self, client, mock_user_service, mock_current_user):
        """Тест успешного получения профиля пользователя"""
        # Arrange
        mock_profile = {
            "id": mock_current_user.id,
            "email": "user@test.com",
            "full_name": "Regular User",
            "role": "user",
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        mock_user_service.get_user_profile.return_value = mock_profile
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.get("/api/user/profile")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == mock_current_user.id
                assert data["email"] == "user@test.com"
                assert data["full_name"] == "Regular User"
                assert data["role"] == "user"
                assert data["is_active"] is True
                mock_user_service.get_user_profile.assert_called_once_with(mock_current_user.id)

    def test_update_user_profile_success(self, client, mock_user_service, mock_current_user):
        """Тест успешного обновления профиля пользователя"""
        # Arrange
        update_data = {
            "full_name": "Updated Regular User",
            "phone": "+1234567890"
        }
        
        mock_updated_profile = {
            "id": mock_current_user.id,
            "email": "user@test.com",
            "full_name": "Updated Regular User",
            "phone": "+1234567890",
            "role": "user",
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        mock_user_service.update_user_profile.return_value = mock_updated_profile
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.put("/api/user/profile", json=update_data)
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == mock_current_user.id
                assert data["email"] == "user@test.com"
                assert data["full_name"] == "Updated Regular User"
                assert data["phone"] == "+1234567890"
                assert data["role"] == "user"
                assert data["is_active"] is True
                mock_user_service.update_user_profile.assert_called_once()

    def test_get_balance_history_for_user_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешного получения истории баланса пользователя"""
        # Arrange
        user_id = 2
        mock_history = [
            {
                "id": 1,
                "user_id": user_id,
                "amount": 100.0,
                "type": "credit",
                "description": "Deposit",
                "created_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": 2,
                "user_id": user_id,
                "amount": -50.0,
                "type": "debit",
                "description": "Rental payment",
                "created_at": "2024-01-02T00:00:00Z"
            }
        ]
        
        mock_user_service.get_balance_history_for_user.return_value = (mock_history, 2)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get(f"/api/admin/users/{user_id}/balance-history")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 2
                assert data["total_count"] == 2
                assert data["items"][0]["amount"] == 100.0
                assert data["items"][0]["type"] == "credit"
                assert data["items"][1]["amount"] == -50.0
                assert data["items"][1]["type"] == "debit"
                mock_user_service.get_balance_history_for_user.assert_called_once_with(user_id, skip=0, limit=10)

    def test_adjust_user_balance_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешного корректировки баланса пользователя"""
        # Arrange
        user_id = 2
        adjustment_data = {
            "amount": 50.0,
            "description": "Bonus payment"
        }
        
        mock_adjustment_result = {"message": "Balance adjusted successfully"}
        
        mock_user_service.adjust_user_balance.return_value = mock_adjustment_result
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post(f"/api/admin/users/{user_id}/balance-history/adjust", json=adjustment_data)
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["message"] == "Balance adjusted successfully"
                mock_user_service.adjust_user_balance.assert_called_once_with(user_id, adjustment_data["amount"], adjustment_data["description"])

    def test_delete_balance_history_entry_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешного удаления записи истории баланса"""
        # Arrange
        user_id = 2
        entry_id = 1
        mock_delete_result = {"message": "Balance history entry deleted successfully"}
        
        mock_user_service.delete_balance_history_entry.return_value = mock_delete_result
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.delete(f"/api/admin/users/{user_id}/balance-history/{entry_id}")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["message"] == "Balance history entry deleted successfully"
                mock_user_service.delete_balance_history_entry.assert_called_once_with(entry_id)

    def test_get_all_users_with_pagination_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешного получения пользователей с пагинацией"""
        # Arrange
        mock_users = [
            {
                "id": 2,
                "email": "user1@test.com",
                "full_name": "User One",
                "role": "user",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            }
        ]
        
        mock_user_service.get_all_users_paginated.return_value = (mock_users, 1)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/users/?skip=0&limit=10")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 1
                assert data["total_count"] == 1
                assert data["items"][0]["email"] == "user1@test.com"
                mock_user_service.get_all_users_paginated.assert_called_once()

    def test_get_all_users_with_search_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешного получения пользователей с поиском"""
        # Arrange
        mock_users = [
            {
                "id": 2,
                "email": "user1@test.com",
                "full_name": "User One",
                "role": "user",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            }
        ]
        
        mock_user_service.get_all_users_paginated.return_value = (mock_users, 1)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/users/?search=user1")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 1
                assert data["total_count"] == 1
                assert data["items"][0]["email"] == "user1@test.com"
                mock_user_service.get_all_users_paginated.assert_called_once()

    def test_get_all_users_with_role_filter_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешного получения пользователей с фильтром по роли"""
        # Arrange
        mock_users = [
            {
                "id": 2,
                "email": "user1@test.com",
                "full_name": "User One",
                "role": "user",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            }
        ]
        
        mock_user_service.get_all_users_paginated.return_value = (mock_users, 1)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/users/?role=user")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 1
                assert data["total_count"] == 1
                assert data["items"][0]["email"] == "user1@test.com"
                assert data["items"][0]["role"] == "user"
                mock_user_service.get_all_users_paginated.assert_called_once()

    def test_get_all_users_with_status_filter_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешного получения пользователей с фильтром по статусу"""
        # Arrange
        mock_users = [
            {
                "id": 2,
                "email": "user1@test.com",
                "full_name": "User One",
                "role": "user",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            }
        ]
        
        mock_user_service.get_all_users_paginated.return_value = (mock_users, 1)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/users/?is_active=true")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 1
                assert data["total_count"] == 1
                assert data["items"][0]["email"] == "user1@test.com"
                assert data["items"][0]["is_active"] is True
                mock_user_service.get_all_users_paginated.assert_called_once()

    def test_get_user_by_id_not_found(self, client, mock_user_service, mock_current_admin_user):
        """Тест получения несуществующего пользователя по ID"""
        # Arrange
        user_id = 999
        mock_user_service.get_user_by_id.return_value = None
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get(f"/api/admin/users/{user_id}")
                
                # Assert
                assert response.status_code == 404
                data = response.json()
                assert "detail" in data
                assert "User not found" in data["detail"]

    def test_update_user_by_admin_not_found(self, client, mock_user_service, mock_current_admin_user):
        """Тест обновления несуществующего пользователя"""
        # Arrange
        user_id = 999
        update_data = {
            "full_name": "Updated User",
            "is_active": False
        }
        
        mock_user_service.update_user_by_admin.side_effect = ValueError("User not found")
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.put(f"/api/admin/users/{user_id}", json=update_data)
                
                # Assert
                assert response.status_code == 400
                data = response.json()
                assert "detail" in data
                assert "User not found" in data["detail"]

    def test_block_user_not_found(self, client, mock_user_service, mock_current_admin_user):
        """Тест блокировки несуществующего пользователя"""
        # Arrange
        user_id = 999
        mock_user_service.block_user.side_effect = ValueError("User not found")
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post(f"/api/admin/users/{user_id}/block")
                
                # Assert
                assert response.status_code == 400
                data = response.json()
                assert "detail" in data
                assert "User not found" in data["detail"]

    def test_unblock_user_not_found(self, client, mock_user_service, mock_current_admin_user):
        """Тест разблокировки несуществующего пользователя"""
        # Arrange
        user_id = 999
        mock_user_service.unblock_user.side_effect = ValueError("User not found")
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post(f"/api/admin/users/{user_id}/unblock")
                
                # Assert
                assert response.status_code == 400
                data = response.json()
                assert "detail" in data
                assert "User not found" in data["detail"]

    def test_get_user_profile_unauthorized(self, client, mock_user_service):
        """Тест получения профиля без авторизации"""
        # Arrange
        mock_profile = {"id": 1, "email": "user@test.com"}
        mock_user_service.get_user_profile.return_value = mock_profile
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act - без авторизации
            response = client.get("/api/user/profile")
            
            # Assert
            assert response.status_code == 401
            data = response.json()
            assert "detail" in data

    def test_update_user_profile_unauthorized(self, client, mock_user_service):
        """Тест обновления профиля без авторизации"""
        # Arrange
        update_data = {
            "full_name": "Updated User"
        }
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act - без авторизации
            response = client.put("/api/user/profile", json=update_data)
            
            # Assert
            assert response.status_code == 401
            data = response.json()
            assert "detail" in data

    def test_get_all_users_unauthorized(self, client, mock_user_service):
        """Тест получения всех пользователей без авторизации"""
        # Arrange
        mock_users = []
        mock_user_service.get_all_users_paginated.return_value = (mock_users, 0)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act - без авторизации
            response = client.get("/api/admin/users/")
            
            # Assert
            assert response.status_code == 401
            data = response.json()
            assert "detail" in data

    def test_get_balance_history_for_user_unauthorized(self, client, mock_user_service):
        """Тест получения истории баланса без авторизации"""
        # Arrange
        user_id = 2
        mock_history = []
        mock_user_service.get_balance_history_for_user.return_value = (mock_history, 0)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act - без авторизации
            response = client.get(f"/api/admin/users/{user_id}/balance-history")
            
            # Assert
            assert response.status_code == 401
            data = response.json()
            assert "detail" in data

    def test_adjust_user_balance_unauthorized(self, client, mock_user_service):
        """Тест корректировки баланса без авторизации"""
        # Arrange
        user_id = 2
        adjustment_data = {
            "amount": 50.0,
            "description": "Bonus payment"
        }
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act - без авторизации
            response = client.post(f"/api/admin/users/{user_id}/balance-history/adjust", json=adjustment_data)
            
            # Assert
            assert response.status_code == 401
            data = response.json()
            assert "detail" in data

    def test_delete_balance_history_entry_unauthorized(self, client, mock_user_service):
        """Тест удаления записи истории баланса без авторизации"""
        # Arrange
        user_id = 2
        entry_id = 1
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act - без авторизации
            response = client.delete(f"/api/admin/users/{user_id}/balance-history/{entry_id}")
            
            # Assert
            assert response.status_code == 401
            data = response.json()
            assert "detail" in data

    def test_get_all_users_database_error(self, client, mock_user_service, mock_current_admin_user):
        """Тест получения всех пользователей при ошибке базы данных"""
        # Arrange
        mock_user_service.get_all_users_paginated.side_effect = Exception("Database connection error")
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/users/")
                
                # Assert
                assert response.status_code == 500
                data = response.json()
                assert "detail" in data
                assert "Database connection error" in data["detail"]

    def test_get_user_profile_database_error(self, client, mock_user_service, mock_current_user):
        """Тест получения профиля пользователя при ошибке базы данных"""
        # Arrange
        mock_user_service.get_user_profile.side_effect = Exception("Database connection error")
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.get("/api/user/profile")
                
                # Assert
                assert response.status_code == 500
                data = response.json()
                assert "detail" in data
                assert "Database connection error" in data["detail"]

    def test_update_user_profile_validation_error(self, client, mock_user_service, mock_current_user):
        """Тест обновления профиля с невалидными данными"""
        # Arrange
        update_data = {
            "full_name": "",  # Пустое имя
            "email": "invalid-email"  # Невалидный email
        }
        
        mock_user_service.update_user_profile.side_effect = ValueError("Invalid user data")
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.put("/api/user/profile", json=update_data)
                
                # Assert
                assert response.status_code == 400
                data = response.json()
                assert "detail" in data
                assert "Invalid user data" in data["detail"]

    def test_adjust_user_balance_validation_error(self, client, mock_user_service, mock_current_admin_user):
        """Тест корректировки баланса с невалидными данными"""
        # Arrange
        user_id = 2
        adjustment_data = {
            "amount": 0.0,  # Нулевая сумма
            "description": ""  # Пустое описание
        }
        
        mock_user_service.adjust_user_balance.side_effect = ValueError("Invalid adjustment data")
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post(f"/api/admin/users/{user_id}/balance-history/adjust", json=adjustment_data)
                
                # Assert
                assert response.status_code == 400
                data = response.json()
                assert "detail" in data
                assert "Invalid adjustment data" in data["detail"]

    def test_delete_balance_history_entry_not_found(self, client, mock_user_service, mock_current_admin_user):
        """Тест удаления несуществующей записи истории баланса"""
        # Arrange
        user_id = 2
        entry_id = 999
        mock_user_service.delete_balance_history_entry.side_effect = ValueError("Balance history entry not found")
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.delete(f"/api/admin/users/{user_id}/balance-history/{entry_id}")
                
                # Assert
                assert response.status_code == 400
                data = response.json()
                assert "detail" in data
                assert "Balance history entry not found" in data["detail"]

    def test_get_balance_history_for_user_empty_result(self, client, mock_user_service, mock_current_admin_user):
        """Тест получения пустой истории баланса пользователя"""
        # Arrange
        user_id = 2
        mock_history = []
        mock_user_service.get_balance_history_for_user.return_value = (mock_history, 0)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get(f"/api/admin/users/{user_id}/balance-history")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 0
                assert data["total_count"] == 0
                mock_user_service.get_balance_history_for_user.assert_called_once_with(user_id, skip=0, limit=10)

    def test_get_all_users_empty_result(self, client, mock_user_service, mock_current_admin_user):
        """Тест получения пустого списка пользователей"""
        # Arrange
        mock_users = []
        mock_user_service.get_all_users_paginated.return_value = (mock_users, 0)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/users/")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 0
                assert data["total_count"] == 0
                mock_user_service.get_all_users_paginated.assert_called_once()




















