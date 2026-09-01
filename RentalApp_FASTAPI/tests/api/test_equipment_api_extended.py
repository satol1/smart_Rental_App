"""
Расширенные тесты для equipment_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import datetime

from api.main_api import app
from containers import Container


class TestEquipmentAPIExtended:
    """Расширенные тесты для API оборудования"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_equipment_crud_service(self):
        """Мок сервиса CRUD операций с оборудованием"""
        service = AsyncMock()
        service.create_equipment = AsyncMock()
        service.update_equipment_details = AsyncMock()
        service.delete_equipment = AsyncMock()
        service.get_equipment_by_id = AsyncMock()
        return service

    @pytest.fixture
    def mock_equipment_filter_service(self):
        """Мок сервиса фильтрации оборудования"""
        service = AsyncMock()
        service.get_paginated_equipment = AsyncMock()
        service.get_available_filters = AsyncMock()
        service.get_available_types = AsyncMock()
        service.get_available_brands = AsyncMock()
        service.get_available_associations = AsyncMock()
        return service

    @pytest.fixture
    def mock_equipment_service_api(self):
        """Мок API сервиса оборудования"""
        service = AsyncMock()
        service.get_all_equipment = AsyncMock()
        service.get_paginated_equipment = AsyncMock()
        service.update_equipment_details = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_admin_user(self):
        """Мок пользователя-администратора"""
        from api.models.user import User
        user = User()
        user.id = 1
        user.email = "admin@test.com"
        user.role = "admin"
        user.full_name = "Admin User"
        user.is_active = True
        return user

    def test_get_all_equipment_success(self, client, mock_equipment_service_api):
        """Тест успешного получения всего оборудования"""
        # Arrange
        mock_equipment_list = [
            {
                "id": 1,
                "name": "Canon EOS R5",
                "type": "camera",
                "daily_rate": 100.0,
                "brand_system_id": 1,
                "serial_number": "SN001"
            },
            {
                "id": 2,
                "name": "Sony A7R IV",
                "type": "camera",
                "daily_rate": 120.0,
                "brand_system_id": 2,
                "serial_number": "SN002"
            }
        ]
        
        mock_equipment_service_api.get_all_equipment.return_value = mock_equipment_list
        
        # Override the dependency using container
        with app.container.equipment_service_api.override(mock_equipment_service_api):
            # Act
            response = client.get("/api/equipment/all")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["name"] == "Canon EOS R5"
            assert data[1]["name"] == "Sony A7R IV"
            mock_equipment_service_api.get_all_equipment.assert_called_once()

    def test_get_paginated_equipment_without_grouping_success(self, client, mock_equipment_service_api):
        """Тест успешного получения оборудования с пагинацией без группировки"""
        # Arrange
        mock_equipment_list = [
            {
                "id": 1,
                "name": "Canon EOS R5",
                "type": "camera",
                "daily_rate": 100.0,
                "brand_system_id": 1,
                "serial_number": "SN001"
            }
        ]
        
        mock_equipment_service_api.get_paginated_equipment.return_value = (mock_equipment_list, 1)
        
        # Override the dependency using container
        with app.container.equipment_service_api.override(mock_equipment_service_api):
            # Act
            response = client.get("/api/equipment/paginated?group_similar=false")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) == 1
            assert data["total_count"] == 1
            assert data["items"][0]["name"] == "Canon EOS R5"
            mock_equipment_service_api.get_paginated_equipment.assert_called_once()

    def test_get_paginated_equipment_with_filters_success(self, client, mock_equipment_service_api):
        """Тест успешного получения оборудования с фильтрами"""
        # Arrange
        mock_equipment_list = [
            {
                "id": 1,
                "name": "Canon EOS R5",
                "type": "camera",
                "daily_rate": 100.0,
                "brand_system_id": 1,
                "serial_number": "SN001"
            }
        ]
        
        mock_equipment_service_api.get_paginated_equipment.return_value = (mock_equipment_list, 1)
        
        # Override the dependency using container
        with app.container.equipment_service_api.override(mock_equipment_service_api):
            # Act
            response = client.get("/api/equipment/paginated?equipment_type=camera&brand_system_id=1&group_similar=true")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) == 1
            assert data["total_count"] == 1
            assert data["items"][0]["name"] == "Canon EOS R5"
            mock_equipment_service_api.get_paginated_equipment.assert_called_once()

    def test_update_equipment_details_success(self, client, mock_equipment_service_api, mock_current_admin_user):
        """Тест успешного обновления деталей оборудования"""
        # Arrange
        equipment_id = 1
        update_data = {
            "name": "Updated Canon EOS R5",
            "daily_rate": 110.0,
            "description": "Updated description"
        }
        
        mock_updated_equipment = {
            "id": equipment_id,
            "name": "Updated Canon EOS R5",
            "daily_rate": 110.0,
            "description": "Updated description",
            "type": "camera",
            "brand_system_id": 1,
            "serial_number": "SN001"
        }
        
        mock_equipment_service_api.update_equipment_details.return_value = mock_updated_equipment
        
        # Override the dependency using container
        with app.container.equipment_service_api.override(mock_equipment_service_api):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.put(f"/api/equipment/{equipment_id}/details", json=update_data)
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == equipment_id
                assert data["name"] == "Updated Canon EOS R5"
                assert data["daily_rate"] == 110.0
                assert data["description"] == "Updated description"
                mock_equipment_service_api.update_equipment_details.assert_called_once()

    def test_get_equipment_with_pagination_success(self, client, mock_equipment_filter_service):
        """Тест успешного получения оборудования с пагинацией"""
        # Arrange
        mock_equipment_list = [
            {
                "id": 1,
                "name": "Canon EOS R5",
                "type": "camera",
                "daily_rate": 100.0,
                "brand_system_id": 1,
                "serial_number": "SN001"
            },
            {
                "id": 2,
                "name": "Sony A7R IV",
                "type": "camera",
                "daily_rate": 120.0,
                "brand_system_id": 2,
                "serial_number": "SN002"
            }
        ]
        
        mock_equipment_filter_service.get_paginated_equipment.return_value = (mock_equipment_list, 2)
        
        # Override the dependency using container
        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            # Act
            response = client.get("/api/equipment/?skip=0&limit=10")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) == 2
            assert data["total_count"] == 2
            assert data["items"][0]["name"] == "Canon EOS R5"
            assert data["items"][1]["name"] == "Sony A7R IV"
            mock_equipment_filter_service.get_paginated_equipment.assert_called_once()

    def test_get_equipment_with_filters_success(self, client, mock_equipment_filter_service):
        """Тест успешного получения оборудования с фильтрами"""
        # Arrange
        mock_equipment_list = [
            {
                "id": 1,
                "name": "Canon EOS R5",
                "type": "camera",
                "daily_rate": 100.0,
                "brand_system_id": 1,
                "serial_number": "SN001"
            }
        ]
        
        mock_equipment_filter_service.get_paginated_equipment.return_value = (mock_equipment_list, 1)
        
        # Override the dependency using container
        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            # Act
            response = client.get("/api/equipment/?equipment_type=camera&brand_system_id=1&search_query=Canon")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) == 1
            assert data["total_count"] == 1
            assert data["items"][0]["name"] == "Canon EOS R5"
            mock_equipment_filter_service.get_paginated_equipment.assert_called_once()

    def test_get_equipment_availability_success(self, client, mock_equipment_filter_service):
        """Тест успешного получения доступности оборудования"""
        # Arrange
        mock_equipment_list = [
            {
                "id": 1,
                "name": "Canon EOS R5",
                "type": "camera",
                "daily_rate": 100.0,
                "brand_system_id": 1,
                "serial_number": "SN001",
                "available": True
            }
        ]
        
        mock_equipment_filter_service.get_paginated_equipment.return_value = (mock_equipment_list, 1)
        
        # Override the dependency using container
        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            # Act
            response = client.get("/api/equipment/?available_only=true&start_date=2024-01-15&end_date=2024-01-20")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) == 1
            assert data["total_count"] == 1
            assert data["items"][0]["name"] == "Canon EOS R5"
            assert data["items"][0]["available"] is True
            mock_equipment_filter_service.get_paginated_equipment.assert_called_once()

    def test_get_available_filters_success(self, client, mock_equipment_filter_service):
        """Тест успешного получения доступных фильтров"""
        # Arrange
        mock_filters = {
            "equipment_types": ["camera", "lens", "accessory"],
            "brand_systems": [
                {"id": 1, "name": "Canon"},
                {"id": 2, "name": "Sony"}
            ],
            "associations": [
                {"id": 1, "name": "Photography"},
                {"id": 2, "name": "Videography"}
            ]
        }
        
        mock_equipment_filter_service.get_available_filters.return_value = mock_filters
        
        # Override the dependency using container
        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            # Act
            response = client.get("/api/equipment/filters")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert "equipment_types" in data
            assert "brand_systems" in data
            assert "associations" in data
            assert len(data["equipment_types"]) == 3
            assert len(data["brand_systems"]) == 2
            assert len(data["associations"]) == 2
            mock_equipment_filter_service.get_available_filters.assert_called_once()

    def test_get_available_types_success(self, client, mock_equipment_filter_service):
        """Тест успешного получения доступных типов оборудования"""
        # Arrange
        mock_types = ["camera", "lens", "accessory", "tripod"]
        
        mock_equipment_filter_service.get_available_types.return_value = mock_types
        
        # Override the dependency using container
        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            # Act
            response = client.get("/api/equipment/types")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 4
            assert "camera" in data
            assert "lens" in data
            assert "accessory" in data
            assert "tripod" in data
            mock_equipment_filter_service.get_available_types.assert_called_once()

    def test_get_available_brands_success(self, client, mock_equipment_filter_service):
        """Тест успешного получения доступных брендов"""
        # Arrange
        mock_brands = [
            {"id": 1, "name": "Canon"},
            {"id": 2, "name": "Sony"},
            {"id": 3, "name": "Nikon"}
        ]
        
        mock_equipment_filter_service.get_available_brands.return_value = mock_brands
        
        # Override the dependency using container
        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            # Act
            response = client.get("/api/equipment/brands")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 3
            assert data[0]["name"] == "Canon"
            assert data[1]["name"] == "Sony"
            assert data[2]["name"] == "Nikon"
            mock_equipment_filter_service.get_available_brands.assert_called_once()

    def test_get_available_associations_success(self, client, mock_equipment_filter_service):
        """Тест успешного получения доступных ассоциаций"""
        # Arrange
        mock_associations = [
            {"id": 1, "name": "Photography"},
            {"id": 2, "name": "Videography"},
            {"id": 3, "name": "Audio"}
        ]
        
        mock_equipment_filter_service.get_available_associations.return_value = mock_associations
        
        # Override the dependency using container
        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            # Act
            response = client.get("/api/equipment/associations")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 3
            assert data[0]["name"] == "Photography"
            assert data[1]["name"] == "Videography"
            assert data[2]["name"] == "Audio"
            mock_equipment_filter_service.get_available_associations.assert_called_once()

    def test_create_equipment_success(self, client, mock_equipment_crud_service, mock_current_admin_user):
        """Тест успешного создания оборудования"""
        # Arrange
        equipment_data = {
            "name": "New Camera",
            "type": "camera",
            "daily_rate": 100.0,
            "brand_system_id": 1,
            "serial_number": "SN999",
            "description": "A new camera"
        }
        
        mock_created_equipment = {
            "id": 3,
            "name": "New Camera",
            "type": "camera",
            "daily_rate": 100.0,
            "brand_system_id": 1,
            "serial_number": "SN999",
            "description": "A new camera"
        }
        
        mock_equipment_crud_service.create_equipment.return_value = mock_created_equipment
        
        # Override the dependency using container
        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post("/api/admin/equipment/", json=equipment_data)
                
                # Assert
                assert response.status_code == 201
                data = response.json()
                assert data["id"] == 3
                assert data["name"] == "New Camera"
                assert data["type"] == "camera"
                assert data["daily_rate"] == 100.0
                assert data["brand_system_id"] == 1
                assert data["serial_number"] == "SN999"
                assert data["description"] == "A new camera"
                mock_equipment_crud_service.create_equipment.assert_called_once()

    def test_update_equipment_success(self, client, mock_equipment_crud_service, mock_current_admin_user):
        """Тест успешного обновления оборудования"""
        # Arrange
        equipment_id = 1
        update_data = {
            "name": "Updated Camera",
            "daily_rate": 110.0,
            "description": "Updated description"
        }
        
        mock_updated_equipment = {
            "id": equipment_id,
            "name": "Updated Camera",
            "type": "camera",
            "daily_rate": 110.0,
            "brand_system_id": 1,
            "serial_number": "SN001",
            "description": "Updated description"
        }
        
        mock_equipment_crud_service.update_equipment_details.return_value = mock_updated_equipment
        
        # Override the dependency using container
        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.put(f"/api/admin/equipment/{equipment_id}", json=update_data)
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == equipment_id
                assert data["name"] == "Updated Camera"
                assert data["daily_rate"] == 110.0
                assert data["description"] == "Updated description"
                mock_equipment_crud_service.update_equipment_details.assert_called_once()

    def test_delete_equipment_success(self, client, mock_equipment_crud_service, mock_current_admin_user):
        """Тест успешного удаления оборудования"""
        # Arrange
        equipment_id = 1
        mock_delete_result = {"message": "Equipment deleted successfully"}
        
        mock_equipment_crud_service.delete_equipment.return_value = mock_delete_result
        
        # Override the dependency using container
        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.delete(f"/api/admin/equipment/{equipment_id}")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["message"] == "Equipment deleted successfully"
                mock_equipment_crud_service.delete_equipment.assert_called_once_with(equipment_id)

    def test_get_equipment_by_id_success(self, client, mock_equipment_crud_service):
        """Тест успешного получения оборудования по ID"""
        # Arrange
        equipment_id = 1
        mock_equipment = {
            "id": equipment_id,
            "name": "Canon EOS R5",
            "type": "camera",
            "daily_rate": 100.0,
            "brand_system_id": 1,
            "serial_number": "SN001",
            "description": "Professional camera"
        }
        
        mock_equipment_crud_service.get_equipment_by_id.return_value = mock_equipment
        
        # Override the dependency using container
        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            # Act
            response = client.get(f"/api/equipment/{equipment_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == equipment_id
            assert data["name"] == "Canon EOS R5"
            assert data["type"] == "camera"
            assert data["daily_rate"] == 100.0
            assert data["brand_system_id"] == 1
            assert data["serial_number"] == "SN001"
            assert data["description"] == "Professional camera"
            mock_equipment_crud_service.get_equipment_by_id.assert_called_once_with(equipment_id)

    def test_get_equipment_by_id_not_found(self, client, mock_equipment_crud_service):
        """Тест получения несуществующего оборудования по ID"""
        # Arrange
        equipment_id = 999
        mock_equipment_crud_service.get_equipment_by_id.return_value = None
        
        # Override the dependency using container
        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            # Act
            response = client.get(f"/api/equipment/{equipment_id}")
            
            # Assert
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert "Equipment not found" in data["detail"]

    def test_create_equipment_validation_error(self, client, mock_equipment_crud_service, mock_current_admin_user):
        """Тест создания оборудования с невалидными данными"""
        # Arrange
        equipment_data = {
            "name": "",  # Пустое имя
            "type": "camera",
            "daily_rate": -10.0,  # Отрицательная ставка
            "brand_system_id": 1,
            "serial_number": "SN999"
        }
        
        mock_equipment_crud_service.create_equipment.side_effect = ValueError("Invalid equipment data")
        
        # Override the dependency using container
        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.post("/api/admin/equipment/", json=equipment_data)
                
                # Assert
                assert response.status_code == 400
                data = response.json()
                assert "detail" in data
                assert "Invalid equipment data" in data["detail"]

    def test_update_equipment_not_found(self, client, mock_equipment_crud_service, mock_current_admin_user):
        """Тест обновления несуществующего оборудования"""
        # Arrange
        equipment_id = 999
        update_data = {
            "name": "Updated Camera",
            "daily_rate": 110.0
        }
        
        mock_equipment_crud_service.update_equipment_details.side_effect = ValueError("Equipment not found")
        
        # Override the dependency using container
        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.put(f"/api/admin/equipment/{equipment_id}", json=update_data)
                
                # Assert
                assert response.status_code == 400
                data = response.json()
                assert "detail" in data
                assert "Equipment not found" in data["detail"]

    def test_delete_equipment_not_found(self, client, mock_equipment_crud_service, mock_current_admin_user):
        """Тест удаления несуществующего оборудования"""
        # Arrange
        equipment_id = 999
        mock_equipment_crud_service.delete_equipment.side_effect = ValueError("Equipment not found")
        
        # Override the dependency using container
        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.delete(f"/api/admin/equipment/{equipment_id}")
                
                # Assert
                assert response.status_code == 400
                data = response.json()
                assert "detail" in data
                assert "Equipment not found" in data["detail"]

    def test_get_equipment_with_invalid_pagination(self, client, mock_equipment_filter_service):
        """Тест получения оборудования с невалидной пагинацией"""
        # Arrange
        mock_equipment_list = []
        mock_equipment_filter_service.get_paginated_equipment.return_value = (mock_equipment_list, 0)
        
        # Override the dependency using container
        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            # Act
            response = client.get("/api/equipment/?skip=-1&limit=0")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) == 0
            assert data["total_count"] == 0
            mock_equipment_filter_service.get_paginated_equipment.assert_called_once()

    def test_search_equipment_by_name(self, client, mock_equipment_filter_service):
        """Тест поиска оборудования по имени"""
        # Arrange
        mock_equipment_list = [
            {
                "id": 1,
                "name": "Canon EOS R5",
                "type": "camera",
                "daily_rate": 100.0,
                "brand_system_id": 1,
                "serial_number": "SN001"
            }
        ]
        
        mock_equipment_filter_service.get_paginated_equipment.return_value = (mock_equipment_list, 1)
        
        # Override the dependency using container
        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            # Act
            response = client.get("/api/equipment/?search_query=Canon")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) == 1
            assert data["total_count"] == 1
            assert data["items"][0]["name"] == "Canon EOS R5"
            mock_equipment_filter_service.get_paginated_equipment.assert_called_once()

    def test_get_equipment_availability(self, client, mock_equipment_filter_service):
        """Тест получения доступности оборудования"""
        # Arrange
        mock_equipment_list = [
            {
                "id": 1,
                "name": "Canon EOS R5",
                "type": "camera",
                "daily_rate": 100.0,
                "brand_system_id": 1,
                "serial_number": "SN001",
                "available": True
            }
        ]
        
        mock_equipment_filter_service.get_paginated_equipment.return_value = (mock_equipment_list, 1)
        
        # Override the dependency using container
        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            # Act
            response = client.get("/api/equipment/?available_only=true")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) == 1
            assert data["total_count"] == 1
            assert data["items"][0]["name"] == "Canon EOS R5"
            assert data["items"][0]["available"] is True
            mock_equipment_filter_service.get_paginated_equipment.assert_called_once()

    def test_create_equipment_unauthorized(self, client, mock_equipment_crud_service):
        """Тест создания оборудования без авторизации"""
        # Arrange
        equipment_data = {
            "name": "New Camera",
            "type": "camera",
            "daily_rate": 100.0,
            "brand_system_id": 1,
            "serial_number": "SN999"
        }
        
        # Override the dependency using container
        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            # Act - без авторизации
            response = client.post("/api/admin/equipment/", json=equipment_data)
            
            # Assert
            assert response.status_code == 401
            data = response.json()
            assert "detail" in data

    def test_get_equipment_database_error(self, client, mock_equipment_filter_service):
        """Тест получения оборудования при ошибке базы данных"""
        # Arrange
        mock_equipment_filter_service.get_paginated_equipment.side_effect = Exception("Database connection error")
        
        # Override the dependency using container
        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            # Act
            response = client.get("/api/equipment/")
            
            # Assert
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
            assert "Database connection error" in data["detail"]

    def test_get_available_filters_database_error(self, client, mock_equipment_filter_service):
        """Тест получения доступных фильтров при ошибке базы данных"""
        # Arrange
        mock_equipment_filter_service.get_available_filters.side_effect = Exception("Database connection error")
        
        # Override the dependency using container
        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            # Act
            response = client.get("/api/equipment/filters")
            
            # Assert
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
            assert "Database connection error" in data["detail"]




















