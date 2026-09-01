"""
Тесты для reservation_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container
from api.models.reservation import Reservation


class TestReservationAPI:
    """Тесты для API резерваций"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_reservation_service(self):
        """Мок сервиса резерваций"""
        service = AsyncMock()
        service.create_reservation = AsyncMock()
        service.get_user_reservations = AsyncMock()
        service.cancel_reservation = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_user(self):
        """Мок текущего пользователя"""
        from api.models.user import User
        user = User()
        user.id = 1
        user.email = "test@example.com"
        user.full_name = "Test User"
        user.is_active = True
        return user

    def test_create_reservation_success(self, client, mock_reservation_service, mock_current_user):
        """Тест успешного создания резервации"""
        # Arrange
        reservation_data = {
            "equipment_ids": [1, 2],
            "start_date": "2024-01-01",
            "end_date": "2024-01-05",
            "notes": "Test reservation"
        }
        
        mock_reservation = Reservation()
        mock_reservation.id = 1
        mock_reservation.user_id = 1
        mock_reservation.start_date = "2024-01-01"
        mock_reservation.end_date = "2024-01-05"
        
        mock_reservation_service.create_reservation.return_value = mock_reservation
        
        # Override the dependency using container
        with app.container.reservation_lifecycle_service.override(mock_reservation_service):
            # Act
            response = client.post("/api/reservations/", json=reservation_data)
            
            # Assert
            assert response.status_code == 201
            data = response.json()
            assert data["id"] == 1
            assert data["user_id"] == 1
            assert data["start_date"] == "2024-01-01"
            assert data["end_date"] == "2024-01-05"
            mock_reservation_service.create_reservation.assert_called_once()

    def test_get_user_reservations_success(self, client, mock_reservation_service, mock_current_user):
        """Тест успешного получения резерваций пользователя"""
        # Arrange
        mock_reservations = [
            {"id": 1, "user_id": 1, "start_date": "2024-01-01", "end_date": "2024-01-05"},
            {"id": 2, "user_id": 1, "start_date": "2024-02-01", "end_date": "2024-02-05"}
        ]
        
        mock_reservation_service.get_user_reservations.return_value = mock_reservations
        
        # Override the dependency using container
        with app.container.reservation_query_service.override(mock_reservation_service):
            # Act
            response = client.get("/api/reservations/my")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]["id"] == 1
            assert data[1]["id"] == 2
            mock_reservation_service.get_user_reservations.assert_called_once()

    def test_cancel_reservation_success(self, client, mock_reservation_service, mock_current_user):
        """Тест успешной отмены резервации"""
        # Arrange
        reservation_id = 1
        mock_reservation_service.cancel_reservation.return_value = {"message": "Резервация отменена"}
        
        # Override the dependency using container
        with app.container.reservation_lifecycle_service.override(mock_reservation_service):
            # Act
            response = client.delete(f"/api/reservations/{reservation_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Резервация отменена"
            mock_reservation_service.cancel_reservation.assert_called_once()

    def test_cancel_reservation_not_found(self, client, mock_reservation_service, mock_current_user):
        """Тест отмены несуществующей резервации"""
        # Arrange
        reservation_id = 999
        mock_reservation_service.cancel_reservation.return_value = None
        
        # Override the dependency using container
        with app.container.reservation_lifecycle_service.override(mock_reservation_service):
            # Act
            response = client.delete(f"/api/reservations/{reservation_id}")
            
            # Assert
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert "Резервация не найдена" in data["detail"]




















