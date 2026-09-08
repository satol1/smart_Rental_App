import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import date, timedelta

from api.main_api import app
from containers import Container
from api.models.user import User
from api.models.pack import Pack
from shared.schemas.pack_schema import PackCreate, PackUpdate

class TestPackAPIExtended:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    @pytest.fixture
    def mock_pack_service(self):
        service = AsyncMock()
        service.create_pack = AsyncMock()
        service.get_all_packs = AsyncMock()
        service.get_pack_by_id = AsyncMock()
        service.update_pack = AsyncMock()
        service.delete_pack = AsyncMock()
        service.get_public_packs_for_catalog = AsyncMock()
        service.suggest_equipment_for_pack = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_admin_user(self):
        user = User(id=1, email="admin@example.com", full_name="Admin User", is_active=True, role="admin")
        return user

    @pytest.fixture
    def mock_current_user(self):
        user = User(id=2, email="user@example.com", full_name="Regular User", is_active=True, role="user")
        return user

    def test_create_pack_admin_success(self, client, mock_pack_service, mock_current_admin_user):
        pack_data = {
            "name": "Wedding Photography Kit",
            "description": "Complete kit for wedding photography",
            "equipment_ids": [1, 2, 3],
            "is_public": True
        }
        mock_pack = Pack(id=1, **pack_data)
        mock_pack_service.create_pack.return_value = mock_pack

        with app.container.pack_service.override(mock_pack_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/packs/", json=pack_data)
                assert response.status_code == 201
                assert response.json()["name"] == "Wedding Photography Kit"
                mock_pack_service.create_pack.assert_called_once()

    def test_get_all_packs_success(self, client, mock_pack_service):
        mock_packs = [
            Pack(id=1, name="Wedding Kit", description="Wedding photography", equipment_ids=[1, 2], is_public=True),
            Pack(id=2, name="Portrait Kit", description="Portrait photography", equipment_ids=[3, 4], is_public=False)
        ]
        mock_pack_service.get_all_packs.return_value = mock_packs

        with app.container.pack_service.override(mock_pack_service):
            response = client.get("/api/packs/")
            assert response.status_code == 200
            assert len(response.json()) == 2
            assert response.json()[0]["name"] == "Wedding Kit"
            mock_pack_service.get_all_packs.assert_called_once()

    def test_get_pack_by_id_success(self, client, mock_pack_service):
        pack_id = 1
        mock_pack = Pack(id=pack_id, name="Wedding Kit", description="Wedding photography", equipment_ids=[1, 2], is_public=True)
        mock_pack_service.get_pack_by_id.return_value = mock_pack

        with app.container.pack_service.override(mock_pack_service):
            response = client.get(f"/api/packs/{pack_id}")
            assert response.status_code == 200
            assert response.json()["name"] == "Wedding Kit"
            mock_pack_service.get_pack_by_id.assert_called_once_with(pack_id)

    def test_update_pack_admin_success(self, client, mock_pack_service, mock_current_admin_user):
        pack_id = 1
        update_data = {
            "name": "Updated Wedding Kit",
            "description": "Updated description",
            "equipment_ids": [1, 2, 3, 4]
        }
        updated_pack = Pack(id=pack_id, name="Updated Wedding Kit", description="Updated description", equipment_ids=[1, 2, 3, 4], is_public=True)
        mock_pack_service.update_pack.return_value = updated_pack

        with app.container.pack_service.override(mock_pack_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/packs/{pack_id}", json=update_data)
                assert response.status_code == 200
                assert response.json()["name"] == "Updated Wedding Kit"
                mock_pack_service.update_pack.assert_called_once()

    def test_delete_pack_admin_success(self, client, mock_pack_service, mock_current_admin_user):
        pack_id = 1
        mock_pack_service.delete_pack.return_value = {"message": "Pack deleted successfully"}

        with app.container.pack_service.override(mock_pack_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.delete(f"/api/admin/packs/{pack_id}")
                assert response.status_code == 200
                assert response.json()["message"] == "Pack deleted successfully"
                mock_pack_service.delete_pack.assert_called_once_with(pack_id)

    def test_get_public_packs_for_catalog_success(self, client, mock_pack_service):
        start_date = date.today()
        end_date = date.today() + timedelta(days=7)
        mock_packs = [
            Pack(id=1, name="Wedding Kit", description="Wedding photography", equipment_ids=[1, 2], is_public=True),
            Pack(id=2, name="Portrait Kit", description="Portrait photography", equipment_ids=[3, 4], is_public=True)
        ]
        mock_pack_service.get_public_packs_for_catalog.return_value = mock_packs

        with app.container.pack_service.override(mock_pack_service):
            response = client.get(f"/api/packs/catalog/?start_date={start_date.isoformat()}&end_date={end_date.isoformat()}")
            assert response.status_code == 200
            assert len(response.json()) == 2
            assert response.json()[0]["name"] == "Wedding Kit"
            mock_pack_service.get_public_packs_for_catalog.assert_called_once()

    def test_suggest_equipment_for_pack_success(self, client, mock_pack_service, mock_current_admin_user):
        pack_id = 1
        mock_equipment = [
            {"id": 5, "name": "Additional Lens", "type": "Lens"},
            {"id": 6, "name": "Flash", "type": "Lighting"}
        ]
        mock_pack_service.suggest_equipment_for_pack.return_value = mock_equipment

        with app.container.pack_service.override(mock_pack_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.get(f"/api/admin/packs/{pack_id}/suggest-equipment")
                assert response.status_code == 200
                assert len(response.json()) == 2
                assert response.json()[0]["name"] == "Additional Lens"
                mock_pack_service.suggest_equipment_for_pack.assert_called_once_with(pack_id)

    def test_create_pack_unauthorized(self, client, mock_pack_service):
        pack_data = {"name": "Test Pack", "equipment_ids": [1, 2]}

        with app.container.pack_service.override(mock_pack_service):
            with patch("api.dependencies.get_current_user", side_effect=Exception("Unauthorized")):
                response = client.post("/api/admin/packs/", json=pack_data)
                assert response.status_code == 500

    def test_get_pack_not_found(self, client, mock_pack_service):
        pack_id = 999
        mock_pack_service.get_pack_by_id.return_value = None

        with app.container.pack_service.override(mock_pack_service):
            response = client.get(f"/api/packs/{pack_id}")
            assert response.status_code == 404
            assert "Pack not found" in response.json()["detail"]

    def test_create_pack_invalid_data(self, client, mock_pack_service, mock_current_admin_user):
        pack_data = {"name": "", "equipment_ids": []}  # Invalid data

        with app.container.pack_service.override(mock_pack_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/packs/", json=pack_data)
                assert response.status_code == 422  # FastAPI validation error

    def test_get_public_packs_for_catalog_without_dates(self, client, mock_pack_service):
        mock_packs = [
            Pack(id=1, name="Wedding Kit", description="Wedding photography", equipment_ids=[1, 2], is_public=True)
        ]
        mock_pack_service.get_public_packs_for_catalog.return_value = mock_packs

        with app.container.pack_service.override(mock_pack_service):
            response = client.get("/api/packs/catalog/")
            assert response.status_code == 200
            assert len(response.json()) == 1
            mock_pack_service.get_public_packs_for_catalog.assert_called_once()

    def test_update_pack_service_error(self, client, mock_pack_service, mock_current_admin_user):
        pack_id = 1
        update_data = {"name": "Updated Pack"}
        mock_pack_service.update_pack.side_effect = Exception("Database error")

        with app.container.pack_service.override(mock_pack_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/packs/{pack_id}", json=update_data)
                assert response.status_code == 500
                assert "Database error" in response.json()["detail"]

    def test_suggest_equipment_for_pack_not_found(self, client, mock_pack_service, mock_current_admin_user):
        pack_id = 999
        mock_pack_service.suggest_equipment_for_pack.return_value = []

        with app.container.pack_service.override(mock_pack_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.get(f"/api/admin/packs/{pack_id}/suggest-equipment")
                assert response.status_code == 200
                assert len(response.json()) == 0
                mock_pack_service.suggest_equipment_for_pack.assert_called_once_with(pack_id)

    def test_get_all_packs_empty(self, client, mock_pack_service):
        mock_pack_service.get_all_packs.return_value = []

        with app.container.pack_service.override(mock_pack_service):
            response = client.get("/api/packs/")
            assert response.status_code == 200
            assert len(response.json()) == 0
            mock_pack_service.get_all_packs.assert_called_once()

    def test_create_pack_with_equipment_not_found(self, client, mock_pack_service, mock_current_admin_user):
        pack_data = {
            "name": "Test Pack",
            "equipment_ids": [999, 1000]  # Non-existent equipment
        }
        mock_pack_service.create_pack.side_effect = ValueError("Equipment not found")

        with app.container.pack_service.override(mock_pack_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/packs/", json=pack_data)
                assert response.status_code == 400
                assert "Equipment not found" in response.json()["detail"]




















