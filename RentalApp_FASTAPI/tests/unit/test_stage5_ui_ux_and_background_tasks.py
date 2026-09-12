# tests/unit/test_stage5_ui_ux_and_background_tasks.py

import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, Mock, patch

from api.models.user import User
from api.models.rental import Rental, RentalEquipment, RentalAccessory
from api.models.equipment import Equipment
from api.models.accessory import Accessory
from api.services.order.rental_return_service import RentalReturnService
from api.repositories.rental_command_repository import RentalCommandRepository
from shared.constants.order_status import OrderStatus
from shared.schemas.rental_schema import RentalReturnRequest


@pytest.fixture
def mock_db():
    db = AsyncMock()
    nested = Mock()
    nested.__aenter__ = AsyncMock(return_value=None)
    nested.__aexit__ = AsyncMock(return_value=None)
    db.begin_nested = Mock(return_value=nested)
    db.get = AsyncMock()
    db.flush = AsyncMock()
    return db


@pytest.fixture
def mock_manager():
    manager = Mock(spec=User)
    manager.id = 99
    manager.role = "admin"
    return manager


@pytest.fixture
def mock_client():
    return User(
        id=15,
        email="client@test.com",
        full_name="Test Client",
        role="user",
        balance=Decimal("500.00"),
    )


@pytest.fixture
def active_rental():
    rental = Rental(
        id=301,
        user_id=15,
        created_by_id=99,
        start_date=date(2026, 9, 10),
        end_date=date(2026, 9, 15),
        status="active",
        total_cost=Decimal("10000.00"),
        discount_amount=Decimal("0.00"),
        prepayment_amount=Decimal("5000.00"),
        deposit_amount=Decimal("3000.00"),
        deposit_status="held",
    )
    eq = Equipment(id=1, name="Sony FX3", daily_rate=2000.0)
    acc = Accessory(id=10, name="Аккумулятор NP-FZ100", price=800.0)
    rental.equipment = [eq]
    rental.rental_items = [
        RentalEquipment(
            rental_id=301,
            equipment_id=1,
            status="rented",
            daily_rate=2000.0
        )
    ]
    rental.accessory_links = [
        RentalAccessory(
            rental_id=301,
            equipment_id=1,
            accessory_id=10,
        )
    ]
    return rental


class TestStage5LostAccessoriesReturn:
    """Тесты обработки утери аксессуаров и задолженностей при возврате."""

    @pytest.mark.asyncio
    async def test_full_return_with_lost_accessories_adds_surcharge_and_debt(
        self, mock_db, mock_manager, mock_client, active_rental
    ):
        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=active_rental)
        rental_repo.save_rental = AsyncMock()

        command_repo = RentalCommandRepository(mock_db)
        rental_repo.finalize_rental_return = command_repo.finalize_rental_return

        validator = Mock()
        validator.validate_rental_is_returnable = Mock()
        validator.validate_return_date = Mock()
        validator.validate_accessories_returned = Mock()

        financial_service = AsyncMock()
        financial_service.calculate_overdue_surcharge = AsyncMock(return_value=Decimal("0"))
        financial_service.calculate_early_return_credit = AsyncMock(return_value=Decimal("0"))
        financial_service.get_rental_days = AsyncMock(return_value=5)

        balance_service = AsyncMock()
        balance_service.add_transaction = AsyncMock()

        # Клиент с задолженностью на балансе
        mock_client.balance = -1200.0
        mock_db.get.return_value = mock_client
        active_rental.user = mock_client

        service = RentalReturnService(
            db=mock_db,
            rental_repo=rental_repo,
            validator=validator,
            balance_service=balance_service,
            financial_service=financial_service,
        )

        request = RentalReturnRequest(
            actual_return_date=date(2026, 9, 15),
            notes_on_return="Сдано с опозданием",
            accessories_returned_confirmation=True,
            equipment_ids=[1],
            lost_accessory_ids=[10],
            lost_accessories_cost=800.0,
            deposit_action="refund"
        )

        result = await service.return_rental(active_rental.id, request, mock_manager)

        # Проверяем, что стоимость утери включена в final_cost (10000 + 800)
        assert active_rental.final_cost == Decimal("10800.00")
        # Проверяем статус: закрыта с долгом, так как balance < 0
        assert active_rental.status == OrderStatus.COMPLETED_WITH_DEBT.value
        # Проверяем, что в заметках есть информация об утере
        assert "Утерянные аксессуары" in active_rental.notes_on_return
        # Проверяем балансовую транзакцию за утерю (surcharge_amount)
        balance_service.add_transaction.assert_called_once()
        assert balance_service.add_transaction.call_args[1]["amount"] == -Decimal("800.00")

    @pytest.mark.asyncio
    async def test_partial_return_with_lost_accessories_debits_user_balance(
        self, mock_db, mock_manager, mock_client
    ):
        rental = Rental(
            id=302,
            user_id=15,
            created_by_id=99,
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 20),
            status="active",
            total_cost=Decimal("20000.00"),
            discount_amount=Decimal("0.00"),
            prepayment_amount=Decimal("10000.00"),
            deposit_amount=Decimal("5000.00"),
        )
        eq1 = Equipment(id=1, name="Sony FX3", daily_rate=1500.0)
        eq2 = Equipment(id=2, name="Sony 24-70 GM", daily_rate=500.0)
        rental.equipment = [eq1, eq2]
        item1 = RentalEquipment(rental_id=302, equipment_id=1, status="rented", daily_rate=1500.0)
        item2 = RentalEquipment(rental_id=302, equipment_id=2, status="rented", daily_rate=500.0)
        rental.rental_items = [item1, item2]

        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=rental)
        rental_repo.save_rental = AsyncMock()

        validator = Mock()
        validator.validate_rental_is_returnable = Mock()
        validator.validate_return_date = Mock()

        financial_service = AsyncMock()
        financial_service.get_rental_days = AsyncMock(return_value=5)

        balance_service = AsyncMock()
        balance_service.add_transaction = AsyncMock()

        service = RentalReturnService(
            db=mock_db,
            rental_repo=rental_repo,
            validator=validator,
            balance_service=balance_service,
            financial_service=financial_service,
        )

        # Возвращаем только позицию 1, и при этом утерян аксессуар на 500 рублей
        request = RentalReturnRequest(
            actual_return_date=date(2026, 9, 15),
            notes_on_return="Частичный возврат",
            accessories_returned_confirmation=True,
            equipment_ids=[1],
            lost_accessory_ids=[20],
            lost_accessories_cost=500.0,
        )

        await service.return_rental(rental.id, request, mock_manager)

        # Позиция 1 возвращена, позиция 2 остается в аренде
        assert item1.status == "returned"
        assert item2.status == "rented"
        assert rental.status == "active"

        # За утерю создана транзакция списания
        calls = balance_service.add_transaction.call_args_list
        debit_calls = [c for c in calls if c[1]["amount"] == -Decimal("500.00")]
        assert len(debit_calls) == 1
        assert "Утерянные аксессуары" in rental.notes_on_return


class TestStage5BackgroundScheduler:
    """Тесты фонового планировщика и раннера OverdueChecker."""

    @pytest.mark.asyncio
    async def test_run_overdue_check_once_with_provided_session(self, mock_db):
        from api.services.background_runner import run_overdue_check_once

        with patch("api.services.background_runner.create_overdue_checker") as mock_create:
            instance = Mock()
            instance.check_and_block_users_with_overdue_reservations = AsyncMock(return_value=[42, 99])
            mock_create.return_value = instance

            result = await run_overdue_check_once(db_session=mock_db)

            assert result["status"] == "success"
            assert result["blocked_user_ids"] == [42, 99]
            assert result["blocked_count"] == 2
            mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_background_scheduler_lifecycle(self):
        import asyncio
        from api.services.background_runner import BackgroundScheduler

        scheduler = BackgroundScheduler()
        assert not scheduler.is_running

        with patch("config.core.settings.ENABLE_BACKGROUND_SCHEDULER", True), \
             patch("config.core.settings.OVERDUE_CHECK_INTERVAL_SECONDS", 1), \
             patch("api.services.background_runner.run_overdue_check_once", new_callable=AsyncMock) as mock_run:
            
            mock_run.return_value = {"status": "success", "blocked_count": 0}

            await scheduler.start()
            assert scheduler.is_running
            assert scheduler._task is not None

            # Даем циклу инициализироваться
            await asyncio.sleep(0.1)

            await scheduler.stop()
            assert not scheduler.is_running
            assert scheduler._task is None

    @pytest.mark.asyncio
    async def test_background_scheduler_disabled_by_settings(self):
        from api.services.background_runner import BackgroundScheduler

        scheduler = BackgroundScheduler()

        with patch("config.core.settings.ENABLE_BACKGROUND_SCHEDULER", False):
            await scheduler.start()
            assert not scheduler.is_running
            assert scheduler._task is None

    def test_create_overdue_checker_constructs_all_dependencies_correctly(self, mock_db):
        from api.services.background_runner import create_overdue_checker
        from api.services.user.overdue_checker_service import OverdueCheckerService

        checker = create_overdue_checker(mock_db)
        assert isinstance(checker, OverdueCheckerService)
        assert checker.db is mock_db
        assert checker.user_repo is not None
        assert checker.reservation_repo is not None
        assert checker.user_status_service is not None

    @pytest.mark.asyncio
    async def test_admin_tasks_endpoints(self, mock_manager):
        from api.admin_tasks_api import trigger_overdue_checker, get_scheduler_status

        with patch("api.admin_tasks_api.run_overdue_check_once", new_callable=AsyncMock) as mock_run:
            mock_run.return_value = {"status": "success", "blocked_user_ids": [10], "blocked_count": 1}

            res = await trigger_overdue_checker(current_user=mock_manager)
            assert res["status"] == "success"
            assert res["blocked_count"] == 1

        status_res = await get_scheduler_status(current_user=mock_manager)
        assert "is_running" in status_res


