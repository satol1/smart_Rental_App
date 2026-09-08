"""
Тесты для admin_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import datetime

from api.main_api import app
from containers import Container


class TestAdminAPI:
    """Тесты для API администратора"""

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
        service.get_balance_history_for_user = AsyncMock()
        service.adjust_user_balance = AsyncMock()
        service.delete_balance_history_entry = AsyncMock()
        return service

    @pytest.fixture
    def mock_equipment_service(self):
        """Мок сервиса оборудования"""
        service = AsyncMock()
        service.get_all_equipment_paginated = AsyncMock()
        service.get_equipment_by_id = AsyncMock()
        service.create_equipment = AsyncMock()
        service.update_equipment = AsyncMock()
        service.delete_equipment = AsyncMock()
        return service

    @pytest.fixture
    def mock_reservation_service(self):
        """Мок сервиса резерваций"""
        service = AsyncMock()
        service.get_all_reservations_paginated = AsyncMock()
        service.get_reservation_by_id = AsyncMock()
        service.create_reservation = AsyncMock()
        service.update_reservation = AsyncMock()
        service.cancel_reservation = AsyncMock()
        return service

    @pytest.fixture
    def mock_rental_service(self):
        """Мок сервиса аренды"""
        service = AsyncMock()
        service.get_all_rentals_paginated = AsyncMock()
        service.get_rental_by_id = AsyncMock()
        service.create_rental = AsyncMock()
        service.update_rental = AsyncMock()
        service.return_rental = AsyncMock()
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

    def test_get_admin_dashboard_success(self, client, mock_current_admin_user):
        """Тест успешного получения дашборда администратора"""
        # Arrange
        mock_dashboard_data = {
            "total_users": 100,
            "total_equipment": 50,
            "active_rentals": 15,
            "pending_reservations": 8,
            "total_revenue": 15000.0,
            "monthly_revenue": 5000.0
        }
        
        # Override the dependency using container
        with app.container.dashboard_service.override(AsyncMock(return_value=mock_dashboard_data)):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/dashboard")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["total_users"] == 100
                assert data["total_equipment"] == 50
                assert data["active_rentals"] == 15
                assert data["pending_reservations"] == 8
                assert data["total_revenue"] == 15000.0
                assert data["monthly_revenue"] == 5000.0

    def test_get_admin_users_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешного получения пользователей администратором"""
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
                response = client.get("/api/admin/users")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 2
                assert data["total_count"] == 2
                assert data["items"][0]["email"] == "user1@test.com"
                assert data["items"][1]["email"] == "user2@test.com"
                mock_user_service.get_all_users_paginated.assert_called_once()

    def test_get_admin_user_by_id_success(self, client, mock_user_service, mock_current_admin_user):
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

    def test_update_admin_user_success(self, client, mock_user_service, mock_current_admin_user):
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

    def test_block_admin_user_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешной блокировки пользователя администратором"""
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

    def test_unblock_admin_user_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешной разблокировки пользователя администратором"""
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

    def test_get_admin_equipment_success(self, client, mock_equipment_service, mock_current_admin_user):
        """Тест успешного получения оборудования администратором"""
        # Arrange
        mock_equipment = [
            {
                "id": 1,
                "name": "Canon EOS R5",
                "type": "camera",
                "daily_rate": 100.0,
                "brand_system_id": 1,
                "serial_number": "SN001"
            },
            {
                "id": 2,
                "name": "Sony A7R IV",
                "type": "camera",
                "daily_rate": 120.0,
                "brand_system_id": 2,
                "serial_number": "SN002"
            }
        ]
        
        mock_equipment_service.get_all_equipment_paginated.return_value = (mock_equipment, 2)
        
        # Override the dependency using container
        with app.container.equipment_service.override(mock_equipment_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/equipment")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 2
                assert data["total_count"] == 2
                assert data["items"][0]["name"] == "Canon EOS R5"
                assert data["items"][1]["name"] == "Sony A7R IV"
                mock_equipment_service.get_all_equipment_paginated.assert_called_once()

    def test_create_admin_equipment_success(self, client, mock_equipment_service, mock_current_admin_user):
        """Тест успешного создания оборудования администратором"""
        # Arrange
        equipment_data = {
            "name": "New Camera",
            "type": "camera",
            "daily_rate": 100.0,
            "brand_system_id": 1,
            "serial_number": "SN999",
            "description": "A new camera"
        }
        
        mock_created_equipment = {
            "id": 3,
            "name": "New Camera",
            "type": "camera",
            "daily_rate": 100.0,
            "brand_system_id": 1,
            "serial_number": "SN999",
            "description": "A new camera"
        }
        
        mock_equipment_service.create_equipment.return_value = mock_created_equipment
        
        # Override the dependency using container
        with app.container.equipment_service.override(mock_equipment_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post("/api/admin/equipment", json=equipment_data)
                
                # Assert
                assert response.status_code == 201
                data = response.json()
                assert data["id"] == 3
                assert data["name"] == "New Camera"
                assert data["type"] == "camera"
                assert data["daily_rate"] == 100.0
                assert data["brand_system_id"] == 1
                assert data["serial_number"] == "SN999"
                assert data["description"] == "A new camera"
                mock_equipment_service.create_equipment.assert_called_once()

    def test_update_admin_equipment_success(self, client, mock_equipment_service, mock_current_admin_user):
        """Тест успешного обновления оборудования администратором"""
        # Arrange
        equipment_id = 1
        update_data = {
            "name": "Updated Camera",
            "daily_rate": 110.0,
            "description": "Updated description"
        }
        
        mock_updated_equipment = {
            "id": equipment_id,
            "name": "Updated Camera",
            "type": "camera",
            "daily_rate": 110.0,
            "brand_system_id": 1,
            "serial_number": "SN001",
            "description": "Updated description"
        }
        
        mock_equipment_service.update_equipment.return_value = mock_updated_equipment
        
        # Override the dependency using container
        with app.container.equipment_service.override(mock_equipment_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.put(f"/api/admin/equipment/{equipment_id}", json=update_data)
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == equipment_id
                assert data["name"] == "Updated Camera"
                assert data["daily_rate"] == 110.0
                assert data["description"] == "Updated description"
                mock_equipment_service.update_equipment.assert_called_once()

    def test_delete_admin_equipment_success(self, client, mock_equipment_service, mock_current_admin_user):
        """Тест успешного удаления оборудования администратором"""
        # Arrange
        equipment_id = 1
        mock_delete_result = {"message": "Equipment deleted successfully"}
        
        mock_equipment_service.delete_equipment.return_value = mock_delete_result
        
        # Override the dependency using container
        with app.container.equipment_service.override(mock_equipment_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.delete(f"/api/admin/equipment/{equipment_id}")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["message"] == "Equipment deleted successfully"
                mock_equipment_service.delete_equipment.assert_called_once_with(equipment_id)

    def test_get_admin_reservations_success(self, client, mock_reservation_service, mock_current_admin_user):
        """Тест успешного получения резерваций администратором"""
        # Arrange
        mock_reservations = [
            {
                "id": 1,
                "user_id": 2,
                "start_date": "2024-01-15",
                "end_date": "2024-01-20",
                "total_price": 500.0,
                "status": "active"
            },
            {
                "id": 2,
                "user_id": 3,
                "start_date": "2024-01-25",
                "end_date": "2024-01-30",
                "total_price": 300.0,
                "status": "completed"
            }
        ]
        
        mock_reservation_service.get_all_reservations_paginated.return_value = (mock_reservations, 2)
        
        # Override the dependency using container
        with app.container.reservation_service.override(mock_reservation_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/reservations")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 2
                assert data["total_count"] == 2
                assert data["items"][0]["id"] == 1
                assert data["items"][1]["id"] == 2
                mock_reservation_service.get_all_reservations_paginated.assert_called_once()

    def test_get_admin_rentals_success(self, client, mock_rental_service, mock_current_admin_user):
        """Тест успешного получения аренд администратором"""
        # Arrange
        mock_rentals = [
            {
                "id": 1,
                "user_id": 2,
                "actual_start_date": "2024-01-15",
                "actual_end_date": "2024-01-20",
                "total_price": 500.0,
                "status": "active"
            },
            {
                "id": 2,
                "user_id": 3,
                "actual_start_date": "2024-01-25",
                "actual_end_date": "2024-01-30",
                "total_price": 300.0,
                "status": "completed"
            }
        ]
        
        mock_rental_service.get_all_rentals_paginated.return_value = (mock_rentals, 2)
        
        # Override the dependency using container
        with app.container.rental_service.override(mock_rental_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/rentals")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 2
                assert data["total_count"] == 2
                assert data["items"][0]["id"] == 1
                assert data["items"][1]["id"] == 2
                mock_rental_service.get_all_rentals_paginated.assert_called_once()

    def test_get_admin_user_balance_history_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешного получения истории баланса пользователя администратором"""
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

    def test_adjust_admin_user_balance_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешной корректировки баланса пользователя администратором"""
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

    def test_delete_admin_balance_history_entry_success(self, client, mock_user_service, mock_current_admin_user):
        """Тест успешного удаления записи истории баланса администратором"""
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

    def test_get_admin_dashboard_unauthorized(self, client):
        """Тест получения дашборда без авторизации"""
        # Arrange
        mock_dashboard_data = {"total_users": 100}
        
        # Override the dependency using container
        with app.container.dashboard_service.override(AsyncMock(return_value=mock_dashboard_data)):
            # Act - без авторизации
            response = client.get("/api/admin/dashboard")
            
            # Assert
            assert response.status_code == 401
            data = response.json()
            assert "detail" in data

    def test_get_admin_users_unauthorized(self, client, mock_user_service):
        """Тест получения пользователей без авторизации"""
        # Arrange
        mock_users = []
        mock_user_service.get_all_users_paginated.return_value = (mock_users, 0)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            # Act - без авторизации
            response = client.get("/api/admin/users")
            
            # Assert
            assert response.status_code == 401
            data = response.json()
            assert "detail" in data

    def test_create_admin_equipment_unauthorized(self, client, mock_equipment_service):
        """Тест создания оборудования без авторизации"""
        # Arrange
        equipment_data = {
            "name": "New Camera",
            "type": "camera",
            "daily_rate": 100.0,
            "brand_system_id": 1,
            "serial_number": "SN999"
        }
        
        # Override the dependency using container
        with app.container.equipment_service.override(mock_equipment_service):
            # Act - без авторизации
            response = client.post("/api/admin/equipment", json=equipment_data)
            
            # Assert
            assert response.status_code == 401
            data = response.json()
            assert "detail" in data

    def test_get_admin_user_by_id_not_found(self, client, mock_user_service, mock_current_admin_user):
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

    def test_update_admin_user_not_found(self, client, mock_user_service, mock_current_admin_user):
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

    def test_block_admin_user_not_found(self, client, mock_user_service, mock_current_admin_user):
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

    def test_create_admin_equipment_validation_error(self, client, mock_equipment_service, mock_current_admin_user):
        """Тест создания оборудования с невалидными данными"""
        # Arrange
        equipment_data = {
            "name": "",  # Пустое имя
            "type": "camera",
            "daily_rate": -10.0,  # Отрицательная ставка
            "brand_system_id": 1,
            "serial_number": "SN999"
        }
        
        mock_equipment_service.create_equipment.side_effect = ValueError("Invalid equipment data")
        
        # Override the dependency using container
        with app.container.equipment_service.override(mock_equipment_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post("/api/admin/equipment", json=equipment_data)
                
                # Assert
                assert response.status_code == 400
                data = response.json()
                assert "detail" in data
                assert "Invalid equipment data" in data["detail"]

    def test_get_admin_dashboard_database_error(self, client, mock_current_admin_user):
        """Тест получения дашборда при ошибке базы данных"""
        # Arrange
        mock_dashboard_service = AsyncMock()
        mock_dashboard_service.side_effect = Exception("Database connection error")
        
        # Override the dependency using container
        with app.container.dashboard_service.override(mock_dashboard_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/dashboard")
                
                # Assert
                assert response.status_code == 500
                data = response.json()
                assert "detail" in data
                assert "Database connection error" in data["detail"]

    def test_get_admin_users_database_error(self, client, mock_user_service, mock_current_admin_user):
        """Тест получения пользователей при ошибке базы данных"""
        # Arrange
        mock_user_service.get_all_users_paginated.side_effect = Exception("Database connection error")
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/users")
                
                # Assert
                assert response.status_code == 500
                data = response.json()
                assert "detail" in data
                assert "Database connection error" in data["detail"]

    def test_adjust_admin_user_balance_validation_error(self, client, mock_user_service, mock_current_admin_user):
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

    def test_delete_admin_balance_history_entry_not_found(self, client, mock_user_service, mock_current_admin_user):
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

    def test_get_admin_users_with_pagination_success(self, client, mock_user_service, mock_current_admin_user):
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
                response = client.get("/api/admin/users?skip=0&limit=10")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 1
                assert data["total_count"] == 1
                assert data["items"][0]["email"] == "user1@test.com"
                mock_user_service.get_all_users_paginated.assert_called_once()

    def test_get_admin_users_with_search_success(self, client, mock_user_service, mock_current_admin_user):
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
                response = client.get("/api/admin/users?search=user1")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 1
                assert data["total_count"] == 1
                assert data["items"][0]["email"] == "user1@test.com"
                mock_user_service.get_all_users_paginated.assert_called_once()

    def test_get_admin_users_with_role_filter_success(self, client, mock_user_service, mock_current_admin_user):
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
                response = client.get("/api/admin/users?role=user")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 1
                assert data["total_count"] == 1
                assert data["items"][0]["email"] == "user1@test.com"
                assert data["items"][0]["role"] == "user"
                mock_user_service.get_all_users_paginated.assert_called_once()

    def test_get_admin_users_with_status_filter_success(self, client, mock_user_service, mock_current_admin_user):
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
                response = client.get("/api/admin/users?is_active=true")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 1
                assert data["total_count"] == 1
                assert data["items"][0]["email"] == "user1@test.com"
                assert data["items"][0]["is_active"] is True
                mock_user_service.get_all_users_paginated.assert_called_once()

    def test_get_admin_users_empty_result(self, client, mock_user_service, mock_current_admin_user):
        """Тест получения пустого списка пользователей"""
        # Arrange
        mock_users = []
        mock_user_service.get_all_users_paginated.return_value = (mock_users, 0)
        
        # Override the dependency using container
        with app.container.user_service.override(mock_user_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/users")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 0
                assert data["total_count"] == 0
                mock_user_service.get_all_users_paginated.assert_called_once()

    def test_get_admin_user_balance_history_empty_result(self, client, mock_user_service, mock_current_admin_user):
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




















