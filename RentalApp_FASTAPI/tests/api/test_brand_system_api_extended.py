import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container
from api.models.user import User
from api.models.brand_system import BrandSystem
from shared.schemas.brand_system_schema import BrandSystemCreate, BrandSystemUpdate

class TestBrandSystemAPIExtended:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    @pytest.fixture
    def mock_brand_system_service(self):
        service = AsyncMock()
        service.create_brand_system = AsyncMock()
        service.get_all_brand_systems = AsyncMock()
        service.get_brand_system_by_id = AsyncMock()
        service.update_brand_system = AsyncMock()
        service.delete_brand_system = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_admin_user(self):
        user = User(id=1, email="admin@example.com", full_name="Admin User", is_active=True, role="admin")
        return user

    def test_create_brand_system_admin_success(self, client, mock_brand_system_service, mock_current_admin_user):
        brand_system_data = {
            "name": "New Brand System",
            "description": "High-quality brand system"
        }
        mock_brand_system = BrandSystem(id=1, **brand_system_data)
        mock_brand_system_service.create_brand_system.return_value = mock_brand_system

        with app.container.brand_system_service.override(mock_brand_system_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/brand-systems/", json=brand_system_data)
                assert response.status_code == 201
                assert response.json()["name"] == "New Brand System"
                mock_brand_system_service.create_brand_system.assert_called_once()

    def test_get_all_brand_systems_success(self, client, mock_brand_system_service):
        mock_brand_systems = [
            BrandSystem(id=1, name="Brand System 1", description="Description 1"),
            BrandSystem(id=2, name="Brand System 2", description="Description 2")
        ]
        mock_brand_system_service.get_all_brand_systems.return_value = mock_brand_systems

        with app.container.brand_system_service.override(mock_brand_system_service):
            response = client.get("/api/brand-systems/")
            assert response.status_code == 200
            assert len(response.json()) == 2
            assert response.json()[0]["name"] == "Brand System 1"
            mock_brand_system_service.get_all_brand_systems.assert_called_once()

    def test_get_brand_system_by_id_success(self, client, mock_brand_system_service):
        brand_system_id = 1
        mock_brand_system = BrandSystem(id=brand_system_id, name="Existing Brand System", description="Existing description")
        mock_brand_system_service.get_brand_system_by_id.return_value = mock_brand_system

        with app.container.brand_system_service.override(mock_brand_system_service):
            response = client.get(f"/api/brand-systems/{brand_system_id}")
            assert response.status_code == 200
            assert response.json()["name"] == "Existing Brand System"
            mock_brand_system_service.get_brand_system_by_id.assert_called_once_with(brand_system_id)

    def test_get_brand_system_by_id_not_found(self, client, mock_brand_system_service):
        brand_system_id = 999
        mock_brand_system_service.get_brand_system_by_id.return_value = None

        with app.container.brand_system_service.override(mock_brand_system_service):
            response = client.get(f"/api/brand-systems/{brand_system_id}")
            assert response.status_code == 404
            assert "Бренд-система не найдена" in response.json()["detail"]

    def test_update_brand_system_admin_success(self, client, mock_brand_system_service, mock_current_admin_user):
        brand_system_id = 1
        update_data = {"name": "Updated Brand System", "description": "Updated description"}
        updated_brand_system = BrandSystem(id=brand_system_id, **update_data)
        mock_brand_system_service.update_brand_system.return_value = updated_brand_system

        with app.container.brand_system_service.override(mock_brand_system_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/brand-systems/{brand_system_id}", json=update_data)
                assert response.status_code == 200
                assert response.json()["name"] == "Updated Brand System"
                mock_brand_system_service.update_brand_system.assert_called_once()

    def test_delete_brand_system_admin_success(self, client, mock_brand_system_service, mock_current_admin_user):
        brand_system_id = 1
        mock_brand_system_service.delete_brand_system.return_value = {"message": "Brand system deleted successfully"}

        with app.container.brand_system_service.override(mock_brand_system_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.delete(f"/api/admin/brand-systems/{brand_system_id}")
                assert response.status_code == 200
                assert response.json()["message"] == "Brand system deleted successfully"
                mock_brand_system_service.delete_brand_system.assert_called_once_with(brand_system_id)

    def test_create_brand_system_unauthorized(self, client, mock_brand_system_service):
        brand_system_data = {
            "name": "Unauthorized Brand System",
            "description": "This should fail"
        }

        with app.container.brand_system_service.override(mock_brand_system_service):
            with patch("api.dependencies.get_current_user", side_effect=Exception("Unauthorized")):
                response = client.post("/api/admin/brand-systems/", json=brand_system_data)
                assert response.status_code == 500

    def test_create_brand_system_duplicate_name(self, client, mock_brand_system_service, mock_current_admin_user):
        brand_system_data = {
            "name": "Duplicate Brand System",
            "description": "This should fail due to duplicate name"
        }
        mock_brand_system_service.create_brand_system.side_effect = ValueError("Brand system with this name already exists")

        with app.container.brand_system_service.override(mock_brand_system_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/brand-systems/", json=brand_system_data)
                assert response.status_code == 400
                assert "Brand system with this name already exists" in response.json()["detail"]

    def test_update_brand_system_not_found(self, client, mock_brand_system_service, mock_current_admin_user):
        brand_system_id = 999
        update_data = {"name": "Updated Name"}
        mock_brand_system_service.update_brand_system.return_value = None

        with app.container.brand_system_service.override(mock_brand_system_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/brand-systems/{brand_system_id}", json=update_data)
                assert response.status_code == 404
                assert "Бренд-система не найдена" in response.json()["detail"]

    def test_delete_brand_system_not_found(self, client, mock_brand_system_service, mock_current_admin_user):
        brand_system_id = 999
        mock_brand_system_service.delete_brand_system.return_value = None

        with app.container.brand_system_service.override(mock_brand_system_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.delete(f"/api/admin/brand-systems/{brand_system_id}")
                assert response.status_code == 404
                assert "Бренд-система не найдена" in response.json()["detail"]




















