"""
Тесты для dashboard_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container


class TestDashboardAPI:
    """Тесты для API дашборда"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_dashboard_service(self):
        """Мок сервиса дашборда"""
        service = AsyncMock()
        service.get_dashboard_summary = AsyncMock()
        service.get_equipment_utilization = AsyncMock()
        service.get_revenue_analytics = AsyncMock()
        service.get_rental_trends = AsyncMock()
        service.get_user_statistics = AsyncMock()
        service.get_equipment_status_overview = AsyncMock()
        service.get_recent_activities = AsyncMock()
        service.get_equipment_performance = AsyncMock()
        service.get_financial_summary = AsyncMock()
        service.get_operational_metrics = AsyncMock()
        return service

    @pytest.fixture
    def mock_current_admin_user(self):
        """Мок пользователя-администратора"""
        from api.models.user import User
        user = User()
        user.id = 1
        user.email = "admin@test.com"
        user.role = "admin"
        user.full_name = "Admin User"
        user.is_active = True
        return user

    def test_get_dashboard_summary_success(self, client, mock_dashboard_service, mock_current_admin_user):
        """Тест успешного получения сводки дашборда"""
        # Arrange
        mock_summary = {
            "total_equipment": 50,
            "active_rentals": 15,
            "pending_reservations": 8,
            "total_revenue": 15000.0,
            "monthly_revenue": 5000.0,
            "equipment_utilization": 75.5,
            "active_users": 25,
            "new_users_this_month": 5
        }
        
        mock_dashboard_service.get_dashboard_summary.return_value = mock_summary
        
        # Override the dependency using container
        with app.container.dashboard_service.override(mock_dashboard_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/dashboard/summary")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["total_equipment"] == 50
                assert data["active_rentals"] == 15
                assert data["pending_reservations"] == 8
                assert data["total_revenue"] == 15000.0
                assert data["monthly_revenue"] == 5000.0
                assert data["equipment_utilization"] == 75.5
                assert data["active_users"] == 25
                assert data["new_users_this_month"] == 5
                mock_dashboard_service.get_dashboard_summary.assert_called_once()

    def test_get_equipment_utilization_success(self, client, mock_dashboard_service, mock_current_admin_user):
        """Тест успешного получения данных об использовании оборудования"""
        # Arrange
        mock_utilization = {
            "total_equipment": 50,
            "in_use": 15,
            "available": 30,
            "maintenance": 3,
            "reserved": 2,
            "utilization_percentage": 75.5,
            "by_category": {
                "cameras": {"total": 20, "in_use": 8, "utilization": 40.0},
                "lenses": {"total": 15, "in_use": 4, "utilization": 26.7},
                "accessories": {"total": 15, "in_use": 3, "utilization": 20.0}
            }
        }
        
        mock_dashboard_service.get_equipment_utilization.return_value = mock_utilization
        
        # Override the dependency using container
        with app.container.dashboard_service.override(mock_dashboard_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/dashboard/equipment-utilization")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["total_equipment"] == 50
                assert data["in_use"] == 15
                assert data["available"] == 30
                assert data["maintenance"] == 3
                assert data["reserved"] == 2
                assert data["utilization_percentage"] == 75.5
                assert "by_category" in data
                assert data["by_category"]["cameras"]["total"] == 20
                mock_dashboard_service.get_equipment_utilization.assert_called_once()

    def test_get_revenue_analytics_success(self, client, mock_dashboard_service, mock_current_admin_user):
        """Тест успешного получения аналитики доходов"""
        # Arrange
        mock_analytics = {
            "total_revenue": 15000.0,
            "monthly_revenue": 5000.0,
            "daily_revenue": 166.67,
            "revenue_by_period": {
                "last_7_days": 1200.0,
                "last_30_days": 5000.0,
                "last_90_days": 15000.0
            },
            "revenue_by_category": {
                "cameras": 8000.0,
                "lenses": 4000.0,
                "accessories": 3000.0
            },
            "growth_rate": 15.5
        }
        
        mock_dashboard_service.get_revenue_analytics.return_value = mock_analytics
        
        # Override the dependency using container
        with app.container.dashboard_service.override(mock_dashboard_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/dashboard/revenue-analytics")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["total_revenue"] == 15000.0
                assert data["monthly_revenue"] == 5000.0
                assert data["daily_revenue"] == 166.67
                assert "revenue_by_period" in data
                assert "revenue_by_category" in data
                assert data["growth_rate"] == 15.5
                mock_dashboard_service.get_revenue_analytics.assert_called_once()

    def test_get_rental_trends_success(self, client, mock_dashboard_service, mock_current_admin_user):
        """Тест успешного получения трендов аренды"""
        # Arrange
        mock_trends = {
            "rentals_by_period": {
                "last_7_days": [5, 8, 12, 15, 18, 20, 22],
                "last_30_days": [45, 52, 48, 55, 60, 58, 62, 65, 70, 68, 72, 75, 78, 80, 82, 85, 88, 90, 92, 95, 98, 100, 102, 105, 108, 110, 112, 115, 118, 120]
            },
            "popular_equipment": [
                {"equipment_id": 1, "name": "Canon EOS R5", "rental_count": 25},
                {"equipment_id": 2, "name": "Sony A7R IV", "rental_count": 20},
                {"equipment_id": 3, "name": "Nikon Z7 II", "rental_count": 18}
            ],
            "average_rental_duration": 4.5,
            "peak_rental_times": ["09:00", "14:00", "18:00"]
        }
        
        mock_dashboard_service.get_rental_trends.return_value = mock_trends
        
        # Override the dependency using container
        with app.container.dashboard_service.override(mock_dashboard_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/dashboard/rental-trends")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "rentals_by_period" in data
                assert "popular_equipment" in data
                assert data["average_rental_duration"] == 4.5
                assert "peak_rental_times" in data
                assert len(data["popular_equipment"]) == 3
                mock_dashboard_service.get_rental_trends.assert_called_once()

    def test_get_user_statistics_success(self, client, mock_dashboard_service, mock_current_admin_user):
        """Тест успешного получения статистики пользователей"""
        # Arrange
        mock_statistics = {
            "total_users": 100,
            "active_users": 75,
            "new_users_this_month": 15,
            "users_by_role": {
                "admin": 3,
                "manager": 5,
                "user": 92
            },
            "user_activity": {
                "daily_active": 25,
                "weekly_active": 60,
                "monthly_active": 75
            },
            "user_growth_rate": 20.5
        }
        
        mock_dashboard_service.get_user_statistics.return_value = mock_statistics
        
        # Override the dependency using container
        with app.container.dashboard_service.override(mock_dashboard_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/dashboard/user-statistics")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["total_users"] == 100
                assert data["active_users"] == 75
                assert data["new_users_this_month"] == 15
                assert "users_by_role" in data
                assert "user_activity" in data
                assert data["user_growth_rate"] == 20.5
                mock_dashboard_service.get_user_statistics.assert_called_once()

    def test_get_equipment_status_overview_success(self, client, mock_dashboard_service, mock_current_admin_user):
        """Тест успешного получения обзора статуса оборудования"""
        # Arrange
        mock_overview = {
            "total_equipment": 50,
            "status_breakdown": {
                "available": 30,
                "in_use": 15,
                "maintenance": 3,
                "reserved": 2
            },
            "maintenance_schedule": [
                {"equipment_id": 1, "name": "Camera 1", "maintenance_date": "2024-01-15"},
                {"equipment_id": 2, "name": "Camera 2", "maintenance_date": "2024-01-20"}
            ],
            "equipment_health": {
                "excellent": 40,
                "good": 8,
                "needs_attention": 2
            }
        }
        
        mock_dashboard_service.get_equipment_status_overview.return_value = mock_overview
        
        # Override the dependency using container
        with app.container.dashboard_service.override(mock_dashboard_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/dashboard/equipment-status")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["total_equipment"] == 50
                assert "status_breakdown" in data
                assert "maintenance_schedule" in data
                assert "equipment_health" in data
                assert data["status_breakdown"]["available"] == 30
                assert data["status_breakdown"]["in_use"] == 15
                mock_dashboard_service.get_equipment_status_overview.assert_called_once()

    def test_get_recent_activities_success(self, client, mock_dashboard_service, mock_current_admin_user):
        """Тест успешного получения последних активностей"""
        # Arrange
        mock_activities = [
            {
                "id": 1,
                "type": "rental_created",
                "description": "Новая аренда создана",
                "user_id": 5,
                "user_name": "John Doe",
                "timestamp": "2024-01-10T10:30:00Z",
                "details": {"rental_id": 123, "equipment": "Canon EOS R5"}
            },
            {
                "id": 2,
                "type": "equipment_returned",
                "description": "Оборудование возвращено",
                "user_id": 3,
                "user_name": "Jane Smith",
                "timestamp": "2024-01-10T09:15:00Z",
                "details": {"rental_id": 122, "equipment": "Sony A7R IV"}
            }
        ]
        
        mock_dashboard_service.get_recent_activities.return_value = mock_activities
        
        # Override the dependency using container
        with app.container.dashboard_service.override(mock_dashboard_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/dashboard/recent-activities")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 2
                assert data[0]["type"] == "rental_created"
                assert data[0]["description"] == "Новая аренда создана"
                assert data[1]["type"] == "equipment_returned"
                assert data[1]["description"] == "Оборудование возвращено"
                mock_dashboard_service.get_recent_activities.assert_called_once()

    def test_get_equipment_performance_success(self, client, mock_dashboard_service, mock_current_admin_user):
        """Тест успешного получения производительности оборудования"""
        # Arrange
        mock_performance = {
            "top_performing_equipment": [
                {"equipment_id": 1, "name": "Canon EOS R5", "utilization": 95.5, "revenue": 2500.0},
                {"equipment_id": 2, "name": "Sony A7R IV", "utilization": 88.2, "revenue": 2200.0},
                {"equipment_id": 3, "name": "Nikon Z7 II", "utilization": 82.1, "revenue": 1800.0}
            ],
            "underperforming_equipment": [
                {"equipment_id": 10, "name": "Old Camera", "utilization": 15.0, "revenue": 200.0}
            ],
            "average_utilization": 75.5,
            "total_revenue": 15000.0
        }
        
        mock_dashboard_service.get_equipment_performance.return_value = mock_performance
        
        # Override the dependency using container
        with app.container.dashboard_service.override(mock_dashboard_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/dashboard/equipment-performance")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert "top_performing_equipment" in data
                assert "underperforming_equipment" in data
                assert data["average_utilization"] == 75.5
                assert data["total_revenue"] == 15000.0
                assert len(data["top_performing_equipment"]) == 3
                assert len(data["underperforming_equipment"]) == 1
                mock_dashboard_service.get_equipment_performance.assert_called_once()

    def test_get_financial_summary_success(self, client, mock_dashboard_service, mock_current_admin_user):
        """Тест успешного получения финансовой сводки"""
        # Arrange
        mock_summary = {
            "total_revenue": 15000.0,
            "monthly_revenue": 5000.0,
            "pending_payments": 1200.0,
            "overdue_payments": 300.0,
            "refunds_this_month": 150.0,
            "revenue_by_source": {
                "rentals": 12000.0,
                "accessories": 2000.0,
                "penalties": 1000.0
            },
            "payment_methods": {
                "credit_card": 8000.0,
                "bank_transfer": 5000.0,
                "cash": 2000.0
            }
        }
        
        mock_dashboard_service.get_financial_summary.return_value = mock_summary
        
        # Override the dependency using container
        with app.container.dashboard_service.override(mock_dashboard_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/dashboard/financial-summary")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["total_revenue"] == 15000.0
                assert data["monthly_revenue"] == 5000.0
                assert data["pending_payments"] == 1200.0
                assert data["overdue_payments"] == 300.0
                assert data["refunds_this_month"] == 150.0
                assert "revenue_by_source" in data
                assert "payment_methods" in data
                mock_dashboard_service.get_financial_summary.assert_called_once()

    def test_get_operational_metrics_success(self, client, mock_dashboard_service, mock_current_admin_user):
        """Тест успешного получения операционных метрик"""
        # Arrange
        mock_metrics = {
            "average_rental_duration": 4.5,
            "equipment_turnover_rate": 2.3,
            "customer_satisfaction": 4.7,
            "maintenance_frequency": 0.8,
            "booking_conversion_rate": 85.5,
            "equipment_availability": 92.0,
            "average_response_time": 2.5,
            "system_uptime": 99.9
        }
        
        mock_dashboard_service.get_operational_metrics.return_value = mock_metrics
        
        # Override the dependency using container
        with app.container.dashboard_service.override(mock_dashboard_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/dashboard/operational-metrics")
                
                # Assert
                assert response.status_code == 200
                data = response.json()
                assert data["average_rental_duration"] == 4.5
                assert data["equipment_turnover_rate"] == 2.3
                assert data["customer_satisfaction"] == 4.7
                assert data["maintenance_frequency"] == 0.8
                assert data["booking_conversion_rate"] == 85.5
                assert data["equipment_availability"] == 92.0
                assert data["average_response_time"] == 2.5
                assert data["system_uptime"] == 99.9
                mock_dashboard_service.get_operational_metrics.assert_called_once()

    def test_get_dashboard_summary_unauthorized(self, client, mock_dashboard_service):
        """Тест получения сводки дашборда без авторизации"""
        # Arrange
        mock_summary = {"total_equipment": 50}
        mock_dashboard_service.get_dashboard_summary.return_value = mock_summary
        
        # Override the dependency using container
        with app.container.dashboard_service.override(mock_dashboard_service):
            # Act - без авторизации
            response = client.get("/api/admin/dashboard/summary")
            
            # Assert
            assert response.status_code == 401
            data = response.json()
            assert "detail" in data

    def test_get_dashboard_summary_database_error(self, client, mock_dashboard_service, mock_current_admin_user):
        """Тест получения сводки дашборда при ошибке базы данных"""
        # Arrange
        mock_dashboard_service.get_dashboard_summary.side_effect = Exception("Database connection error")
        
        # Override the dependency using container
        with app.container.dashboard_service.override(mock_dashboard_service):
            with patch("api.dependencies.get_current_user", return_value=mock_current_admin_user):
                # Act
                response = client.get("/api/admin/dashboard/summary")
                
                # Assert
                assert response.status_code == 500
                data = response.json()
                assert "detail" in data
                assert "Database connection error" in data["detail"]