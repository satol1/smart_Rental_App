# tests/services/test_balance_money_chains.py
"""
Регрессионные тесты денежных цепочек на реальной БД (in-memory SQLite), без моков.

Моки не видят семантику ORM (flush/refresh/identity map), поэтому инцидент
12.09.2026 («пополнение создало запись в истории, но баланс не изменился»)
прошёл сквозь mock-тесты: refresh() до flush сбрасывал грязный атрибут balance,
и UPDATE баланса терялся при коммите, пока строка истории оставалась.

Инвариант всех цепочек: users.balance == SUM(balance_history.amount).
"""

import pytest
from decimal import Decimal

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from api.database_models import Base
from api.models.balance_history import BalanceHistory
from api.models.user import User
from api.repositories.balance_history_repository import BalanceHistoryRepository
from api.repositories.user_repository import UserRepository
from api.services.balance_service import BalanceService
from api.services.order.payment_repository import PaymentRepository
from api.services.user_service import UserService
from shared.constants.balance_operations import BalanceOperationType
from shared.schemas.user_schema import UserPaymentRequest


@pytest.fixture
async def db_session():
    """Реальная in-memory БД со всей схемой моделей."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        yield session
    await engine.dispose()


@pytest.fixture
async def user(db_session) -> User:
    user = User(
        email="money-chains@example.com",
        hashed_password="x",
        full_name="Money Chains",
        role="client",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    return user


@pytest.fixture
def user_service(db_session) -> UserService:
    user_repo = UserRepository(db_session)
    balance_service = BalanceService(db_session, user_repo)
    return UserService(
        db_session,
        user_repo,
        balance_service,
        BalanceHistoryRepository(db_session),
        PaymentRepository(db_session),
    )


@pytest.fixture
def manager() -> User:
    manager = User()
    manager.full_name = "Manager Manager"
    return manager


async def _db_balance(db_session, user_id: int) -> Decimal:
    """Баланс так, как его видит БД после коммита.

    Колоночный select не трогает identity map и всегда читает свежее значение
    из БД (expire_all не нужен: он протухает и у объектов теста, и lazy-load
    в синхронном контексте дал бы MissingGreenlet).
    """
    result = await db_session.execute(select(User.balance).where(User.id == user_id))
    return Decimal(str(result.scalar_one()))


async def _history_sum(db_session, user_id: int) -> Decimal:
    result = await db_session.execute(
        select(func.coalesce(func.sum(BalanceHistory.amount), 0)).where(
            BalanceHistory.user_id == user_id
        )
    )
    return Decimal(str(result.scalar_one()))


@pytest.mark.asyncio
async def test_top_up_updates_balance_and_history(db_session, user_service, user, manager):
    """Инцидент 12.09.2026: пополнение баланса обязано менять users.balance.

    Раньше refresh() после add_transaction перечитывал объект из БД до flush и
    сбрасывал непрос flushed-UPDATE баланса: история росла, баланс — нет.
    """
    request = UserPaymentRequest(amount=73070.0, payment_method="cash", description="repro")
    out = await user_service.process_user_payment(user.id, request, manager)
    await db_session.commit()

    # Ответ эндпоинта показывает новый баланс, а не закэшированный старый
    assert out.balance == pytest.approx(73070.0)
    assert await _db_balance(db_session, user.id) == Decimal("73070.00")
    assert await _history_sum(db_session, user.id) == Decimal("73070.00")


@pytest.mark.asyncio
async def test_adjust_balance_credit_and_debit(db_session, user_service, user, manager):
    """Ручная корректировка (бонус/штраф) меняет баланс на величину операции."""
    await user_service.adjust_user_balance(user.id, 500.0, "бонус", manager)
    await user_service.adjust_user_balance(user.id, -600.0, "штраф", manager)
    await db_session.commit()

    assert await _db_balance(db_session, user.id) == Decimal("-100.00")
    assert await _db_balance(db_session, user.id) == await _history_sum(db_session, user.id)


@pytest.mark.asyncio
async def test_delete_history_entry_recalculates_balance(db_session, user_service, user):
    """Удаление записи истории админом пересчитывает баланс по оставшейся сумме."""
    await user_service.adjust_user_balance(user.id, 300.0, "начисление", manager_user())
    await db_session.commit()

    entry_id = (
        await db_session.execute(
            select(BalanceHistory.id).where(BalanceHistory.user_id == user.id)
        )
    ).scalar_one()

    await user_service.delete_balance_history_entry(entry_id)
    await db_session.commit()

    assert await _db_balance(db_session, user.id) == Decimal("0.00")
    assert await _history_sum(db_session, user.id) == Decimal("0")


@pytest.mark.asyncio
async def test_full_money_chain_keeps_balance_equal_to_history(db_session, user_service, user, manager):
    """Полная цепочка: аванс → списание → штраф → кредит → возврат при отмене.

    После каждого шага баланс в БД равен сумме истории (инвариант денег).
    """
    balance_service = user_service.balance_service
    steps = [
        (Decimal("10000.00"), BalanceOperationType.PREPAYMENT),
        (Decimal("-78400.00"), BalanceOperationType.RENTAL_DEBIT),
        (Decimal("-600.00"), BalanceOperationType.OVERDUE_SURCHARGE_DEBIT),
        (Decimal("600.00"), BalanceOperationType.EARLY_RETURN_CREDIT),
        (Decimal("78400.00"), BalanceOperationType.RENTAL_REVERT_CREDIT),
        (Decimal("-10000.00"), BalanceOperationType.PREPAYMENT_REFUND_ON_REVERT),
    ]
    expected = Decimal("0")
    for amount, operation_type in steps:
        async with db_session.begin_nested():
            await balance_service.add_transaction(
                user_id=user.id,
                amount=amount,
                operation_type=operation_type,
                description=f"step {operation_type.value}",
            )
        await db_session.commit()
        expected += amount
        assert await _db_balance(db_session, user.id) == expected
        assert await _history_sum(db_session, user.id) == expected

    # Итог цепочки: всё компенсировано, баланс ноль
    assert expected == Decimal("0")


@pytest.mark.asyncio
async def test_top_up_after_debt_brings_balance_to_expected(db_session, user_service, user, manager):
    """Сценарий из тикета: долг по аренде затем пополнение наличными.

    Баланс после пополнения = долг + сумма пополнения (а не «остался долг»).
    """
    await user_service.adjust_user_balance(user.id, -73070.0, "долг по аренде", manager)
    await db_session.commit()
    assert await _db_balance(db_session, user.id) == Decimal("-73070.00")

    request = UserPaymentRequest(amount=73070.0, payment_method="cash", description="погашение")
    await user_service.process_user_payment(user.id, request, manager)
    await db_session.commit()

    assert await _db_balance(db_session, user.id) == Decimal("0.00")
    assert await _history_sum(db_session, user.id) == Decimal("0.00")


def manager_user() -> User:
    manager = User()
    manager.full_name = "Manager Manager"
    return manager
