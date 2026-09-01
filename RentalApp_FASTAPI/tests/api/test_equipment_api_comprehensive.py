import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import date, datetime, timedelta

from api.main_api import app
from containers import Container
from api.models.equipment import Equipment
from api.models.user import User
from shared.schemas.equipment_schema import EquipmentCreate, EquipmentUpdateExtended

class TestEquipmentAPIComprehensive:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    @pytest.fixture
    def mock_equipment_crud_service(self):
        service = AsyncMock()
        service.create_equipment = AsyncMock()
        service.update_equipment_details = AsyncMock()
        service.delete_equipment = AsyncMock()
        service.get_equipment_by_id = AsyncMock()
        return service

    @pytest.fixture
    def mock_equipment_filter_service(self):
        service = AsyncMock()
        service.get_paginated_equipment = AsyncMock()
        service.calculate_available_filters = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_admin_user(self):
        user = User(id=1, email="admin@example.com", full_name="Admin User", is_active=True, role="admin")
        return user

    @pytest.fixture
    def mock_current_user(self):
        user = User(id=2, email="user@example.com", full_name="Regular User", is_active=True, role="user")
        return user

    def test_create_equipment_with_all_fields(self, client, mock_equipment_crud_service, mock_current_admin_user):
        equipment_data = {
            "name": "Professional Camera",
            "description": "High-end professional camera for photography",
            "daily_rate": 75.0,
            "type": "Camera",
            "brand_system_id": 1,
            "serial_number": "SN123456",
            "accessories_ids": [1, 2, 3],
            "association_ids": [1, 2],
            "is_active": True,
            "notes": "Excellent condition"
        }
        mock_equipment = Equipment(id=1, **equipment_data)
        mock_equipment_crud_service.create_equipment.return_value = mock_equipment

        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/equipment/", json=equipment_data)
                assert response.status_code == 201
                assert response.json()["name"] == "Professional Camera"
                assert response.json()["daily_rate"] == 75.0
                mock_equipment_crud_service.create_equipment.assert_called_once()

    def test_get_equipment_with_complex_filters(self, client, mock_equipment_filter_service):
        start_date = date.today()
        end_date = date.today() + timedelta(days=7)
        mock_equipment_list = [
            Equipment(id=1, name="Camera A", daily_rate=50.0, type="Camera", brand_system_id=1, serial_number="SN001"),
            Equipment(id=2, name="Lens B", daily_rate=25.0, type="Lens", brand_system_id=1, serial_number="SN002")
        ]
        mock_equipment_filter_service.get_paginated_equipment.return_value = (mock_equipment_list, 2)

        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            response = client.get(
                f"/api/equipment/?query=professional&type=Camera&brand_system_id=1&association_id=1"
                f"&start_date={start_date.isoformat()}&end_date={end_date.isoformat()}"
                f"&available_only=true&min_daily_rate=20&max_daily_rate=100&skip=0&limit=20"
            )
            assert response.status_code == 200
            assert len(response.json()["items"]) == 2
            assert response.json()["total_count"] == 2
            mock_equipment_filter_service.get_paginated_equipment.assert_called_once()

    def test_update_equipment_with_partial_data(self, client, mock_equipment_crud_service, mock_current_admin_user):
        equipment_id = 1
        update_data = {
            "daily_rate": 80.0,
            "notes": "Updated notes",
            "accessories_ids": [4, 5]
        }
        updated_equipment = Equipment(
            id=equipment_id, name="Professional Camera", daily_rate=80.0, 
            type="Camera", brand_system_id=1, serial_number="SN123456", notes="Updated notes"
        )
        mock_equipment_crud_service.update_equipment_details.return_value = updated_equipment

        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/equipment/{equipment_id}", json=update_data)
                assert response.status_code == 200
                assert response.json()["daily_rate"] == 80.0
                assert response.json()["notes"] == "Updated notes"
                mock_equipment_crud_service.update_equipment_details.assert_called_once()

    def test_get_equipment_availability_calendar(self, client, mock_equipment_filter_service):
        equipment_id = 1
        start_date = date.today()
        end_date = date.today() + timedelta(days=30)
        mock_equipment = Equipment(id=equipment_id, name="Camera A", daily_rate=50.0, type="Camera", brand_system_id=1, serial_number="SN001")
        mock_equipment_filter_service.get_paginated_equipment.return_value = ([mock_equipment], 1)

        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            response = client.get(
                f"/api/equipment/{equipment_id}/availability?"
                f"start_date={start_date.isoformat()}&end_date={end_date.isoformat()}"
            )
            assert response.status_code == 200
            mock_equipment_filter_service.get_paginated_equipment.assert_called_once()

    def test_equipment_search_with_multiple_criteria(self, client, mock_equipment_filter_service):
        mock_equipment_list = [
            Equipment(id=1, name="Sony A7R", daily_rate=100.0, type="Camera", brand_system_id=1, serial_number="SN001"),
            Equipment(id=2, name="Canon 5D", daily_rate=90.0, type="Camera", brand_system_id=2, serial_number="SN002")
        ]
        mock_equipment_filter_service.get_paginated_equipment.return_value = (mock_equipment_list, 2)

        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            response = client.get("/api/equipment/?query=Sony&type=Camera&min_daily_rate=50&max_daily_rate=150")
            assert response.status_code == 200
            assert len(response.json()["items"]) == 2
            mock_equipment_filter_service.get_paginated_equipment.assert_called_once()

    def test_equipment_bulk_operations(self, client, mock_equipment_crud_service, mock_current_admin_user):
        equipment_ids = [1, 2, 3]
        bulk_update_data = {
            "equipment_ids": equipment_ids,
            "is_active": False,
            "notes": "Bulk deactivation"
        }
        mock_equipment_crud_service.update_equipment_details.return_value = {"message": "Bulk update successful"}

        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put("/api/admin/equipment/bulk-update", json=bulk_update_data)
                assert response.status_code == 200
                assert response.json()["message"] == "Bulk update successful"

    def test_equipment_statistics(self, client, mock_equipment_filter_service, mock_current_admin_user):
        mock_stats = {
            "total_equipment": 50,
            "active_equipment": 45,
            "inactive_equipment": 5,
            "equipment_by_type": {"Camera": 20, "Lens": 15, "Lighting": 10, "Other": 5},
            "average_daily_rate": 65.5,
            "most_expensive": {"id": 1, "name": "Professional Camera", "daily_rate": 150.0},
            "least_expensive": {"id": 2, "name": "Basic Tripod", "daily_rate": 10.0}
        }
        mock_equipment_filter_service.get_equipment_statistics.return_value = mock_stats

        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.get("/api/admin/equipment/statistics")
                assert response.status_code == 200
                assert response.json()["total_equipment"] == 50
                assert response.json()["average_daily_rate"] == 65.5
                mock_equipment_filter_service.get_equipment_statistics.assert_called_once()

    def test_equipment_import_export(self, client, mock_equipment_crud_service, mock_current_admin_user):
        import_data = [
            {"name": "Camera 1", "daily_rate": 50.0, "type": "Camera", "serial_number": "SN001"},
            {"name": "Lens 1", "daily_rate": 25.0, "type": "Lens", "serial_number": "SN002"}
        ]
        mock_equipment_crud_service.import_equipment.return_value = {"imported": 2, "errors": 0}

        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/equipment/import", json=import_data)
                assert response.status_code == 200
                assert response.json()["imported"] == 2
                assert response.json()["errors"] == 0
                mock_equipment_crud_service.import_equipment.assert_called_once()

    def test_equipment_maintenance_schedule(self, client, mock_equipment_crud_service, mock_current_admin_user):
        equipment_id = 1
        maintenance_data = {
            "maintenance_type": "cleaning",
            "scheduled_date": (date.today() + timedelta(days=7)).isoformat(),
            "notes": "Regular cleaning maintenance"
        }
        mock_equipment_crud_service.schedule_maintenance.return_value = {"message": "Maintenance scheduled"}

        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post(f"/api/admin/equipment/{equipment_id}/maintenance", json=maintenance_data)
                assert response.status_code == 200
                assert response.json()["message"] == "Maintenance scheduled"
                mock_equipment_crud_service.schedule_maintenance.assert_called_once()

    def test_equipment_usage_analytics(self, client, mock_equipment_filter_service, mock_current_admin_user):
        mock_analytics = {
            "most_popular_equipment": [
                {"id": 1, "name": "Camera A", "rental_count": 25},
                {"id": 2, "name": "Lens B", "rental_count": 20}
            ],
            "revenue_by_equipment": [
                {"id": 1, "name": "Camera A", "revenue": 2500.0},
                {"id": 2, "name": "Lens B", "revenue": 1500.0}
            ],
            "utilization_rate": 0.75,
            "average_rental_duration": 3.5
        }
        mock_equipment_filter_service.get_usage_analytics.return_value = mock_analytics

        with app.container.equipment_filter_service.override(mock_equipment_filter_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.get("/api/admin/equipment/analytics")
                assert response.status_code == 200
                assert response.json()["utilization_rate"] == 0.75
                assert len(response.json()["most_popular_equipment"]) == 2
                mock_equipment_filter_service.get_usage_analytics.assert_called_once()

    def test_equipment_error_handling_comprehensive(self, client, mock_equipment_crud_service, mock_current_admin_user):
        equipment_id = 1
        update_data = {"daily_rate": 80.0}
        mock_equipment_crud_service.update_equipment_details.side_effect = Exception("Database connection lost")

        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/equipment/{equipment_id}", json=update_data)
                assert response.status_code == 500
                assert "Database connection lost" in response.json()["detail"]

    def test_equipment_validation_edge_cases(self, client, mock_equipment_crud_service, mock_current_admin_user):
        # Test with extreme values
        equipment_data = {
            "name": "A" * 1000,  # Very long name
            "daily_rate": 999999.99,  # Very high rate
            "type": "Camera",
            "serial_number": "SN" + "0" * 100  # Very long serial
        }

        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.post("/api/admin/equipment/", json=equipment_data)
                # Should either succeed or return validation error
                assert response.status_code in [201, 422]

    def test_equipment_concurrent_access(self, client, mock_equipment_crud_service, mock_current_admin_user):
        equipment_id = 1
        update_data = {"daily_rate": 80.0}
        mock_equipment_crud_service.update_equipment_details.side_effect = Exception("Concurrent modification detected")

        with app.container.equipment_crud_service.override(mock_equipment_crud_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                response = client.put(f"/api/admin/equipment/{equipment_id}", json=update_data)
                assert response.status_code == 500
                assert "Concurrent modification detected" in response.json()["detail"]
