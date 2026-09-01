import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

from api.main_api import app
from containers import Container
from api.models.user import User
from api.models.rental import Rental
from shared.schemas.rental_schema import RentalCreateFromScratchRequest, AdminRentalUpdate

class TestRentalAPIExtended:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    @pytest.fixture
    def mock_rental_service(self):
        service = AsyncMock()
        service.create_rental = AsyncMock()
        service.get_rentals_for_user = AsyncMock()
        service.get_rental_by_id = AsyncMock()
        service.update_rental = AsyncMock()
        service.return_rental = AsyncMock()
        service.get_overdue_rentals = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_user(self):
        user = User(id=2, email="user@example.com", full_name="Regular User", is_active=True, role="user")
        return user

    @pytest.fixture
    def mock_current_admin_user(self):
        user = User(id=1, email="admin@example.com", full_name="Admin User", is_active=True, role="admin")
        return user

    def test_create_rental_success(self, client, mock_rental_service, mock_current_user):
        rental_data = {
            "equipment_ids": [1, 2],
            "start_date": (datetime.now() + timedelta(days=1)).isoformat(),
            "end_date": (datetime.now() + timedelta(days=5)).isoformat(),
            "total_price": 200.0
        }
        mock_rental = Rental(id=1, user_id=mock_current_user.id, **rental_data, status="active")
        mock_rental_service.create_rental.return_value = mock_rental

        with app.container.rental_service.override(mock_rental_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.post("/api/rentals/", json=rental_data)
                assert response.status_code == 201
                assert response.json()["id"] == 1
                assert response.json()["status"] == "active"
                mock_rental_service.create_rental.assert_called_once()

    def test_get_user_rentals_success(self, client, mock_rental_service, mock_current_user):
        mock_rentals = [
            Rental(id=1, user_id=mock_current_user.id, start_date=datetime.now(), end_date=datetime.now() + timedelta(days=1), total_cost=50.0, status="active"),
            Rental(id=2, user_id=mock_current_user.id, start_date=datetime.now(), end_date=datetime.now() + timedelta(days=2), total_cost=75.0, status="completed")
        ]
        mock_rental_service.get_rentals_for_user.return_value = mock_rentals

        with app.container.rental_service.override(mock_rental_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.get("/api/rentals/my-rentals")
                assert response.status_code == 200
                assert len(response.json()) == 2
                assert response.json()[0]["status"] == "active"
                mock_rental_service.get_rentals_for_user.assert_called_once_with(mock_current_user.id)

    def test_get_rental_by_id_success(self, client, mock_rental_service, mock_current_user):
        rental_id = 1
        mock_rental = Rental(id=rental_id, user_id=mock_current_user.id, start_date=datetime.now(), end_date=datetime.now() + timedelta(days=1), total_cost=50.0, status="active")
        mock_rental_service.get_rental_by_id.return_value = mock_rental

        with app.container.rental_service.override(mock_rental_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.get(f"/api/rentals/{rental_id}")
                assert response.status_code == 200
                assert response.json()["id"] == rental_id
                assert response.json()["status"] == "active"
                mock_rental_service.get_rental_by_id.assert_called_once_with(rental_id, mock_current_user.id)

    def test_get_rental_by_id_not_found(self, client, mock_rental_service, mock_current_user):
        rental_id = 999
        mock_rental_service.get_rental_by_id.return_value = None

        with app.container.rental_service.override(mock_rental_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.get(f"/api/rentals/{rental_id}")
                assert response.status_code == 404
                assert "Аренда не найдена" in response.json()["detail"]

    def test_update_rental_success(self, client, mock_rental_service, mock_current_user):
        rental_id = 1
        update_data = {"end_date": (datetime.now() + timedelta(days=7)).isoformat(), "total_cost": 300.0}
        updated_rental = Rental(id=rental_id, user_id=mock_current_user.id, start_date=datetime.now(), end_date=datetime.now() + timedelta(days=7), total_cost=300.0, status="active")
        mock_rental_service.update_rental.return_value = updated_rental

        with app.container.rental_service.override(mock_rental_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.put(f"/api/rentals/{rental_id}", json=update_data)
                assert response.status_code == 200
                assert response.json()["total_price"] == 300.0
                mock_rental_service.update_rental.assert_called_once()

    def test_return_rental_success(self, client, mock_rental_service, mock_current_user):
        rental_id = 1
        mock_rental_service.return_rental.return_value = {"message": "Аренда успешно возвращена"}

        with app.container.rental_service.override(mock_rental_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.post(f"/api/rentals/{rental_id}/return")
                assert response.status_code == 200
                assert response.json()["message"] == "Аренда успешно возвращена"
                mock_rental_service.return_rental.assert_called_once_with(rental_id, mock_current_user.id)

    def test_get_overdue_rentals_admin_success(self, client, mock_rental_service, mock_current_admin_user):
        mock_overdue_rentals = [
            Rental(id=1, user_id=2, start_date=datetime.now() - timedelta(days=5), end_date=datetime.now() - timedelta(days=1), total_cost=50.0, status="overdue"),
            Rental(id=2, user_id=3, start_date=datetime.now() - timedelta(days=3), end_date=datetime.now() - timedelta(days=1), total_cost=75.0, status="overdue")
        ]
        mock_rental_service.get_overdue_rentals.return_value = mock_overdue_rentals

        with app.container.rental_service.override(mock_rental_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.get("/api/admin/rentals/overdue")
                assert response.status_code == 200
                assert len(response.json()) == 2
                assert response.json()[0]["status"] == "overdue"
                mock_rental_service.get_overdue_rentals.assert_called_once()

    def test_create_rental_unauthorized(self, client, mock_rental_service):
        rental_data = {
            "equipment_ids": [1],
            "start_date": (datetime.now() + timedelta(days=1)).isoformat(),
            "end_date": (datetime.now() + timedelta(days=5)).isoformat(),
            "total_price": 100.0
        }

        with app.container.rental_service.override(mock_rental_service):
            with patch("api.dependencies.get_current_user", side_effect=Exception("Unauthorized")):
                response = client.post("/api/rentals/", json=rental_data)
                assert response.status_code == 500

    def test_create_rental_invalid_dates(self, client, mock_rental_service, mock_current_user):
        rental_data = {
            "equipment_ids": [1],
            "start_date": (datetime.now() + timedelta(days=5)).isoformat(),
            "end_date": (datetime.now() + timedelta(days=1)).isoformat(), # Invalid range
            "total_price": 100.0
        }

        with app.container.rental_service.override(mock_rental_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.post("/api/rentals/", json=rental_data)
                assert response.status_code == 422 # FastAPI validation error
                assert "ensure that start_date is less than or equal to end_date" in response.json()["detail"][0]["msg"]

    def test_create_rental_service_error(self, client, mock_rental_service, mock_current_user):
        rental_data = {
            "equipment_ids": [1],
            "start_date": (datetime.now() + timedelta(days=1)).isoformat(),
            "end_date": (datetime.now() + timedelta(days=5)).isoformat(),
            "total_price": 100.0
        }
        mock_rental_service.create_rental.side_effect = ValueError("Equipment not available")

        with app.container.rental_service.override(mock_rental_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.post("/api/rentals/", json=rental_data)
                assert response.status_code == 400
                assert "Equipment not available" in response.json()["detail"]
