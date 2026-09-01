import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

from api.main_api import app
from containers import Container
from api.models.user import User
from api.models.promo_code import PromoCode
from shared.schemas.promo_code_schema import PromoCodeCreate, PromoCodeUpdate

class TestPromoCodeAPIExtended:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    @pytest.fixture
    def mock_promo_code_service(self):
        service = AsyncMock()
        service.validate_promo_code_for_use = AsyncMock()
        service.get_all_promo_codes = AsyncMock()
        service.create_promo_code = AsyncMock()
        service.update_promo_code = AsyncMock()
        service.delete_promo_code = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_admin_user(self):
        user = User(id=1, email="admin@example.com", full_name="Admin User", is_active=True, role="admin")
        return user

    @pytest.fixture
    def mock_current_user(self):
        user = User(id=2, email="user@example.com", full_name="Regular User", is_active=True, role="user")
        return user

    def test_validate_promo_code_success(self, client, mock_promo_code_service, mock_current_user):
        promo_code_data = {
            "code": "DISCOUNT10",
            "equipment_ids": [1, 2],
            "total_amount": 100.0
        }
        mock_validation_result = {
            "is_valid": True,
            "discount_amount": 10.0,
            "final_amount": 90.0,
            "message": "Промокод действителен"
        }
        mock_promo_code_service.validate_promo_code_for_use.return_value = mock_validation_result

        with app.container.promo_code_service.override(mock_promo_code_service):
            with patch("api.dependencies.get_current_user_optional", return_value=mock_current_user):
                response = client.post("/api/promo-codes/validate", json=promo_code_data)
                assert response.status_code == 200
                assert response.json()["is_valid"] is True
                assert response.json()["discount_amount"] == 10.0
                mock_promo_code_service.validate_promo_code_for_use.assert_called_once()

    def test_validate_promo_code_invalid(self, client, mock_promo_code_service, mock_current_user):
        promo_code_data = {
            "code": "INVALID",
            "equipment_ids": [1],
            "total_amount": 100.0
        }
        mock_validation_result = {
            "is_valid": False,
            "discount_amount": 0.0,
            "final_amount": 100.0,
            "message": "Промокод недействителен"
        }
        mock_promo_code_service.validate_promo_code_for_use.return_value = mock_validation_result

        with app.container.promo_code_service.override(mock_promo_code_service):
            with patch("api.dependencies.get_current_user_optional", return_value=mock_current_user):
                response = client.post("/api/promo-codes/validate", json=promo_code_data)
                assert response.status_code == 200
                assert response.json()["is_valid"] is False
                assert response.json()["discount_amount"] == 0.0
                mock_promo_code_service.validate_promo_code_for_use.assert_called_once()

    def test_validate_promo_code_without_user(self, client, mock_promo_code_service):
        promo_code_data = {
            "code": "DISCOUNT10",
            "equipment_ids": [1],
            "total_amount": 100.0
        }
        mock_validation_result = {
            "is_valid": True,
            "discount_amount": 10.0,
            "final_amount": 90.0,
            "message": "Промокод действителен"
        }
        mock_promo_code_service.validate_promo_code_for_use.return_value = mock_validation_result

        with app.container.promo_code_service.override(mock_promo_code_service):
            with patch("api.dependencies.get_current_user_optional", return_value=None):
                response = client.post("/api/promo-codes/validate", json=promo_code_data)
                assert response.status_code == 200
                assert response.json()["is_valid"] is True
                mock_promo_code_service.validate_promo_code_for_use.assert_called_once()

    def test_get_all_promo_codes_admin_success(self, client, mock_promo_code_service, mock_current_admin_user):
        mock_promo_codes = [
            PromoCode(code="DISCOUNT10", discount_percentage=10.0, is_active=True, max_uses=100, times_used=5),
            PromoCode(code="SAVE20", discount_percentage=20.0, is_active=True, max_uses=50, times_used=10)
        ]
        mock_promo_code_service.get_all_promo_codes.return_value = mock_promo_codes

        with app.container.promo_code_service.override(mock_promo_code_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.get("/api/admin/promo-codes/")
                assert response.status_code == 200
                assert len(response.json()) == 2
                assert response.json()[0]["code"] == "DISCOUNT10"
                mock_promo_code_service.get_all_promo_codes.assert_called_once()

    def test_create_promo_code_admin_success(self, client, mock_promo_code_service, mock_current_admin_user):
        promo_code_data = {
            "code": "NEWCODE",
            "discount_percentage": 15.0,
            "is_active": True,
            "max_uses": 200,
            "min_order_amount": 50.0,
            "expires_at": (datetime.now() + timedelta(days=30)).isoformat()
        }
        mock_promo_code = PromoCode(**promo_code_data, times_used=0)
        mock_promo_code_service.create_promo_code.return_value = mock_promo_code

        with app.container.promo_code_service.override(mock_promo_code_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/promo-codes/", json=promo_code_data)
                assert response.status_code == 201
                assert response.json()["code"] == "NEWCODE"
                assert response.json()["discount_percentage"] == 15.0
                mock_promo_code_service.create_promo_code.assert_called_once()

    def test_update_promo_code_admin_success(self, client, mock_promo_code_service, mock_current_admin_user):
        promo_code_id = 1
        update_data = {"discount_percentage": 25.0, "is_active": False}
        updated_promo_code = PromoCode(code="DISCOUNT10", discount_percentage=25.0, is_active=False, max_uses=100, times_used=5)
        mock_promo_code_service.update_promo_code.return_value = updated_promo_code

        with app.container.promo_code_service.override(mock_promo_code_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/promo-codes/{promo_code_id}", json=update_data)
                assert response.status_code == 200
                assert response.json()["discount_percentage"] == 25.0
                assert response.json()["is_active"] is False
                mock_promo_code_service.update_promo_code.assert_called_once()

    def test_delete_promo_code_admin_success(self, client, mock_promo_code_service, mock_current_admin_user):
        promo_code_id = 1
        mock_promo_code_service.delete_promo_code.return_value = {"message": "Promo code deleted successfully"}

        with app.container.promo_code_service.override(mock_promo_code_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.delete(f"/api/admin/promo-codes/{promo_code_id}")
                assert response.status_code == 200
                assert response.json()["message"] == "Promo code deleted successfully"
                mock_promo_code_service.delete_promo_code.assert_called_once_with(promo_code_id)

    def test_validate_promo_code_empty_equipment_list(self, client, mock_promo_code_service, mock_current_user):
        promo_code_data = {
            "code": "DISCOUNT10",
            "equipment_ids": [],
            "total_amount": 100.0
        }
        mock_validation_result = {
            "is_valid": False,
            "discount_amount": 0.0,
            "final_amount": 100.0,
            "message": "Список оборудования пуст"
        }
        mock_promo_code_service.validate_promo_code_for_use.return_value = mock_validation_result

        with app.container.promo_code_service.override(mock_promo_code_service):
            with patch("api.dependencies.get_current_user_optional", return_value=mock_current_user):
                response = client.post("/api/promo-codes/validate", json=promo_code_data)
                assert response.status_code == 200
                assert response.json()["is_valid"] is False
                mock_promo_code_service.validate_promo_code_for_use.assert_called_once()

    def test_validate_promo_code_zero_amount(self, client, mock_promo_code_service, mock_current_user):
        promo_code_data = {
            "code": "DISCOUNT10",
            "equipment_ids": [1],
            "total_amount": 0.0
        }
        mock_validation_result = {
            "is_valid": False,
            "discount_amount": 0.0,
            "final_amount": 0.0,
            "message": "Сумма заказа должна быть больше нуля"
        }
        mock_promo_code_service.validate_promo_code_for_use.return_value = mock_validation_result

        with app.container.promo_code_service.override(mock_promo_code_service):
            with patch("api.dependencies.get_current_user_optional", return_value=mock_current_user):
                response = client.post("/api/promo-codes/validate", json=promo_code_data)
                assert response.status_code == 200
                assert response.json()["is_valid"] is False
                mock_promo_code_service.validate_promo_code_for_use.assert_called_once()

    def test_create_promo_code_unauthorized(self, client, mock_promo_code_service):
        promo_code_data = {
            "code": "UNAUTHORIZED",
            "discount_percentage": 10.0,
            "is_active": True,
            "max_uses": 100
        }

        with app.container.promo_code_service.override(mock_promo_code_service):
            with patch("api.dependencies.get_current_user", side_effect=Exception("Unauthorized")):
                response = client.post("/api/admin/promo-codes/", json=promo_code_data)
                assert response.status_code == 500

    def test_create_promo_code_invalid_percentage(self, client, mock_promo_code_service, mock_current_admin_user):
        promo_code_data = {
            "code": "INVALID",
            "discount_percentage": 150.0, # Invalid percentage > 100
            "is_active": True,
            "max_uses": 100
        }

        with app.container.promo_code_service.override(mock_promo_code_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/promo-codes/", json=promo_code_data)
                assert response.status_code == 422 # FastAPI validation error

    def test_update_promo_code_not_found(self, client, mock_promo_code_service, mock_current_admin_user):
        promo_code_id = 999
        update_data = {"discount_percentage": 25.0}
        mock_promo_code_service.update_promo_code.return_value = None

        with app.container.promo_code_service.override(mock_promo_code_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/promo-codes/{promo_code_id}", json=update_data)
                assert response.status_code == 404
                assert "Промокод не найден" in response.json()["detail"]

    def test_delete_promo_code_not_found(self, client, mock_promo_code_service, mock_current_admin_user):
        promo_code_id = 999
        mock_promo_code_service.delete_promo_code.return_value = None

        with app.container.promo_code_service.override(mock_promo_code_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.delete(f"/api/admin/promo-codes/{promo_code_id}")
                assert response.status_code == 404
                assert "Промокод не найден" in response.json()["detail"]

