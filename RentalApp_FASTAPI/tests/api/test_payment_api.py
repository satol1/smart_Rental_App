import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import datetime

from api.main_api import app
from containers import Container
from api.models.user import User
from api.models.payment import Payment
from shared.schemas.payment_schema import PaymentCreate, PaymentUpdate

class TestPaymentAPI:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    @pytest.fixture
    def mock_payment_service(self):
        service = AsyncMock()
        service.create_payment = AsyncMock()
        service.get_payment_by_id = AsyncMock()
        service.get_user_payments = AsyncMock()
        service.update_payment = AsyncMock()
        service.delete_payment = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_user(self):
        user = User(id=1, email="user@example.com", full_name="Test User", is_active=True, role="user")
        return user

    @pytest.fixture
    def mock_current_admin_user(self):
        user = User(id=1, email="admin@example.com", full_name="Admin User", is_active=True, role="admin")
        return user

    def test_create_payment_success(self, client, mock_payment_service, mock_current_user):
        payment_data = {
            "amount": 100.0,
            "payment_method": "card",
            "description": "Test payment",
            "rental_id": 1
        }
        mock_payment = Payment(user_id=1, **payment_data)
        mock_payment_service.create_payment.return_value = mock_payment

        with app.container.payment_service.override(mock_payment_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.post("/api/payments/", json=payment_data)
                assert response.status_code == 201
                assert response.json()["amount"] == 100.0
                mock_payment_service.create_payment.assert_called_once()

    def test_get_payment_by_id_success(self, client, mock_payment_service, mock_current_user):
        payment_id = 1
        mock_payment = Payment(user_id=1, amount=100.0, payment_method="card")
        mock_payment_service.get_payment_by_id.return_value = mock_payment

        with app.container.payment_service.override(mock_payment_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.get(f"/api/payments/{payment_id}")
                assert response.status_code == 200
                assert response.json()["amount"] == 100.0
                mock_payment_service.get_payment_by_id.assert_called_once_with(payment_id)

    def test_get_user_payments_success(self, client, mock_payment_service, mock_current_user):
        mock_payments = [
            Payment(user_id=1, amount=100.0, payment_method="card"),
            Payment(user_id=1, amount=50.0, payment_method="cash")
        ]
        mock_payment_service.get_user_payments.return_value = mock_payments

        with app.container.payment_service.override(mock_payment_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.get("/api/payments/user/")
                assert response.status_code == 200
                assert len(response.json()) == 2
                mock_payment_service.get_user_payments.assert_called_once_with(mock_current_user.id)

    def test_update_payment_admin_success(self, client, mock_payment_service, mock_current_admin_user):
        payment_id = 1
        update_data = {"status": "completed", "description": "Updated payment"}
        updated_payment = Payment(user_id=1, amount=100.0, payment_method="card", status="completed")
        mock_payment_service.update_payment.return_value = updated_payment

        with app.container.payment_service.override(mock_payment_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/payments/{payment_id}", json=update_data)
                assert response.status_code == 200
                assert response.json()["status"] == "completed"
                mock_payment_service.update_payment.assert_called_once()

    def test_delete_payment_admin_success(self, client, mock_payment_service, mock_current_admin_user):
        payment_id = 1
        mock_payment_service.delete_payment.return_value = {"message": "Payment deleted successfully"}

        with app.container.payment_service.override(mock_payment_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.delete(f"/api/admin/payments/{payment_id}")
                assert response.status_code == 200
                assert response.json()["message"] == "Payment deleted successfully"
                mock_payment_service.delete_payment.assert_called_once_with(payment_id)

    def test_create_payment_unauthorized(self, client, mock_payment_service):
        payment_data = {"amount": 100.0, "payment_method": "card"}
        
        with app.container.payment_service.override(mock_payment_service):
            with patch("api.dependencies.get_current_user", side_effect=Exception("Unauthorized")):
                response = client.post("/api/payments/", json=payment_data)
                assert response.status_code == 500

    def test_get_payment_not_found(self, client, mock_payment_service, mock_current_user):
        payment_id = 999
        mock_payment_service.get_payment_by_id.return_value = None

        with app.container.payment_service.override(mock_payment_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.get(f"/api/payments/{payment_id}")
                assert response.status_code == 404
                assert "Payment not found" in response.json()["detail"]

    def test_create_payment_invalid_data(self, client, mock_payment_service, mock_current_user):
        payment_data = {"amount": -100.0, "payment_method": ""}  # Invalid data

        with app.container.payment_service.override(mock_payment_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.post("/api/payments/", json=payment_data)
                assert response.status_code == 422  # FastAPI validation error

    def test_get_user_payments_empty(self, client, mock_payment_service, mock_current_user):
        mock_payment_service.get_user_payments.return_value = []

        with app.container.payment_service.override(mock_payment_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.get("/api/payments/user/")
                assert response.status_code == 200
                assert len(response.json()) == 0
                mock_payment_service.get_user_payments.assert_called_once_with(mock_current_user.id)

    def test_update_payment_service_error(self, client, mock_payment_service, mock_current_admin_user):
        payment_id = 1
        update_data = {"status": "completed"}
        mock_payment_service.update_payment.side_effect = Exception("Database error")

        with app.container.payment_service.override(mock_payment_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/payments/{payment_id}", json=update_data)
                assert response.status_code == 500
                assert "Database error" in response.json()["detail"]

