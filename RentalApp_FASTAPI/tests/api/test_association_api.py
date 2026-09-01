"""
Тесты для association_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container
from api.models.association import Association


class TestAssociationAPI:
    """Тесты для API ассоциаций"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_association_service(self):
        """Мок сервиса ассоциаций"""
        service = AsyncMock()
        service.get_all_associations = AsyncMock()
        service.get_association_by_id = AsyncMock()
        service.create_association = AsyncMock()
        service.update_association = AsyncMock()
        service.delete_association = AsyncMock()
        return service

    def test_get_all_associations_success(self, client, mock_association_service):
        """Тест успешного получения всех ассоциаций"""
        # Arrange
        mock_associations = [
            {"id": 1, "name": "Camera Association", "description": "Camera group"},
            {"id": 2, "name": "Audio Association", "description": "Audio group"}
        ]
        
        mock_association_service.get_all_associations.return_value = mock_associations
        
        # Override the dependency using container
        with app.container.association_service.override(mock_association_service):
            # Act
            response = client.get("/api/associations/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]["name"] == "Camera Association"
            assert data[1]["name"] == "Audio Association"
            mock_association_service.get_all_associations.assert_called_once()

    def test_get_association_by_id_success(self, client, mock_association_service):
        """Тест успешного получения ассоциации по ID"""
        # Arrange
        association_id = 1
        mock_association = Association()
        mock_association.id = association_id
        mock_association.name = "Camera Association"
        mock_association.description = "Camera group"
        
        mock_association_service.get_association_by_id.return_value = mock_association
        
        # Override the dependency using container
        with app.container.association_service.override(mock_association_service):
            # Act
            response = client.get(f"/api/associations/{association_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == association_id
            assert data["name"] == "Camera Association"
            assert data["description"] == "Camera group"
            mock_association_service.get_association_by_id.assert_called_once_with(association_id)

    def test_create_association_success(self, client, mock_association_service):
        """Тест успешного создания ассоциации"""
        # Arrange
        association_data = {
            "name": "New Association",
            "description": "New group description",
            "equipment_ids": [1, 2, 3]
        }
        
        mock_association = Association()
        mock_association.id = 1
        mock_association.name = "New Association"
        mock_association.description = "New group description"
        
        mock_association_service.create_association.return_value = mock_association
        
        # Override the dependency using container
        with app.container.association_service.override(mock_association_service):
            # Act
            response = client.post("/api/associations/", json=association_data)
            
            # Assert
            assert response.status_code == 201
            data = response.json()
            assert data["id"] == 1
            assert data["name"] == "New Association"
            assert data["description"] == "New group description"
            mock_association_service.create_association.assert_called_once()

    def test_update_association_success(self, client, mock_association_service):
        """Тест успешного обновления ассоциации"""
        # Arrange
        association_id = 1
        update_data = {
            "name": "Updated Association",
            "description": "Updated description"
        }
        
        mock_association = Association()
        mock_association.id = association_id
        mock_association.name = "Updated Association"
        mock_association.description = "Updated description"
        
        mock_association_service.update_association.return_value = mock_association
        
        # Override the dependency using container
        with app.container.association_service.override(mock_association_service):
            # Act
            response = client.put(f"/api/associations/{association_id}", json=update_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == association_id
            assert data["name"] == "Updated Association"
            assert data["description"] == "Updated description"
            mock_association_service.update_association.assert_called_once()

    def test_delete_association_success(self, client, mock_association_service):
        """Тест успешного удаления ассоциации"""
        # Arrange
        association_id = 1
        mock_association_service.delete_association.return_value = {"message": "Ассоциация удалена"}
        
        # Override the dependency using container
        with app.container.association_service.override(mock_association_service):
            # Act
            response = client.delete(f"/api/associations/{association_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Ассоциация удалена"
            mock_association_service.delete_association.assert_called_once_with(association_id)

    def test_get_association_not_found(self, client, mock_association_service):
        """Тест получения несуществующей ассоциации"""
        # Arrange
        association_id = 999
        mock_association_service.get_association_by_id.return_value = None
        
        # Override the dependency using container
        with app.container.association_service.override(mock_association_service):
            # Act
            response = client.get(f"/api/associations/{association_id}")
            
            # Assert
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert "Ассоциация не найдена" in data["detail"]
