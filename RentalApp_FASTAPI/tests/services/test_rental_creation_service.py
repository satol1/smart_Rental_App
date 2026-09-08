# tests/services/test_rental_creation_service.py
"""
Тесты для RentalCreationService - критически важного сервиса для создания аренд.
Тестирует конвертацию резервов в аренды и создание аренд с нуля.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date, timedelta
from fastapi import HTTPException

from api.services.order.rental_creation_service import RentalCreationService
from api.models.user import User
from api.models.rental import Rental
from api.models.reservation import Reservation
from api.models.equipment import Equipment
from shared.schemas.rental_schema import (
    RentalCreateFromReservationRequest,
    RentalCreateFromScratchRequest
)
from shared.constants.balance_operations import BalanceOperationType
from api.services.financial_service import PriceDetails


class TestRentalCreationService:
    """Тесты для RentalCreationService."""

    @pytest.fixture
    def rental_creation_service(self, mock_db_session):
        """Создает экземпляр RentalCreationService с моками."""
        from api.repositories.rental_repository import RentalRepository
        from api.repositories.reservation_repository import ReservationRepository
        from api.repositories.user_repository import UserRepository
        from api.repositories.equipment_repository import EquipmentRepository
        from api.services.order.system_repository import SystemService
        from api.services.order.order_validator import OrderValidator
        from api.services.balance_service import BalanceService
        from api.services.financial_service import FinancialService
        from api.services.promo_code import PromoCodeBusinessLogic
        
        mock_rental_repo = MagicMock(spec=RentalRepository)
        mock_reservation_repo = MagicMock(spec=ReservationRepository)
        mock_user_repo = MagicMock(spec=UserRepository)
        mock_equipment_repo = MagicMock(spec=EquipmentRepository)
        mock_system_service = MagicMock(spec=SystemService)
        mock_validator = MagicMock(spec=OrderValidator)
        mock_balance_service = MagicMock(spec=BalanceService)
        mock_financial_service = MagicMock(spec=FinancialService)
        mock_promo_code_logic = MagicMock(spec=PromoCodeBusinessLogic)
        
        return RentalCreationService(
            db=mock_db_session,
            rental_repo=mock_rental_repo,
            reservation_repo=mock_reservation_repo,
            user_repo=mock_user_repo,
            equipment_repo=mock_equipment_repo,
            system_service=mock_system_service,
            validator=mock_validator,
            balance_service=mock_balance_service,
            financial_service=mock_financial_service,
            promo_code_logic=mock_promo_code_logic
        )

    @pytest.fixture
    def sample_user(self):
        """Создает тестового пользователя."""
        user = User()
        user.id = 1
        user.email = "user@example.com"
        user.role = "client"
        user.is_active = True
        return user

    @pytest.fixture
    def sample_manager(self):
        """Создает тестового менеджера."""
        manager = User()
        manager.id = 2
        manager.email = "manager@example.com"
        manager.role = "admin"
        return manager

    @pytest.fixture
    def sample_equipment(self):
        """Создает тестовое оборудование."""
        equipment = Equipment()
        equipment.id = 1
        equipment.name = "Test Camera"
        equipment.daily_rate = 100.0
        equipment.is_active = True
        return [equipment]

    @pytest.fixture
    def sample_reservation(self, sample_user, sample_equipment):
        """Создает тестовый резерв."""
        reservation = Reservation()
        reservation.id = 1
        reservation.user_id = sample_user.id
        reservation.user = sample_user
        reservation.start_date = date.today() - timedelta(days=1)
        reservation.end_date = date.today() + timedelta(days=3)
        reservation.equipment = sample_equipment
        reservation.accessory_links = []
        reservation.total_cost = 400.0
        reservation.discount_amount = 0.0
        reservation.promo_code_id = None
        reservation.status = "active"
        return reservation

    @pytest.fixture
    def sample_rental(self, sample_user, sample_manager, sample_equipment):
        """Создает тестовую аренду."""
        rental = Rental()
        rental.id = 1
        rental.user_id = sample_user.id
        rental.created_by_id = sample_manager.id
        rental.start_date = date.today()
        rental.end_date = date.today() + timedelta(days=3)
        rental.equipment = sample_equipment
        rental.total_cost = 400.0
        rental.discount_amount = 0.0
        rental.status = "active"
        return rental

    @pytest.fixture
    def convert_request(self):
        """Создает запрос на конвертацию резерва."""
        return RentalCreateFromReservationRequest(
            deposit_amount=0.0,
            prepayment_amount=0.0,
            notes_on_issue=None,
            force_issue_on_holiday=False
        )

    @pytest.fixture
    def create_from_scratch_request(self):
        """Создает запрос на создание аренды с нуля."""
        return RentalCreateFromScratchRequest(
            user_id=1,
            equipment_ids=[1],
            start_date=date.today(),
            end_date=date.today() + timedelta(days=3),
            selected_accessories=None,
            promo_code=None,
            deposit_amount=0.0,
            prepayment_amount=0.0,
            notes_on_issue=None,
            force_issue_on_holiday=False
        )

    @pytest.fixture
    def price_details(self):
        """Создает детали цены."""
        return PriceDetails(
            full_total=400.0,
            discount_amount=0.0,
            final_total=400.0
        )

    # === ТЕСТЫ ДЛЯ convert_reservation_to_rental ===

    @pytest.mark.asyncio
    async def test_convert_reservation_to_rental_success(self, rental_creation_service, mock_db_session,
                                                         sample_reservation, sample_user, sample_manager,
                                                         sample_rental, convert_request, price_details):
        """Тест успешной конвертации резерва в аренду."""
        # Arrange
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_creation_service.reservation_repo.get_by_id_with_details = AsyncMock(return_value=sample_reservation)
        rental_creation_service.validator.validate_reservation_for_conversion = MagicMock()
        rental_creation_service.validator.validate_issue_on_holiday = AsyncMock()
        rental_creation_service.validator.user_status_service = None  # Упрощаем тест
        
        rental_creation_service.user_repo.get_by_id = AsyncMock(return_value=sample_user)
        rental_creation_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        rental_creation_service.system_service.get_promo_code_by_id = AsyncMock(return_value=None)
        
        rental_creation_service.rental_repo.create_rental_from_reservation = MagicMock(return_value=sample_rental)
        rental_creation_service.reservation_repo.save_object = AsyncMock()
        rental_creation_service.rental_repo.save_rental = AsyncMock(return_value=sample_rental)
        rental_creation_service.balance_service.add_transaction = AsyncMock()
        rental_creation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)

        # Act
        result = await rental_creation_service.convert_reservation_to_rental(
            1, convert_request, sample_manager
        )

        # Assert
        assert result == sample_rental
        rental_creation_service.reservation_repo.get_by_id_with_details.assert_called_once_with(1)
        rental_creation_service.validator.validate_reservation_for_conversion.assert_called_once()
        rental_creation_service.rental_repo.create_rental_from_reservation.assert_called_once()
        rental_creation_service.balance_service.add_transaction.assert_called()

    @pytest.mark.asyncio
    async def test_convert_reservation_to_rental_with_prepayment(self, rental_creation_service, mock_db_session,
                                                                 sample_reservation, sample_user, sample_manager,
                                                                 sample_rental, price_details):
        """Тест конвертации резерва с предоплатой."""
        # Arrange
        convert_request = RentalCreateFromReservationRequest(
            deposit_amount=0.0,
            prepayment_amount=200.0,
            notes_on_issue=None,
            force_issue_on_holiday=False
        )
        
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_creation_service.reservation_repo.get_by_id_with_details = AsyncMock(return_value=sample_reservation)
        rental_creation_service.validator.validate_reservation_for_conversion = MagicMock()
        rental_creation_service.validator.validate_issue_on_holiday = AsyncMock()
        rental_creation_service.validator.user_status_service = None
        
        rental_creation_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        rental_creation_service.system_service.get_promo_code_by_id = AsyncMock(return_value=None)
        rental_creation_service.rental_repo.create_rental_from_reservation = MagicMock(return_value=sample_rental)
        rental_creation_service.reservation_repo.save_object = AsyncMock()
        rental_creation_service.rental_repo.save_rental = AsyncMock(return_value=sample_rental)
        rental_creation_service.balance_service.add_transaction = AsyncMock()
        rental_creation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)

        # Act
        result = await rental_creation_service.convert_reservation_to_rental(
            1, convert_request, sample_manager
        )

        # Assert
        assert result == sample_rental
        # Проверяем, что была создана транзакция предоплаты
        prepayment_calls = [call for call in rental_creation_service.balance_service.add_transaction.call_args_list
                           if call[1]['operation_type'] == BalanceOperationType.PREPAYMENT]
        assert len(prepayment_calls) > 0

    @pytest.mark.asyncio
    async def test_convert_reservation_to_rental_reservation_not_found(self, rental_creation_service, mock_db_session,
                                                                      sample_manager, convert_request):
        """Тест конвертации несуществующего резерва."""
        # Arrange
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_creation_service.reservation_repo.get_by_id_with_details = AsyncMock(return_value=None)
        rental_creation_service.validator.validate_reservation_for_conversion = MagicMock(
            side_effect=HTTPException(status_code=404, detail="Reservation not found")
        )

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await rental_creation_service.convert_reservation_to_rental(
                999, convert_request, sample_manager
            )
        
        assert exc_info.value.status_code == 404

    # === ТЕСТЫ ДЛЯ create_rental_from_scratch ===

    @pytest.mark.asyncio
    async def test_create_rental_from_scratch_success(self, rental_creation_service, mock_db_session,
                                                      sample_user, sample_manager, sample_equipment,
                                                      sample_rental, create_from_scratch_request, price_details):
        """Тест успешного создания аренды с нуля."""
        # Arrange
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_creation_service.user_repo.get_user_by_id_or_fail = AsyncMock(return_value=sample_user)
        rental_creation_service.validator.user_status_service = None  # Упрощаем тест
        rental_creation_service.validator.validate_issue_on_holiday = AsyncMock()
        rental_creation_service.validator.validate_equipment_availability = AsyncMock()
        rental_creation_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=sample_equipment)
        rental_creation_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        
        rental_creation_service.rental_repo.create_rental_instance = MagicMock(return_value=sample_rental)
        rental_creation_service.rental_repo.save_rental = AsyncMock(return_value=sample_rental)
        rental_creation_service.rental_repo.add_accessories_to_rental_async = AsyncMock()
        rental_creation_service.balance_service.add_transaction = AsyncMock()
        rental_creation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)

        # Act
        result = await rental_creation_service.create_rental_from_scratch(
            create_from_scratch_request, sample_manager
        )

        # Assert
        assert result == sample_rental
        rental_creation_service.user_repo.get_user_by_id_or_fail.assert_called_once_with(1)
        rental_creation_service.equipment_repo.get_equipment_by_ids_or_fail.assert_called_once_with([1])
        # Двухпроходный расчёт: предварительный (без промо, для min_order_amount)
        # и финальный (с промокодом)
        assert rental_creation_service.financial_service.calculate_final_price.call_count == 2
        rental_creation_service.rental_repo.create_rental_instance.assert_called_once()
        rental_creation_service.balance_service.add_transaction.assert_called()

    @pytest.mark.asyncio
    async def test_create_rental_from_scratch_with_prepayment(self, rental_creation_service, mock_db_session,
                                                              sample_user, sample_manager, sample_equipment,
                                                              sample_rental, price_details):
        """Тест создания аренды с предоплатой."""
        # Arrange
        request = RentalCreateFromScratchRequest(
            user_id=1,
            equipment_ids=[1],
            start_date=date.today(),
            end_date=date.today() + timedelta(days=3),
            selected_accessories=None,
            promo_code=None,
            deposit_amount=0.0,
            prepayment_amount=200.0,
            notes_on_issue=None,
            force_issue_on_holiday=False
        )
        
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_creation_service.user_repo.get_user_by_id_or_fail = AsyncMock(return_value=sample_user)
        rental_creation_service.validator.user_status_service = None
        rental_creation_service.validator.validate_issue_on_holiday = AsyncMock()
        rental_creation_service.validator.validate_equipment_availability = AsyncMock()
        rental_creation_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=sample_equipment)
        rental_creation_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        rental_creation_service.rental_repo.create_rental_instance = MagicMock(return_value=sample_rental)
        rental_creation_service.rental_repo.save_rental = AsyncMock(return_value=sample_rental)
        rental_creation_service.rental_repo.add_accessories_to_rental_async = AsyncMock()
        rental_creation_service.balance_service.add_transaction = AsyncMock()
        rental_creation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)

        # Act
        result = await rental_creation_service.create_rental_from_scratch(request, sample_manager)

        # Assert
        assert result == sample_rental
        # Проверяем, что была создана транзакция предоплаты
        prepayment_calls = [call for call in rental_creation_service.balance_service.add_transaction.call_args_list
                           if call[1]['operation_type'] == BalanceOperationType.PREPAYMENT]
        assert len(prepayment_calls) > 0

    @pytest.mark.asyncio
    async def test_create_rental_from_scratch_with_promo_code(self, rental_creation_service, mock_db_session,
                                                             sample_user, sample_manager, sample_equipment,
                                                             sample_rental, price_details):
        """Тест создания аренды с промокодом."""
        # Arrange
        from api.models.promo_code import PromoCode
        
        promo_code = PromoCode()
        promo_code.id = 1
        promo_code.code = "TEST10"
        promo_code.discount_percentage = 10.0
        
        request = RentalCreateFromScratchRequest(
            user_id=1,
            equipment_ids=[1],
            start_date=date.today(),
            end_date=date.today() + timedelta(days=3),
            selected_accessories=None,
            promo_code="TEST10",
            deposit_amount=0.0,
            prepayment_amount=0.0,
            notes_on_issue=None,
            force_issue_on_holiday=False
        )
        
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_creation_service.user_repo.get_user_by_id_or_fail = AsyncMock(return_value=sample_user)
        rental_creation_service.validator.user_status_service = None
        rental_creation_service.validator.validate_issue_on_holiday = AsyncMock()
        rental_creation_service.validator.validate_equipment_availability = AsyncMock()
        rental_creation_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=sample_equipment)
        rental_creation_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(return_value=promo_code)
        rental_creation_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        rental_creation_service.rental_repo.create_rental_instance = MagicMock(return_value=sample_rental)
        rental_creation_service.rental_repo.save_rental = AsyncMock(return_value=sample_rental)
        rental_creation_service.rental_repo.add_accessories_to_rental_async = AsyncMock()
        rental_creation_service.balance_service.add_transaction = AsyncMock()
        rental_creation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)

        # Act
        result = await rental_creation_service.create_rental_from_scratch(request, sample_manager)

        # Assert
        assert result == sample_rental
        rental_creation_service.promo_code_logic.validate_and_get_promo_code.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_rental_from_scratch_user_not_found(self, rental_creation_service, mock_db_session,
                                                              sample_manager, create_from_scratch_request):
        """Тест создания аренды для несуществующего пользователя."""
        # Arrange
        from fastapi import HTTPException
        
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_creation_service.user_repo.get_user_by_id_or_fail = AsyncMock(
            side_effect=HTTPException(status_code=404, detail="User not found")
        )

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await rental_creation_service.create_rental_from_scratch(
                create_from_scratch_request, sample_manager
            )
        
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_create_rental_from_scratch_equipment_not_found(self, rental_creation_service, mock_db_session,
                                                                 sample_user, sample_manager, create_from_scratch_request):
        """Тест создания аренды с несуществующим оборудованием."""
        # Arrange
        from fastapi import HTTPException
        
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_creation_service.user_repo.get_user_by_id_or_fail = AsyncMock(return_value=sample_user)
        rental_creation_service.validator.user_status_service = None
        rental_creation_service.validator.validate_issue_on_holiday = AsyncMock()
        rental_creation_service.validator.validate_equipment_availability = AsyncMock()
        rental_creation_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(
            side_effect=HTTPException(status_code=404, detail="Equipment not found")
        )

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await rental_creation_service.create_rental_from_scratch(
                create_from_scratch_request, sample_manager
            )
        
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_create_rental_from_scratch_with_accessories(self, rental_creation_service, mock_db_session,
                                                              sample_user, sample_manager, sample_equipment,
                                                              sample_rental, price_details):
        """Тест создания аренды с аксессуарами."""
        # Arrange
        request = RentalCreateFromScratchRequest(
            user_id=1,
            equipment_ids=[1],
            start_date=date.today(),
            end_date=date.today() + timedelta(days=3),
            selected_accessories={1: [1, 2]},  # Аксессуары для оборудования ID=1
            promo_code=None,
            deposit_amount=0.0,
            prepayment_amount=0.0,
            notes_on_issue=None,
            force_issue_on_holiday=False
        )
        
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_creation_service.user_repo.get_user_by_id_or_fail = AsyncMock(return_value=sample_user)
        rental_creation_service.validator.user_status_service = None
        rental_creation_service.validator.validate_issue_on_holiday = AsyncMock()
        rental_creation_service.validator.validate_equipment_availability = AsyncMock()
        rental_creation_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=sample_equipment)
        rental_creation_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        rental_creation_service.rental_repo.create_rental_instance = MagicMock(return_value=sample_rental)
        rental_creation_service.rental_repo.save_rental = AsyncMock(return_value=sample_rental)
        rental_creation_service.rental_repo.add_accessories_to_rental_async = AsyncMock()
        rental_creation_service.balance_service.add_transaction = AsyncMock()
        rental_creation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)

        # Act
        result = await rental_creation_service.create_rental_from_scratch(request, sample_manager)

        # Assert
        assert result == sample_rental
        rental_creation_service.rental_repo.add_accessories_to_rental_async.assert_called_once()

    # === ТЕСТЫ ДЛЯ _extract_reservation_data ===

    def test_extract_reservation_data(self, rental_creation_service, sample_reservation):
        """Тест извлечения данных из резерва."""
        # Act
        equipment_ids, selected_accessories = rental_creation_service._extract_reservation_data(sample_reservation)

        # Assert
        assert equipment_ids == [1]
        assert selected_accessories == {}

    # === ТЕСТЫ ДЛЯ _recalculate_price_for_conversion ===

    @pytest.mark.asyncio
    async def test_recalculate_price_for_conversion_without_promo(self, rental_creation_service, sample_reservation, price_details):
        """Тест пересчета цены без промокода."""
        # Arrange
        equipment_ids = [1]
        selected_accessories = {}
        new_start_date = date.today()
        
        rental_creation_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        rental_creation_service.system_service.get_promo_code_by_id = AsyncMock(return_value=None)

        # Act
        result = await rental_creation_service._recalculate_price_for_conversion(
            sample_reservation, equipment_ids, selected_accessories, new_start_date
        )

        # Assert
        assert result == price_details
        assert rental_creation_service.financial_service.calculate_final_price.call_count == 2  # Предварительный и финальный расчет

