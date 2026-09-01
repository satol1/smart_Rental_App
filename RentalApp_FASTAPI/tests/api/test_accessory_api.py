"""
Тесты для accessory_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container
from api.models.accessory import Accessory


class TestAccessoryAPI:
    """Тесты для API аксессуаров"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_accessory_service(self):
        """Мок сервиса аксессуаров"""
        service = AsyncMock()
        service.get_all_accessories = AsyncMock()
        service.get_accessory_by_id = AsyncMock()
        service.create_accessory = AsyncMock()
        service.update_accessory = AsyncMock()
        service.delete_accessory = AsyncMock()
        return service

    def test_get_all_accessories_success(self, client, mock_accessory_service):
        """Тест успешного получения всех аксессуаров"""
        # Arrange
        mock_accessories = [
            {"id": 1, "name": "Camera Lens", "price": 50.0},
            {"id": 2, "name": "Tripod", "price": 30.0}
        ]
        
        mock_accessory_service.get_all_accessories.return_value = mock_accessories
        
        # Override the dependency using container
        with app.container.accessory_service.override(mock_accessory_service):
            # Act
            response = client.get("/api/accessories/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]["name"] == "Camera Lens"
            assert data[1]["name"] == "Tripod"
            mock_accessory_service.get_all_accessories.assert_called_once()

    def test_get_accessory_by_id_success(self, client, mock_accessory_service):
        """Тест успешного получения аксессуара по ID"""
        # Arrange
        accessory_id = 1
        mock_accessory = Accessory()
        mock_accessory.id = accessory_id
        mock_accessory.name = "Camera Lens"
        mock_accessory.price = 50.0
        
        mock_accessory_service.get_accessory_by_id.return_value = mock_accessory
        
        # Override the dependency using container
        with app.container.accessory_service.override(mock_accessory_service):
            # Act
            response = client.get(f"/api/accessories/{accessory_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == accessory_id
            assert data["name"] == "Camera Lens"
            assert data["price"] == 50.0
            mock_accessory_service.get_accessory_by_id.assert_called_once_with(accessory_id)

    def test_create_accessory_success(self, client, mock_accessory_service):
        """Тест успешного создания аксессуара"""
        # Arrange
        accessory_data = {
            "name": "New Lens",
            "price": 75.0,
            "description": "High quality lens"
        }
        
        mock_accessory = Accessory()
        mock_accessory.id = 1
        mock_accessory.name = "New Lens"
        mock_accessory.price = 75.0
        
        mock_accessory_service.create_accessory.return_value = mock_accessory
        
        # Override the dependency using container
        with app.container.accessory_service.override(mock_accessory_service):
            # Act
            response = client.post("/api/accessories/", json=accessory_data)
            
            # Assert
            assert response.status_code == 201
            data = response.json()
            assert data["id"] == 1
            assert data["name"] == "New Lens"
            assert data["price"] == 75.0
            mock_accessory_service.create_accessory.assert_called_once()

    def test_update_accessory_success(self, client, mock_accessory_service):
        """Тест успешного обновления аксессуара"""
        # Arrange
        accessory_id = 1
        update_data = {
            "name": "Updated Lens",
            "price": 80.0
        }
        
        mock_accessory = Accessory()
        mock_accessory.id = accessory_id
        mock_accessory.name = "Updated Lens"
        mock_accessory.price = 80.0
        
        mock_accessory_service.update_accessory.return_value = mock_accessory
        
        # Override the dependency using container
        with app.container.accessory_service.override(mock_accessory_service):
            # Act
            response = client.put(f"/api/accessories/{accessory_id}", json=update_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == accessory_id
            assert data["name"] == "Updated Lens"
            assert data["price"] == 80.0
            mock_accessory_service.update_accessory.assert_called_once()

    def test_delete_accessory_success(self, client, mock_accessory_service):
        """Тест успешного удаления аксессуара"""
        # Arrange
        accessory_id = 1
        mock_accessory_service.delete_accessory.return_value = {"message": "Аксессуар удален"}
        
        # Override the dependency using container
        with app.container.accessory_service.override(mock_accessory_service):
            # Act
            response = client.delete(f"/api/accessories/{accessory_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Аксессуар удален"
            mock_accessory_service.delete_accessory.assert_called_once_with(accessory_id)

    def test_get_accessory_not_found(self, client, mock_accessory_service):
        """Тест получения несуществующего аксессуара"""
        # Arrange
        accessory_id = 999
        mock_accessory_service.get_accessory_by_id.return_value = None
        
        # Override the dependency using container
        with app.container.accessory_service.override(mock_accessory_service):
            # Act
            response = client.get(f"/api/accessories/{accessory_id}")
            
            # Assert
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert "Аксессуар не найден" in data["detail"]




















