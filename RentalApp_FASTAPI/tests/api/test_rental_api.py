"""
Тесты для rental_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container


class TestRentalAPI:
    """Тесты для API аренды"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_rental_lifecycle_service(self):
        """Мок сервиса жизненного цикла аренды"""
        service = AsyncMock()
        service.create_rental_from_reservation = AsyncMock()
        service.create_rental_from_scratch = AsyncMock()
        service.return_rental = AsyncMock()
        return service

    @pytest.fixture
    def mock_rental_query_service(self):
        """Мок сервиса запросов аренды"""
        service = AsyncMock()
        service.get_rentals_for_user = AsyncMock()
        service.get_rental_by_id = AsyncMock()
        service.get_paginated_rentals = AsyncMock()
        return service

    def test_create_rental_from_reservation_success(self, client, mock_rental_lifecycle_service):
        """Тест успешного создания аренды из резервации"""
        # Arrange
        reservation_id = 1
        rental_data = {
            "reservation_id": reservation_id,
            "notes": "Rental created from reservation"
        }
        
        mock_rental = {
            "id": 1,
            "reservation_id": reservation_id,
            "status": "active",
            "notes": "Rental created from reservation"
        }
        
        mock_rental_lifecycle_service.create_rental_from_reservation.return_value = mock_rental
        
        # Override the dependency using container
        with app.container.rental_lifecycle_service.override(mock_rental_lifecycle_service):
            # Act
            response = client.post("/api/admin/rentals/from-reservation/1", json=rental_data)
            
            # Assert
            assert response.status_code == 201
            data = response.json()
            assert data["id"] == 1
            assert data["reservation_id"] == reservation_id
            assert data["status"] == "active"
            assert data["notes"] == "Rental created from reservation"
            mock_rental_lifecycle_service.create_rental_from_reservation.assert_called_once()

    def test_create_rental_from_scratch_success(self, client, mock_rental_lifecycle_service):
        """Тест успешного создания аренды с нуля"""
        # Arrange
        rental_data = {
            "equipment_ids": [1, 2],
            "user_id": 1,
            "start_date": "2024-01-01",
            "end_date": "2024-01-05",
            "notes": "Direct rental"
        }
        
        mock_rental = {
            "id": 1,
            "equipment_ids": [1, 2],
            "user_id": 1,
            "start_date": "2024-01-01",
            "end_date": "2024-01-05",
            "status": "active",
            "notes": "Direct rental"
        }
        
        mock_rental_lifecycle_service.create_rental_from_scratch.return_value = mock_rental
        
        # Override the dependency using container
        with app.container.rental_lifecycle_service.override(mock_rental_lifecycle_service):
            # Act
            response = client.post("/api/admin/rentals/", json=rental_data)
            
            # Assert
            assert response.status_code == 201
            data = response.json()
            assert data["id"] == 1
            assert data["equipment_ids"] == [1, 2]
            assert data["user_id"] == 1
            assert data["status"] == "active"
            mock_rental_lifecycle_service.create_rental_from_scratch.assert_called_once()

    def test_return_rental_success(self, client, mock_rental_lifecycle_service):
        """Тест успешного возврата аренды"""
        # Arrange
        rental_id = 1
        return_data = {
            "return_notes": "Equipment returned in good condition"
        }
        
        mock_rental = {
            "id": rental_id,
            "status": "returned",
            "return_notes": "Equipment returned in good condition"
        }
        
        mock_rental_lifecycle_service.return_rental.return_value = mock_rental
        
        # Override the dependency using container
        with app.container.rental_lifecycle_service.override(mock_rental_lifecycle_service):
            # Act
            response = client.post(f"/api/rentals/{rental_id}/return", json=return_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == rental_id
            assert data["status"] == "returned"
            assert data["return_notes"] == "Equipment returned in good condition"
            mock_rental_lifecycle_service.return_rental.assert_called_once()

    def test_get_rentals_for_user_success(self, client, mock_rental_query_service):
        """Тест успешного получения аренд пользователя"""
        # Arrange
        user_id = 1
        mock_rentals = [
            {"id": 1, "user_id": user_id, "status": "active"},
            {"id": 2, "user_id": user_id, "status": "returned"}
        ]
        
        mock_rental_query_service.get_rentals_for_user.return_value = mock_rentals
        
        # Override the dependency using container
        with app.container.rental_query_service.override(mock_rental_query_service):
            # Act
            response = client.get(f"/api/rentals/user/{user_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
            assert data[0]["user_id"] == user_id
            assert data[1]["user_id"] == user_id
            mock_rental_query_service.get_rentals_for_user.assert_called_once_with(user_id)

    def test_get_rental_by_id_success(self, client, mock_rental_query_service):
        """Тест успешного получения аренды по ID"""
        # Arrange
        rental_id = 1
        mock_rental = {
            "id": rental_id,
            "user_id": 1,
            "status": "active",
            "equipment_ids": [1, 2]
        }
        
        mock_rental_query_service.get_rental_by_id.return_value = mock_rental
        
        # Override the dependency using container
        with app.container.rental_query_service.override(mock_rental_query_service):
            # Act
            response = client.get(f"/api/rentals/{rental_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == rental_id
            assert data["user_id"] == 1
            assert data["status"] == "active"
            assert data["equipment_ids"] == [1, 2]
            mock_rental_query_service.get_rental_by_id.assert_called_once_with(rental_id)

    def test_get_paginated_rentals_success(self, client, mock_rental_query_service):
        """Тест успешного получения пагинированных аренд"""
        # Arrange
        mock_rentals = [
            {"id": 1, "user_id": 1, "status": "active"},
            {"id": 2, "user_id": 2, "status": "returned"}
        ]
        
        mock_rental_query_service.get_paginated_rentals.return_value = (mock_rentals, 2)
        
        # Override the dependency using container
        with app.container.rental_query_service.override(mock_rental_query_service):
            # Act
            response = client.get("/api/user/rentals")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert "total_count" in data
            assert len(data["items"]) == 2
            assert data["total_count"] == 2
            mock_rental_query_service.get_paginated_rentals.assert_called_once()

    def test_get_rental_not_found(self, client, mock_rental_query_service):
        """Тест получения несуществующей аренды"""
        # Arrange
        rental_id = 999
        mock_rental_query_service.get_rental_by_id.return_value = None
        
        # Override the dependency using container
        with app.container.rental_query_service.override(mock_rental_query_service):
            # Act
            response = client.get(f"/api/rentals/{rental_id}")
            
            # Assert
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert "Аренда не найдена" in data["detail"]

    def test_create_rental_validation_error(self, client, mock_rental_lifecycle_service):
        """Тест создания аренды с невалидными данными"""
        # Arrange
        rental_data = {
            "equipment_ids": [],  # Пустой список оборудования
            "user_id": 1,
            "start_date": "2024-01-01",
            "end_date": "2024-01-05"
        }
        
        mock_rental_lifecycle_service.create_rental_from_scratch.side_effect = ValueError("Список оборудования не может быть пустым")
        
        # Override the dependency using container
        with app.container.rental_lifecycle_service.override(mock_rental_lifecycle_service):
            # Act
            response = client.post("/api/admin/rentals/", json=rental_data)
            
            # Assert
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "Список оборудования не может быть пустым" in data["detail"]

    def test_get_rentals_for_user_empty(self, client, mock_rental_query_service):
        """Тест получения пустого списка аренд пользователя"""
        # Arrange
        user_id = 1
        mock_rental_query_service.get_rentals_for_user.return_value = []
        
        # Override the dependency using container
        with app.container.rental_query_service.override(mock_rental_query_service):
            # Act
            response = client.get(f"/api/rentals/user/{user_id}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 0
            mock_rental_query_service.get_rentals_for_user.assert_called_once_with(user_id)

