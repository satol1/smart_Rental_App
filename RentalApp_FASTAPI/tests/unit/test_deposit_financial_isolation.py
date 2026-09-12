# tests/unit/test_deposit_financial_isolation.py

import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from api.models.rental import Rental, RentalEquipment
from api.models.user import User
from shared.constants.deposit_status import DepositStatus
from shared.constants.order_status import OrderStatus
from shared.schemas.rental_schema import RentalReturnRequest


class TestDepositFinancialIsolation:
    """
    Глубокий аудит и верификация изоляции залогов от финансового контура:
    - Залог хранится в сейфе наличными под расписку.
    - Никакие операции с залогом (внесение, возврат, частичное или полное удержание)
      не должны создавать записей в payments или balance_history.
    - Баланс пользователя не должен изменяться от операций с залогом.
    """

    @pytest.fixture
    def mock_db(self):
        db = AsyncMock()
        db.begin_nested = MagicMock()
        db.flush = AsyncMock()
        db.add = MagicMock()
        db.add_all = MagicMock()
        return db

    @pytest.fixture
    def sample_user(self):
        return User(
            id=10,
            full_name="Тестовый Клиент",
            email="client@example.com",
            phone="+79991234567",
            balance=Decimal("0.00"),
        )

    @pytest.fixture
    def sample_manager(self):
        return User(
            id=1,
            full_name="Тестовый Менеджер",
            email="manager@example.com",
            role="manager",
        )

    @pytest.fixture
    def sample_rental(self, sample_user):
        rental = Rental(
            id=500,
            user_id=sample_user.id,
            total_cost=Decimal("10000.00"),
            deposit_amount=Decimal("5000.00"),
            deposit_status=DepositStatus.HELD.value,
            deposit_refunded_amount=Decimal("0.00"),
            deposit_retained_amount=Decimal("0.00"),
            prepayment_amount=Decimal("0.00"),
            start_date=date(2026, 9, 1),
            end_date=date(2026, 9, 5),
            status=OrderStatus.ACTIVE.value,
        )
        rental.user = sample_user
        rental.equipment = []
        rental.rental_items = [
            RentalEquipment(rental_id=500, equipment_id=1, status="rented")
        ]
        rental.accessory_links = []
        return rental

    @pytest.mark.asyncio
    async def test_full_return_refund_deposit_does_not_create_financial_records(
        self, mock_db, sample_rental, sample_manager
    ):
        """Возврат залога клиенту не должен создавать проводок в balance_history или payments."""
        from api.services.order.rental_return_service import RentalReturnService

        balance_service = AsyncMock()
        financial_service = AsyncMock()
        financial_service.get_rental_days = AsyncMock(return_value=4)
        financial_service.calculate_early_return_credit = AsyncMock(return_value=Decimal("0.00"))
        financial_service.calculate_overdue_surcharge = AsyncMock(return_value=Decimal("0.00"))

        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)

        def mock_finalize(r, ret_d, notes, credit, surcharge, has_debt=False, **kwargs):
            r.status = OrderStatus.COMPLETED.value
            r.actual_return_date = ret_d
            if "deposit_status" in kwargs:
                r.deposit_status = kwargs["deposit_status"]
            if "deposit_refunded_amount" in kwargs:
                r.deposit_refunded_amount = kwargs["deposit_refunded_amount"]
            if "deposit_retained_amount" in kwargs:
                r.deposit_retained_amount = kwargs["deposit_retained_amount"]

        rental_repo.finalize_rental_return = MagicMock(side_effect=mock_finalize)

        validator = MagicMock()
        validator.validate_rental_is_returnable = MagicMock()
        validator.validate_return_date = MagicMock()
        validator.validate_accessories_returned = MagicMock()

        service = RentalReturnService(
            db=mock_db,
            rental_repo=rental_repo,
            validator=validator,
            balance_service=balance_service,
            financial_service=financial_service,
            user_status_service=None,
        )

        request = RentalReturnRequest(
            actual_return_date=date(2026, 9, 5),
            accessories_returned_confirmation=True,
            deposit_action="refund",
        )

        with patch("api.services.order.rental_return_service.schedule_after_commit"):
            await service.return_rental(sample_rental.id, request, sample_manager)

        assert sample_rental.deposit_status == DepositStatus.REFUNDED.value
        assert sample_rental.deposit_refunded_amount == Decimal("5000.00")
        assert sample_rental.deposit_retained_amount == Decimal("0.00")
        assert balance_service.add_transaction.call_count == 0

    @pytest.mark.asyncio
    async def test_full_return_retain_deposit_for_damage_does_not_create_financial_records(
        self, mock_db, sample_rental, sample_manager
    ):
        """Удержание залога за повреждения не должно фиксироваться в балансе или платежах."""
        from api.services.order.rental_return_service import RentalReturnService

        balance_service = AsyncMock()
        financial_service = AsyncMock()
        financial_service.get_rental_days = AsyncMock(return_value=4)
        financial_service.calculate_early_return_credit = AsyncMock(return_value=Decimal("0.00"))
        financial_service.calculate_overdue_surcharge = AsyncMock(return_value=Decimal("0.00"))

        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)

        def mock_finalize(r, ret_d, notes, credit, surcharge, has_debt=False, **kwargs):
            r.status = OrderStatus.COMPLETED.value
            r.actual_return_date = ret_d
            if "deposit_status" in kwargs:
                r.deposit_status = kwargs["deposit_status"]
            if "deposit_refunded_amount" in kwargs:
                r.deposit_refunded_amount = kwargs["deposit_refunded_amount"]
            if "deposit_retained_amount" in kwargs:
                r.deposit_retained_amount = kwargs["deposit_retained_amount"]
            if "deposit_notes" in kwargs:
                r.deposit_notes = kwargs["deposit_notes"]

        rental_repo.finalize_rental_return = MagicMock(side_effect=mock_finalize)

        validator = MagicMock()
        validator.validate_rental_is_returnable = MagicMock()
        validator.validate_return_date = MagicMock()
        validator.validate_accessories_returned = MagicMock()

        service = RentalReturnService(
            db=mock_db,
            rental_repo=rental_repo,
            validator=validator,
            balance_service=balance_service,
            financial_service=financial_service,
            user_status_service=None,
        )

        request = RentalReturnRequest(
            actual_return_date=date(2026, 9, 5),
            accessories_returned_confirmation=True,
            deposit_action="retain",
            deposit_notes="Разбит фильтр объектива",
        )

        with patch("api.services.order.rental_return_service.schedule_after_commit"):
            await service.return_rental(sample_rental.id, request, sample_manager)

        assert sample_rental.deposit_status == DepositStatus.RETAINED_FOR_DAMAGE.value
        assert sample_rental.deposit_retained_amount == Decimal("5000.00")
        assert sample_rental.deposit_refunded_amount == Decimal("0.00")
        assert sample_rental.deposit_notes == "Разбит фильтр объектива"
        assert balance_service.add_transaction.call_count == 0

    @pytest.mark.asyncio
    async def test_partial_retain_does_not_affect_user_balance(
        self, mock_db, sample_rental, sample_manager
    ):
        """Частичное удержание залога (например, 1500 из 5000) оставляет баланс нетронутым."""
        from api.services.order.rental_return_service import RentalReturnService

        balance_service = AsyncMock()
        financial_service = AsyncMock()
        financial_service.get_rental_days = AsyncMock(return_value=4)
        financial_service.calculate_early_return_credit = AsyncMock(return_value=Decimal("0.00"))
        financial_service.calculate_overdue_surcharge = AsyncMock(return_value=Decimal("0.00"))

        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)

        def mock_finalize(r, ret_d, notes, credit, surcharge, has_debt=False, **kwargs):
            r.status = OrderStatus.COMPLETED.value
            r.actual_return_date = ret_d
            if "deposit_status" in kwargs:
                r.deposit_status = kwargs["deposit_status"]
            if "deposit_refunded_amount" in kwargs:
                r.deposit_refunded_amount = kwargs["deposit_refunded_amount"]
            if "deposit_retained_amount" in kwargs:
                r.deposit_retained_amount = kwargs["deposit_retained_amount"]

        rental_repo.finalize_rental_return = MagicMock(side_effect=mock_finalize)

        validator = MagicMock()
        validator.validate_rental_is_returnable = MagicMock()
        validator.validate_return_date = MagicMock()
        validator.validate_accessories_returned = MagicMock()

        service = RentalReturnService(
            db=mock_db,
            rental_repo=rental_repo,
            validator=validator,
            balance_service=balance_service,
            financial_service=financial_service,
            user_status_service=None,
        )

        request = RentalReturnRequest(
            actual_return_date=date(2026, 9, 5),
            accessories_returned_confirmation=True,
            deposit_action="partial_retain",
            deposit_retained_amount=1500.0,
            deposit_notes="Царапина на корпусе",
        )

        with patch("api.services.order.rental_return_service.schedule_after_commit"):
            await service.return_rental(sample_rental.id, request, sample_manager)

        assert sample_rental.deposit_status == DepositStatus.PARTIALLY_RETAINED.value
        assert sample_rental.deposit_retained_amount == Decimal("1500.00")
        assert sample_rental.deposit_refunded_amount == Decimal("3500.00")
        assert balance_service.add_transaction.call_count == 0

    @pytest.mark.asyncio
    async def test_rental_creation_with_deposit_does_not_create_deposit_transaction(
        self, mock_db, sample_user, sample_manager
    ):
        """При создании аренды с залогом 5000 руб. транзакция начисления/списания залога не создается."""
        from api.services.order.rental_creation_service import RentalCreationService
        from shared.schemas.rental_schema import RentalCreateFromScratchRequest
        from shared.constants.balance_operations import BalanceOperationType

        balance_service = AsyncMock()
        financial_service = AsyncMock()
        price_result = MagicMock()
        price_result.final_total = Decimal("6000.00")
        price_result.discount_amount = Decimal("0.00")
        financial_service.calculate_final_price.return_value = price_result

        rental_repo = AsyncMock()
        created_rental = Rental(
            id=101,
            user_id=sample_user.id,
            total_cost=Decimal("6000.00"),
            deposit_amount=Decimal("5000.00"),
            prepayment_amount=Decimal("0.00"),
            status=OrderStatus.ACTIVE.value,
        )
        rental_repo.create_rental_instance.return_value = created_rental
        rental_repo.create_rental_from_scratch.return_value = created_rental
        rental_repo.save_rental.return_value = created_rental
        rental_repo.get_rental_by_id_or_fail.return_value = created_rental

        from datetime import timedelta
        from shared.utils.date_utils import get_business_today
        today = get_business_today()

        user_repo = AsyncMock()
        user_repo.get_user_by_id_or_fail.return_value = sample_user

        equipment_repo = AsyncMock()
        mock_eq = MagicMock()
        mock_eq.id = 1
        equipment_repo.get_equipment_by_ids_or_fail.return_value = [mock_eq]

        validator = MagicMock()
        validator.user_status_service = None
        validator.validate_equipment_availability = AsyncMock()
        validator.validate_issue_on_holiday = AsyncMock()
        validator.validate_date_range = MagicMock()

        service = RentalCreationService(
            db=mock_db,
            rental_repo=rental_repo,
            reservation_repo=AsyncMock(),
            user_repo=user_repo,
            equipment_repo=equipment_repo,
            system_service=AsyncMock(),
            validator=validator,
            balance_service=balance_service,
            financial_service=financial_service,
            promo_code_logic=AsyncMock(),
        )

        request = RentalCreateFromScratchRequest(
            user_id=sample_user.id,
            equipment_ids=[1],
            start_date=today,
            end_date=today + timedelta(days=2),
            deposit_amount=5000.0,
            prepayment_amount=0.0,
        )

        with patch("api.services.order.rental_creation_service.schedule_after_commit"):
            await service.create_rental_from_scratch(request, sample_manager)

        # Проверяем, что в balance_service была передана ТОЛЬКО 1 транзакция - списание стоимости аренды (rental_debit)
        # и НИКАКИХ транзакций по залогу!
        assert balance_service.add_transaction.call_count == 1
        call_kwargs = balance_service.add_transaction.call_args.kwargs
        assert call_kwargs["operation_type"] == BalanceOperationType.RENTAL_DEBIT
        assert call_kwargs["amount"] == -created_rental.total_cost

