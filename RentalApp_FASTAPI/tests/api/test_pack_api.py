"""
Тесты для pack_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container


class TestPackAPI:
    """Тесты для API пакетов оборудования"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_pack_service(self):
        """Мок сервиса пакетов"""
        service = AsyncMock()
        service.get_all_packs = AsyncMock()
        service.get_pack_by_id = AsyncMock()
        service.create_pack = AsyncMock()
        service.update_pack = AsyncMock()
        service.delete_pack = AsyncMock()
        service.get_public_packs_for_catalog = AsyncMock()
        return service

    def test_get_all_packs_success(self, client, mock_pack_service):
        """Тест успешного получения всех пакетов"""
        # Arrange
        mock_packs = [
            {"id": 1, "name": "Camera Pack", "description": "Professional camera set"},
            {"id": 2, "name": "Lighting Pack", "description": "Studio lighting equipment"}
        ]
        
        mock_pack_service.get_all_packs.return_value = mock_packs
        
        # Override the dependency using container
        with app.container.pack_service.override(mock_pack_service):
            # Act
            response = client.get("/api/packs/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]["name"] == "Camera Pack"
            assert data[1]["name"] == "Lighting Pack"
            mock_pack_service.get_all_packs.assert_called_once()

    def test_get_pack_by_id_success(self, client, mock_pack_service):
        """Тест успешного получения пакета по ID"""
        # Arrange
        pack_id = 1
        mock_pack = {
            "id": pack_id,
            "name": "Camera Pack",
            "description": "Professional camera set",
            "equipment_ids": [1, 2, 3]
        }
        
        mock_pack_service.get_pack_by_id.return_value = mock_pack
        
        # Override the dependency using container
        with app.container.pack_service.override(mock_pack_service):
            # Act
            response = client.get(f"/api/packs/{pack_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == pack_id
            assert data["name"] == "Camera Pack"
            assert data["description"] == "Professional camera set"
            assert data["equipment_ids"] == [1, 2, 3]
            mock_pack_service.get_pack_by_id.assert_called_once_with(pack_id)

    def test_create_pack_success(self, client, mock_pack_service):
        """Тест успешного создания пакета"""
        # Arrange
        pack_data = {
            "name": "New Pack",
            "description": "A new equipment pack",
            "equipment_ids": [1, 2]
        }
        
        mock_pack = {
            "id": 1,
            "name": "New Pack",
            "description": "A new equipment pack",
            "equipment_ids": [1, 2]
        }
        
        mock_pack_service.create_pack.return_value = mock_pack
        
        # Override the dependency using container
        with app.container.pack_service.override(mock_pack_service):
            # Act
            response = client.post("/api/packs/", json=pack_data)
            
            # Assert
            assert response.status_code == 201
            data = response.json()
            assert data["id"] == 1
            assert data["name"] == "New Pack"
            assert data["description"] == "A new equipment pack"
            assert data["equipment_ids"] == [1, 2]
            mock_pack_service.create_pack.assert_called_once()

    def test_update_pack_success(self, client, mock_pack_service):
        """Тест успешного обновления пакета"""
        # Arrange
        pack_id = 1
        update_data = {
            "name": "Updated Pack",
            "description": "Updated description"
        }
        
        mock_pack = {
            "id": pack_id,
            "name": "Updated Pack",
            "description": "Updated description",
            "equipment_ids": [1, 2, 3]
        }
        
        mock_pack_service.update_pack.return_value = mock_pack
        
        # Override the dependency using container
        with app.container.pack_service.override(mock_pack_service):
            # Act
            response = client.put(f"/api/packs/{pack_id}", json=update_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == pack_id
            assert data["name"] == "Updated Pack"
            assert data["description"] == "Updated description"
            mock_pack_service.update_pack.assert_called_once()

    def test_delete_pack_success(self, client, mock_pack_service):
        """Тест успешного удаления пакета"""
        # Arrange
        pack_id = 1
        mock_pack_service.delete_pack.return_value = {"message": "Пакет удален"}
        
        # Override the dependency using container
        with app.container.pack_service.override(mock_pack_service):
            # Act
            response = client.delete(f"/api/packs/{pack_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Пакет удален"
            mock_pack_service.delete_pack.assert_called_once_with(pack_id)

    def test_get_public_packs_for_catalog_success(self, client, mock_pack_service):
        """Тест успешного получения публичных пакетов для каталога"""
        # Arrange
        mock_packs = [
            {"id": 1, "name": "Public Pack 1", "description": "Public pack 1"},
            {"id": 2, "name": "Public Pack 2", "description": "Public pack 2"}
        ]
        
        mock_pack_service.get_public_packs_for_catalog.return_value = mock_packs
        
        # Override the dependency using container
        with app.container.pack_service.override(mock_pack_service):
            # Act
            response = client.get("/api/packs/public/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]["name"] == "Public Pack 1"
            assert data[1]["name"] == "Public Pack 2"
            mock_pack_service.get_public_packs_for_catalog.assert_called_once()

    def test_get_pack_not_found(self, client, mock_pack_service):
        """Тест получения несуществующего пакета"""
        # Arrange
        pack_id = 999
        mock_pack_service.get_pack_by_id.return_value = None
        
        # Override the dependency using container
        with app.container.pack_service.override(mock_pack_service):
            # Act
            response = client.get(f"/api/packs/{pack_id}")
            
            # Assert
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert "Пакет не найден" in data["detail"]

    def test_create_pack_validation_error(self, client, mock_pack_service):
        """Тест создания пакета с невалидными данными"""
        # Arrange
        pack_data = {
            "name": "",  # Пустое имя
            "description": "Invalid pack",
            "equipment_ids": []
        }
        
        mock_pack_service.create_pack.side_effect = ValueError("Название пакета не может быть пустым")
        
        # Override the dependency using container
        with app.container.pack_service.override(mock_pack_service):
            # Act
            response = client.post("/api/packs/", json=pack_data)
            
            # Assert
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "Название пакета не может быть пустым" in data["detail"]

    def test_get_all_packs_empty(self, client, mock_pack_service):
        """Тест получения пустого списка пакетов"""
        # Arrange
        mock_pack_service.get_all_packs.return_value = []
        
        # Override the dependency using container
        with app.container.pack_service.override(mock_pack_service):
            # Act
            response = client.get("/api/packs/")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 0
            mock_pack_service.get_all_packs.assert_called_once()




















