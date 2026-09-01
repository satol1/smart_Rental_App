"""
Тесты для availability_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import date, datetime, timedelta

from api.main_api import app
from containers import Container


class TestAvailabilityAPI:
    """Тесты для API проверки доступности оборудования"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_availability_service(self):
        """Мок сервиса проверки доступности"""
        service = AsyncMock()
        service.check_equipment_availability = AsyncMock()
        service.get_available_equipment = AsyncMock()
        service.get_equipment_availability_calendar = AsyncMock()
        service.check_bulk_availability = AsyncMock()
        service.get_availability_summary = AsyncMock()
        service.check_equipment_conflicts = AsyncMock()
        service.get_equipment_rental_history = AsyncMock()
        service.get_availability_statistics = AsyncMock()
        service.check_equipment_maintenance_schedule = AsyncMock()
        service.get_equipment_availability_trends = AsyncMock()
        return service

    def test_check_equipment_availability_success(self, client, mock_availability_service):
        """Тест успешной проверки доступности оборудования"""
        # Arrange
        availability_data = {
            "equipment_ids": [1, 2, 3],
            "start_date": "2024-01-15",
            "end_date": "2024-01-20"
        }
        
        mock_result = {
            "available_equipment": [1, 2],
            "unavailable_equipment": [3],
            "availability_details": {
                "1": {"available": True, "reason": None},
                "2": {"available": True, "reason": None},
                "3": {"available": False, "reason": "Already rented"}
            },
            "total_available": 2,
            "total_requested": 3
        }
        
        mock_availability_service.check_equipment_availability.return_value = mock_result
        
        # Override the dependency using container
        with app.container.availability_service.override(mock_availability_service):
            # Act
            response = client.post("/api/availability/check", json=availability_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["available_equipment"] == [1, 2]
            assert data["unavailable_equipment"] == [3]
            assert data["total_available"] == 2
            assert data["total_requested"] == 3
            assert "availability_details" in data
            mock_availability_service.check_equipment_availability.assert_called_once()

    def test_get_available_equipment_success(self, client, mock_availability_service):
        """Тест успешного получения доступного оборудования"""
        # Arrange
        query_params = {
            "start_date": "2024-01-15",
            "end_date": "2024-01-20",
            "equipment_type": "camera",
            "limit": 10
        }
        
        mock_result = {
            "available_equipment": [
                {
                    "id": 1,
                    "name": "Canon EOS R5",
                    "type": "camera",
                    "daily_rate": 100.0,
                    "available": True
                },
                {
                    "id": 2,
                    "name": "Sony A7R IV",
                    "type": "camera",
                    "daily_rate": 120.0,
                    "available": True
                }
            ],
            "total_count": 2,
            "filters_applied": {
                "start_date": "2024-01-15",
                "end_date": "2024-01-20",
                "equipment_type": "camera"
            }
        }
        
        mock_availability_service.get_available_equipment.return_value = mock_result
        
        # Override the dependency using container
        with app.container.availability_service.override(mock_availability_service):
            # Act
            response = client.get("/api/availability/equipment", params=query_params)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data["available_equipment"]) == 2
            assert data["total_count"] == 2
            assert data["available_equipment"][0]["name"] == "Canon EOS R5"
            assert data["available_equipment"][1]["name"] == "Sony A7R IV"
            assert "filters_applied" in data
            mock_availability_service.get_available_equipment.assert_called_once()

    def test_get_equipment_availability_calendar_success(self, client, mock_availability_service):
        """Тест успешного получения календаря доступности оборудования"""
        # Arrange
        equipment_id = 1
        query_params = {
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        
        mock_result = {
            "equipment_id": 1,
            "equipment_name": "Canon EOS R5",
            "availability_calendar": [
                {"date": "2024-01-01", "available": True, "reason": None},
                {"date": "2024-01-02", "available": False, "reason": "Rented"},
                {"date": "2024-01-03", "available": False, "reason": "Rented"},
                {"date": "2024-01-04", "available": True, "reason": None},
                {"date": "2024-01-05", "available": True, "reason": None}
            ],
            "summary": {
                "total_days": 31,
                "available_days": 25,
                "unavailable_days": 6,
                "availability_percentage": 80.6
            }
        }
        
        mock_availability_service.get_equipment_availability_calendar.return_value = mock_result
        
        # Override the dependency using container
        with app.container.availability_service.override(mock_availability_service):
            # Act
            response = client.get(f"/api/availability/equipment/{equipment_id}/calendar", params=query_params)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["equipment_id"] == 1
            assert data["equipment_name"] == "Canon EOS R5"
            assert len(data["availability_calendar"]) == 5
            assert data["summary"]["total_days"] == 31
            assert data["summary"]["available_days"] == 25
            assert data["summary"]["unavailable_days"] == 6
            assert data["summary"]["availability_percentage"] == 80.6
            mock_availability_service.get_equipment_availability_calendar.assert_called_once()

    def test_check_bulk_availability_success(self, client, mock_availability_service):
        """Тест успешной проверки массовой доступности"""
        # Arrange
        bulk_data = {
            "equipment_requests": [
                {"equipment_id": 1, "start_date": "2024-01-15", "end_date": "2024-01-20"},
                {"equipment_id": 2, "start_date": "2024-01-15", "end_date": "2024-01-20"},
                {"equipment_id": 3, "start_date": "2024-01-15", "end_date": "2024-01-20"}
            ]
        }
        
        mock_result = {
            "bulk_availability": [
                {"equipment_id": 1, "available": True, "reason": None},
                {"equipment_id": 2, "available": True, "reason": None},
                {"equipment_id": 3, "available": False, "reason": "Already rented"}
            ],
            "summary": {
                "total_requests": 3,
                "available_requests": 2,
                "unavailable_requests": 1,
                "success_rate": 66.7
            }
        }
        
        mock_availability_service.check_bulk_availability.return_value = mock_result
        
        # Override the dependency using container
        with app.container.availability_service.override(mock_availability_service):
            # Act
            response = client.post("/api/availability/bulk-check", json=bulk_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert len(data["bulk_availability"]) == 3
            assert data["summary"]["total_requests"] == 3
            assert data["summary"]["available_requests"] == 2
            assert data["summary"]["unavailable_requests"] == 1
            assert data["summary"]["success_rate"] == 66.7
            mock_availability_service.check_bulk_availability.assert_called_once()

    def test_get_availability_summary_success(self, client, mock_availability_service):
        """Тест успешного получения сводки доступности"""
        # Arrange
        query_params = {
            "start_date": "2024-01-15",
            "end_date": "2024-01-20"
        }
        
        mock_result = {
            "total_equipment": 50,
            "available_equipment": 35,
            "unavailable_equipment": 15,
            "availability_percentage": 70.0,
            "by_category": {
                "cameras": {"total": 20, "available": 15, "unavailable": 5},
                "lenses": {"total": 15, "available": 10, "unavailable": 5},
                "accessories": {"total": 15, "available": 10, "unavailable": 5}
            },
            "unavailability_reasons": {
                "rented": 10,
                "maintenance": 3,
                "reserved": 2
            }
        }
        
        mock_availability_service.get_availability_summary.return_value = mock_result
        
        # Override the dependency using container
        with app.container.availability_service.override(mock_availability_service):
            # Act
            response = client.get("/api/availability/summary", params=query_params)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["total_equipment"] == 50
            assert data["available_equipment"] == 35
            assert data["unavailable_equipment"] == 15
            assert data["availability_percentage"] == 70.0
            assert "by_category" in data
            assert "unavailability_reasons" in data
            mock_availability_service.get_availability_summary.assert_called_once()

    def test_check_equipment_conflicts_success(self, client, mock_availability_service):
        """Тест успешной проверки конфликтов оборудования"""
        # Arrange
        conflict_data = {
            "equipment_id": 1,
            "start_date": "2024-01-15",
            "end_date": "2024-01-20",
            "exclude_rental_id": 123
        }
        
        mock_result = {
            "has_conflicts": True,
            "conflicts": [
                {
                    "rental_id": 124,
                    "start_date": "2024-01-16",
                    "end_date": "2024-01-18",
                    "conflict_type": "overlap",
                    "conflict_days": 3
                }
            ],
            "conflict_summary": {
                "total_conflicts": 1,
                "conflict_days": 3,
                "conflict_percentage": 50.0
            }
        }
        
        mock_availability_service.check_equipment_conflicts.return_value = mock_result
        
        # Override the dependency using container
        with app.container.availability_service.override(mock_availability_service):
            # Act
            response = client.post("/api/availability/check-conflicts", json=conflict_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["has_conflicts"] is True
            assert len(data["conflicts"]) == 1
            assert data["conflicts"][0]["rental_id"] == 124
            assert data["conflict_summary"]["total_conflicts"] == 1
            assert data["conflict_summary"]["conflict_days"] == 3
            mock_availability_service.check_equipment_conflicts.assert_called_once()

    def test_get_equipment_rental_history_success(self, client, mock_availability_service):
        """Тест успешного получения истории аренды оборудования"""
        # Arrange
        equipment_id = 1
        query_params = {
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
            "limit": 10
        }
        
        mock_result = {
            "equipment_id": 1,
            "equipment_name": "Canon EOS R5",
            "rental_history": [
                {
                    "rental_id": 123,
                    "user_id": 5,
                    "user_name": "John Doe",
                    "start_date": "2024-01-02",
                    "end_date": "2024-01-05",
                    "status": "completed"
                },
                {
                    "rental_id": 124,
                    "user_id": 6,
                    "user_name": "Jane Smith",
                    "start_date": "2024-01-10",
                    "end_date": "2024-01-15",
                    "status": "active"
                }
            ],
            "total_rentals": 2,
            "utilization_stats": {
                "total_rental_days": 8,
                "average_rental_duration": 4.0,
                "utilization_percentage": 25.8
            }
        }
        
        mock_availability_service.get_equipment_rental_history.return_value = mock_result
        
        # Override the dependency using container
        with app.container.availability_service.override(mock_availability_service):
            # Act
            response = client.get(f"/api/availability/equipment/{equipment_id}/rental-history", params=query_params)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["equipment_id"] == 1
            assert data["equipment_name"] == "Canon EOS R5"
            assert len(data["rental_history"]) == 2
            assert data["total_rentals"] == 2
            assert "utilization_stats" in data
            assert data["utilization_stats"]["total_rental_days"] == 8
            mock_availability_service.get_equipment_rental_history.assert_called_once()

    def test_get_availability_statistics_success(self, client, mock_availability_service):
        """Тест успешного получения статистики доступности"""
        # Arrange
        query_params = {
            "period": "month",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        
        mock_result = {
            "period": "month",
            "total_equipment": 50,
            "average_availability": 75.5,
            "peak_availability": 95.0,
            "lowest_availability": 45.0,
            "availability_trends": [
                {"date": "2024-01-01", "availability": 80.0},
                {"date": "2024-01-02", "availability": 75.0},
                {"date": "2024-01-03", "availability": 70.0}
            ],
            "equipment_performance": [
                {"equipment_id": 1, "name": "Canon EOS R5", "availability": 90.0},
                {"equipment_id": 2, "name": "Sony A7R IV", "availability": 85.0}
            ]
        }
        
        mock_availability_service.get_availability_statistics.return_value = mock_result
        
        # Override the dependency using container
        with app.container.availability_service.override(mock_availability_service):
            # Act
            response = client.get("/api/availability/statistics", params=query_params)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["period"] == "month"
            assert data["total_equipment"] == 50
            assert data["average_availability"] == 75.5
            assert data["peak_availability"] == 95.0
            assert data["lowest_availability"] == 45.0
            assert "availability_trends" in data
            assert "equipment_performance" in data
            mock_availability_service.get_availability_statistics.assert_called_once()

    def test_check_equipment_maintenance_schedule_success(self, client, mock_availability_service):
        """Тест успешной проверки расписания обслуживания оборудования"""
        # Arrange
        maintenance_data = {
            "equipment_id": 1,
            "start_date": "2024-01-15",
            "end_date": "2024-01-20"
        }
        
        mock_result = {
            "equipment_id": 1,
            "equipment_name": "Canon EOS R5",
            "maintenance_schedule": [
                {
                    "maintenance_id": 1,
                    "scheduled_date": "2024-01-18",
                    "maintenance_type": "routine",
                    "duration_hours": 2,
                    "description": "Regular maintenance"
                }
            ],
            "conflicts_with_rental": True,
            "conflict_details": {
                "rental_id": 125,
                "start_date": "2024-01-16",
                "end_date": "2024-01-19",
                "conflict_days": 2
            }
        }
        
        mock_availability_service.check_equipment_maintenance_schedule.return_value = mock_result
        
        # Override the dependency using container
        with app.container.availability_service.override(mock_availability_service):
            # Act
            response = client.post("/api/availability/check-maintenance", json=maintenance_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["equipment_id"] == 1
            assert data["equipment_name"] == "Canon EOS R5"
            assert len(data["maintenance_schedule"]) == 1
            assert data["conflicts_with_rental"] is True
            assert "conflict_details" in data
            mock_availability_service.check_equipment_maintenance_schedule.assert_called_once()

    def test_get_equipment_availability_trends_success(self, client, mock_availability_service):
        """Тест успешного получения трендов доступности оборудования"""
        # Arrange
        query_params = {
            "equipment_id": 1,
            "period": "week",
            "start_date": "2024-01-01",
            "end_date": "2024-01-07"
        }
        
        mock_result = {
            "equipment_id": 1,
            "equipment_name": "Canon EOS R5",
            "period": "week",
            "availability_trends": [
                {"date": "2024-01-01", "availability": 100.0, "rental_count": 0},
                {"date": "2024-01-02", "availability": 0.0, "rental_count": 1},
                {"date": "2024-01-03", "availability": 0.0, "rental_count": 1},
                {"date": "2024-01-04", "availability": 100.0, "rental_count": 0}
            ],
            "summary": {
                "average_availability": 50.0,
                "total_rental_days": 2,
                "utilization_rate": 28.6
            }
        }
        
        mock_availability_service.get_equipment_availability_trends.return_value = mock_result
        
        # Override the dependency using container
        with app.container.availability_service.override(mock_availability_service):
            # Act
            response = client.get("/api/availability/equipment/1/trends", params=query_params)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["equipment_id"] == 1
            assert data["equipment_name"] == "Canon EOS R5"
            assert data["period"] == "week"
            assert len(data["availability_trends"]) == 4
            assert "summary" in data
            assert data["summary"]["average_availability"] == 50.0
            mock_availability_service.get_equipment_availability_trends.assert_called_once()

    def test_check_equipment_availability_validation_error(self, client, mock_availability_service):
        """Тест проверки доступности с невалидными данными"""
        # Arrange
        availability_data = {
            "equipment_ids": [],  # Пустой список
            "start_date": "2024-01-15",
            "end_date": "2024-01-20"
        }
        
        mock_availability_service.check_equipment_availability.side_effect = ValueError("Список оборудования не может быть пустым")
        
        # Override the dependency using container
        with app.container.availability_service.override(mock_availability_service):
            # Act
            response = client.post("/api/availability/check", json=availability_data)
            
            # Assert
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "Список оборудования не может быть пустым" in data["detail"]

    def test_get_available_equipment_equipment_not_found(self, client, mock_availability_service):
        """Тест получения доступного оборудования для несуществующего типа"""
        # Arrange
        query_params = {
            "start_date": "2024-01-15",
            "end_date": "2024-01-20",
            "equipment_type": "nonexistent"
        }
        
        mock_availability_service.get_available_equipment.side_effect = ValueError("Тип оборудования не найден")
        
        # Override the dependency using container
        with app.container.availability_service.override(mock_availability_service):
            # Act
            response = client.get("/api/availability/equipment", params=query_params)
            
            # Assert
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "Тип оборудования не найден" in data["detail"]

    def test_check_equipment_availability_database_error(self, client, mock_availability_service):
        """Тест проверки доступности при ошибке базы данных"""
        # Arrange
        availability_data = {
            "equipment_ids": [1, 2],
            "start_date": "2024-01-15",
            "end_date": "2024-01-20"
        }
        
        mock_availability_service.check_equipment_availability.side_effect = Exception("Database connection error")
        
        # Override the dependency using container
        with app.container.availability_service.override(mock_availability_service):
            # Act
            response = client.post("/api/availability/check", json=availability_data)
            
            # Assert
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
            assert "Database connection error" in data["detail"]




















