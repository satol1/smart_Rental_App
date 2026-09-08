import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container
from api.models.user import User
from api.models.accessory import Accessory
from shared.schemas.accessory_schema import AccessoryCreate, AccessoryUpdate

class TestAccessoryAPIExtended:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    @pytest.fixture
    def mock_accessory_service(self):
        service = AsyncMock()
        service.create_accessory = AsyncMock()
        service.get_all_accessories_paginated = AsyncMock()
        service.get_accessory_by_id = AsyncMock()
        service.update_accessory = AsyncMock()
        service.delete_accessory = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_admin_user(self):
        user = User(id=1, email="admin@example.com", full_name="Admin User", is_active=True, role="admin")
        return user

    def test_create_accessory_admin_success(self, client, mock_accessory_service, mock_current_admin_user):
        accessory_data = {
            "name": "New Accessory",
            "description": "High-quality accessory",
            "daily_rate": 15.0,
            "type": "Lens",
            "is_available": True
        }
        mock_accessory = Accessory(id=1, **accessory_data)
        mock_accessory_service.create_accessory.return_value = mock_accessory

        with app.container.accessory_service.override(mock_accessory_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/accessories/", json=accessory_data)
                assert response.status_code == 201
                assert response.json()["name"] == "New Accessory"
                assert response.json()["daily_rate"] == 15.0
                mock_accessory_service.create_accessory.assert_called_once()

    def test_get_all_accessories_success(self, client, mock_accessory_service):
        mock_accessories = [
            Accessory(id=1, name="Accessory 1", description="Description 1", daily_rate=10.0, type="Lens", is_available=True),
            Accessory(id=2, name="Accessory 2", description="Description 2", daily_rate=20.0, type="Filter", is_available=True)
        ]
        mock_accessory_service.get_all_accessories_paginated.return_value = (mock_accessories, 2)

        with app.container.accessory_service.override(mock_accessory_service):
            response = client.get("/api/accessories/")
            assert response.status_code == 200
            assert len(response.json()["items"]) == 2
            assert response.json()["total_count"] == 2
            assert response.json()["items"][0]["name"] == "Accessory 1"
            mock_accessory_service.get_all_accessories_paginated.assert_called_once()

    def test_get_accessory_by_id_success(self, client, mock_accessory_service):
        accessory_id = 1
        mock_accessory = Accessory(id=accessory_id, name="Existing Accessory", description="Existing description", daily_rate=25.0, type="Lens", is_available=True)
        mock_accessory_service.get_accessory_by_id.return_value = mock_accessory

        with app.container.accessory_service.override(mock_accessory_service):
            response = client.get(f"/api/accessories/{accessory_id}")
            assert response.status_code == 200
            assert response.json()["name"] == "Existing Accessory"
            assert response.json()["daily_rate"] == 25.0
            mock_accessory_service.get_accessory_by_id.assert_called_once_with(accessory_id)

    def test_get_accessory_by_id_not_found(self, client, mock_accessory_service):
        accessory_id = 999
        mock_accessory_service.get_accessory_by_id.return_value = None

        with app.container.accessory_service.override(mock_accessory_service):
            response = client.get(f"/api/accessories/{accessory_id}")
            assert response.status_code == 404
            assert "Аксессуар не найден" in response.json()["detail"]

    def test_update_accessory_admin_success(self, client, mock_accessory_service, mock_current_admin_user):
        accessory_id = 1
        update_data = {"name": "Updated Accessory", "daily_rate": 30.0, "is_available": False}
        updated_accessory = Accessory(id=accessory_id, name="Updated Accessory", description="Existing description", daily_rate=30.0, type="Lens", is_available=False)
        mock_accessory_service.update_accessory.return_value = updated_accessory

        with app.container.accessory_service.override(mock_accessory_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/accessories/{accessory_id}", json=update_data)
                assert response.status_code == 200
                assert response.json()["name"] == "Updated Accessory"
                assert response.json()["daily_rate"] == 30.0
                assert response.json()["is_available"] is False
                mock_accessory_service.update_accessory.assert_called_once()

    def test_delete_accessory_admin_success(self, client, mock_accessory_service, mock_current_admin_user):
        accessory_id = 1
        mock_accessory_service.delete_accessory.return_value = {"message": "Accessory deleted successfully"}

        with app.container.accessory_service.override(mock_accessory_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.delete(f"/api/admin/accessories/{accessory_id}")
                assert response.status_code == 200
                assert response.json()["message"] == "Accessory deleted successfully"
                mock_accessory_service.delete_accessory.assert_called_once_with(accessory_id)

    def test_create_accessory_unauthorized(self, client, mock_accessory_service):
        accessory_data = {
            "name": "Unauthorized Accessory",
            "description": "This should fail",
            "daily_rate": 10.0,
            "type": "Lens",
            "is_available": True
        }

        with app.container.accessory_service.override(mock_accessory_service):
            with patch("api.dependencies.get_current_user", side_effect=Exception("Unauthorized")):
                response = client.post("/api/admin/accessories/", json=accessory_data)
                assert response.status_code == 500

    def test_create_accessory_invalid_data(self, client, mock_accessory_service, mock_current_admin_user):
        accessory_data = {
            "name": "", # Invalid empty name
            "description": "Invalid accessory",
            "daily_rate": -10.0, # Invalid negative rate
            "type": "Lens",
            "is_available": True
        }

        with app.container.accessory_service.override(mock_accessory_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/accessories/", json=accessory_data)
                assert response.status_code == 422 # FastAPI validation error

    def test_update_accessory_not_found(self, client, mock_accessory_service, mock_current_admin_user):
        accessory_id = 999
        update_data = {"name": "Updated Name"}
        mock_accessory_service.update_accessory.return_value = None

        with app.container.accessory_service.override(mock_accessory_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/accessories/{accessory_id}", json=update_data)
                assert response.status_code == 404
                assert "Аксессуар не найден" in response.json()["detail"]

    def test_delete_accessory_not_found(self, client, mock_accessory_service, mock_current_admin_user):
        accessory_id = 999
        mock_accessory_service.delete_accessory.return_value = None

        with app.container.accessory_service.override(mock_accessory_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.delete(f"/api/admin/accessories/{accessory_id}")
                assert response.status_code == 404
                assert "Аксессуар не найден" in response.json()["detail"]

    def test_delete_accessory_with_usage_error(self, client, mock_accessory_service, mock_current_admin_user):
        accessory_id = 1
        mock_accessory_service.delete_accessory.side_effect = ValueError("Cannot delete accessory that is currently in use")

        with app.container.accessory_service.override(mock_accessory_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.delete(f"/api/admin/accessories/{accessory_id}")
                assert response.status_code == 400
                assert "Cannot delete accessory that is currently in use" in response.json()["detail"]




















