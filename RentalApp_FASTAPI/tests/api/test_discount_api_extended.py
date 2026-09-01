import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container
from api.models.user import User
from api.models.discount import DurationDiscount
from shared.schemas.discount_schema import DiscountCreate, DiscountUpdate

class TestDiscountAPIExtended:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    @pytest.fixture
    def mock_discount_service(self):
        service = AsyncMock()
        service.get_duration_discount_percentage = AsyncMock()
        service.get_all_discounts = AsyncMock()
        service.create_discount = AsyncMock()
        service.update_discount = AsyncMock()
        service.delete_discount = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_admin_user(self):
        user = User(id=1, email="admin@example.com", full_name="Admin User", is_active=True, role="admin")
        return user

    def test_get_duration_discount_percentage_success(self, client, mock_discount_service):
        rental_days = 7
        mock_discount_service.get_duration_discount_percentage.return_value = 10.0

        with app.container.discount_service.override(mock_discount_service):
            response = client.get(f"/api/discounts/duration?rental_days={rental_days}")
            assert response.status_code == 200
            assert response.json()["discount_percentage"] == 10.0
            mock_discount_service.get_duration_discount_percentage.assert_called_once_with(rental_days)

    def test_get_duration_discount_percentage_no_discount(self, client, mock_discount_service):
        rental_days = 1
        mock_discount_service.get_duration_discount_percentage.return_value = 0.0

        with app.container.discount_service.override(mock_discount_service):
            response = client.get(f"/api/discounts/duration?rental_days={rental_days}")
            assert response.status_code == 200
            assert response.json()["discount_percentage"] == 0.0
            mock_discount_service.get_duration_discount_percentage.assert_called_once_with(rental_days)

    def test_get_duration_discount_percentage_zero_days(self, client, mock_discount_service):
        rental_days = 0
        mock_discount_service.get_duration_discount_percentage.return_value = 0.0

        with app.container.discount_service.override(mock_discount_service):
            response = client.get(f"/api/discounts/duration?rental_days={rental_days}")
            assert response.status_code == 200
            assert response.json()["discount_percentage"] == 0.0
            mock_discount_service.get_duration_discount_percentage.assert_called_once_with(rental_days)

    def test_get_duration_discount_percentage_negative_days(self, client, mock_discount_service):
        rental_days = -1
        mock_discount_service.get_duration_discount_percentage.return_value = 0.0

        with app.container.discount_service.override(mock_discount_service):
            response = client.get(f"/api/discounts/duration?rental_days={rental_days}")
            assert response.status_code == 200
            assert response.json()["discount_percentage"] == 0.0
            mock_discount_service.get_duration_discount_percentage.assert_called_once_with(rental_days)

    def test_get_duration_discount_percentage_large_days(self, client, mock_discount_service):
        rental_days = 365
        mock_discount_service.get_duration_discount_percentage.return_value = 50.0

        with app.container.discount_service.override(mock_discount_service):
            response = client.get(f"/api/discounts/duration?rental_days={rental_days}")
            assert response.status_code == 200
            assert response.json()["discount_percentage"] == 50.0
            mock_discount_service.get_duration_discount_percentage.assert_called_once_with(rental_days)

    def test_get_all_discounts_success(self, client, mock_discount_service):
        mock_discounts = [
            DurationDiscount(id=1, min_days=7, discount_percentage=10),
            DurationDiscount(id=2, min_days=30, discount_percentage=20)
        ]
        mock_discount_service.get_all_discounts.return_value = mock_discounts

        with app.container.discount_service.override(mock_discount_service):
            response = client.get("/api/discounts/")
            assert response.status_code == 200
            assert len(response.json()) == 2
            assert response.json()[0]["min_days"] == 7
            mock_discount_service.get_all_discounts.assert_called_once()

    def test_create_discount_admin_success(self, client, mock_discount_service, mock_current_admin_user):
        discount_data = {
            "min_days": 5,
            "discount_percentage": 15
        }
        mock_discount = DurationDiscount(id=1, **discount_data)
        mock_discount_service.create_discount.return_value = mock_discount

        with app.container.discount_service.override(mock_discount_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/discounts/", json=discount_data)
                assert response.status_code == 201
                assert response.json()["min_days"] == 5
                assert response.json()["discount_percentage"] == 15
                mock_discount_service.create_discount.assert_called_once()

    def test_update_discount_admin_success(self, client, mock_discount_service, mock_current_admin_user):
        discount_id = 1
        update_data = {"min_days": 10, "discount_percentage": 25}
        updated_discount = DurationDiscount(id=discount_id, min_days=10, discount_percentage=25)
        mock_discount_service.update_discount.return_value = updated_discount

        with app.container.discount_service.override(mock_discount_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/discounts/{discount_id}", json=update_data)
                assert response.status_code == 200
                assert response.json()["min_days"] == 10
                assert response.json()["discount_percentage"] == 25
                mock_discount_service.update_discount.assert_called_once()

    def test_delete_discount_admin_success(self, client, mock_discount_service, mock_current_admin_user):
        discount_id = 1
        mock_discount_service.delete_discount.return_value = {"message": "Discount deleted successfully"}

        with app.container.discount_service.override(mock_discount_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.delete(f"/api/admin/discounts/{discount_id}")
                assert response.status_code == 200
                assert response.json()["message"] == "Discount deleted successfully"
                mock_discount_service.delete_discount.assert_called_once_with(discount_id)

    def test_create_discount_unauthorized(self, client, mock_discount_service):
        discount_data = {
            "min_days": 1,
            "discount_percentage": 10
        }

        with app.container.discount_service.override(mock_discount_service):
            with patch("api.dependencies.get_current_user", side_effect=Exception("Unauthorized")):
                response = client.post("/api/admin/discounts/", json=discount_data)
                assert response.status_code == 500

    def test_create_discount_invalid_percentage(self, client, mock_discount_service, mock_current_admin_user):
        discount_data = {
            "min_days": 1,
            "discount_percentage": 150 # Invalid percentage > 100
        }

        with app.container.discount_service.override(mock_discount_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/discounts/", json=discount_data)
                assert response.status_code == 422 # FastAPI validation error

    def test_create_discount_invalid_days_range(self, client, mock_discount_service, mock_current_admin_user):
        discount_data = {
            "min_days": 0, # Invalid: min_days <= 0
            "discount_percentage": 10
        }

        with app.container.discount_service.override(mock_discount_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/discounts/", json=discount_data)
                assert response.status_code == 422 # FastAPI validation error

    def test_update_discount_not_found(self, client, mock_discount_service, mock_current_admin_user):
        discount_id = 999
        update_data = {"min_days": 5}
        mock_discount_service.update_discount.return_value = None

        with app.container.discount_service.override(mock_discount_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/discounts/{discount_id}", json=update_data)
                assert response.status_code == 404
                assert "Скидка не найдена" in response.json()["detail"]

    def test_delete_discount_not_found(self, client, mock_discount_service, mock_current_admin_user):
        discount_id = 999
        mock_discount_service.delete_discount.return_value = None

        with app.container.discount_service.override(mock_discount_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.delete(f"/api/admin/discounts/{discount_id}")
                assert response.status_code == 404
                assert "Скидка не найдена" in response.json()["detail"]
