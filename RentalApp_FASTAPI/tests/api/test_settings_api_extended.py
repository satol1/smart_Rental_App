import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container
from api.models.user import User
from api.models.setting import Setting
from shared.schemas.setting_schema import SettingUpdate

class TestSettingsAPIExtended:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    @pytest.fixture
    def mock_settings_service(self):
        service = AsyncMock()
        service.get_all_settings = AsyncMock()
        service.update_settings = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_admin_user(self):
        user = User(id=1, email="admin@example.com", full_name="Admin User", is_active=True, role="admin")
        return user

    def test_get_all_settings_admin_success(self, client, mock_settings_service, mock_current_admin_user):
        mock_settings = [
            Setting(key="min_rental_days", value="1"),
            Setting(key="max_rental_days", value="30"),
            Setting(key="default_deposit_percentage", value="20")
        ]
        mock_settings_service.get_all_settings.return_value = mock_settings

        with app.container.settings_service.override(mock_settings_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.get("/api/admin/settings/")
                assert response.status_code == 200
                assert len(response.json()) == 3
                assert response.json()[0]["key"] == "min_rental_days"
                assert response.json()[0]["value"] == "1"
                mock_settings_service.get_all_settings.assert_called_once()

    def test_get_all_settings_empty(self, client, mock_settings_service, mock_current_admin_user):
        mock_settings_service.get_all_settings.return_value = []

        with app.container.settings_service.override(mock_settings_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.get("/api/admin/settings/")
                assert response.status_code == 200
                assert len(response.json()) == 0
                mock_settings_service.get_all_settings.assert_called_once()

    def test_update_settings_admin_success(self, client, mock_settings_service, mock_current_admin_user):
        update_data = [
            {"key": "min_rental_days", "value": "2"},
            {"key": "max_rental_days", "value": "60"}
        ]
        mock_settings_service.update_settings.return_value = {"message": "Settings updated successfully"}

        with app.container.settings_service.override(mock_settings_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put("/api/admin/settings/", json=update_data)
                assert response.status_code == 200
                assert response.json()["message"] == "Settings updated successfully"
                mock_settings_service.update_settings.assert_called_once()

    def test_update_settings_empty_list(self, client, mock_settings_service, mock_current_admin_user):
        update_data = []
        mock_settings_service.update_settings.return_value = {"message": "Settings updated successfully"}

        with app.container.settings_service.override(mock_settings_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put("/api/admin/settings/", json=update_data)
                assert response.status_code == 200
                assert response.json()["message"] == "Settings updated successfully"
                mock_settings_service.update_settings.assert_called_once()

    def test_update_settings_multiple_settings(self, client, mock_settings_service, mock_current_admin_user):
        update_data = [
            {"key": "min_rental_days", "value": "3"},
            {"key": "max_rental_days", "value": "90"},
            {"key": "default_deposit_percentage", "value": "25"},
            {"key": "late_fee_per_day", "value": "50"}
        ]
        mock_settings_service.update_settings.return_value = {"message": "Settings updated successfully"}

        with app.container.settings_service.override(mock_settings_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put("/api/admin/settings/", json=update_data)
                assert response.status_code == 200
                assert response.json()["message"] == "Settings updated successfully"
                mock_settings_service.update_settings.assert_called_once()

    def test_get_all_settings_unauthorized(self, client, mock_settings_service):
        with app.container.settings_service.override(mock_settings_service):
            with patch("api.dependencies.get_current_user", side_effect=Exception("Unauthorized")):
                response = client.get("/api/admin/settings/")
                assert response.status_code == 500

    def test_update_settings_unauthorized(self, client, mock_settings_service):
        update_data = [{"key": "min_rental_days", "value": "2"}]

        with app.container.settings_service.override(mock_settings_service):
            with patch("api.dependencies.get_current_user", side_effect=Exception("Unauthorized")):
                response = client.put("/api/admin/settings/", json=update_data)
                assert response.status_code == 500

    def test_update_settings_invalid_data(self, client, mock_settings_service, mock_current_admin_user):
        update_data = [
            {"key": "", "value": "2"}, # Invalid empty key
            {"key": "min_rental_days", "value": ""} # Invalid empty value
        ]

        with app.container.settings_service.override(mock_settings_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put("/api/admin/settings/", json=update_data)
                assert response.status_code == 422 # FastAPI validation error

    def test_update_settings_repository_error(self, client, mock_settings_service, mock_current_admin_user):
        update_data = [{"key": "min_rental_days", "value": "2"}]
        mock_settings_service.update_settings.side_effect = Exception("Database error")

        with app.container.settings_service.override(mock_settings_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put("/api/admin/settings/", json=update_data)
                assert response.status_code == 500
                assert "Database error" in response.json()["detail"]

    def test_update_settings_commit_error(self, client, mock_settings_service, mock_current_admin_user):
        update_data = [{"key": "min_rental_days", "value": "2"}]
        mock_settings_service.update_settings.side_effect = Exception("Commit failed")

        with app.container.settings_service.override(mock_settings_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put("/api/admin/settings/", json=update_data)
                assert response.status_code == 500
                assert "Commit failed" in response.json()["detail"]

    def test_get_all_settings_repository_error(self, client, mock_settings_service, mock_current_admin_user):
        mock_settings_service.get_all_settings.side_effect = Exception("Database connection error")

        with app.container.settings_service.override(mock_settings_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.get("/api/admin/settings/")
                assert response.status_code == 500
                assert "Database connection error" in response.json()["detail"]

    def test_update_settings_large_dataset(self, client, mock_settings_service, mock_current_admin_user):
        # Тест с большим количеством настроек
        update_data = [
            {"key": f"setting_{i}", "value": f"value_{i}"} for i in range(50)
        ]
        mock_settings_service.update_settings.return_value = {"message": "Settings updated successfully"}

        with app.container.settings_service.override(mock_settings_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put("/api/admin/settings/", json=update_data)
                assert response.status_code == 200
                assert response.json()["message"] == "Settings updated successfully"
                mock_settings_service.update_settings.assert_called_once()

    def test_update_settings_duplicate_keys(self, client, mock_settings_service, mock_current_admin_user):
        update_data = [
            {"key": "min_rental_days", "value": "2"},
            {"key": "min_rental_days", "value": "3"} # Дублирующий ключ
        ]
        mock_settings_service.update_settings.return_value = {"message": "Settings updated successfully"}

        with app.container.settings_service.override(mock_settings_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put("/api/admin/settings/", json=update_data)
                assert response.status_code == 200
                assert response.json()["message"] == "Settings updated successfully"
                mock_settings_service.update_settings.assert_called_once()
