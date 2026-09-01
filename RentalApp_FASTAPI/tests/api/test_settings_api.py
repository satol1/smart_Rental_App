"""
Тесты для settings_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container


class TestSettingsAPI:
    """Тесты для API настроек"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_settings_service(self):
        """Мок сервиса настроек"""
        service = AsyncMock()
        service.get_all_settings = AsyncMock()
        service.update_settings = AsyncMock()
        return service

    def test_get_all_settings_success(self, client, mock_settings_service):
        """Тест успешного получения всех настроек"""
        # Arrange
        mock_settings = [
            {"key": "site_name", "value": "Rental App", "description": "Название сайта"},
            {"key": "max_rental_days", "value": "30", "description": "Максимальное количество дней аренды"}
        ]
        
        mock_settings_service.get_all_settings.return_value = mock_settings
        
        # Override the dependency using container
        with app.container.settings_service.override(mock_settings_service):
            # Act
            response = client.get("/api/settings/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]["key"] == "site_name"
            assert data[1]["key"] == "max_rental_days"
            mock_settings_service.get_all_settings.assert_called_once()

    def test_get_all_settings_empty(self, client, mock_settings_service):
        """Тест получения пустого списка настроек"""
        # Arrange
        mock_settings_service.get_all_settings.return_value = []
        
        # Override the dependency using container
        with app.container.settings_service.override(mock_settings_service):
            # Act
            response = client.get("/api/settings/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 0
            mock_settings_service.get_all_settings.assert_called_once()

    def test_update_settings_success(self, client, mock_settings_service):
        """Тест успешного обновления настроек"""
        # Arrange
        settings_data = [
            {"key": "site_name", "value": "Updated Rental App"},
            {"key": "max_rental_days", "value": "60"}
        ]
        
        mock_updated_settings = [
            {"key": "site_name", "value": "Updated Rental App", "description": "Название сайта"},
            {"key": "max_rental_days", "value": "60", "description": "Максимальное количество дней аренды"}
        ]
        
        mock_settings_service.update_settings.return_value = mock_updated_settings
        
        # Override the dependency using container
        with app.container.settings_service.override(mock_settings_service):
            # Act
            response = client.put("/api/settings/", json=settings_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]["value"] == "Updated Rental App"
            assert data[1]["value"] == "60"
            mock_settings_service.update_settings.assert_called_once()

    def test_update_settings_empty_list(self, client, mock_settings_service):
        """Тест обновления настроек с пустым списком"""
        # Arrange
        settings_data = []
        mock_settings_service.update_settings.return_value = []
        
        # Override the dependency using container
        with app.container.settings_service.override(mock_settings_service):
            # Act
            response = client.put("/api/settings/", json=settings_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 0
            mock_settings_service.update_settings.assert_called_once()

    def test_update_settings_invalid_data(self, client, mock_settings_service):
        """Тест обновления настроек с невалидными данными"""
        # Arrange
        settings_data = [
            {"key": "", "value": "Invalid key"},
            {"key": "valid_key", "value": "Valid value"}
        ]
        
        mock_settings_service.update_settings.side_effect = ValueError("Ключ настройки не может быть пустым")
        
        # Override the dependency using container
        with app.container.settings_service.override(mock_settings_service):
            # Act
            response = client.put("/api/settings/", json=settings_data)
            
            # Assert
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "Ключ настройки не может быть пустым" in data["detail"]

    def test_get_all_settings_database_error(self, client, mock_settings_service):
        """Тест получения настроек при ошибке базы данных"""
        # Arrange
        mock_settings_service.get_all_settings.side_effect = Exception("Database connection error")
        
        # Override the dependency using container
        with app.container.settings_service.override(mock_settings_service):
            # Act
            response = client.get("/api/settings/")
            
            # Assert
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
            assert "Database connection error" in data["detail"]

    def test_update_settings_database_error(self, client, mock_settings_service):
        """Тест обновления настроек при ошибке базы данных"""
        # Arrange
        settings_data = [
            {"key": "site_name", "value": "Updated Rental App"}
        ]
        
        mock_settings_service.update_settings.side_effect = Exception("Database connection error")
        
        # Override the dependency using container
        with app.container.settings_service.override(mock_settings_service):
            # Act
            response = client.put("/api/settings/", json=settings_data)
            
            # Assert
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
            assert "Database connection error" in data["detail"]




















