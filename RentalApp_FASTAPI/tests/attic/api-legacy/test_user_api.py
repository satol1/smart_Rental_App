"""
Тесты для user_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container


class TestUserAPI:
    """Тесты для API пользователей"""

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
        service.create_user = AsyncMock()
        service.update_user = AsyncMock()
        service.delete_user = AsyncMock()
        service.block_user = AsyncMock()
        service.unblock_user = AsyncMock()
        return service

    def test_get_all_users_success(self, client, mock_user_service):
        """Тест успешного получения всех пользователей"""
        # Arrange
        mock_users = [
            {"id": 1, "email": "user1@example.com", "full_name": "User 1", "role": "user"},
            {"id": 2, "email": "user2@example.com", "full_name": "User 2", "role": "manager"}
        ]
        
        mock_user_service.get_all_users_paginated.return_value = (mock_users, 2)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.get("/api/admin/users/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert "total_count" in data
            assert len(data["items"]) == 2
            assert data["total_count"] == 2
            assert data["items"][0]["email"] == "user1@example.com"
            assert data["items"][1]["email"] == "user2@example.com"
            mock_user_service.get_all_users_paginated.assert_called_once()

    def test_get_user_by_id_success(self, client, mock_user_service):
        """Тест успешного получения пользователя по ID"""
        # Arrange
        user_id = 1
        mock_user = {
            "id": user_id,
            "email": "user@example.com",
            "full_name": "Test User",
            "role": "user",
            "is_active": True
        }
        
        mock_user_service.get_user_by_id.return_value = mock_user
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.get(f"/api/users/{user_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == user_id
            assert data["email"] == "user@example.com"
            assert data["full_name"] == "Test User"
            assert data["role"] == "user"
            assert data["is_active"] is True
            mock_user_service.get_user_by_id.assert_called_once_with(user_id)

    def test_create_user_success(self, client, mock_user_service):
        """Тест успешного создания пользователя"""
        # Arrange
        user_data = {
            "email": "newuser@example.com",
            "password": "password123",
            "full_name": "New User",
            "role": "user"
        }
        
        mock_user = {
            "id": 1,
            "email": "newuser@example.com",
            "full_name": "New User",
            "role": "user",
            "is_active": True
        }
        
        mock_user_service.create_user.return_value = mock_user
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.post("/api/admin/users/", json=user_data)
            
            # Assert
            assert response.status_code == 201
            data = response.json()
            assert data["id"] == 1
            assert data["email"] == "newuser@example.com"
            assert data["full_name"] == "New User"
            assert data["role"] == "user"
            assert data["is_active"] is True
            mock_user_service.create_user.assert_called_once()

    def test_update_user_success(self, client, mock_user_service):
        """Тест успешного обновления пользователя"""
        # Arrange
        user_id = 1
        update_data = {
            "full_name": "Updated User",
            "role": "manager"
        }
        
        mock_user = {
            "id": user_id,
            "email": "user@example.com",
            "full_name": "Updated User",
            "role": "manager",
            "is_active": True
        }
        
        mock_user_service.update_user.return_value = mock_user
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.put(f"/api/users/{user_id}", json=update_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == user_id
            assert data["full_name"] == "Updated User"
            assert data["role"] == "manager"
            mock_user_service.update_user.assert_called_once()

    def test_delete_user_success(self, client, mock_user_service):
        """Тест успешного удаления пользователя"""
        # Arrange
        user_id = 1
        mock_user_service.delete_user.return_value = {"message": "Пользователь удален"}
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.delete(f"/api/users/{user_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Пользователь удален"
            mock_user_service.delete_user.assert_called_once_with(user_id)

    def test_block_user_success(self, client, mock_user_service):
        """Тест успешной блокировки пользователя"""
        # Arrange
        user_id = 1
        mock_user_service.block_user.return_value = {"message": "Пользователь заблокирован"}
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.post(f"/api/users/{user_id}/block")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Пользователь заблокирован"
            mock_user_service.block_user.assert_called_once_with(user_id)

    def test_unblock_user_success(self, client, mock_user_service):
        """Тест успешной разблокировки пользователя"""
        # Arrange
        user_id = 1
        mock_user_service.unblock_user.return_value = {"message": "Пользователь разблокирован"}
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.post(f"/api/users/{user_id}/unblock")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Пользователь разблокирован"
            mock_user_service.unblock_user.assert_called_once_with(user_id)

    def test_get_user_not_found(self, client, mock_user_service):
        """Тест получения несуществующего пользователя"""
        # Arrange
        user_id = 999
        mock_user_service.get_user_by_id.return_value = None
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.get(f"/api/users/{user_id}")
            
            # Assert
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert "Пользователь не найден" in data["detail"]

    def test_create_user_validation_error(self, client, mock_user_service):
        """Тест создания пользователя с невалидными данными"""
        # Arrange
        user_data = {
            "email": "invalid-email",  # Невалидный email
            "password": "123",  # Слишком короткий пароль
            "full_name": "Test User"
        }
        
        mock_user_service.create_user.side_effect = ValueError("Email имеет неверный формат")
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.post("/api/admin/users/", json=user_data)
            
            # Assert
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "Email имеет неверный формат" in data["detail"]

    def test_get_all_users_empty(self, client, mock_user_service):
        """Тест получения пустого списка пользователей"""
        # Arrange
        mock_user_service.get_all_users_paginated.return_value = ([], 0)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.get("/api/admin/users/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert "total_count" in data
            assert len(data["items"]) == 0
            assert data["total_count"] == 0
            mock_user_service.get_all_users_paginated.assert_called_once()

    def test_block_user_self_block_error(self, client, mock_user_service):
        """Тест попытки заблокировать самого себя"""
        # Arrange
        user_id = 1
        mock_user_service.block_user.side_effect = ValueError("Нельзя заблокировать самого себя")
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.post(f"/api/users/{user_id}/block")
            
            # Assert
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "Нельзя заблокировать самого себя" in data["detail"]

    def test_get_all_users_with_pagination(self, client, mock_user_service):
        """Тест получения пользователей с пагинацией"""
        # Arrange
        mock_users = [
            {"id": 1, "email": "user1@example.com", "full_name": "User 1", "role": "user"}
        ]
        
        mock_user_service.get_all_users_paginated.return_value = (mock_users, 1)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act
            response = client.get("/api/admin/users/?skip=0&limit=1")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert "total_count" in data
            assert len(data["items"]) == 1
            assert data["total_count"] == 1
            mock_user_service.get_all_users_paginated.assert_called_once()

