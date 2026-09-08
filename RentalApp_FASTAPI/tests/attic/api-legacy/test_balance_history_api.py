import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import datetime

from api.main_api import app
from containers import Container
from api.models.user import User
from api.models.balance_history import BalanceHistory
from shared.schemas.balance_history_schema import BalanceHistoryBase, BalanceHistoryOut

class TestBalanceHistoryAPI:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    @pytest.fixture
    def mock_balance_history_service(self):
        service = AsyncMock()
        service.create_balance_history = AsyncMock()
        service.get_user_balance_history = AsyncMock()
        service.get_balance_history_by_id = AsyncMock()
        service.update_balance_history = AsyncMock()
        service.delete_balance_history = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_user(self):
        user = User(id=1, email="user@example.com", full_name="Test User", is_active=True, role="user")
        return user

    @pytest.fixture
    def mock_current_admin_user(self):
        user = User(id=1, email="admin@example.com", full_name="Admin User", is_active=True, role="admin")
        return user

    def test_get_user_balance_history_success(self, client, mock_balance_history_service, mock_current_user):
        mock_history = [
            BalanceHistory(id=1, user_id=1, amount=100.0, transaction_type="credit", description="Payment"),
            BalanceHistory(id=2, user_id=1, amount=-50.0, transaction_type="debit", description="Rental")
        ]
        mock_balance_history_service.get_user_balance_history.return_value = mock_history

        with app.container.balance_history_service.override(mock_balance_history_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.get("/api/balance-history/user/")
                assert response.status_code == 200
                assert len(response.json()) == 2
                assert response.json()[0]["amount"] == 100.0
                mock_balance_history_service.get_user_balance_history.assert_called_once_with(mock_current_user.id)

    def test_get_balance_history_by_id_success(self, client, mock_balance_history_service, mock_current_user):
        history_id = 1
        mock_history = BalanceHistory(id=history_id, user_id=1, amount=100.0, transaction_type="credit")
        mock_balance_history_service.get_balance_history_by_id.return_value = mock_history

        with app.container.balance_history_service.override(mock_balance_history_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.get(f"/api/balance-history/{history_id}")
                assert response.status_code == 200
                assert response.json()["amount"] == 100.0
                mock_balance_history_service.get_balance_history_by_id.assert_called_once_with(history_id)

    def test_create_balance_history_admin_success(self, client, mock_balance_history_service, mock_current_admin_user):
        history_data = {
            "user_id": 2,
            "amount": 100.0,
            "transaction_type": "credit",
            "description": "Admin adjustment"
        }
        mock_history = BalanceHistory(id=1, **history_data)
        mock_balance_history_service.create_balance_history.return_value = mock_history

        with app.container.balance_history_service.override(mock_balance_history_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/balance-history/", json=history_data)
                assert response.status_code == 201
                assert response.json()["amount"] == 100.0
                mock_balance_history_service.create_balance_history.assert_called_once()

    def test_update_balance_history_admin_success(self, client, mock_balance_history_service, mock_current_admin_user):
        history_id = 1
        update_data = {"description": "Updated description"}
        updated_history = BalanceHistory(id=history_id, user_id=1, amount=100.0, transaction_type="credit", description="Updated description")
        mock_balance_history_service.update_balance_history.return_value = updated_history

        with app.container.balance_history_service.override(mock_balance_history_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/balance-history/{history_id}", json=update_data)
                assert response.status_code == 200
                assert response.json()["description"] == "Updated description"
                mock_balance_history_service.update_balance_history.assert_called_once()

    def test_delete_balance_history_admin_success(self, client, mock_balance_history_service, mock_current_admin_user):
        history_id = 1
        mock_balance_history_service.delete_balance_history.return_value = {"message": "Balance history deleted successfully"}

        with app.container.balance_history_service.override(mock_balance_history_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.delete(f"/api/admin/balance-history/{history_id}")
                assert response.status_code == 200
                assert response.json()["message"] == "Balance history deleted successfully"
                mock_balance_history_service.delete_balance_history.assert_called_once_with(history_id)

    def test_get_user_balance_history_unauthorized(self, client, mock_balance_history_service):
        with app.container.balance_history_service.override(mock_balance_history_service):
            with patch("api.dependencies.get_current_user", side_effect=Exception("Unauthorized")):
                response = client.get("/api/balance-history/user/")
                assert response.status_code == 500

    def test_get_balance_history_not_found(self, client, mock_balance_history_service, mock_current_user):
        history_id = 999
        mock_balance_history_service.get_balance_history_by_id.return_value = None

        with app.container.balance_history_service.override(mock_balance_history_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.get(f"/api/balance-history/{history_id}")
                assert response.status_code == 404
                assert "Balance history not found" in response.json()["detail"]

    def test_create_balance_history_invalid_data(self, client, mock_balance_history_service, mock_current_admin_user):
        history_data = {"user_id": 2, "amount": "invalid", "transaction_type": "invalid"}  # Invalid data

        with app.container.balance_history_service.override(mock_balance_history_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/balance-history/", json=history_data)
                assert response.status_code == 422  # FastAPI validation error

    def test_get_user_balance_history_empty(self, client, mock_balance_history_service, mock_current_user):
        mock_balance_history_service.get_user_balance_history.return_value = []

        with app.container.balance_history_service.override(mock_balance_history_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.get("/api/balance-history/user/")
                assert response.status_code == 200
                assert len(response.json()) == 0
                mock_balance_history_service.get_user_balance_history.assert_called_once_with(mock_current_user.id)

    def test_update_balance_history_service_error(self, client, mock_balance_history_service, mock_current_admin_user):
        history_id = 1
        update_data = {"description": "Updated"}
        mock_balance_history_service.update_balance_history.side_effect = Exception("Database error")

        with app.container.balance_history_service.override(mock_balance_history_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/balance-history/{history_id}", json=update_data)
                assert response.status_code == 500
                assert "Database error" in response.json()["detail"]

    def test_get_user_balance_history_with_pagination(self, client, mock_balance_history_service, mock_current_user):
        mock_history = [
            BalanceHistory(id=1, user_id=1, amount=100.0, transaction_type="credit"),
            BalanceHistory(id=2, user_id=1, amount=-50.0, transaction_type="debit")
        ]
        mock_balance_history_service.get_user_balance_history.return_value = mock_history

        with app.container.balance_history_service.override(mock_balance_history_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_user):
                response = client.get("/api/balance-history/user/?skip=0&limit=10")
                assert response.status_code == 200
                assert len(response.json()) == 2
                mock_balance_history_service.get_user_balance_history.assert_called_once_with(mock_current_user.id)

    def test_create_balance_history_unauthorized(self, client, mock_balance_history_service):
        history_data = {"user_id": 2, "amount": 100.0, "transaction_type": "credit"}

        with app.container.balance_history_service.override(mock_balance_history_service):
            with patch("api.dependencies.get_current_user", side_effect=Exception("Unauthorized")):
                response = client.post("/api/admin/balance-history/", json=history_data)
                assert response.status_code == 500
