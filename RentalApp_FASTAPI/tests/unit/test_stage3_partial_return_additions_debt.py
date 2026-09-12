"""
Unit tests for Stage 3: Granular rental items, Partial return, Add equipment, and Debt lifecycle.
"""

import pytest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import Mock, AsyncMock, patch
from fastapi import HTTPException

from api.models.user import User
from api.models.equipment import Equipment
from api.models.rental import Rental, RentalEquipment, rental_equipment_association
from shared.constants.order_status import OrderStatus
from shared.constants.balance_operations import BalanceOperationType
from shared.schemas.rental_schema import (
    RentalReturnRequest,
    RentalAddItemsRequest,
    RentalOut,
    RentalItemOut,
)
from shared.schemas.user_schema import UserPaymentRequest
from api.services.order.rental_return_service import RentalReturnService
from api.services.order.rental_update_service import RentalUpdateService
from api.services.user_service import UserService


from unittest.mock import Mock, AsyncMock, MagicMock, patch
from datetime import date, datetime, timezone, timedelta

class TestStage3GranularAndPartialReturn:
    """Тесты на детализацию позиций и частичный возврат."""

    @pytest.fixture
    def mock_db(self):
        db = AsyncMock()
        nested = MagicMock()
        nested.__aenter__ = AsyncMock(return_value=None)
        nested.__aexit__ = AsyncMock(return_value=None)
        db.begin_nested = MagicMock(return_value=nested)
        db.get = AsyncMock()
        db.flush = AsyncMock()
        db.execute = AsyncMock()
        return db

    @pytest.fixture
    def mock_manager(self):
        return User(id=99, full_name="Admin Manager", role="manager")

    @pytest.fixture
    def mock_client(self):
        client = User(
            id=10,
            full_name="Client User",
            email="client@example.com",
            role="user",
            is_active=True,
            privacy_policy_accepted=True,
            terms_accepted=True,
            email_verified=True,
            created_at=datetime.now(timezone.utc),
            balance=5000.0,
        )
        return client

    @pytest.fixture
    def mock_equipment(self):
        eq1 = Equipment(id=101, name="Camera A", daily_rate=1000.0)
        eq2 = Equipment(id=102, name="Lens B", daily_rate=500.0)
        return [eq1, eq2]

    @pytest.fixture
    def active_rental(self, mock_client, mock_equipment):
        rental = Rental(
            id=1,
            user_id=mock_client.id,
            created_by_id=99,
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 20),
            status=OrderStatus.ACTIVE.value,
            total_cost=Decimal("15000.00"),
            discount_amount=Decimal("0.00"),
        )
        rental.equipment = list(mock_equipment)
        rental.rental_items = [
            RentalEquipment(rental_id=1, equipment_id=101, status="rented", daily_rate=Decimal("1000.00")),
            RentalEquipment(rental_id=1, equipment_id=102, status="rented", daily_rate=Decimal("500.00")),
        ]
        rental.accessory_links = []
        return rental

    @pytest.mark.asyncio
    async def test_partial_return_credits_unused_days_and_keeps_rental_active(
        self, mock_db, mock_manager, mock_client, active_rental
    ):
        """Частичный возврат одной позиции: возвращается кредит, аренда остается активной."""
        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail.return_value = active_rental
        rental_repo.save_rental = AsyncMock()

        validator = Mock()
        validator.validate_rental_is_returnable = Mock()
        validator.validate_return_date = Mock()

        balance_service = AsyncMock()
        financial_service = AsyncMock()
        # 5 неиспользованных дней
        financial_service.get_rental_days.return_value = 5

        service = RentalReturnService(
            db=mock_db,
            rental_repo=rental_repo,
            validator=validator,
            balance_service=balance_service,
            financial_service=financial_service,
        )

        request = RentalReturnRequest(
            actual_return_date=date(2026, 9, 15),
            accessories_returned_confirmation=True,
            equipment_ids=[101], # возвращаем только Camera A (1000/день)
            notes_on_return="Камера сдана раньше",
        )

        result = await service.return_rental(active_rental.id, request, mock_manager)

        # Проверяем, что аренда осталась ACTIVE
        assert active_rental.status == OrderStatus.ACTIVE.value
        
        # Проверяем статусы позиций
        item101 = next(item for item in active_rental.rental_items if item.equipment_id == 101)
        item102 = next(item for item in active_rental.rental_items if item.equipment_id == 102)
        assert item101.status == "returned"
        assert item101.actual_return_date == date(2026, 9, 15)
        assert item102.status == "rented"

        # Кредит: 5 дней * 1000 = 5000
        balance_service.add_transaction.assert_called_once()
        call_args = balance_service.add_transaction.call_args[1]
        assert call_args["amount"] == Decimal("5000.00")
        assert call_args["operation_type"] == BalanceOperationType.PARTIAL_RETURN_CREDIT

        # Стоимость скорректирована
        assert active_rental.total_cost == Decimal("10000.00")

    @pytest.mark.asyncio
    async def test_full_return_with_negative_balance_sets_completed_with_debt(
        self, mock_db, mock_manager, mock_client, active_rental
    ):
        """Полный возврат при отрицательном балансе клиента переводит аренду в COMPLETED_WITH_DEBT."""
        mock_client.balance = -2500.0
        mock_db.get.return_value = mock_client

        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail.return_value = active_rental
        rental_repo.finalize_rental_return = Mock(
            side_effect=lambda r, ret_d, n, c, s, has_debt=False, **kwargs: setattr(
                r, 'status', OrderStatus.COMPLETED_WITH_DEBT.value if has_debt else OrderStatus.COMPLETED.value
            )
        )

        validator = Mock()
        balance_service = AsyncMock()
        financial_service = AsyncMock()
        financial_service.get_rental_days.return_value = 10
        financial_service.calculate_early_return_credit.return_value = Decimal("0")

        service = RentalReturnService(
            db=mock_db,
            rental_repo=rental_repo,
            validator=validator,
            balance_service=balance_service,
            financial_service=financial_service,
        )

        request = RentalReturnRequest(
            actual_return_date=date(2026, 9, 20),
            accessories_returned_confirmation=True,
            equipment_ids=[101, 102], # полный возврат
        )

        await service.return_rental(active_rental.id, request, mock_manager)

        # Проверяем, что аренда завершена со статусом completed_with_debt
        assert active_rental.status == OrderStatus.COMPLETED_WITH_DEBT.value
        rental_repo.finalize_rental_return.assert_called_once()
        assert rental_repo.finalize_rental_return.call_args[1]["has_debt"] is True

    @pytest.mark.asyncio
    async def test_debt_repayment_promotes_rental_to_completed(
        self, mock_db, mock_manager, mock_client, active_rental
    ):
        """Внесение платежа с rental_id или погашение долга автоматически переводит аренду в completed."""
        active_rental.status = OrderStatus.COMPLETED_WITH_DEBT.value
        mock_client.balance = -1000.0

        user_repo = AsyncMock()
        user_repo.get_by_id.return_value = mock_client

        balance_service = AsyncMock()
        async def mock_add_trans(user_id, amount, operation_type, description, rental_id=None):
            mock_client.balance += amount
        balance_service.add_transaction.side_effect = mock_add_trans

        payment_repo = AsyncMock()
        payment_repo.create_payment = AsyncMock()

        user_service = UserService(
            db=mock_db,
            user_repo=user_repo,
            balance_service=balance_service,
            balance_history_repo=AsyncMock(),
            payment_repo=payment_repo,
        )

        payment_request = UserPaymentRequest(
            amount=2000.0,
            payment_method="card",
            rental_id=active_rental.id,
            description="Оплата задолженности по аренде",
        )

        await user_service.process_user_payment(mock_client.id, payment_request, mock_manager)

        # Баланс стал положительным (+1000)
        assert mock_client.balance == 1000.0
        # Была выполнена операция с типом DEBT_REPAYMENT
        balance_service.add_transaction.assert_called_once()
        call_kwargs = balance_service.add_transaction.call_args[1]
        assert call_kwargs["operation_type"] == BalanceOperationType.DEBT_REPAYMENT
        assert call_kwargs["rental_id"] == active_rental.id
        # Был выполнен SQL update для смены статуса на completed
        assert mock_db.execute.called

    @pytest.mark.asyncio
    async def test_add_equipment_to_active_rental(
        self, mock_db, mock_manager, mock_client, active_rental
    ):
        """Добор техники в активную аренду списывает стоимость на оставшиеся дни и добавляет позицию."""
        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail.return_value = active_rental
        rental_repo.save_rental = AsyncMock()

        new_eq = Equipment(id=103, name="Lighting Kit", daily_rate=800.0)
        mock_db_result = Mock()
        mock_db_result.scalars.return_value.all.return_value = [new_eq]
        mock_db.execute.return_value = mock_db_result

        validator = Mock()
        validator.validate_equipment_availability = AsyncMock()

        balance_service = AsyncMock()
        financial_service = AsyncMock()
        # 3 оставшихся дня
        financial_service.get_rental_days.return_value = 3

        update_service = RentalUpdateService(
            db=mock_db,
            rental_repo=rental_repo,
            system_service=AsyncMock(),
            validator=validator,
            balance_service=balance_service,
            financial_service=financial_service,
            promo_code_logic=AsyncMock(),
        )

        add_request = RentalAddItemsRequest(
            equipment_ids=[103],
            start_date=date(2026, 9, 17),
        )

        await update_service.add_equipment_to_rental(active_rental.id, add_request, mock_manager)

        # 3 дня * 800 = 2400
        balance_service.add_transaction.assert_called_once()
        call_kwargs = balance_service.add_transaction.call_args[1]
        assert call_kwargs["amount"] == Decimal("-2400.00")
        assert call_kwargs["operation_type"] == BalanceOperationType.RENTAL_DEBIT

        # Проверяем, что в rental_items добавилась 3-я позиция
        item_ids = [item.equipment_id for item in active_rental.rental_items]
        assert 103 in item_ids
        assert active_rental.total_cost == Decimal("17400.00")

    @pytest.mark.asyncio
    async def test_readd_previously_returned_equipment_reactivates_item(
        self, mock_db, mock_manager, mock_client, active_rental
    ):
        """Повторный добор ранее возвращенного оборудования реактивирует существующую запись в rental_items."""
        # Оборудование 101 было возвращено
        active_rental.rental_items[0].status = "returned"
        active_rental.rental_items[0].actual_return_date = date(2026, 9, 12)

        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail.return_value = active_rental
        rental_repo.save_rental = AsyncMock()

        mock_db_result = Mock()
        mock_db_result.scalars.return_value.all.return_value = [active_rental.equipment[0]]
        mock_db.execute.return_value = mock_db_result

        validator = Mock()
        validator.validate_equipment_availability = AsyncMock()

        balance_service = AsyncMock()
        financial_service = AsyncMock()
        financial_service.get_rental_days.return_value = 5

        update_service = RentalUpdateService(
            db=mock_db,
            rental_repo=rental_repo,
            system_service=AsyncMock(),
            validator=validator,
            balance_service=balance_service,
            financial_service=financial_service,
            promo_code_logic=AsyncMock(),
        )

        add_request = RentalAddItemsRequest(
            equipment_ids=[101],
            start_date=date(2026, 9, 15),
        )

        await update_service.add_equipment_to_rental(active_rental.id, add_request, mock_manager)

        # Количество rental_items не увеличилось (нет дубликата по PK)
        assert len(active_rental.rental_items) == 2
        # Статус позиции 101 реактивирован на 'rented'
        ri_101 = next(item for item in active_rental.rental_items if item.equipment_id == 101)
        assert ri_101.status == "rented"
        assert ri_101.actual_return_date is None

