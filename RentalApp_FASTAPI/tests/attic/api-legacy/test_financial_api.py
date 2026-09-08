"""
Тесты для financial_api.py
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main_api import app
from containers import Container


class TestFinancialAPI:
    """Тесты для API финансовых операций"""

    @pytest.fixture
    def client(self):
        """Создает тестовый клиент FastAPI."""
        return TestClient(app)

    @pytest.fixture
    def mock_financial_service(self):
        """Мок сервиса финансовых операций"""
        service = AsyncMock()
        service.calculate_final_price = AsyncMock()
        service.calculate_daily_rate = AsyncMock()
        service.calculate_overdue_surcharge = AsyncMock()
        service.calculate_early_return_credit = AsyncMock()
        service.calculate_remaining_amount = AsyncMock()
        return service

    def test_calculate_final_price_success(self, client, mock_financial_service):
        """Тест успешного расчета итоговой цены"""
        # Arrange
        calculation_data = {
            "equipment_ids": [1, 2],
            "start_date": "2024-01-01",
            "end_date": "2024-01-05",
            "accessory_ids": [1],
            "promo_code": "DISCOUNT10"
        }
        
        mock_result = {
            "base_price": 500.0,
            "accessory_price": 50.0,
            "duration_discount": 25.0,
            "promo_discount": 50.0,
            "final_price": 475.0,
            "breakdown": {
                "equipment_cost": 500.0,
                "accessory_cost": 50.0,
                "total_before_discounts": 550.0,
                "duration_discount_amount": 25.0,
                "promo_discount_amount": 50.0,
                "final_amount": 475.0
            }
        }
        
        mock_financial_service.calculate_final_price.return_value = mock_result
        
        # Override the dependency using container
        with app.container.financial_service.override(mock_financial_service):
            # Act
            response = client.post("/api/financial/calculate-price", json=calculation_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["base_price"] == 500.0
            assert data["accessory_price"] == 50.0
            assert data["duration_discount"] == 25.0
            assert data["promo_discount"] == 50.0
            assert data["final_price"] == 475.0
            assert "breakdown" in data
            mock_financial_service.calculate_final_price.assert_called_once()

    def test_calculate_daily_rate_success(self, client, mock_financial_service):
        """Тест успешного расчета дневной ставки"""
        # Arrange
        calculation_data = {
            "equipment_ids": [1, 2],
            "accessory_ids": [1]
        }
        
        mock_result = {
            "equipment_daily_rate": 100.0,
            "accessory_daily_rate": 10.0,
            "total_daily_rate": 110.0
        }
        
        mock_financial_service.calculate_daily_rate.return_value = mock_result
        
        # Override the dependency using container
        with app.container.financial_service.override(mock_financial_service):
            # Act
            response = client.post("/api/financial/calculate-daily-rate", json=calculation_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["equipment_daily_rate"] == 100.0
            assert data["accessory_daily_rate"] == 10.0
            assert data["total_daily_rate"] == 110.0
            mock_financial_service.calculate_daily_rate.assert_called_once()

    def test_calculate_overdue_surcharge_success(self, client, mock_financial_service):
        """Тест успешного расчета штрафа за просрочку"""
        # Arrange
        calculation_data = {
            "rental_id": 1,
            "return_date": "2024-01-10",
            "expected_return_date": "2024-01-05"
        }
        
        mock_result = {
            "overdue_days": 5,
            "daily_penalty_rate": 20.0,
            "total_surcharge": 100.0,
            "breakdown": {
                "overdue_days": 5,
                "daily_penalty_rate": 20.0,
                "total_surcharge": 100.0
            }
        }
        
        mock_financial_service.calculate_overdue_surcharge.return_value = mock_result
        
        # Override the dependency using container
        with app.container.financial_service.override(mock_financial_service):
            # Act
            response = client.post("/api/financial/calculate-overdue-surcharge", json=calculation_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["overdue_days"] == 5
            assert data["daily_penalty_rate"] == 20.0
            assert data["total_surcharge"] == 100.0
            assert "breakdown" in data
            mock_financial_service.calculate_overdue_surcharge.assert_called_once()

    def test_calculate_early_return_credit_success(self, client, mock_financial_service):
        """Тест успешного расчета кредита за досрочный возврат"""
        # Arrange
        calculation_data = {
            "rental_id": 1,
            "return_date": "2024-01-03",
            "expected_return_date": "2024-01-05"
        }
        
        mock_result = {
            "early_return_days": 2,
            "daily_credit_rate": 15.0,
            "total_credit": 30.0,
            "breakdown": {
                "early_return_days": 2,
                "daily_credit_rate": 15.0,
                "total_credit": 30.0
            }
        }
        
        mock_financial_service.calculate_early_return_credit.return_value = mock_result
        
        # Override the dependency using container
        with app.container.financial_service.override(mock_financial_service):
            # Act
            response = client.post("/api/financial/calculate-early-return-credit", json=calculation_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["early_return_days"] == 2
            assert data["daily_credit_rate"] == 15.0
            assert data["total_credit"] == 30.0
            assert "breakdown" in data
            mock_financial_service.calculate_early_return_credit.assert_called_once()

    def test_calculate_remaining_amount_success(self, client, mock_financial_service):
        """Тест успешного расчета оставшейся суммы"""
        # Arrange
        calculation_data = {
            "rental_id": 1,
            "paid_amount": 200.0
        }
        
        mock_result = {
            "total_amount": 500.0,
            "paid_amount": 200.0,
            "remaining_amount": 300.0,
            "breakdown": {
                "total_amount": 500.0,
                "paid_amount": 200.0,
                "remaining_amount": 300.0
            }
        }
        
        mock_financial_service.calculate_remaining_amount.return_value = mock_result
        
        # Override the dependency using container
        with app.container.financial_service.override(mock_financial_service):
            # Act
            response = client.post("/api/financial/calculate-remaining-amount", json=calculation_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["total_amount"] == 500.0
            assert data["paid_amount"] == 200.0
            assert data["remaining_amount"] == 300.0
            assert "breakdown" in data
            mock_financial_service.calculate_remaining_amount.assert_called_once()

    def test_calculate_final_price_validation_error(self, client, mock_financial_service):
        """Тест расчета итоговой цены с невалидными данными"""
        # Arrange
        calculation_data = {
            "equipment_ids": [],  # Пустой список оборудования
            "start_date": "2024-01-01",
            "end_date": "2024-01-05"
        }
        
        mock_financial_service.calculate_final_price.side_effect = ValueError("Список оборудования не может быть пустым")
        
        # Override the dependency using container
        with app.container.financial_service.override(mock_financial_service):
            # Act
            response = client.post("/api/financial/calculate-price", json=calculation_data)
            
            # Assert
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "Список оборудования не может быть пустым" in data["detail"]

    def test_calculate_daily_rate_equipment_not_found(self, client, mock_financial_service):
        """Тест расчета дневной ставки для несуществующего оборудования"""
        # Arrange
        calculation_data = {
            "equipment_ids": [999],  # Несуществующее оборудование
            "accessory_ids": []
        }
        
        mock_financial_service.calculate_daily_rate.side_effect = ValueError("Оборудование не найдено")
        
        # Override the dependency using container
        with app.container.financial_service.override(mock_financial_service):
            # Act
            response = client.post("/api/financial/calculate-daily-rate", json=calculation_data)
            
            # Assert
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "Оборудование не найдено" in data["detail"]

    def test_calculate_overdue_surcharge_no_overdue(self, client, mock_financial_service):
        """Тест расчета штрафа за просрочку без просрочки"""
        # Arrange
        calculation_data = {
            "rental_id": 1,
            "return_date": "2024-01-03",
            "expected_return_date": "2024-01-05"
        }
        
        mock_result = {
            "overdue_days": 0,
            "daily_penalty_rate": 20.0,
            "total_surcharge": 0.0,
            "breakdown": {
                "overdue_days": 0,
                "daily_penalty_rate": 20.0,
                "total_surcharge": 0.0
            }
        }
        
        mock_financial_service.calculate_overdue_surcharge.return_value = mock_result
        
        # Override the dependency using container
        with app.container.financial_service.override(mock_financial_service):
            # Act
            response = client.post("/api/financial/calculate-overdue-surcharge", json=calculation_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["overdue_days"] == 0
            assert data["total_surcharge"] == 0.0
            mock_financial_service.calculate_overdue_surcharge.assert_called_once()

    def test_calculate_early_return_credit_no_early_return(self, client, mock_financial_service):
        """Тест расчета кредита за досрочный возврат без досрочного возврата"""
        # Arrange
        calculation_data = {
            "rental_id": 1,
            "return_date": "2024-01-05",
            "expected_return_date": "2024-01-05"
        }
        
        mock_result = {
            "early_return_days": 0,
            "daily_credit_rate": 15.0,
            "total_credit": 0.0,
            "breakdown": {
                "early_return_days": 0,
                "daily_credit_rate": 15.0,
                "total_credit": 0.0
            }
        }
        
        mock_financial_service.calculate_early_return_credit.return_value = mock_result
        
        # Override the dependency using container
        with app.container.financial_service.override(mock_financial_service):
            # Act
            response = client.post("/api/financial/calculate-early-return-credit", json=calculation_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["early_return_days"] == 0
            assert data["total_credit"] == 0.0
            mock_financial_service.calculate_early_return_credit.assert_called_once()

    def test_calculate_remaining_amount_fully_paid(self, client, mock_financial_service):
        """Тест расчета оставшейся суммы для полностью оплаченной аренды"""
        # Arrange
        calculation_data = {
            "rental_id": 1,
            "paid_amount": 500.0
        }
        
        mock_result = {
            "total_amount": 500.0,
            "paid_amount": 500.0,
            "remaining_amount": 0.0,
            "breakdown": {
                "total_amount": 500.0,
                "paid_amount": 500.0,
                "remaining_amount": 0.0
            }
        }
        
        mock_financial_service.calculate_remaining_amount.return_value = mock_result
        
        # Override the dependency using container
        with app.container.financial_service.override(mock_financial_service):
            # Act
            response = client.post("/api/financial/calculate-remaining-amount", json=calculation_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["total_amount"] == 500.0
            assert data["paid_amount"] == 500.0
            assert data["remaining_amount"] == 0.0
            mock_financial_service.calculate_remaining_amount.assert_called_once()

    def test_calculate_final_price_database_error(self, client, mock_financial_service):
        """Тест расчета итоговой цены при ошибке базы данных"""
        # Arrange
        calculation_data = {
            "equipment_ids": [1, 2],
            "start_date": "2024-01-01",
            "end_date": "2024-01-05"
        }
        
        mock_financial_service.calculate_final_price.side_effect = Exception("Database connection error")
        
        # Override the dependency using container
        with app.container.financial_service.override(mock_financial_service):
            # Act
            response = client.post("/api/financial/calculate-price", json=calculation_data)
            
            # Assert
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
            assert "Database connection error" in data["detail"]




















