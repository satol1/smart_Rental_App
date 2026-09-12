import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

from api.models.rental import Rental, RentalEquipment, RentalAccessory
from api.models.reservation import Reservation, ReservationAccessory
from api.models.equipment import Equipment
from api.models.user import User
from api.services.order.order_validator import OrderValidator
from api.services.order.rental_cancellation_service import RentalCancellationService
from shared.constants.order_status import OrderStatus
from shared.constants.balance_operations import BalanceOperationType
from shared.schemas.rental_schema import RentalRevertRequest
from shared.utils.date_utils import get_business_today, ASTRAKHAN_TZ


@pytest.fixture
def mock_db():
    session = AsyncMock()
    ctx = AsyncMock()
    ctx.__aenter__ = AsyncMock(return_value=None)
    ctx.__aexit__ = AsyncMock(return_value=None)
    session.begin_nested = MagicMock(return_value=ctx)
    return session


@pytest.fixture
def mock_rental_repo():
    repo = AsyncMock()
    return repo


@pytest.fixture
def mock_balance_service():
    service = AsyncMock()
    return service


@pytest.fixture
def mock_system_service():
    service = AsyncMock()
    return service


@pytest.fixture
def mock_promo_code_logic():
    service = AsyncMock()
    return service


@pytest.fixture
def validator():
    return OrderValidator(MagicMock(), MagicMock(), MagicMock(), MagicMock())


@pytest.fixture
def cancellation_service(mock_db, mock_rental_repo, mock_balance_service, mock_system_service, mock_promo_code_logic, validator):
    return RentalCancellationService(
        db=mock_db,
        rental_repo=mock_rental_repo,
        balance_service=mock_balance_service,
        validator=validator,
        system_service=mock_system_service,
        promo_code_logic=mock_promo_code_logic,
    )


def test_revert_without_reservation_id_fails(validator):
    today = get_business_today()
    now_utc = datetime.now(timezone.utc)
    rental = Rental(
        id=1,
        reservation_id=None,
        status="active",
        start_date=today,
        end_date=today + timedelta(days=2),
        created_at=now_utc,
    )
    with pytest.raises(HTTPException) as exc:
        validator.validate_rental_for_revert(rental)
    assert exc.value.status_code == 400
    assert "без резерва" in exc.value.detail


def test_revert_completed_rental_fails(validator):
    today = get_business_today()
    now_utc = datetime.now(timezone.utc)
    rental = Rental(
        id=1,
        reservation_id=10,
        status="completed",
        start_date=today,
        end_date=today + timedelta(days=2),
        created_at=now_utc,
    )
    with pytest.raises(HTTPException) as exc:
        validator.validate_rental_for_revert(rental)
    assert exc.value.status_code == 409
    assert "завершенной или неактивной" in exc.value.detail


def test_revert_rental_with_past_start_date_fails(validator):
    today = get_business_today()
    now_utc = datetime.now(timezone.utc)
    rental = Rental(
        id=1,
        reservation_id=10,
        status="active",
        start_date=today - timedelta(days=1),
        end_date=today + timedelta(days=2),
        created_at=now_utc,
    )
    with pytest.raises(HTTPException) as exc:
        validator.validate_rental_for_revert(rental)
    assert exc.value.status_code == 409
    assert "уже в прошлом" in exc.value.detail


def test_revert_rental_with_partial_return_fails(validator):
    today = get_business_today()
    now_utc = datetime.now(timezone.utc)
    item1 = RentalEquipment(rental_id=1, equipment_id=101, status="returned", actual_return_date=today)
    item2 = RentalEquipment(rental_id=1, equipment_id=102, status="rented", actual_return_date=None)
    rental = Rental(
        id=1,
        reservation_id=10,
        status="active",
        start_date=today,
        end_date=today + timedelta(days=2),
        created_at=now_utc,
    )
    rental.rental_items = [item1, item2]

    with pytest.raises(HTTPException) as exc:
        validator.validate_rental_for_revert(rental)
    assert exc.value.status_code == 409
    assert "были возвраты оборудования" in exc.value.detail


def test_revert_rental_with_added_equipment_mismatch_fails(validator):
    today = get_business_today()
    now_utc = datetime.now(timezone.utc)
    
    eq1 = Equipment(id=101, name="Camera")
    eq2 = Equipment(id=102, name="Lens")
    
    reservation = Reservation(
        id=10,
        start_date=today,
        end_date=today + timedelta(days=2),
        status="fulfilled",
    )
    reservation.equipment = [eq1]
    
    rental = Rental(
        id=1,
        reservation_id=10,
        status="active",
        start_date=today,
        end_date=today + timedelta(days=2),
        created_at=now_utc,
    )
    rental.rental_items = [
        RentalEquipment(rental_id=1, equipment_id=101, status="rented"),
        RentalEquipment(rental_id=1, equipment_id=102, status="rented"),
    ]
    rental.reservation = reservation

    with pytest.raises(HTTPException) as exc:
        validator.validate_rental_for_revert(rental)
    assert exc.value.status_code == 409
    assert "состав оборудования отличается" in exc.value.detail


def test_revert_rental_with_added_accessory_mismatch_fails(validator):
    today = get_business_today()
    now_utc = datetime.now(timezone.utc)
    
    eq1 = Equipment(id=101, name="Camera")
    
    reservation = Reservation(
        id=10,
        start_date=today,
        end_date=today + timedelta(days=2),
        status="fulfilled",
    )
    reservation.equipment = [eq1]
    reservation.accessory_links = []
    
    rental = Rental(
        id=1,
        reservation_id=10,
        status="active",
        start_date=today,
        end_date=today + timedelta(days=2),
        created_at=now_utc,
    )
    rental.rental_items = [
        RentalEquipment(rental_id=1, equipment_id=101, status="rented"),
    ]
    rental.accessory_links = [
        RentalAccessory(rental_id=1, equipment_id=101, accessory_id=201),
    ]
    rental.reservation = reservation

    with pytest.raises(HTTPException) as exc:
        validator.validate_rental_for_revert(rental)
    assert exc.value.status_code == 409
    assert "набор аксессуаров отличается" in exc.value.detail


@pytest.mark.asyncio
async def test_revert_rental_success_creates_financial_transactions(
    cancellation_service, mock_rental_repo, mock_balance_service
):
    today = get_business_today()
    now_utc = datetime.now(timezone.utc)
    
    eq1 = Equipment(id=101, name="Camera")
    reservation = Reservation(
        id=10,
        start_date=today,
        end_date=today + timedelta(days=2),
        status="fulfilled",
    )
    reservation.equipment = [eq1]
    reservation.accessory_links = []
    
    rental = Rental(
        id=1,
        user_id=42,
        reservation_id=10,
        status="active",
        start_date=today,
        end_date=today + timedelta(days=2),
        total_cost=Decimal("5000.00"),
        prepayment_amount=Decimal("1500.00"),
        created_at=now_utc,
    )
    rental.rental_items = [
        RentalEquipment(rental_id=1, equipment_id=101, status="rented"),
    ]
    rental.accessory_links = []
    rental.reservation = reservation
    reservation.rental = rental

    mock_rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=rental)
    
    def fake_revert(r):
        res = r.reservation
        res.status = OrderStatus.ACTIVE
        res.rental = None
        r.reservation = None
        r.reservation_id = None
        return res

    mock_rental_repo.revert_rental_status_to_active = MagicMock(side_effect=fake_revert)
    mock_rental_repo.delete_rental = AsyncMock()

    manager = User(id=99, role="admin")
    request = RentalRevertRequest(refund_prepayment=True)

    await cancellation_service.revert_rental_to_reservation(1, manager, request)

    # 1. Проверяем статус резерва
    assert reservation.status == OrderStatus.ACTIVE
    assert reservation.rental is None

    # 2. Проверяем финансовые проводки
    calls = mock_balance_service.add_transaction.call_args_list
    assert len(calls) == 2

    # RENTAL_REVERT_CREDIT: +5000.00
    credit_call = calls[0].kwargs
    assert credit_call["user_id"] == 42
    assert credit_call["amount"] == Decimal("5000.00")
    assert credit_call["operation_type"] == BalanceOperationType.RENTAL_REVERT_CREDIT

    # PREPAYMENT_REFUND_ON_REVERT: -1500.00
    refund_call = calls[1].kwargs
    assert refund_call["user_id"] == 42
    assert refund_call["amount"] == Decimal("-1500.00")
    assert refund_call["operation_type"] == BalanceOperationType.PREPAYMENT_REFUND_ON_REVERT

    # 3. Проверяем удаление аренды
    mock_rental_repo.delete_rental.assert_called_once_with(rental)


@pytest.mark.asyncio
async def test_scratch_rental_deletion_checks(cancellation_service, mock_rental_repo):
    today = get_business_today()
    now_utc = datetime.now(timezone.utc)
    
    # 1. Scratch rental with past start_date
    rental_past = Rental(
        id=2,
        user_id=42,
        reservation_id=None,
        status="active",
        start_date=today - timedelta(days=2),
        end_date=today + timedelta(days=1),
        created_at=now_utc,
    )
    mock_rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=rental_past)
    with pytest.raises(HTTPException) as exc:
        await cancellation_service.delete_rental_by_admin(2)
    assert exc.value.status_code == 409
    assert "уже в прошлом" in exc.value.detail

    # 2. Scratch rental with returned item
    rental_returned = Rental(
        id=3,
        user_id=42,
        reservation_id=None,
        status="active",
        start_date=today,
        end_date=today + timedelta(days=1),
        created_at=now_utc,
    )
    rental_returned.rental_items = [
        RentalEquipment(rental_id=3, equipment_id=101, status="returned", actual_return_date=today)
    ]
    mock_rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=rental_returned)
    with pytest.raises(HTTPException) as exc:
        await cancellation_service.delete_rental_by_admin(3)
    assert exc.value.status_code == 409
    assert "были возвраты оборудования" in exc.value.detail


@pytest.mark.asyncio
async def test_scratch_rental_deletion_creates_payment_refund(
    cancellation_service, mock_rental_repo, mock_balance_service, mock_db
):
    """При отмене аренды с нуля с предоплатой создается запись возврата в Payment."""
    today = get_business_today()
    now_utc = datetime.now(timezone.utc)

    rental = Rental(
        id=4,
        user_id=42,
        reservation_id=None,
        status="active",
        start_date=today,
        end_date=today + timedelta(days=2),
        total_cost=Decimal("6000.00"),
        prepayment_amount=Decimal("2000.00"),
        created_at=now_utc,
    )
    rental.rental_items = [
        RentalEquipment(rental_id=4, equipment_id=101, status="rented", actual_return_date=None)
    ]
    mock_rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=rental)
    mock_rental_repo.delete_rental = AsyncMock()

    await cancellation_service.delete_rental_by_admin(4)

    # Проверяем возврат аванса в balance_service
    calls = mock_balance_service.add_transaction.call_args_list
    assert len(calls) == 2
    refund_call = calls[1].kwargs
    assert refund_call["amount"] == Decimal("-2000.00")
    assert refund_call["operation_type"] == BalanceOperationType.PREPAYMENT_REFUND_ON_REVERT

    # Проверяем добавление отрицательного Payment(transaction_type='refund')
    from api.models.payment import Payment
    payment_adds = [
        call.args[0] for call in mock_db.add.call_args_list if isinstance(call.args[0], Payment)
    ]
    assert len(payment_adds) == 1
    assert payment_adds[0].amount == Decimal("-2000.00")
    assert payment_adds[0].transaction_type == "refund"

