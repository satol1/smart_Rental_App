"""
Тесты для discount_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container


class TestDiscountAPI:
    """Тесты для API скидок"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_discount_service(self):
        """Мок сервиса скидок"""
        service = AsyncMock()
        service.get_duration_discount_percentage = AsyncMock()
        service.get_all_discounts = AsyncMock()
        return service

    def test_get_duration_discount_success(self, client, mock_discount_service):
        """Тест успешного получения скидки по продолжительности"""
        # Arrange
        days = 7
        mock_discount_service.get_duration_discount_percentage.return_value = 10.0
        
        # Override the dependency using container
        with app.container.discount_service.override(mock_discount_service):
            # Act
            response = client.get(f"/api/discounts/duration?days={days}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["discount_percentage"] == 10.0
            assert data["days"] == days
            mock_discount_service.get_duration_discount_percentage.assert_called_once_with(days)

    def test_get_duration_discount_no_discount(self, client, mock_discount_service):
        """Тест получения скидки для короткого периода (без скидки)"""
        # Arrange
        days = 2
        mock_discount_service.get_duration_discount_percentage.return_value = 0.0
        
        # Override the dependency using container
        with app.container.discount_service.override(mock_discount_service):
            # Act
            response = client.get(f"/api/discounts/duration?days={days}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["discount_percentage"] == 0.0
            assert data["days"] == days
            mock_discount_service.get_duration_discount_percentage.assert_called_once_with(days)

    def test_get_all_discounts_success(self, client, mock_discount_service):
        """Тест успешного получения всех скидок"""
        # Arrange
        mock_discounts = [
            {"id": 1, "name": "Долгосрочная аренда", "min_days": 7, "discount_percentage": 10.0},
            {"id": 2, "name": "Месячная аренда", "min_days": 30, "discount_percentage": 20.0}
        ]
        
        mock_discount_service.get_all_discounts.return_value = mock_discounts
        
        # Override the dependency using container
        with app.container.discount_service.override(mock_discount_service):
            # Act
            response = client.get("/api/discounts/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]["name"] == "Долгосрочная аренда"
            assert data[1]["name"] == "Месячная аренда"
            mock_discount_service.get_all_discounts.assert_called_once()

    def test_get_duration_discount_invalid_days(self, client, mock_discount_service):
        """Тест получения скидки с невалидным количеством дней"""
        # Arrange
        days = -1
        mock_discount_service.get_duration_discount_percentage.return_value = 0.0
        
        # Override the dependency using container
        with app.container.discount_service.override(mock_discount_service):
            # Act
            response = client.get(f"/api/discounts/duration?days={days}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["discount_percentage"] == 0.0
            assert data["days"] == days
            mock_discount_service.get_duration_discount_percentage.assert_called_once_with(days)

    def test_get_all_discounts_empty(self, client, mock_discount_service):
        """Тест получения пустого списка скидок"""
        # Arrange
        mock_discount_service.get_all_discounts.return_value = []
        
        # Override the dependency using container
        with app.container.discount_service.override(mock_discount_service):
            # Act
            response = client.get("/api/discounts/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 0
            mock_discount_service.get_all_discounts.assert_called_once()




















