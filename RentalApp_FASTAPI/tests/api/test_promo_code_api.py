"""
Тесты для promo_code_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container


class TestPromoCodeAPI:
    """Тесты для API промо-кодов"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_promo_code_service(self):
        """Мок сервиса промо-кодов"""
        service = AsyncMock()
        service.validate_promo_code = AsyncMock()
        service.get_promo_code_by_code = AsyncMock()
        service.create_promo_code = AsyncMock()
        service.update_promo_code = AsyncMock()
        service.delete_promo_code = AsyncMock()
        return service

    def test_validate_promo_code_success(self, client, mock_promo_code_service):
        """Тест успешной валидации промо-кода"""
        # Arrange
        promo_code_data = {
            "code": "DISCOUNT10",
            "equipment_ids": [1, 2],
            "total_amount": 1000.0
        }
        
        mock_validation_result = {
            "valid": True,
            "discount_amount": 100.0,
            "final_amount": 900.0,
            "message": "Промо-код применен успешно"
        }
        
        mock_promo_code_service.validate_promo_code.return_value = mock_validation_result
        
        # Override the dependency using container
        with app.container.promo_code_service.override(mock_promo_code_service):
            # Act
            response = client.post("/api/promo-codes/validate", json=promo_code_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["valid"] is True
            assert data["discount_amount"] == 100.0
            assert data["final_amount"] == 900.0
            assert data["message"] == "Промо-код применен успешно"
            mock_promo_code_service.validate_promo_code.assert_called_once()

    def test_validate_promo_code_invalid(self, client, mock_promo_code_service):
        """Тест валидации недействительного промо-кода"""
        # Arrange
        promo_code_data = {
            "code": "INVALID",
            "equipment_ids": [1, 2],
            "total_amount": 1000.0
        }
        
        mock_validation_result = {
            "valid": False,
            "discount_amount": 0.0,
            "final_amount": 1000.0,
            "message": "Промо-код недействителен"
        }
        
        mock_promo_code_service.validate_promo_code.return_value = mock_validation_result
        
        # Override the dependency using container
        with app.container.promo_code_service.override(mock_promo_code_service):
            # Act
            response = client.post("/api/promo-codes/validate", json=promo_code_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["valid"] is False
            assert data["discount_amount"] == 0.0
            assert data["final_amount"] == 1000.0
            assert data["message"] == "Промо-код недействителен"
            mock_promo_code_service.validate_promo_code.assert_called_once()

    def test_get_promo_code_by_code_success(self, client, mock_promo_code_service):
        """Тест успешного получения промо-кода по коду"""
        # Arrange
        promo_code = "DISCOUNT10"
        mock_promo_code = {
            "id": 1,
            "code": promo_code,
            "discount_percentage": 10.0,
            "max_uses": 100,
            "used_count": 25,
            "is_active": True
        }
        
        mock_promo_code_service.get_promo_code_by_code.return_value = mock_promo_code
        
        # Override the dependency using container
        with app.container.promo_code_service.override(mock_promo_code_service):
            # Act
            response = client.get(f"/api/promo-codes/{promo_code}")
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["code"] == promo_code
            assert data["discount_percentage"] == 10.0
            assert data["is_active"] is True
            mock_promo_code_service.get_promo_code_by_code.assert_called_once_with(promo_code)

    def test_create_promo_code_success(self, client, mock_promo_code_service):
        """Тест успешного создания промо-кода"""
        # Arrange
        promo_code_data = {
            "code": "NEWCODE20",
            "discount_percentage": 20.0,
            "max_uses": 50,
            "min_order_amount": 500.0,
            "expires_at": "2024-12-31T23:59:59"
        }
        
        mock_created_promo_code = {
            "id": 1,
            "code": "NEWCODE20",
            "discount_percentage": 20.0,
            "max_uses": 50,
            "min_order_amount": 500.0,
            "is_active": True
        }
        
        mock_promo_code_service.create_promo_code.return_value = mock_created_promo_code
        
        # Override the dependency using container
        with app.container.promo_code_service.override(mock_promo_code_service):
            # Act
            response = client.post("/api/promo-codes/", json=promo_code_data)
            
            # Assert
            assert response.status_code == 201
            data = response.json()
            assert data["id"] == 1
            assert data["code"] == "NEWCODE20"
            assert data["discount_percentage"] == 20.0
            assert data["is_active"] is True
            mock_promo_code_service.create_promo_code.assert_called_once()

    def test_get_promo_code_not_found(self, client, mock_promo_code_service):
        """Тест получения несуществующего промо-кода"""
        # Arrange
        promo_code = "NOTFOUND"
        mock_promo_code_service.get_promo_code_by_code.return_value = None
        
        # Override the dependency using container
        with app.container.promo_code_service.override(mock_promo_code_service):
            # Act
            response = client.get(f"/api/promo-codes/{promo_code}")
            
            # Assert
            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
            assert "Промо-код не найден" in data["detail"]




















