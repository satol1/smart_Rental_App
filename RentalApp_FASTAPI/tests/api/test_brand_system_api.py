"""
Тесты для brand_system_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container


class TestBrandSystemAPI:
    """Тесты для API брендов"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_brand_system_service(self):
        """Мок сервиса брендов"""
        service = AsyncMock()
        service.get_all_brand_systems = AsyncMock()
        service.get_brand_system_by_id = AsyncMock()
        service.create_brand_system = AsyncMock()
        service.update_brand_system = AsyncMock()
        service.delete_brand_system = AsyncMock()
        return service

    def test_get_all_brand_systems_success(self, client, mock_brand_system_service):
        """Тест успешного получения всех брендов"""
        # Arrange
        mock_brands = [
            {"id": 1, "name": "Canon", "description": "Camera brand"},
            {"id": 2, "name": "Nikon", "description": "Camera brand"}
        ]
        
        mock_brand_system_service.get_all_brand_systems.return_value = mock_brands
        
        # Override the dependency using container
        with app.container.brand_system_service.override(mock_brand_system_service):
            # Act
            response = client.get("/api/brand-systems/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]["name"] == "Canon"
            assert data[1]["name"] == "Nikon"
            mock_brand_system_service.get_all_brand_systems.assert_called_once()

    def test_get_brand_system_by_id_success(self, client, mock_brand_system_service):
        """Тест успешного получения бренда по ID"""
        # Arrange
        brand_id = 1
        mock_brand = {
            "id": brand_id,
            "name": "Canon",
            "description": "Camera brand"
        }
        
        mock_brand_system_service.get_brand_system_by_id.return_value = mock_brand
        
        # Override the dependency using container
        with app.container.brand_system_service.override(mock_brand_system_service):
            # Act
            response = client.get(f"/api/brand-systems/{brand_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == brand_id
            assert data["name"] == "Canon"
            assert data["description"] == "Camera brand"
            mock_brand_system_service.get_brand_system_by_id.assert_called_once_with(brand_id)

    def test_create_brand_system_success(self, client, mock_brand_system_service):
        """Тест успешного создания бренда"""
        # Arrange
        brand_data = {
            "name": "Sony",
            "description": "Electronics brand"
        }
        
        mock_brand = {
            "id": 1,
            "name": "Sony",
            "description": "Electronics brand"
        }
        
        mock_brand_system_service.create_brand_system.return_value = mock_brand
        
        # Override the dependency using container
        with app.container.brand_system_service.override(mock_brand_system_service):
            # Act
            response = client.post("/api/brand-systems/", json=brand_data)
            
            # Assert
            assert response.status_code == 201
            data = response.json()
            assert data["id"] == 1
            assert data["name"] == "Sony"
            assert data["description"] == "Electronics brand"
            mock_brand_system_service.create_brand_system.assert_called_once()

    def test_update_brand_system_success(self, client, mock_brand_system_service):
        """Тест успешного обновления бренда"""
        # Arrange
        brand_id = 1
        update_data = {
            "name": "Updated Canon",
            "description": "Updated description"
        }
        
        mock_brand = {
            "id": brand_id,
            "name": "Updated Canon",
            "description": "Updated description"
        }
        
        mock_brand_system_service.update_brand_system.return_value = mock_brand
        
        # Override the dependency using container
        with app.container.brand_system_service.override(mock_brand_system_service):
            # Act
            response = client.put(f"/api/brand-systems/{brand_id}", json=update_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == brand_id
            assert data["name"] == "Updated Canon"
            assert data["description"] == "Updated description"
            mock_brand_system_service.update_brand_system.assert_called_once()

    def test_delete_brand_system_success(self, client, mock_brand_system_service):
        """Тест успешного удаления бренда"""
        # Arrange
        brand_id = 1
        mock_brand_system_service.delete_brand_system.return_value = {"message": "Бренд удален"}
        
        # Override the dependency using container
        with app.container.brand_system_service.override(mock_brand_system_service):
            # Act
            response = client.delete(f"/api/brand-systems/{brand_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Бренд удален"
            mock_brand_system_service.delete_brand_system.assert_called_once_with(brand_id)

    def test_get_brand_system_not_found(self, client, mock_brand_system_service):
        """Тест получения несуществующего бренда"""
        # Arrange
        brand_id = 999
        mock_brand_system_service.get_brand_system_by_id.return_value = None
        
        # Override the dependency using container
        with app.container.brand_system_service.override(mock_brand_system_service):
            # Act
            response = client.get(f"/api/brand-systems/{brand_id}")
            
            # Assert
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert "Бренд не найден" in data["detail"]

    def test_create_brand_system_duplicate_name(self, client, mock_brand_system_service):
        """Тест создания бренда с дублирующимся именем"""
        # Arrange
        brand_data = {
            "name": "Canon",
            "description": "Duplicate brand"
        }
        
        mock_brand_system_service.create_brand_system.side_effect = ValueError("Бренд с таким именем уже существует")
        
        # Override the dependency using container
        with app.container.brand_system_service.override(mock_brand_system_service):
            # Act
            response = client.post("/api/brand-systems/", json=brand_data)
            
            # Assert
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "Бренд с таким именем уже существует" in data["detail"]




















