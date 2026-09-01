"""
Тесты для equipment_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container
from api.models.equipment import Equipment


class TestEquipmentAPI:
    """Тесты для API оборудования"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_equipment_service(self):
        """Мок сервиса оборудования"""
        service = AsyncMock()
        service.get_all_equipment = AsyncMock()
        service.get_equipment_by_id = AsyncMock()
        service.update_equipment_details = AsyncMock()
        return service

    @pytest.fixture
    def mock_equipment_repo(self):
        """Мок репозитория оборудования"""
        return AsyncMock()

    def test_get_all_equipment_success(self, client, mock_equipment_service):
        """Тест успешного получения всего оборудования"""
        # Arrange
        mock_equipment = Equipment()
        mock_equipment.id = 1
        mock_equipment.name = "Test Camera"
        mock_equipment.daily_rate = 100.0
        
        mock_equipment_service.get_all_equipment.return_value = [mock_equipment]
        
        # Override the dependency using container
        with app.container.equipment_service_api.override(mock_equipment_service):
            # Act
            response = client.get("/api/equipment/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 1
            mock_equipment_service.get_all_equipment.assert_called_once()

    def test_get_equipment_by_id_success(self, client, mock_equipment_service):
        """Тест успешного получения оборудования по ID"""
        # Arrange
        equipment_id = 1
        mock_equipment = Equipment()
        mock_equipment.id = equipment_id
        mock_equipment.name = "Test Camera"
        mock_equipment.daily_rate = 100.0
        
        mock_equipment_service.get_equipment_by_id.return_value = mock_equipment
        
        # Override the dependency using container
        with app.container.equipment_service_api.override(mock_equipment_service):
            # Act
            response = client.get(f"/api/equipment/{equipment_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == equipment_id
            assert data["name"] == "Test Camera"
            mock_equipment_service.get_equipment_by_id.assert_called_once_with(equipment_id)

    def test_get_equipment_by_id_not_found(self, client, mock_equipment_service):
        """Тест получения оборудования по несуществующему ID"""
        # Arrange
        equipment_id = 999
        mock_equipment_service.get_equipment_by_id.return_value = None
        
        # Override the dependency using container
        with app.container.equipment_service_api.override(mock_equipment_service):
            # Act
            response = client.get(f"/api/equipment/{equipment_id}")
            
            # Assert
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert "Оборудование не найдено" in data["detail"]

    def test_update_equipment_success(self, client, mock_equipment_service):
        """Тест успешного обновления оборудования"""
        # Arrange
        equipment_id = 1
        update_data = {
            "name": "Updated Camera",
            "daily_rate": 150.0
        }
        
        mock_equipment = Equipment()
        mock_equipment.id = equipment_id
        mock_equipment.name = "Updated Camera"
        mock_equipment.daily_rate = 150.0
        
        mock_equipment_service.update_equipment_details.return_value = mock_equipment
        
        # Override the dependency using container
        with app.container.equipment_service_api.override(mock_equipment_service):
            # Act
            response = client.put(f"/api/equipment/{equipment_id}", json=update_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == equipment_id
            assert data["name"] == "Updated Camera"
            assert data["daily_rate"] == 150.0
            mock_equipment_service.update_equipment_details.assert_called_once()





