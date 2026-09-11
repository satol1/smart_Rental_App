# tests/services/test_billing_financial_chain.py
"""
Comprehensive financial tests for the reservation -> rental -> return billing chain.
Verifies promo code transfer, discount recalculation, prepayment, early/overdue returns,
and lazy-load safety of promo code properties.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date, datetime, timezone, timedelta
from fastapi import HTTPException

from api.models.user import User
from api.models.equipment import Equipment
from api.models.reservation import Reservation
from api.models.rental import Rental
from api.models.promo_code import PromoCode
from shared.schemas.rental_schema import (
    RentalCreateFromReservationRequest,
    RentalReturnRequest
)
from shared.constants.balance_operations import BalanceOperationType
from api.services.financial_service import PriceDetails
from api.services.order.rental_creation_service import RentalCreationService
from api.services.order.rental_return_service import RentalReturnService


class TestBillingFinancialChain:
    """Интеграционные и модульные тесты для финансовой цепочки биллинга с промокодами."""

    @pytest.fixture
    def mock_db(self, mock_db_session):
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        return mock_db_session

    @pytest.fixture
    def sample_user(self):
        user = User()
        user.id = 10
        user.email = "client@example.com"
        user.role = "client"
        user.is_active = True
        return user

    @pytest.fixture
    def sample_manager(self):
        manager = User()
        manager.id = 1
        manager.email = "admin@example.com"
        manager.role = "admin"
        return manager

    @pytest.fixture
    def sample_equipment(self):
        equipment = Equipment()
        equipment.id = 101
        equipment.name = "Sony FX3"
        equipment.daily_rate = 3000.0
        equipment.is_active = True
        return [equipment]

    @pytest.fixture
    def sample_promo_code(self):
        promo = PromoCode()
        promo.id = 5
        promo.code = "SUMMER10"
        promo.discount_percentage = 10.0
        promo.min_order_amount = 2000.0
        promo.is_active = True
        promo.times_used = 0
        promo.max_uses = 50
        promo.valid_from = datetime.now(timezone.utc) - timedelta(days=10)
        promo.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        return promo

    @pytest.fixture
    def rental_creation_service(self, mock_db):
        from api.repositories.rental_repository import RentalRepository
        from api.repositories.reservation_repository import ReservationRepository
        from api.repositories.user_repository import UserRepository
        from api.repositories.equipment_repository import EquipmentRepository
        from api.services.order.system_repository import SystemService
        from api.services.order.order_validator import OrderValidator
        from api.services.balance_service import BalanceService
        from api.services.financial_service import FinancialService
        from api.services.promo_code import PromoCodeBusinessLogic

        return RentalCreationService(
            db=mock_db,
            rental_repo=MagicMock(spec=RentalRepository),
            reservation_repo=MagicMock(spec=ReservationRepository),
            user_repo=MagicMock(spec=UserRepository),
            equipment_repo=MagicMock(spec=EquipmentRepository),
            system_service=MagicMock(spec=SystemService),
            validator=MagicMock(spec=OrderValidator),
            balance_service=MagicMock(spec=BalanceService),
            financial_service=MagicMock(spec=FinancialService),
            promo_code_logic=MagicMock(spec=PromoCodeBusinessLogic)
        )

    # -------------------------------------------------------------------------
    # 1. Reservation -> Rental Promo Code Transfer
    # -------------------------------------------------------------------------
    @pytest.mark.asyncio
    async def test_convert_reservation_transfers_promo_code_and_discount(
        self, rental_creation_service, sample_user, sample_manager,
        sample_equipment, sample_promo_code
    ):
        """
        Тест: При конвертации резерва промокод и скидка корректно передаются
        в создание аренды (recalculated_cost, recalculated_discount, promo_code).
        """
        reservation = Reservation()
        reservation.id = 50
        reservation.user_id = sample_user.id
        reservation.user = sample_user
        reservation.start_date = date.today()
        reservation.end_date = date.today() + timedelta(days=3)
        reservation.equipment = sample_equipment
        reservation.accessory_links = []
        reservation.total_cost = 5670.0  # 6300 - 10%
        reservation.discount_amount = 630.0
        reservation.promo_code_id = sample_promo_code.id
        reservation.applied_promo_code = sample_promo_code
        reservation.status = "active"

        convert_request = RentalCreateFromReservationRequest(
            deposit_amount=5000.0,
            prepayment_amount=1500.0,
            notes_on_issue="Выдача с промокодом",
            force_issue_on_holiday=False
        )

        initial_price = PriceDetails(full_total=6300.0, discount_amount=0.0, final_total=6300.0)
        discounted_price = PriceDetails(full_total=6300.0, discount_amount=630.0, final_total=5670.0)

        # Setup mocks
        rental_creation_service.reservation_repo.get_by_id_with_details = AsyncMock(return_value=reservation)
        rental_creation_service.validator.validate_reservation_for_conversion = MagicMock()
        rental_creation_service.validator.validate_issue_on_holiday = AsyncMock()
        rental_creation_service.validator.user_status_service = None
        rental_creation_service.user_repo.get_by_id = AsyncMock(return_value=sample_user)

        # Recalculation mocks: first call without promo, second call with promo
        rental_creation_service.financial_service.calculate_final_price = AsyncMock(
            side_effect=[initial_price, discounted_price]
        )
        rental_creation_service.system_service.get_promo_code_by_id = AsyncMock(return_value=sample_promo_code)
        rental_creation_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(return_value=sample_promo_code)

        created_rental = Rental()
        created_rental.id = 77
        created_rental.user_id = sample_user.id
        created_rental.created_by_id = sample_manager.id
        created_rental.start_date = date.today()
        created_rental.end_date = date.today() + timedelta(days=3)
        created_rental.equipment = sample_equipment
        created_rental.accessory_links = []
        created_rental.total_cost = 5670.0
        created_rental.discount_amount = 630.0
        created_rental.promo_code = sample_promo_code.code
        created_rental.deposit_amount = 5000.0
        created_rental.prepayment_amount = 1500.0
        created_rental.status = "active"

        rental_creation_service.rental_repo.create_rental_from_reservation = MagicMock(return_value=created_rental)
        rental_creation_service.reservation_repo.save_object = AsyncMock()
        rental_creation_service.rental_repo.save_rental = AsyncMock(return_value=created_rental)
        rental_creation_service.balance_service.add_transaction = AsyncMock()
        rental_creation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=created_rental)

        # Execute conversion
        result = await rental_creation_service.convert_reservation_to_rental(
            reservation.id, convert_request, sample_manager
        )

        # Assertions
        assert result.promo_code == "SUMMER10"
        assert result.discount_amount == 630.0
        assert result.total_cost == 5670.0

        # Verify that create_rental_from_reservation was called with promo_code="SUMMER10"
        rental_creation_service.rental_repo.create_rental_from_reservation.assert_called_once()
        call_kwargs = rental_creation_service.rental_repo.create_rental_from_reservation.call_args[1]
        assert call_kwargs["promo_code"] == "SUMMER10"
        assert call_kwargs["recalculated_cost"] == 5670.0
        assert call_kwargs["recalculated_discount"] == 630.0

    # -------------------------------------------------------------------------
    # 2. Promo Code Dropped When Criteria Fail During Conversion
    # -------------------------------------------------------------------------
    @pytest.mark.asyncio
    async def test_convert_reservation_rejected_if_promo_invalid_on_conversion(
        self, rental_creation_service, sample_user, sample_manager,
        sample_equipment, sample_promo_code
    ):
        """
        Тест: Если промокод стал невалидным (например, истек или сумма ниже порога),
        конвертация явно отклоняется — вместо молчаливого создания аренды без скидки.
        """
        reservation = Reservation()
        reservation.id = 51
        reservation.user_id = sample_user.id
        reservation.user = sample_user
        reservation.start_date = date.today()
        reservation.end_date = date.today() + timedelta(days=1)
        reservation.equipment = sample_equipment
        reservation.accessory_links = []
        reservation.total_cost = 1000.0
        reservation.discount_amount = 0.0
        reservation.promo_code_id = sample_promo_code.id
        reservation.applied_promo_code = sample_promo_code
        reservation.status = "active"

        convert_request = RentalCreateFromReservationRequest(
            deposit_amount=0.0,
            prepayment_amount=0.0,
            force_issue_on_holiday=False
        )

        base_price = PriceDetails(full_total=1000.0, discount_amount=0.0, final_total=1000.0)

        rental_creation_service.reservation_repo.get_by_id_with_details = AsyncMock(return_value=reservation)
        rental_creation_service.validator.validate_reservation_for_conversion = MagicMock()
        rental_creation_service.validator.validate_issue_on_holiday = AsyncMock()
        rental_creation_service.validator.user_status_service = None
        rental_creation_service.user_repo.get_by_id = AsyncMock(return_value=sample_user)

        # Both preliminary and final calculations yield base price
        rental_creation_service.financial_service.calculate_final_price = AsyncMock(return_value=base_price)
        rental_creation_service.system_service.get_promo_code_by_id = AsyncMock(return_value=sample_promo_code)
        # Promo validation fails!
        rental_creation_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(
            side_effect=HTTPException(status_code=400, detail="Promo code expired or min amount not met")
        )

        created_rental = Rental()
        created_rental.id = 78
        created_rental.user_id = sample_user.id
        created_rental.created_by_id = sample_manager.id
        created_rental.start_date = date.today()
        created_rental.end_date = date.today() + timedelta(days=1)
        created_rental.equipment = sample_equipment
        created_rental.accessory_links = []
        created_rental.total_cost = 1000.0
        created_rental.discount_amount = 0.0
        created_rental.promo_code = None
        created_rental.status = "active"

        rental_creation_service.rental_repo.create_rental_from_reservation = MagicMock(return_value=created_rental)
        rental_creation_service.reservation_repo.save_object = AsyncMock()
        rental_creation_service.rental_repo.save_rental = AsyncMock(return_value=created_rental)
        rental_creation_service.balance_service.add_transaction = AsyncMock()
        rental_creation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=created_rental)

        # Промокод стал невалидным к моменту конвертации: аренда НЕ создаётся
        # молча без скидки, а отказывает явно (клиент ожидает сумму со скидкой)
        with pytest.raises(HTTPException) as exc_info:
            await rental_creation_service.convert_reservation_to_rental(
                reservation.id, convert_request, sample_manager
            )

        assert exc_info.value.status_code in (400, 409)
        rental_creation_service.rental_repo.create_rental_from_reservation.assert_not_called()

    # -------------------------------------------------------------------------
    # 3. Rental Return & Promo Code Retention
    # -------------------------------------------------------------------------
    @pytest.mark.asyncio
    async def test_rental_return_preserves_promo_code(self, mock_db, sample_user, sample_manager):
        """
        Тест: При возврате аренды финализация возврата корректно вызывается,
        а промокод и сумма скидки сохраняются в сущности аренды.
        """
        from api.repositories.rental_repository import RentalRepository
        from api.services.order.order_validator import OrderValidator
        from api.services.balance_service import BalanceService
        from api.services.financial_service import FinancialService

        rental_repo = MagicMock(spec=RentalRepository)
        validator = MagicMock(spec=OrderValidator)
        balance_service = MagicMock(spec=BalanceService)
        financial_service = MagicMock(spec=FinancialService)

        return_service = RentalReturnService(
            db=mock_db,
            rental_repo=rental_repo,
            validator=validator,
            balance_service=balance_service,
            financial_service=financial_service
        )

        rental = Rental()
        rental.id = 100
        rental.user_id = sample_user.id
        rental.user = sample_user
        rental.start_date = date(2026, 6, 1)
        rental.end_date = date(2026, 6, 5)
        rental.total_cost = 5670.0
        rental.discount_amount = 630.0
        rental.promo_code = "SUMMER10"
        rental.deposit_amount = 0.0
        rental.prepayment_amount = 0.0
        rental.status = "active"
        rental.equipment = []
        rental.accessory_links = []

        return_request = RentalReturnRequest(
            actual_return_date=date(2026, 6, 5),
            notes_on_return="All gear returned safely",
            accessories_returned_confirmation=True
        )

        completed_rental = Rental()
        completed_rental.id = 100
        completed_rental.user_id = sample_user.id
        completed_rental.total_cost = 5670.0
        completed_rental.discount_amount = 630.0
        completed_rental.promo_code = "SUMMER10"
        completed_rental.status = "completed"

        rental_repo.get_rental_by_id_or_fail = AsyncMock(side_effect=[rental, completed_rental])
        validator.validate_rental_is_returnable = MagicMock()
        validator.validate_accessories_returned = MagicMock()
        validator.validate_return_date = MagicMock()
        financial_service.calculate_early_return_credit = AsyncMock(return_value=0.0)
        financial_service.calculate_overdue_surcharge = AsyncMock(return_value=0.0)
        rental_repo.finalize_rental_return = MagicMock()
        rental_repo.save_rental = AsyncMock(return_value=completed_rental)
        balance_service.add_transaction = AsyncMock()

        result = await return_service.return_rental(
            rental.id, return_request, sample_manager
        )

        # Status becomes completed, but promo_code and discount_amount remain intact
        rental_repo.finalize_rental_return.assert_called_once()
        assert result.status == "completed"
        assert result.promo_code == "SUMMER10"
        assert result.discount_amount == 630.0

    # -------------------------------------------------------------------------
    # 4. Model Promo Code Property & Async Resilience
    # -------------------------------------------------------------------------
    def test_reservation_promo_code_property(self, sample_promo_code):
        """
        Тест: reservation.promo_code возвращает код если промокод привязан,
        и None если не привязан, без исключений ленивой загрузки.
        """
        res = Reservation()
        res.promo_code_id = sample_promo_code.id
        res.applied_promo_code = sample_promo_code
        assert res.promo_code == "SUMMER10"

        res_no_promo = Reservation()
        res_no_promo.promo_code_id = None
        res_no_promo.applied_promo_code = None
        assert res_no_promo.promo_code is None

    # -------------------------------------------------------------------------
    # 5. Early Return Credit & Overdue Surcharge Balance Transactions
    # -------------------------------------------------------------------------
    @pytest.mark.asyncio
    async def test_rental_return_early_return_credit_balance_transaction(
        self, mock_db, sample_user, sample_manager
    ):
        """
        Тест: При досрочном возврате создается транзакция EARLY_RETURN_CREDIT
        на точную сумму пересчитанного кредита.
        """
        from api.repositories.rental_repository import RentalRepository
        from api.services.order.order_validator import OrderValidator
        from api.services.balance_service import BalanceService
        from api.services.financial_service import FinancialService

        rental_repo = MagicMock(spec=RentalRepository)
        validator = MagicMock(spec=OrderValidator)
        balance_service = MagicMock(spec=BalanceService)
        financial_service = MagicMock(spec=FinancialService)

        return_service = RentalReturnService(
            db=mock_db,
            rental_repo=rental_repo,
            validator=validator,
            balance_service=balance_service,
            financial_service=financial_service
        )

        rental = Rental()
        rental.id = 101
        rental.user_id = sample_user.id
        rental.user = sample_user
        rental.start_date = date(2026, 6, 1)
        rental.end_date = date(2026, 6, 5)
        rental.total_cost = 6000.0
        rental.discount_amount = 0.0
        rental.promo_code = None
        rental.status = "active"

        return_request = RentalReturnRequest(
            actual_return_date=date(2026, 6, 3),
            notes_on_return="Early return",
            accessories_returned_confirmation=True
        )

        completed_rental = Rental()
        completed_rental.id = 101
        completed_rental.user_id = sample_user.id
        completed_rental.total_cost = 6000.0
        completed_rental.status = "completed"

        rental_repo.get_rental_by_id_or_fail = AsyncMock(side_effect=[rental, completed_rental])
        validator.validate_rental_is_returnable = MagicMock()
        validator.validate_accessories_returned = MagicMock()
        validator.validate_return_date = MagicMock()
        financial_service.get_rental_days = AsyncMock(return_value=4)
        financial_service.calculate_early_return_credit = AsyncMock(return_value=3000.0)
        rental_repo.finalize_rental_return = MagicMock()
        rental_repo.save_rental = AsyncMock(return_value=completed_rental)
        balance_service.add_transaction = AsyncMock()

        await return_service.return_rental(
            rental.id, return_request, sample_manager
        )

        balance_service.add_transaction.assert_called_once_with(
            user_id=sample_user.id,
            amount=3000.0,
            operation_type=BalanceOperationType.EARLY_RETURN_CREDIT,
            description=f"Возврат за досрочное завершение аренды #{rental.id}",
            rental_id=rental.id
        )
        rental_repo.finalize_rental_return.assert_called_once_with(
            rental, date(2026, 6, 3), "Early return", 3000.0, 0.0
        )

    @pytest.mark.asyncio
    async def test_rental_return_overdue_surcharge_balance_transaction(
        self, mock_db, sample_user, sample_manager
    ):
        """
        Тест: При возврате с просрочкой создается транзакция OVERDUE_SURCHARGE_DEBIT
        на сумму штрафа с отрицательным знаком.
        """
        from api.repositories.rental_repository import RentalRepository
        from api.services.order.order_validator import OrderValidator
        from api.services.balance_service import BalanceService
        from api.services.financial_service import FinancialService

        rental_repo = MagicMock(spec=RentalRepository)
        validator = MagicMock(spec=OrderValidator)
        balance_service = MagicMock(spec=BalanceService)
        financial_service = MagicMock(spec=FinancialService)

        return_service = RentalReturnService(
            db=mock_db,
            rental_repo=rental_repo,
            validator=validator,
            balance_service=balance_service,
            financial_service=financial_service
        )

        rental = Rental()
        rental.id = 102
        rental.user_id = sample_user.id
        rental.user = sample_user
        rental.start_date = date(2026, 6, 1)
        rental.end_date = date(2026, 6, 5)
        rental.total_cost = 6000.0
        rental.discount_amount = 0.0
        rental.promo_code = None
        rental.status = "active"

        return_request = RentalReturnRequest(
            actual_return_date=date(2026, 6, 7),
            notes_on_return="Late return",
            accessories_returned_confirmation=True
        )

        completed_rental = Rental()
        completed_rental.id = 102
        completed_rental.user_id = sample_user.id
        completed_rental.total_cost = 6000.0
        completed_rental.status = "completed"

        rental_repo.get_rental_by_id_or_fail = AsyncMock(side_effect=[rental, completed_rental])
        validator.validate_rental_is_returnable = MagicMock()
        validator.validate_accessories_returned = MagicMock()
        validator.validate_return_date = MagicMock()
        financial_service.calculate_overdue_surcharge = AsyncMock(return_value=3000.0)
        rental_repo.finalize_rental_return = MagicMock()
        rental_repo.save_rental = AsyncMock(return_value=completed_rental)
        balance_service.add_transaction = AsyncMock()

        await return_service.return_rental(
            rental.id, return_request, sample_manager
        )

        balance_service.add_transaction.assert_called_once_with(
            user_id=sample_user.id,
            amount=-3000.0,
            operation_type=BalanceOperationType.OVERDUE_SURCHARGE_DEBIT,
            description=f"Списание за просрочку аренды #{rental.id}",
            rental_id=rental.id
        )
        rental_repo.finalize_rental_return.assert_called_once_with(
            rental, date(2026, 6, 7), "Late return", 0.0, 3000.0
        )

    # -------------------------------------------------------------------------
    # 6. Revert Rental Balance Transactions
    # -------------------------------------------------------------------------
    @pytest.mark.asyncio
    async def test_revert_rental_balance_transactions(
        self, mock_db, sample_user, sample_manager
    ):
        """
        Тест: При отмене аренды (revert) начисляется RENTAL_REVERT_CREDIT (+total_cost),
        а при возврате аванса клиенту списывается PREPAYMENT_REFUND_ON_REVERT (-prepayment_amount).
        """
        from api.repositories.rental_repository import RentalRepository
        from api.services.order.order_validator import OrderValidator
        from api.services.balance_service import BalanceService
        from api.services.order.system_repository import SystemService
        from api.services.promo_code import PromoCodeBusinessLogic
        from api.services.order.rental_cancellation_service import RentalCancellationService
        from shared.schemas.rental_schema import RentalRevertRequest

        rental_repo = MagicMock(spec=RentalRepository)
        validator = MagicMock(spec=OrderValidator)
        balance_service = MagicMock(spec=BalanceService)
        system_service = MagicMock(spec=SystemService)
        promo_code_logic = MagicMock(spec=PromoCodeBusinessLogic)

        cancellation_service = RentalCancellationService(
            db=mock_db,
            rental_repo=rental_repo,
            validator=validator,
            balance_service=balance_service,
            system_service=system_service,
            promo_code_logic=promo_code_logic
        )

        rental = Rental()
        rental.id = 103
        rental.user_id = sample_user.id
        rental.total_cost = 5000.0
        rental.prepayment_amount = 1500.0
        rental.status = "active"

        reservation = Reservation()
        reservation.id = 88
        reservation.status = "fulfilled"

        rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=rental)
        validator.validate_rental_for_revert = MagicMock()
        rental_repo.revert_rental_status_to_active = MagicMock(return_value=reservation)
        rental_repo.delete_rental = AsyncMock()
        balance_service.add_transaction = AsyncMock()

        revert_request = RentalRevertRequest(refund_prepayment=True)
        await cancellation_service.revert_rental_to_reservation(
            rental.id, sample_manager, revert_request
        )

        assert balance_service.add_transaction.call_count == 2
        calls = balance_service.add_transaction.call_args_list

        assert calls[0].kwargs["amount"] == 5000.0
        assert calls[0].kwargs["operation_type"] == BalanceOperationType.RENTAL_REVERT_CREDIT

        assert calls[1].kwargs["amount"] == -1500.0
        assert calls[1].kwargs["operation_type"] == BalanceOperationType.PREPAYMENT_REFUND_ON_REVERT

    # -------------------------------------------------------------------------
    # 7. Promo Validation & Drop on End Date Change
    # -------------------------------------------------------------------------
    @pytest.mark.asyncio
    async def test_admin_update_rental_dates_rejected_if_promo_below_min_amount(
        self, mock_db, sample_user, sample_manager, sample_equipment, sample_promo_code
    ):
        """
        Тест: При изменении менеджером даты окончания аренды, если сумма заказа
        падает ниже min_order_amount промокода, обновление явно отклоняется —
        вместо молчаливого сброса промокода и пересчёта без скидки.
        """
        from api.repositories.rental_repository import RentalRepository
        from api.services.order.order_validator import OrderValidator
        from api.services.balance_service import BalanceService
        from api.services.financial_service import FinancialService, PriceDetails
        from api.services.order.system_repository import SystemService
        from api.services.promo_code import PromoCodeBusinessLogic
        from api.services.order.rental_update_service import RentalUpdateService
        from shared.schemas.rental_schema import AdminRentalUpdate

        rental_repo = MagicMock(spec=RentalRepository)
        validator = MagicMock(spec=OrderValidator)
        balance_service = MagicMock(spec=BalanceService)
        financial_service = MagicMock(spec=FinancialService)
        system_service = MagicMock(spec=SystemService)
        promo_code_logic = MagicMock(spec=PromoCodeBusinessLogic)

        update_service = RentalUpdateService(
            db=mock_db,
            rental_repo=rental_repo,
            validator=validator,
            system_service=system_service,
            balance_service=balance_service,
            financial_service=financial_service,
            promo_code_logic=promo_code_logic
        )

        rental = Rental()
        rental.id = 104
        rental.user_id = sample_user.id
        rental.user = sample_user
        rental.start_date = date.today()
        rental.end_date = date.today() + timedelta(days=5)
        rental.total_cost = 9000.0
        rental.discount_amount = 1000.0
        rental.promo_code = sample_promo_code.code
        rental.status = "active"
        rental.prepayment_amount = 0.0
        rental.reservation_id = None

        new_end_date = date.today() + timedelta(days=1)
        update_request = AdminRentalUpdate(end_date=new_end_date)

        rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=rental)
        rental_repo.get_rental_equipment_ids = MagicMock(return_value=[101])
        rental_repo.get_rental_accessories_mapping = MagicMock(return_value={})
        validator.validate_equipment_availability = AsyncMock()

        preliminary_price = PriceDetails(full_total=1000.0, discount_amount=0.0, final_total=1000.0)
        promo_code_logic.validate_and_get_promo_code = AsyncMock(
            side_effect=HTTPException(status_code=400, detail="Min order amount not reached")
        )
        final_price = PriceDetails(full_total=1000.0, discount_amount=0.0, final_total=1000.0)
        financial_service.calculate_final_price = AsyncMock(
            side_effect=[preliminary_price, final_price]
        )
        rental_repo.save_rental = AsyncMock(return_value=rental)
        balance_service.add_transaction = AsyncMock()

        # Сумма упала ниже min_order_amount: обновление явно отклоняется,
        # а не пересчитывается молча без скидки
        with pytest.raises(HTTPException) as exc_info:
            await update_service.update_rental_details_by_admin(
                rental.id, update_request, sample_manager
            )

        assert exc_info.value.status_code in (400, 409)
        rental_repo.save_rental.assert_not_called()
        balance_service.add_transaction.assert_not_called()

    # -------------------------------------------------------------------------
    # 8. Relationship Lazy Loading Safety (lazy='joined')
    # -------------------------------------------------------------------------
    def test_model_lazy_joined_relationships(self):
        """
        Тест: Проверяет наличие lazy='joined' для ключевых связей,
        чтобы исключить DetachedInstanceError в асинхронных моделях.
        """
        from sqlalchemy.orm import class_mapper

        reservation_mapper = class_mapper(Reservation)
        assert reservation_mapper.relationships["user"].lazy == "joined"
        assert reservation_mapper.relationships["applied_promo_code"].lazy == "joined"
        assert reservation_mapper.relationships["equipment"].lazy == "joined"

        rental_mapper = class_mapper(Rental)
        assert rental_mapper.relationships["user"].lazy == "joined"
        assert rental_mapper.relationships["equipment"].lazy == "joined"

