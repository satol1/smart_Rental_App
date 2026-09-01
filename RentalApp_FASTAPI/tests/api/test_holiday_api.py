"""
Тесты для holiday_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container


class TestHolidayAPI:
    """Тесты для API праздников"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_holiday_service(self):
        """Мок сервиса праздников"""
        service = AsyncMock()
        service.get_holidays = AsyncMock()
        service.create_holiday = AsyncMock()
        service.delete_holiday = AsyncMock()
        return service

    def test_get_holidays_success(self, client, mock_holiday_service):
        """Тест успешного получения праздников"""
        # Arrange
        mock_holidays = [
            {"id": 1, "date": "2024-01-01", "name": "Новый год"},
            {"id": 2, "date": "2024-12-25", "name": "Рождество"}
        ]
        
        mock_holiday_service.get_holidays.return_value = mock_holidays
        
        # Override the dependency using container
        with app.container.holiday_service.override(mock_holiday_service):
            # Act
            response = client.get("/api/holidays/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]["name"] == "Новый год"
            assert data[1]["name"] == "Рождество"
            mock_holiday_service.get_holidays.assert_called_once()

    def test_create_holiday_success(self, client, mock_holiday_service):
        """Тест успешного создания праздника"""
        # Arrange
        holiday_data = {
            "date": "2024-02-14",
            "name": "День святого Валентина"
        }
        
        mock_holiday = {
            "id": 1,
            "date": "2024-02-14",
            "name": "День святого Валентина"
        }
        
        mock_holiday_service.create_holiday.return_value = mock_holiday
        
        # Override the dependency using container
        with app.container.holiday_service.override(mock_holiday_service):
            # Act
            response = client.post("/api/holidays/", json=holiday_data)
            
            # Assert
            assert response.status_code == 201
            data = response.json()
            assert data["id"] == 1
            assert data["name"] == "День святого Валентина"
            assert data["date"] == "2024-02-14"
            mock_holiday_service.create_holiday.assert_called_once()

    def test_delete_holiday_success(self, client, mock_holiday_service):
        """Тест успешного удаления праздника"""
        # Arrange
        holiday_id = 1
        mock_holiday_service.delete_holiday.return_value = {"message": "Праздник удален"}
        
        # Override the dependency using container
        with app.container.holiday_service.override(mock_holiday_service):
            # Act
            response = client.delete(f"/api/holidays/{holiday_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Праздник удален"
            mock_holiday_service.delete_holiday.assert_called_once_with(holiday_id)

    def test_get_holidays_empty(self, client, mock_holiday_service):
        """Тест получения пустого списка праздников"""
        # Arrange
        mock_holiday_service.get_holidays.return_value = []
        
        # Override the dependency using container
        with app.container.holiday_service.override(mock_holiday_service):
            # Act
            response = client.get("/api/holidays/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 0
            mock_holiday_service.get_holidays.assert_called_once()

    def test_create_holiday_duplicate_date(self, client, mock_holiday_service):
        """Тест создания праздника с дублирующейся датой"""
        # Arrange
        holiday_data = {
            "date": "2024-01-01",
            "name": "Дублирующий праздник"
        }
        
        mock_holiday_service.create_holiday.side_effect = ValueError("Праздник на эту дату уже существует")
        
        # Override the dependency using container
        with app.container.holiday_service.override(mock_holiday_service):
            # Act
            response = client.post("/api/holidays/", json=holiday_data)
            
            # Assert
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "Праздник на эту дату уже существует" in data["detail"]




















