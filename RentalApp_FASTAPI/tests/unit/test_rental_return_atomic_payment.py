import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from api.models.user import User
from api.models.rental import Rental, RentalEquipment
from api.models.payment import Payment
from shared.constants.order_status import OrderStatus
from shared.constants.balance_operations import BalanceOperationType
from shared.schemas.rental_schema import RentalReturnRequest
from api.services.order.rental_return_service import RentalReturnService


class TestRentalReturnAtomicPayment:
    """
    Верификация атомарного проведения платежей при возврате аренды:
    - Платеж обрабатывается до проверки has_debt в единой транзакции возврата.
    - При полном погашении задолженности аренда завершается со статусом COMPLETED.
    - При частичном погашении задолженности аренда завершается со статусом COMPLETED_WITH_DEBT.
    - Создаются соответствующие записи в BalanceHistory (через balance_service) и Payment.
    """

    @pytest.fixture
    def mock_db(self):
        db = AsyncMock()
        db.begin_nested = MagicMock()
        db.add = MagicMock()
        db.flush = AsyncMock()
        db.commit = AsyncMock()
        return db

    @pytest.fixture
    def sample_manager(self):
        return User(
            id=1,
            full_name="Тестовый Менеджер",
            email="manager@example.com",
            role="manager",
        )

    @pytest.fixture
    def user_with_debt(self):
        return User(
            id=10,
            full_name="Клиент с Долгом",
            email="client@example.com",
            balance=Decimal("-500.00"),
        )

    @pytest.fixture
    def sample_rental(self, user_with_debt):
        rental = Rental(
            id=505,
            user_id=user_with_debt.id,
            total_cost=Decimal("2000.00"),
            deposit_amount=Decimal("3000.00"),
            prepayment_amount=Decimal("1500.00"),
            start_date=date(2026, 9, 1),
            end_date=date(2026, 9, 5),
            status=OrderStatus.ACTIVE.value,
        )
        rental.user = user_with_debt
        rental.equipment = []
        rental.rental_items = [
            RentalEquipment(rental_id=505, equipment_id=1, status="rented")
        ]
        rental.accessory_links = []
        return rental

    @pytest.mark.asyncio
    async def test_atomic_return_full_debt_payoff(
        self, mock_db, sample_rental, sample_manager
    ):
        """Полное погашение долга в момент возврата переводит аренду в COMPLETED."""
        balance_service = AsyncMock()

        # Эмулируем работу balance_service: при зачислении 500 balance становится 0
        async def mock_add_transaction(user_id, amount, operation_type, description, rental_id=None):
            sample_rental.user.balance += amount
            return MagicMock()

        balance_service.add_transaction = AsyncMock(side_effect=mock_add_transaction)

        financial_service = AsyncMock()
        financial_service.get_rental_days = AsyncMock(return_value=4)
        financial_service.calculate_early_return_credit = AsyncMock(return_value=Decimal("0.00"))
        financial_service.calculate_overdue_surcharge = AsyncMock(return_value=Decimal("0.00"))

        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)

        def mock_finalize(r, ret_d, notes, credit, surcharge, has_debt=False, **kwargs):
            r.status = OrderStatus.COMPLETED_WITH_DEBT.value if has_debt else OrderStatus.COMPLETED.value
            r.actual_return_date = ret_d

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
            payment_amount=Decimal("500.00"),
            payment_method="cash",
            payment_description="Погашение долга при возврате",
        )

        with patch("api.services.order.rental_return_service.schedule_after_commit"):
            await service.return_rental(sample_rental.id, request, sample_manager)

        # 1. Аренда завершена БЕЗ долга (COMPLETED)
        assert sample_rental.status == OrderStatus.COMPLETED.value

        # 2. Транзакция баланса создана с типом DEBT_REPAYMENT
        balance_service.add_transaction.assert_called_once_with(
            user_id=sample_rental.user_id,
            amount=Decimal("500.00"),
            operation_type=BalanceOperationType.DEBT_REPAYMENT,
            description="Погашение долга при возврате",
            rental_id=sample_rental.id,
        )

        # 3. Платеж зафиксирован в db.add
        added_payments = [
            call.args[0]
            for call in mock_db.add.call_args_list
            if isinstance(call.args[0], Payment)
        ]
        assert len(added_payments) == 1
        payment = added_payments[0]
        assert payment.amount == Decimal("500.00")
        assert payment.payment_method == "cash"
        assert payment.transaction_type == "debt_repayment"
        assert payment.rental_id == sample_rental.id
        assert payment.user_id == sample_rental.user_id

    @pytest.mark.asyncio
    async def test_atomic_return_partial_debt_payoff(
        self, mock_db, sample_rental, sample_manager
    ):
        """Частичное погашение долга в момент возврата оставляет статус COMPLETED_WITH_DEBT."""
        # Исходный долг 500, вносим 200 -> остается долг 300
        balance_service = AsyncMock()

        async def mock_add_transaction(user_id, amount, operation_type, description, rental_id=None):
            sample_rental.user.balance += amount
            return MagicMock()

        balance_service.add_transaction = AsyncMock(side_effect=mock_add_transaction)

        financial_service = AsyncMock()
        financial_service.get_rental_days = AsyncMock(return_value=4)
        financial_service.calculate_early_return_credit = AsyncMock(return_value=Decimal("0.00"))
        financial_service.calculate_overdue_surcharge = AsyncMock(return_value=Decimal("0.00"))

        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)

        def mock_finalize(r, ret_d, notes, credit, surcharge, has_debt=False, **kwargs):
            r.status = OrderStatus.COMPLETED_WITH_DEBT.value if has_debt else OrderStatus.COMPLETED.value
            r.actual_return_date = ret_d

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
            payment_amount=Decimal("200.00"),
            payment_method="card",
        )

        with patch("api.services.order.rental_return_service.schedule_after_commit"):
            await service.return_rental(sample_rental.id, request, sample_manager)

        # 1. Аренда завершена С долгом (COMPLETED_WITH_DEBT)
        assert sample_rental.status == OrderStatus.COMPLETED_WITH_DEBT.value
        assert sample_rental.user.balance == Decimal("-300.00")

        # 2. Платеж зафиксирован
        added_payments = [
            call.args[0]
            for call in mock_db.add.call_args_list
            if isinstance(call.args[0], Payment)
        ]
        assert len(added_payments) == 1
        assert added_payments[0].amount == Decimal("200.00")
        assert added_payments[0].payment_method == "card"
