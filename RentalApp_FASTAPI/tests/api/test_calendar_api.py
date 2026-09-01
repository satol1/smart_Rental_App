"""
Тесты для calendar_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container


class TestCalendarAPI:
    """Тесты для API календаря"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_calendar_service(self):
        """Мок сервиса календаря"""
        service = AsyncMock()
        service.get_calendar_events = AsyncMock()
        service.get_equipment_availability = AsyncMock()
        service.get_reservation_details = AsyncMock()
        service.get_rental_details = AsyncMock()
        return service

    def test_get_calendar_events_success(self, client, mock_calendar_service):
        """Тест успешного получения событий календаря"""
        # Arrange
        mock_events = [
            {
                "id": 1,
                "title": "Reservation",
                "start": "2024-01-01T10:00:00",
                "end": "2024-01-05T18:00:00",
                "type": "reservation"
            },
            {
                "id": 2,
                "title": "Rental",
                "start": "2024-01-10T09:00:00",
                "end": "2024-01-15T17:00:00",
                "type": "rental"
            }
        ]
        
        mock_calendar_service.get_calendar_events.return_value = mock_events
        
        # Override the dependency using container
        with app.container.calendar_service.override(mock_calendar_service):
            # Act
            response = client.get("/api/calendar/events")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]["type"] == "reservation"
            assert data[1]["type"] == "rental"
            mock_calendar_service.get_calendar_events.assert_called_once()

    def test_get_equipment_availability_success(self, client, mock_calendar_service):
        """Тест успешного получения доступности оборудования"""
        # Arrange
        equipment_id = 1
        start_date = "2024-01-01"
        end_date = "2024-01-31"
        
        mock_availability = {
            "equipment_id": equipment_id,
            "available_dates": ["2024-01-01", "2024-01-02", "2024-01-03"],
            "unavailable_dates": ["2024-01-05", "2024-01-06"]
        }
        
        mock_calendar_service.get_equipment_availability.return_value = mock_availability
        
        # Override the dependency using container
        with app.container.calendar_service.override(mock_calendar_service):
            # Act
            response = client.get(f"/api/calendar/equipment/{equipment_id}/availability?start_date={start_date}&end_date={end_date}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["equipment_id"] == equipment_id
            assert "available_dates" in data
            assert "unavailable_dates" in data
            mock_calendar_service.get_equipment_availability.assert_called_once()

    def test_get_reservation_details_success(self, client, mock_calendar_service):
        """Тест успешного получения деталей резервации"""
        # Arrange
        reservation_id = 1
        mock_reservation_details = {
            "id": reservation_id,
            "user_id": 1,
            "equipment_ids": [1, 2],
            "start_date": "2024-01-01",
            "end_date": "2024-01-05",
            "status": "active"
        }
        
        mock_calendar_service.get_reservation_details.return_value = mock_reservation_details
        
        # Override the dependency using container
        with app.container.calendar_service.override(mock_calendar_service):
            # Act
            response = client.get(f"/api/calendar/reservations/{reservation_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == reservation_id
            assert data["status"] == "active"
            assert data["equipment_ids"] == [1, 2]
            mock_calendar_service.get_reservation_details.assert_called_once()

    def test_get_rental_details_success(self, client, mock_calendar_service):
        """Тест успешного получения деталей аренды"""
        # Arrange
        rental_id = 1
        mock_rental_details = {
            "id": rental_id,
            "user_id": 1,
            "equipment_ids": [1, 2],
            "start_date": "2024-01-01",
            "end_date": "2024-01-05",
            "status": "active",
            "total_cost": 500.0
        }
        
        mock_calendar_service.get_rental_details.return_value = mock_rental_details
        
        # Override the dependency using container
        with app.container.calendar_service.override(mock_calendar_service):
            # Act
            response = client.get(f"/api/calendar/rentals/{rental_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == rental_id
            assert data["status"] == "active"
            assert data["total_cost"] == 500.0
            mock_calendar_service.get_rental_details.assert_called_once()

    def test_get_calendar_events_empty(self, client, mock_calendar_service):
        """Тест получения пустого списка событий календаря"""
        # Arrange
        mock_calendar_service.get_calendar_events.return_value = []
        
        # Override the dependency using container
        with app.container.calendar_service.override(mock_calendar_service):
            # Act
            response = client.get("/api/calendar/events")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 0
            mock_calendar_service.get_calendar_events.assert_called_once()




















