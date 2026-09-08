"""
Тесты для order_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

from api.main_api import app
from containers import Container


class TestOrderAPI:
    """Тесты для API заказов"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_reservation_lifecycle_service(self):
        """Мок сервиса жизненного цикла резерваций"""
        service = AsyncMock()
        service.create_user_reservation = AsyncMock()
        service.update_user_reservation = AsyncMock()
        service.cancel_user_reservation = AsyncMock()
        service.create_admin_reservation = AsyncMock()
        service.update_admin_reservation = AsyncMock()
        service.cancel_admin_reservation = AsyncMock()
        return service

    @pytest.fixture
    def mock_rental_lifecycle_service(self):
        """Мок сервиса жизненного цикла аренды"""
        service = AsyncMock()
        service.create_rental_from_reservation = AsyncMock()
        service.create_rental_from_scratch = AsyncMock()
        service.return_rental = AsyncMock()
        return service

    @pytest.fixture
    def mock_reservation_query_service(self):
        """Мок сервиса запросов резерваций"""
        service = AsyncMock()
        service.get_my_reservations = AsyncMock()
        service.get_reservation_by_id = AsyncMock()
        return service

    @pytest.fixture
    def mock_rental_query_service(self):
        """Мок сервиса запросов аренды"""
        service = AsyncMock()
        service.get_rentals_for_user = AsyncMock()
        service.get_paginated_rentals = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_user(self):
        """Мок текущего пользователя"""
        from api.models.user import User
        user = User()
        user.id = 1
        user.email = "user@test.com"
        user.role = "user"
        user.full_name = "Test User"
        user.is_active = True
        return user

    @pytest.fixture
    def mock_current_admin_user(self):
        """Мок пользователя-администратора"""
        from api.models.user import User
        user = User()
        user.id = 2
        user.email = "admin@test.com"
        user.role = "admin"
        user.full_name = "Admin User"
        user.is_active = True
        return user

    def test_create_user_reservation_success(self, client, mock_reservation_lifecycle_service, mock_current_user):
        """Тест успешного создания резервации пользователем"""
        # Arrange
        reservation_data = {
            "equipment_ids": [1, 2],
            "start_date": "2024-01-15",
            "end_date": "2024-01-20",
            "accessory_ids": [1],
            "promo_code": "DISCOUNT10"
        }
        
        mock_reservation = {
            "id": 1,
            "user_id": mock_current_user.id,
            "start_date": "2024-01-15",
            "end_date": "2024-01-20",
            "total_price": 500.0,
            "status": "active"
        }
        
        mock_reservation_lifecycle_service.create_user_reservation.return_value = mock_reservation
        
        # Override the dependency using container
        with app.container.reservation_lifecycle_service.override(mock_reservation_lifecycle_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.post("/api/orders/reservations", json=reservation_data)
                
                # Assert
                assert response.status_code == 201
                data = response.json()
                assert data["id"] == 1
                assert data["user_id"] == mock_current_user.id
                assert data["start_date"] == "2024-01-15"
                assert data["end_date"] == "2024-01-20"
                assert data["total_price"] == 500.0
                assert data["status"] == "active"
                mock_reservation_lifecycle_service.create_user_reservation.assert_called_once()

    def test_create_admin_reservation_success(self, client, mock_reservation_lifecycle_service, mock_current_admin_user):
        """Тест успешного создания резервации администратором"""
        # Arrange
        reservation_data = {
            "user_id": 3,
            "equipment_ids": [1, 2],
            "start_date": "2024-01-15",
            "end_date": "2024-01-20",
            "accessory_ids": [1],
            "promo_code": "DISCOUNT10"
        }
        
        mock_reservation = {
            "id": 2,
            "user_id": 3,
            "start_date": "2024-01-15",
            "end_date": "2024-01-20",
            "total_price": 500.0,
            "status": "active"
        }
        
        mock_reservation_lifecycle_service.create_admin_reservation.return_value = mock_reservation
        
        # Override the dependency using container
        with app.container.reservation_lifecycle_service.override(mock_reservation_lifecycle_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post("/api/admin/orders/reservations", json=reservation_data)
                
                # Assert
                assert response.status_code == 201
                data = response.json()
                assert data["id"] == 2
                assert data["user_id"] == 3
                assert data["start_date"] == "2024-01-15"
                assert data["end_date"] == "2024-01-20"
                assert data["total_price"] == 500.0
                assert data["status"] == "active"
                mock_reservation_lifecycle_service.create_admin_reservation.assert_called_once()

    def test_create_rental_from_reservation_success(self, client, mock_rental_lifecycle_service, mock_current_admin_user):
        """Тест успешного создания аренды из резервации"""
        # Arrange
        rental_data = {
            "reservation_id": 1,
            "actual_start_date": "2024-01-15",
            "actual_end_date": "2024-01-20",
            "total_price": 500.0
        }
        
        mock_rental = {
            "id": 1,
            "reservation_id": 1,
            "user_id": 3,
            "actual_start_date": "2024-01-15",
            "actual_end_date": "2024-01-20",
            "total_price": 500.0,
            "status": "active"
        }
        
        mock_rental_lifecycle_service.create_rental_from_reservation.return_value = mock_rental
        
        # Override the dependency using container
        with app.container.rental_lifecycle_service.override(mock_rental_lifecycle_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post("/api/admin/orders/rentals/from-reservation", json=rental_data)
                
                # Assert
                assert response.status_code == 201
                data = response.json()
                assert data["id"] == 1
                assert data["reservation_id"] == 1
                assert data["user_id"] == 3
                assert data["actual_start_date"] == "2024-01-15"
                assert data["actual_end_date"] == "2024-01-20"
                assert data["total_price"] == 500.0
                assert data["status"] == "active"
                mock_rental_lifecycle_service.create_rental_from_reservation.assert_called_once()

    def test_create_rental_from_scratch_success(self, client, mock_rental_lifecycle_service, mock_current_admin_user):
        """Тест успешного создания аренды с нуля"""
        # Arrange
        rental_data = {
            "user_id": 3,
            "equipment_ids": [1, 2],
            "actual_start_date": "2024-01-15",
            "actual_end_date": "2024-01-20",
            "accessory_ids": [1],
            "total_price": 500.0
        }
        
        mock_rental = {
            "id": 2,
            "user_id": 3,
            "actual_start_date": "2024-01-15",
            "actual_end_date": "2024-01-20",
            "total_price": 500.0,
            "status": "active"
        }
        
        mock_rental_lifecycle_service.create_rental_from_scratch.return_value = mock_rental
        
        # Override the dependency using container
        with app.container.rental_lifecycle_service.override(mock_rental_lifecycle_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post("/api/admin/orders/rentals/from-scratch", json=rental_data)
                
                # Assert
                assert response.status_code == 201
                data = response.json()
                assert data["id"] == 2
                assert data["user_id"] == 3
                assert data["actual_start_date"] == "2024-01-15"
                assert data["actual_end_date"] == "2024-01-20"
                assert data["total_price"] == 500.0
                assert data["status"] == "active"
                mock_rental_lifecycle_service.create_rental_from_scratch.assert_called_once()

    def test_get_my_reservations_success(self, client, mock_reservation_query_service, mock_current_user):
        """Тест успешного получения резерваций пользователя"""
        # Arrange
        mock_reservations = [
            {
                "id": 1,
                "user_id": mock_current_user.id,
                "start_date": "2024-01-15",
                "end_date": "2024-01-20",
                "total_price": 500.0,
                "status": "active"
            },
            {
                "id": 2,
                "user_id": mock_current_user.id,
                "start_date": "2024-01-25",
                "end_date": "2024-01-30",
                "total_price": 300.0,
                "status": "completed"
            }
        ]
        
        mock_reservation_query_service.get_my_reservations.return_value = (mock_reservations, 2)
        
        # Override the dependency using container
        with app.container.reservation_query_service.override(mock_reservation_query_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.get("/api/orders/reservations/my")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 2
                assert data["total_count"] == 2
                assert data["items"][0]["id"] == 1
                assert data["items"][1]["id"] == 2
                mock_reservation_query_service.get_my_reservations.assert_called_once()

    def test_get_my_rentals_success(self, client, mock_rental_query_service, mock_current_user):
        """Тест успешного получения аренд пользователя"""
        # Arrange
        mock_rentals = [
            {
                "id": 1,
                "user_id": mock_current_user.id,
                "actual_start_date": "2024-01-15",
                "actual_end_date": "2024-01-20",
                "total_price": 500.0,
                "status": "active"
            },
            {
                "id": 2,
                "user_id": mock_current_user.id,
                "actual_start_date": "2024-01-25",
                "actual_end_date": "2024-01-30",
                "total_price": 300.0,
                "status": "completed"
            }
        ]
        
        mock_rental_query_service.get_rentals_for_user.return_value = (mock_rentals, 2)
        
        # Override the dependency using container
        with app.container.rental_query_service.override(mock_rental_query_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.get("/api/orders/rentals/my")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 2
                assert data["total_count"] == 2
                assert data["items"][0]["id"] == 1
                assert data["items"][1]["id"] == 2
                mock_rental_query_service.get_rentals_for_user.assert_called_once()

    def test_get_all_rentals_admin_success(self, client, mock_rental_query_service, mock_current_admin_user):
        """Тест успешного получения всех аренд администратором"""
        # Arrange
        mock_rentals = [
            {
                "id": 1,
                "user_id": 1,
                "actual_start_date": "2024-01-15",
                "actual_end_date": "2024-01-20",
                "total_price": 500.0,
                "status": "active"
            },
            {
                "id": 2,
                "user_id": 2,
                "actual_start_date": "2024-01-25",
                "actual_end_date": "2024-01-30",
                "total_price": 300.0,
                "status": "completed"
            }
        ]
        
        mock_rental_query_service.get_paginated_rentals.return_value = (mock_rentals, 2)
        
        # Override the dependency using container
        with app.container.rental_query_service.override(mock_rental_query_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/orders/rentals")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 2
                assert data["total_count"] == 2
                assert data["items"][0]["id"] == 1
                assert data["items"][1]["id"] == 2
                mock_rental_query_service.get_paginated_rentals.assert_called_once()

    def test_update_user_reservation_success(self, client, mock_reservation_lifecycle_service, mock_current_user):
        """Тест успешного обновления резервации пользователем"""
        # Arrange
        reservation_id = 1
        update_data = {
            "start_date": "2024-01-16",
            "end_date": "2024-01-21",
            "accessory_ids": [1, 2]
        }
        
        mock_updated_reservation = {
            "id": reservation_id,
            "user_id": mock_current_user.id,
            "start_date": "2024-01-16",
            "end_date": "2024-01-21",
            "total_price": 550.0,
            "status": "active"
        }
        
        mock_reservation_lifecycle_service.update_user_reservation.return_value = mock_updated_reservation
        
        # Override the dependency using container
        with app.container.reservation_lifecycle_service.override(mock_reservation_lifecycle_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.put(f"/api/orders/reservations/{reservation_id}", json=update_data)
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == reservation_id
                assert data["user_id"] == mock_current_user.id
                assert data["start_date"] == "2024-01-16"
                assert data["end_date"] == "2024-01-21"
                assert data["total_price"] == 550.0
                assert data["status"] == "active"
                mock_reservation_lifecycle_service.update_user_reservation.assert_called_once()

    def test_cancel_user_reservation_success(self, client, mock_reservation_lifecycle_service, mock_current_user):
        """Тест успешной отмены резервации пользователем"""
        # Arrange
        reservation_id = 1
        mock_cancel_result = {"message": "Reservation cancelled successfully"}
        
        mock_reservation_lifecycle_service.cancel_user_reservation.return_value = mock_cancel_result
        
        # Override the dependency using container
        with app.container.reservation_lifecycle_service.override(mock_reservation_lifecycle_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.delete(f"/api/orders/reservations/{reservation_id}")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["message"] == "Reservation cancelled successfully"
                mock_reservation_lifecycle_service.cancel_user_reservation.assert_called_once_with(reservation_id, mock_current_user.id)

    def test_return_rental_success(self, client, mock_rental_lifecycle_service, mock_current_admin_user):
        """Тест успешного возврата аренды"""
        # Arrange
        rental_id = 1
        return_data = {
            "actual_return_date": "2024-01-18"
        }
        
        mock_return_result = {"message": "Rental returned successfully"}
        
        mock_rental_lifecycle_service.return_rental.return_value = mock_return_result
        
        # Override the dependency using container
        with app.container.rental_lifecycle_service.override(mock_rental_lifecycle_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post(f"/api/admin/orders/rentals/{rental_id}/return", json=return_data)
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["message"] == "Rental returned successfully"
                mock_rental_lifecycle_service.return_rental.assert_called_once_with(rental_id, return_data["actual_return_date"])

    def test_get_reservation_by_id_success(self, client, mock_reservation_query_service, mock_current_user):
        """Тест успешного получения резервации по ID"""
        # Arrange
        reservation_id = 1
        mock_reservation = {
            "id": reservation_id,
            "user_id": mock_current_user.id,
            "start_date": "2024-01-15",
            "end_date": "2024-01-20",
            "total_price": 500.0,
            "status": "active"
        }
        
        mock_reservation_query_service.get_reservation_by_id.return_value = mock_reservation
        
        # Override the dependency using container
        with app.container.reservation_query_service.override(mock_reservation_query_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.get(f"/api/orders/reservations/{reservation_id}")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == reservation_id
                assert data["user_id"] == mock_current_user.id
                assert data["start_date"] == "2024-01-15"
                assert data["end_date"] == "2024-01-20"
                assert data["total_price"] == 500.0
                assert data["status"] == "active"
                mock_reservation_query_service.get_reservation_by_id.assert_called_once_with(reservation_id, mock_current_user.id)

    def test_create_user_reservation_validation_error(self, client, mock_reservation_lifecycle_service, mock_current_user):
        """Тест создания резервации с невалидными данными"""
        # Arrange
        reservation_data = {
            "equipment_ids": [],  # Пустой список оборудования
            "start_date": "2024-01-15",
            "end_date": "2024-01-20"
        }
        
        mock_reservation_lifecycle_service.create_user_reservation.side_effect = ValueError("Список оборудования не может быть пустым")
        
        # Override the dependency using container
        with app.container.reservation_lifecycle_service.override(mock_reservation_lifecycle_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.post("/api/orders/reservations", json=reservation_data)
                
                # Assert
                assert response.status_code == 400
                data = response.json()
                assert "detail" in data
                assert "Список оборудования не может быть пустым" in data["detail"]

    def test_create_rental_from_reservation_equipment_not_found(self, client, mock_rental_lifecycle_service, mock_current_admin_user):
        """Тест создания аренды из резервации с несуществующей резервацией"""
        # Arrange
        rental_data = {
            "reservation_id": 999,  # Несуществующая резервация
            "actual_start_date": "2024-01-15",
            "actual_end_date": "2024-01-20",
            "total_price": 500.0
        }
        
        mock_rental_lifecycle_service.create_rental_from_reservation.side_effect = ValueError("Reservation not found")
        
        # Override the dependency using container
        with app.container.rental_lifecycle_service.override(mock_rental_lifecycle_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post("/api/admin/orders/rentals/from-reservation", json=rental_data)
                
                # Assert
                assert response.status_code == 400
                data = response.json()
                assert "detail" in data
                assert "Reservation not found" in data["detail"]

    def test_get_my_reservations_unauthorized(self, client, mock_reservation_query_service):
        """Тест получения резерваций без авторизации"""
        # Arrange
        mock_reservations = []
        mock_reservation_query_service.get_my_reservations.return_value = (mock_reservations, 0)
        
        # Override the dependency using container
        with app.container.reservation_query_service.override(mock_reservation_query_service):
            # Act - без авторизации
            response = client.get("/api/orders/reservations/my")
            
            # Assert
            assert response.status_code == 401
            data = response.json()
            assert "detail" in data

    def test_create_user_reservation_database_error(self, client, mock_reservation_lifecycle_service, mock_current_user):
        """Тест создания резервации при ошибке базы данных"""
        # Arrange
        reservation_data = {
            "equipment_ids": [1, 2],
            "start_date": "2024-01-15",
            "end_date": "2024-01-20"
        }
        
        mock_reservation_lifecycle_service.create_user_reservation.side_effect = Exception("Database connection error")
        
        # Override the dependency using container
        with app.container.reservation_lifecycle_service.override(mock_reservation_lifecycle_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.post("/api/orders/reservations", json=reservation_data)
                
                # Assert
                assert response.status_code == 500
                data = response.json()
                assert "detail" in data
                assert "Database connection error" in data["detail"]

    def test_cancel_user_reservation_not_found(self, client, mock_reservation_lifecycle_service, mock_current_user):
        """Тест отмены несуществующей резервации"""
        # Arrange
        reservation_id = 999
        mock_reservation_lifecycle_service.cancel_user_reservation.side_effect = ValueError("Reservation not found")
        
        # Override the dependency using container
        with app.container.reservation_lifecycle_service.override(mock_reservation_lifecycle_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.delete(f"/api/orders/reservations/{reservation_id}")
                
                # Assert
                assert response.status_code == 400
                data = response.json()
                assert "detail" in data
                assert "Reservation not found" in data["detail"]

    def test_return_rental_not_found(self, client, mock_rental_lifecycle_service, mock_current_admin_user):
        """Тест возврата несуществующей аренды"""
        # Arrange
        rental_id = 999
        return_data = {
            "actual_return_date": "2024-01-18"
        }
        
        mock_rental_lifecycle_service.return_rental.side_effect = ValueError("Rental not found")
        
        # Override the dependency using container
        with app.container.rental_lifecycle_service.override(mock_rental_lifecycle_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post(f"/api/admin/orders/rentals/{rental_id}/return", json=return_data)
                
                # Assert
                assert response.status_code == 400
                data = response.json()
                assert "detail" in data
                assert "Rental not found" in data["detail"]

    def test_get_my_reservations_empty_result(self, client, mock_reservation_query_service, mock_current_user):
        """Тест получения пустого списка резерваций"""
        # Arrange
        mock_reservations = []
        mock_reservation_query_service.get_my_reservations.return_value = (mock_reservations, 0)
        
        # Override the dependency using container
        with app.container.reservation_query_service.override(mock_reservation_query_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.get("/api/orders/reservations/my")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 0
                assert data["total_count"] == 0
                mock_reservation_query_service.get_my_reservations.assert_called_once()

    def test_get_my_rentals_empty_result(self, client, mock_rental_query_service, mock_current_user):
        """Тест получения пустого списка аренд"""
        # Arrange
        mock_rentals = []
        mock_rental_query_service.get_rentals_for_user.return_value = (mock_rentals, 0)
        
        # Override the dependency using container
        with app.container.rental_query_service.override(mock_rental_query_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                # Act
                response = client.get("/api/orders/rentals/my")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data["items"]) == 0
                assert data["total_count"] == 0
                mock_rental_query_service.get_rentals_for_user.assert_called_once()
