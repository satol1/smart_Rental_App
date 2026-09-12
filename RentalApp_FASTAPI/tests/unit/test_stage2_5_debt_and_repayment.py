import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime

from api.services.user_service import UserService
from api.repositories.rental_command_repository import RentalCommandRepository
from api.models.user import User
from api.models.rental import Rental
from api.models.balance_history import BalanceHistory
from shared.schemas.user_schema import UserPaymentRequest
from shared.constants.order_status import OrderStatus
from shared.constants.balance_operations import BalanceOperationType


@pytest.fixture
def mock_db():
    db = AsyncMock()
    mock_context = AsyncMock()
    mock_context.__aenter__ = AsyncMock(return_value=db)
    mock_context.__aexit__ = AsyncMock(return_value=None)
    db.begin_nested = MagicMock(return_value=mock_context)
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest.fixture
def test_user():
    user = User()
    user.id = 10
    user.full_name = "Debtor User"
    user.email = "debtor@example.com"
    user.phone = "+1234567890"
    user.telegram_username = "debtoruser"
    user.role = "user"
    user.balance = Decimal("-1500.00")
    user.is_active = True
    user.status = "Активный"
    user.privacy_policy_accepted = True
    user.terms_accepted = True
    user.email_verified = True
    user.created_at = datetime.now()
    user.updated_at = datetime.now()
    return user


@pytest.fixture
def manager_user():
    manager = User()
    manager.id = 1
    manager.full_name = "Admin Manager"
    manager.email = "admin@example.com"
    manager.phone = "+1234567891"
    manager.role = "manager"
    manager.is_active = True
    manager.status = "Активный"
    manager.privacy_policy_accepted = True
    manager.terms_accepted = True
    manager.email_verified = True
    manager.created_at = datetime.now()
    manager.updated_at = datetime.now()
    return manager


@pytest.fixture
def user_service(mock_db):
    user_repo = AsyncMock()
    balance_service = AsyncMock()
    balance_history_repo = AsyncMock()
    payment_repo = AsyncMock()
    order_validator = MagicMock()

    return UserService(
        db=mock_db,
        user_repo=user_repo,
        balance_service=balance_service,
        balance_history_repo=balance_history_repo,
        payment_repo=payment_repo,
        order_validator=order_validator,
    )


@pytest.mark.asyncio
async def test_payment_with_specific_rental_id_resolves_debt(user_service, mock_db, test_user, manager_user):
    """Пополнение с указанием rental_id гасит долг по этой аренде, даже если баланс все еще < 0."""
    user_service.user_repo.get_by_id.return_value = test_user
    # Допустим, платеж на 500 руб при долге 1500 -> баланс стал -1000
    test_user.balance = Decimal("-1000.00")

    payment_req = UserPaymentRequest(
        amount=500.0,
        payment_method="cash",
        description="Оплата долга по аренде #42",
        rental_id=42,
    )

    await user_service.process_user_payment(
        user_id=10,
        payment_data=payment_req,
        manager=manager_user,
    )

    # Проверяем, что db.execute был вызван с UPDATE запросом для конкретной аренды
    assert mock_db.execute.call_count == 1
    call_args = mock_db.execute.call_args[0][0]
    assert "UPDATE rentals SET" in str(call_args)
    params = call_args.compile().params
    assert params["status"] == OrderStatus.COMPLETED.value


@pytest.mark.asyncio
async def test_payment_bringing_balance_positive_resolves_all_debts(user_service, mock_db, test_user, manager_user):
    """Пополнение без rental_id, выводящее баланс в >= 0, переводит все аренды с долгом в completed."""
    user_service.user_repo.get_by_id.return_value = test_user
    # Платеж на 2000 руб при долге 1500 -> баланс стал +500
    test_user.balance = Decimal("500.00")

    payment_req = UserPaymentRequest(
        amount=2000.0,
        payment_method="card",
        description="Полное погашение",
        rental_id=None,
    )

    await user_service.process_user_payment(
        user_id=10,
        payment_data=payment_req,
        manager=manager_user,
    )

    # Проверяем вызов обновления для всех долгов пользователя
    assert mock_db.execute.call_count == 1
    call_args = mock_db.execute.call_args[0][0]
    assert "UPDATE rentals SET" in str(call_args)
    params = call_args.compile().params
    assert params["status"] == OrderStatus.COMPLETED.value


@pytest.mark.asyncio
async def test_partial_payment_with_negative_balance_leaves_debts(user_service, mock_db, test_user, manager_user):
    """Частичное пополнение без rental_id при сохранении баланса < 0 НЕ снимает статус долга."""
    user_service.user_repo.get_by_id.return_value = test_user
    # Платеж на 300 руб при долге 1500 -> баланс остался -1200
    test_user.balance = Decimal("-1200.00")

    payment_req = UserPaymentRequest(
        amount=300.0,
        payment_method="cash",
        description="Частичный платеж",
        rental_id=None,
    )

    await user_service.process_user_payment(
        user_id=10,
        payment_data=payment_req,
        manager=manager_user,
    )

    # db.execute не должен вызываться для update rentals
    assert mock_db.execute.call_count == 0


@pytest.mark.asyncio
async def test_balance_adjustment_positive_resolves_debts(user_service, mock_db, test_user, manager_user):
    """Ручная корректировка баланса администратором, выводящая баланс >= 0, переводит долги в completed."""
    user_service.user_repo.get_user_by_id_or_fail.return_value = test_user
    # Корректировка выводит баланс в 0
    test_user.balance = Decimal("0.00")

    await user_service.adjust_user_balance(
        user_id=10,
        amount=1500.0,
        description="Списание задолженности по соглашению",
        current_user=manager_user,
    )

    assert mock_db.execute.call_count == 1
    call_args = mock_db.execute.call_args[0][0]
    assert "UPDATE rentals SET" in str(call_args)
    params = call_args.compile().params
    assert params["status"] == OrderStatus.COMPLETED.value


@pytest.mark.asyncio
async def test_delete_balance_history_resolving_balance_resolves_debts(user_service, mock_db, test_user):
    """Удаление ошибочного списания, восстанавливающее баланс до >= 0, переводит долги в completed."""
    user_service.user_repo.get_by_id.return_value = test_user
    
    # Мокируем удаление записи истории: возврат баланса в 100 руб
    user_service.balance_history_repo.get_user_balance_sum.return_value = Decimal("100.00")
    dummy_entry = BalanceHistory(id=99, user_id=10, amount=Decimal("-1600.00"))
    user_service.balance_history_repo.get_by_id.return_value = dummy_entry
    user_service.balance_history_repo.delete.return_value = None

    await user_service.delete_balance_history_entry(
        history_id=99,
    )

    assert mock_db.execute.call_count == 1
    call_args = mock_db.execute.call_args[0][0]
    assert "UPDATE rentals SET" in str(call_args)
    params = call_args.compile().params
    assert params["status"] == OrderStatus.COMPLETED.value


def test_rental_command_repo_return_with_debt():
    """RentalCommandRepository.finalize_rental_return выставляет completed_with_debt при has_debt=True."""
    repo = RentalCommandRepository(AsyncMock())
    rental = Rental()
    rental.id = 55
    rental.status = OrderStatus.ACTIVE.value
    rental.total_cost = Decimal("1000.00")

    repo.finalize_rental_return(
        rental=rental,
        return_date=datetime(2026, 9, 13, 12, 0),
        notes="Возврат с долгом",
        credit=0.0,
        surcharge=500.0,
        has_debt=True,
    )

    assert rental.status == OrderStatus.COMPLETED_WITH_DEBT.value
    assert rental.final_cost == Decimal("1500.00")


def test_rental_command_repo_return_without_debt():
    """RentalCommandRepository.finalize_rental_return выставляет completed при has_debt=False."""
    repo = RentalCommandRepository(AsyncMock())
    rental = Rental()
    rental.id = 56
    rental.status = OrderStatus.ACTIVE.value
    rental.total_cost = Decimal("1000.00")

    repo.finalize_rental_return(
        rental=rental,
        return_date=datetime(2026, 9, 13, 12, 0),
        notes="Обычный возврат",
        credit=0.0,
        surcharge=0.0,
        has_debt=False,
    )

    assert rental.status == OrderStatus.COMPLETED.value
    assert rental.final_cost == Decimal("1000.00")
