import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import date, datetime

from api.main_api import app
from containers import Container
from api.models.user import User
from api.models.holiday import Holiday
from shared.schemas.holiday_schema import HolidayCreate, RecurringHolidayRuleCreate

class TestHolidayAPIExtended:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    @pytest.fixture
    def mock_holiday_service(self):
        service = AsyncMock()
        service.get_holidays = AsyncMock()
        service.create_single_holiday = AsyncMock()
        service.create_weekly_recurring_holidays = AsyncMock()
        service.delete_holiday = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_admin_user(self):
        user = User(id=1, email="admin@example.com", full_name="Admin User", is_active=True, role="admin")
        return user

    def test_get_holidays_success(self, client, mock_holiday_service):
        start_date = date.today()
        end_date = date.today()
        mock_holidays = [
            Holiday(id=1, date=start_date, name="Test Holiday", description="Test description"),
            Holiday(id=2, date=end_date, name="Another Holiday", description="Another description")
        ]
        mock_holiday_service.get_holidays.return_value = mock_holidays

        with app.container.holiday_service.override(mock_holiday_service):
            response = client.get(f"/api/holidays/?start_date={start_date.isoformat()}&end_date={end_date.isoformat()}")
            assert response.status_code == 200
            assert len(response.json()) == 2
            assert response.json()[0]["name"] == "Test Holiday"
            mock_holiday_service.get_holidays.assert_called_once()

    def test_get_holidays_empty_result(self, client, mock_holiday_service):
        start_date = date.today()
        end_date = date.today()
        mock_holiday_service.get_holidays.return_value = []

        with app.container.holiday_service.override(mock_holiday_service):
            response = client.get(f"/api/holidays/?start_date={start_date.isoformat()}&end_date={end_date.isoformat()}")
            assert response.status_code == 200
            assert len(response.json()) == 0
            mock_holiday_service.get_holidays.assert_called_once()

    def test_create_single_holiday_admin_success(self, client, mock_holiday_service, mock_current_admin_user):
        holiday_data = {
            "date": date.today().isoformat(),
            "description": "New holiday description"
        }
        mock_holiday = Holiday(id=1, date=date.today(), description="New holiday description")
        mock_holiday_service.create_single_holiday.return_value = mock_holiday

        with app.container.holiday_service.override(mock_holiday_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/holidays/", json=holiday_data)
                assert response.status_code == 201
                assert response.json()["description"] == "New holiday description"
                mock_holiday_service.create_single_holiday.assert_called_once()

    def test_create_weekly_recurring_holidays_admin_success(self, client, mock_holiday_service, mock_current_admin_user):
        holiday_data = {
            "start_date": date.today().isoformat(),
            "end_date": (date.today() + datetime.timedelta(days=7)).isoformat(),
            "description": "Weekly holiday description",
            "day_of_week": 1
        }
        mock_holidays = [
            Holiday(id=1, date=date.today(), description="Weekly holiday description"),
            Holiday(id=2, date=date.today() + datetime.timedelta(days=7), description="Weekly holiday description")
        ]
        mock_holiday_service.create_weekly_recurring_holidays.return_value = mock_holidays

        with app.container.holiday_service.override(mock_holiday_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/holidays/recurring", json=holiday_data)
                assert response.status_code == 201
                assert len(response.json()) == 2
                assert response.json()[0]["description"] == "Weekly holiday description"
                mock_holiday_service.create_weekly_recurring_holidays.assert_called_once()

    def test_delete_holiday_admin_success(self, client, mock_holiday_service, mock_current_admin_user):
        holiday_id = 1
        mock_holiday_service.delete_holiday.return_value = {"message": "Holiday deleted successfully"}

        with app.container.holiday_service.override(mock_holiday_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.delete(f"/api/admin/holidays/{holiday_id}")
                assert response.status_code == 200
                assert response.json()["message"] == "Holiday deleted successfully"
                mock_holiday_service.delete_holiday.assert_called_once_with(holiday_id)

    def test_create_single_holiday_unauthorized(self, client, mock_holiday_service):
        holiday_data = {
            "date": date.today().isoformat(),
            "description": "This should fail"
        }

        with app.container.holiday_service.override(mock_holiday_service):
            with patch("api.dependencies.get_current_user", side_effect=Exception("Unauthorized")):
                response = client.post("/api/admin/holidays/", json=holiday_data)
                assert response.status_code == 500

    def test_create_single_holiday_with_conflicts(self, client, mock_holiday_service, mock_current_admin_user):
        holiday_data = {
            "date": date.today().isoformat(),
            "description": "This should fail due to conflicts"
        }
        mock_holiday_service.create_single_holiday.side_effect = ValueError("Holiday conflicts with existing reservations")

        with app.container.holiday_service.override(mock_holiday_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/holidays/", json=holiday_data)
                assert response.status_code == 400
                assert "Holiday conflicts with existing reservations" in response.json()["detail"]

    def test_create_single_holiday_force_creation(self, client, mock_holiday_service, mock_current_admin_user):
        holiday_data = {
            "date": date.today().isoformat(),
            "description": "This should succeed with force_creation",
            "force": True
        }
        mock_holiday = Holiday(id=1, date=date.today(), description="This should succeed with force_creation")
        mock_holiday_service.create_single_holiday.return_value = mock_holiday

        with app.container.holiday_service.override(mock_holiday_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/holidays/", json=holiday_data)
                assert response.status_code == 201
                assert response.json()["description"] == "This should succeed with force_creation"
                mock_holiday_service.create_single_holiday.assert_called_once()

    def test_delete_holiday_not_found(self, client, mock_holiday_service, mock_current_admin_user):
        holiday_id = 999
        mock_holiday_service.delete_holiday.return_value = None

        with app.container.holiday_service.override(mock_holiday_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.delete(f"/api/admin/holidays/{holiday_id}")
                assert response.status_code == 404
                assert "Праздник не найден" in response.json()["detail"]

    def test_get_holidays_with_pagination(self, client, mock_holiday_service):
        start_date = date.today()
        end_date = date.today()
        mock_holidays = [
            Holiday(id=1, date=start_date, description="Description 1"),
            Holiday(id=2, date=end_date, description="Description 2")
        ]
        mock_holiday_service.get_holidays.return_value = mock_holidays

        with app.container.holiday_service.override(mock_holiday_service):
            response = client.get(f"/api/holidays/?start_date={start_date.isoformat()}&end_date={end_date.isoformat()}&skip=0&limit=10")
            assert response.status_code == 200
            assert len(response.json()) == 2
            mock_holiday_service.get_holidays.assert_called_once()

    def test_create_weekly_recurring_holidays_invalid_date_range(self, client, mock_holiday_service, mock_current_admin_user):
        holiday_data = {
            "start_date": date.today().isoformat(),
            "end_date": (date.today() - datetime.timedelta(days=7)).isoformat(), # Invalid range
            "description": "This should fail due to invalid date range",
            "day_of_week": 1
        }

        with app.container.holiday_service.override(mock_holiday_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/holidays/recurring", json=holiday_data)
                assert response.status_code == 422 # FastAPI validation error
                assert "ensure that start_date is less than or equal to end_date" in response.json()["detail"][0]["msg"]
