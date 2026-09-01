# tests/services/test_rental_lifecycle_service_simple.py

import pytest
from unittest.mock import Mock, AsyncMock
from datetime import date
from fastapi import HTTPException

from api.services.order.rental_service import RentalLifecycleService
from api.models.rental import Rental
from api.models.reservation import Reservation
from api.models.user import User
from api.models.equipment import Equipment
from shared.constants.order_status import OrderStatus
from shared.schemas.rental_schema import (
    RentalCreateFromReservationRequest,
    RentalReturnRequest,
    RentalCreateFromScratchRequest,
)


class TestRentalLifecycleServiceSimple:
    """Простые тесты для RentalLifecycleService"""

    @pytest.fixture
    def sample_user(self):
        """Образец пользователя для тестирования"""
        return User(
            id=1,
            email="test@example.com",
            full_name="Test User",
            phone="+1234567890"
        )

    @pytest.fixture
    def sample_equipment(self):
        """Образец оборудования для тестирования"""
        return Equipment(
            id=1,
            name="Test Equipment",
            equipment_type="Test Type",
            brand="Test Brand",
            condition="Good",
            daily_rate=100.0
        )

    @pytest.fixture
    def sample_reservation(self):
        """Образец резервации для тестирования"""
        return Reservation(
            id=1,
            user_id=1,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 7),
            status=OrderStatus.ACTIVE
        )

    @pytest.fixture
    def sample_rental(self):
        """Образец аренды для тестирования"""
        return Rental(
            id=1,
            user_id=1,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 7),
            status=OrderStatus.ACTIVE
        )

    def test_service_initialization(self):
        """Тест инициализации сервиса"""
        # Создаем моки для всех зависимостей
        mock_db = AsyncMock()
        mock_rental_repo = AsyncMock()
        mock_reservation_repo = AsyncMock()
        mock_user_repo = AsyncMock()
        mock_equipment_repo = AsyncMock()
        mock_system_service = AsyncMock()
        mock_validator = AsyncMock()
        mock_balance_service = AsyncMock()
        mock_financial_service = AsyncMock()
        mock_promo_code_logic = AsyncMock()
        
        # Создаем моки для специализированных сервисов
        mock_creation_service = AsyncMock()
        mock_return_service = AsyncMock()
        mock_update_service = AsyncMock()
        mock_cancellation_service = AsyncMock()
        
        # Создаем экземпляр сервиса
        service = RentalLifecycleService(
            db=mock_db,
            rental_repo=mock_rental_repo,
            reservation_repo=mock_reservation_repo,
            user_repo=mock_user_repo,
            equipment_repo=mock_equipment_repo,
            system_service=mock_system_service,
            validator=mock_validator,
            balance_service=mock_balance_service,
            financial_service=mock_financial_service,
            promo_code_logic=mock_promo_code_logic,
            creation_service=mock_creation_service,
            return_service=mock_return_service,
            update_service=mock_update_service,
            cancellation_service=mock_cancellation_service
        )
        
        # Проверяем, что сервис создался
        assert service is not None
        assert service.db == mock_db
        # Проверяем, что специализированные сервисы созданы
        assert service.creation_service is not None
        assert service.return_service is not None
        assert service.update_service is not None
        assert service.cancellation_service is not None

    def test_rental_model_creation(self, sample_rental):
        """Тест создания модели аренды"""
        assert sample_rental.id == 1
        assert sample_rental.user_id == 1
        assert sample_rental.start_date == date(2024, 1, 1)
        assert sample_rental.end_date == date(2024, 1, 7)
        assert sample_rental.status == OrderStatus.ACTIVE

    def test_reservation_model_creation(self, sample_reservation):
        """Тест создания модели резервации"""
        assert sample_reservation.id == 1
        assert sample_reservation.user_id == 1
        assert sample_reservation.start_date == date(2024, 1, 1)
        assert sample_reservation.end_date == date(2024, 1, 7)
        assert sample_reservation.status == OrderStatus.ACTIVE

    def test_user_model_creation(self, sample_user):
        """Тест создания модели пользователя"""
        assert sample_user.id == 1
        assert sample_user.email == "test@example.com"
        assert sample_user.full_name == "Test User"
        assert sample_user.phone == "+1234567890"

    def test_equipment_model_creation(self, sample_equipment):
        """Тест создания модели оборудования"""
        assert sample_equipment.id == 1
        assert sample_equipment.name == "Test Equipment"
        assert sample_equipment.equipment_type == "Test Type"
        assert sample_equipment.brand == "Test Brand"
        assert sample_equipment.condition == "Good"
        assert sample_equipment.daily_rate == 100.0

    def test_rental_create_from_reservation_request_creation(self):
        """Тест создания запроса на создание аренды из резервации"""
        request = RentalCreateFromReservationRequest(
            notes_on_issue="Test notes",
            deposit_amount=100.0,
            prepayment_amount=50.0,
            force_issue_on_holiday=False
        )
        
        assert request.notes_on_issue == "Test notes"
        assert request.deposit_amount == 100.0
        assert request.prepayment_amount == 50.0
        assert request.force_issue_on_holiday is False

    def test_rental_create_from_scratch_request_creation(self):
        """Тест создания запроса на создание аренды с нуля"""
        request = RentalCreateFromScratchRequest(
            user_id=1,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 7),
            equipment_ids=[1, 2]
        )
        
        assert request.user_id == 1
        assert request.start_date == date(2024, 1, 1)
        assert request.end_date == date(2024, 1, 7)
        assert request.equipment_ids == [1, 2]

    def test_rental_return_request_creation(self):
        """Тест создания запроса на возврат аренды"""
        request = RentalReturnRequest(
            actual_return_date=date(2024, 1, 5),
            notes_on_return="Good condition",
            accessories_returned_confirmation=True
        )
        
        assert request.actual_return_date == date(2024, 1, 5)
        assert request.notes_on_return == "Good condition"
        assert request.accessories_returned_confirmation is True

    def test_order_status_values(self):
        """Тест значений статусов заказов"""
        assert OrderStatus.ACTIVE == "active"
        assert OrderStatus.COMPLETED == "completed"
        assert OrderStatus.CANCELLED == "cancelled"
        assert OrderStatus.OVERDUE == "overdue"
        assert OrderStatus.FULFILLED == "fulfilled"

    def test_rental_model_string_representation(self, sample_rental):
        """Тест строкового представления модели аренды"""
        rental_str = str(sample_rental)
        assert "Rental" in rental_str
        assert "1" in rental_str

    def test_reservation_model_string_representation(self, sample_reservation):
        """Тест строкового представления модели резервации"""
        reservation_str = str(sample_reservation)
        assert "Reservation" in reservation_str

    def test_user_model_string_representation(self, sample_user):
        """Тест строкового представления модели пользователя"""
        user_str = str(sample_user)
        assert "User" in user_str

    def test_equipment_model_string_representation(self, sample_equipment):
        """Тест строкового представления модели оборудования"""
        equipment_str = str(sample_equipment)
        assert "Equipment" in equipment_str
