# tests/unit/test_stage2_1_conversion_and_timezone.py
"""
Тесты для Этапа 2.1:
- Конвертация Резерв -> Аренда:
  * Без явных дат (старт = get_business_today(), конец = reservation.end_date)
  * С сохранением контрактных дат при досрочной выдаче (start_date, end_date)
  * С пересчетом при изменении интервала
  * Запрет end_date < start_date
  * Запрет end_date < get_business_today()
  * Валидация выдачи в праздничный день (force_issue_on_holiday)
  * Валидация пересечения доступности оборудования для [new_start_date, new_end_date]
- Timezone Drift:
  * Проверка Europe/Astrakhan (UTC+4) в ночные часы (00:00 - 04:00 по местному)
"""

import pytest
from datetime import date, datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from shared.utils.date_utils import (
    ASTRAKHAN_TZ,
    get_business_today,
    get_business_now,
    to_business_date,
)
from shared.constants.order_status import OrderStatus
from shared.schemas.rental_schema import RentalCreateFromReservationRequest
from api.models.reservation import Reservation
from api.models.rental import Rental
from api.models.user import User
from api.models.equipment import Equipment
from api.services.order.rental_creation_service import RentalCreationService
from api.services.order.order_validator import OrderValidator


@pytest.fixture
def mock_db():
    session = AsyncMock()
    nested_cm = MagicMock()
    nested_cm.__aenter__ = AsyncMock(return_value=session)
    nested_cm.__aexit__ = AsyncMock(return_value=None)
    session.begin_nested = MagicMock(return_value=nested_cm)
    return session


@pytest.fixture
def mock_repos():
    rental_repo = AsyncMock()
    reservation_repo = AsyncMock()
    user_repo = AsyncMock()
    equipment_repo = AsyncMock()
    system_service = AsyncMock()
    validator = MagicMock(spec=OrderValidator)
    validator.user_status_service = None
    validator.validate_reservation_for_conversion = MagicMock()
    validator.validate_issue_on_holiday = AsyncMock()
    validator.validate_equipment_availability = AsyncMock()
    balance_service = AsyncMock()
    financial_service = AsyncMock()
    promo_code_logic = AsyncMock()

    return {
        "rental_repo": rental_repo,
        "reservation_repo": reservation_repo,
        "user_repo": user_repo,
        "equipment_repo": equipment_repo,
        "system_service": system_service,
        "validator": validator,
        "balance_service": balance_service,
        "financial_service": financial_service,
        "promo_code_logic": promo_code_logic,
    }


@pytest.fixture
def rental_creation_service(mock_db, mock_repos):
    return RentalCreationService(
        db=mock_db,
        rental_repo=mock_repos["rental_repo"],
        reservation_repo=mock_repos["reservation_repo"],
        user_repo=mock_repos["user_repo"],
        equipment_repo=mock_repos["equipment_repo"],
        system_service=mock_repos["system_service"],
        validator=mock_repos["validator"],
        balance_service=mock_repos["balance_service"],
        financial_service=mock_repos["financial_service"],
        promo_code_logic=mock_repos["promo_code_logic"],
    )


def test_timezone_drift_around_midnight():
    """Тест проверки даты при переходе полночи между UTC и Астраханью (UTC+4)."""
    # 2026-09-12 21:30:00 UTC -> 2026-09-13 01:30:00 в Астрахани
    utc_dt = datetime(2026, 9, 12, 21, 30, tzinfo=timezone.utc)
    business_date = to_business_date(utc_dt)
    assert business_date == date(2026, 9, 13)

    # 2026-09-12 19:59:59 UTC -> 2026-09-12 23:59:59 в Астрахани
    utc_dt_before = datetime(2026, 9, 12, 19, 59, 59, tzinfo=timezone.utc)
    assert to_business_date(utc_dt_before) == date(2026, 9, 12)

    # 2026-09-12 20:00:00 UTC -> 2026-09-13 00:00:00 в Астрахани
    utc_dt_midnight = datetime(2026, 9, 12, 20, 0, 0, tzinfo=timezone.utc)
    assert to_business_date(utc_dt_midnight) == date(2026, 9, 13)


@pytest.mark.asyncio
async def test_convert_reservation_default_dates(rental_creation_service, mock_repos, mock_db):
    """По умолчанию start_date берется из get_business_today(), end_date - из reservation."""
    fixed_today = date(2026, 9, 12)
    eq1 = Equipment(id=101, name="Sony FX3")
    reservation = Reservation(
        id=1,
        user_id=5,
        status=OrderStatus.ACTIVE.value,
        start_date=date(2026, 9, 12),
        end_date=date(2026, 9, 18),
        total_cost=6000,
        equipment=[eq1],
        accessory_links=[],
    )
    mock_repos["reservation_repo"].get_by_id_with_details.return_value = reservation

    # Price mock
    price_mock = MagicMock()
    price_mock.final_total = 6000
    mock_repos["financial_service"].calculate_final_price.return_value = price_mock

    # Rental creation mock (create_rental_from_reservation is a synchronous method)
    rental_mock = Rental(id=50, user_id=5, total_cost=6000, deposit_amount=0, prepayment_amount=0)
    mock_repos["rental_repo"].create_rental_from_reservation = MagicMock(return_value=rental_mock)
    mock_repos["rental_repo"].get_rental_by_id_or_fail.return_value = rental_mock

    manager = User(id=99, role="admin")
    request = RentalCreateFromReservationRequest()

    with patch("api.services.order.rental_creation_service.get_business_today", return_value=fixed_today):
        result = await rental_creation_service.convert_reservation_to_rental(1, request, manager)

    # Проверяем, что переданы даты: fixed_today и reservation.end_date
    mock_repos["validator"].validate_issue_on_holiday.assert_awaited_once_with(fixed_today, False)
    mock_repos["validator"].validate_equipment_availability.assert_awaited_once_with(
        [101], fixed_today, date(2026, 9, 18), exclude_reservation_id=1
    )
    mock_repos["financial_service"].calculate_final_price.assert_awaited_with(
        [101], {}, fixed_today, date(2026, 9, 18), None
    )


@pytest.mark.asyncio
async def test_convert_reservation_preserves_contract_dates_on_early_issue(rental_creation_service, mock_repos):
    """При досрочной выдаче менеджер может сохранить контрактные даты бронирования."""
    # Клиент забронировал на 15–20 сентября, выдача происходит 12 сентября,
    # менеджер выбирает сохранить контрактные даты 15–20 сентября
    today = date(2026, 9, 12)
    contract_start = date(2026, 9, 15)
    contract_end = date(2026, 9, 20)

    eq = Equipment(id=202, name="Canon R5")
    reservation = Reservation(
        id=2,
        user_id=7,
        status=OrderStatus.ACTIVE.value,
        start_date=contract_start,
        end_date=contract_end,
        total_cost=10000,
        equipment=[eq],
        accessory_links=[],
    )
    mock_repos["reservation_repo"].get_by_id_with_details.return_value = reservation

    price_mock = MagicMock()
    price_mock.final_total = 10000
    mock_repos["financial_service"].calculate_final_price.return_value = price_mock

    rental_mock = Rental(id=51, user_id=7, total_cost=10000, deposit_amount=0, prepayment_amount=0)
    mock_repos["rental_repo"].create_rental_from_reservation = MagicMock(return_value=rental_mock)
    mock_repos["rental_repo"].get_rental_by_id_or_fail.return_value = rental_mock

    manager = User(id=99, role="admin")
    request = RentalCreateFromReservationRequest(
        start_date=contract_start,
        end_date=contract_end,
    )

    with patch("api.services.order.rental_creation_service.get_business_today", return_value=today):
        await rental_creation_service.convert_reservation_to_rental(2, request, manager)

    # Проверка: валидатор праздников и доступности проверял именно contract_start и contract_end
    mock_repos["validator"].validate_issue_on_holiday.assert_awaited_once_with(contract_start, False)
    mock_repos["validator"].validate_equipment_availability.assert_awaited_once_with(
        [202], contract_start, contract_end, exclude_reservation_id=2
    )
    mock_repos["financial_service"].calculate_final_price.assert_awaited_with(
        [202], {}, contract_start, contract_end, None
    )


@pytest.mark.asyncio
async def test_convert_reservation_rejects_inverted_dates(rental_creation_service, mock_repos):
    """Выбрасывается 400 Bad Request, если end_date < start_date."""
    today = date(2026, 9, 12)
    reservation = Reservation(
        id=3,
        user_id=7,
        status=OrderStatus.ACTIVE.value,
        start_date=date(2026, 9, 15),
        end_date=date(2026, 9, 20),
        equipment=[],
        accessory_links=[],
    )
    mock_repos["reservation_repo"].get_by_id_with_details.return_value = reservation
    manager = User(id=99, role="admin")

    request = RentalCreateFromReservationRequest(
        start_date=date(2026, 9, 18),
        end_date=date(2026, 9, 15),
    )

    with patch("api.services.order.rental_creation_service.get_business_today", return_value=today):
        with pytest.raises(HTTPException) as exc:
            await rental_creation_service.convert_reservation_to_rental(3, request, manager)

    assert exc.value.status_code == 400
    assert "не может быть раньше" in exc.value.detail


@pytest.mark.asyncio
async def test_convert_reservation_rejects_expired_end_date(rental_creation_service, mock_repos):
    """Выбрасывается 409 Conflict, если end_date < get_business_today()."""
    today = date(2026, 9, 12)
    reservation = Reservation(
        id=4,
        user_id=7,
        status=OrderStatus.ACTIVE.value,
        start_date=date(2026, 9, 1),
        end_date=date(2026, 9, 5),
        equipment=[],
        accessory_links=[],
    )
    mock_repos["reservation_repo"].get_by_id_with_details.return_value = reservation
    manager = User(id=99, role="admin")

    # Передаем и start_date, и end_date в прошлом (start_date <= end_date < today)
    request = RentalCreateFromReservationRequest(
        start_date=date(2026, 9, 1),
        end_date=date(2026, 9, 5),
    )

    with patch("api.services.order.rental_creation_service.get_business_today", return_value=today):
        with pytest.raises(HTTPException) as exc:
            await rental_creation_service.convert_reservation_to_rental(4, request, manager)

    assert exc.value.status_code == 409
    assert "уже прошла" in exc.value.detail


@pytest.mark.asyncio
async def test_convert_reservation_holiday_conflict(rental_creation_service, mock_repos):
    """При попытке выдачи в праздник без force выбрасывается 409 Conflict."""
    today = date(2026, 9, 12)
    reservation = Reservation(
        id=5,
        user_id=7,
        status=OrderStatus.ACTIVE.value,
        start_date=today,
        end_date=date(2026, 9, 15),
        equipment=[],
        accessory_links=[],
    )
    mock_repos["reservation_repo"].get_by_id_with_details.return_value = reservation
    mock_repos["validator"].validate_issue_on_holiday.side_effect = HTTPException(
        status_code=409, detail={"error_type": "ISSUE_ON_HOLIDAY", "message": "Праздничный день"}
    )
    manager = User(id=99, role="admin")
    request = RentalCreateFromReservationRequest(force_issue_on_holiday=False)

    with patch("api.services.order.rental_creation_service.get_business_today", return_value=today):
        with pytest.raises(HTTPException) as exc:
            await rental_creation_service.convert_reservation_to_rental(5, request, manager)

    assert exc.value.status_code == 409
    assert exc.value.detail["error_type"] == "ISSUE_ON_HOLIDAY"


@pytest.mark.asyncio
async def test_convert_reservation_equipment_unavailable_conflict(rental_creation_service, mock_repos):
    """При занятости оборудования на новый период выбрасывается 409 Conflict."""
    today = date(2026, 9, 12)
    eq = Equipment(id=303, name="Blackmagic Pocket 6K")
    reservation = Reservation(
        id=6,
        user_id=7,
        status=OrderStatus.ACTIVE.value,
        start_date=date(2026, 9, 15),
        end_date=date(2026, 9, 20),
        equipment=[eq],
        accessory_links=[],
    )
    mock_repos["reservation_repo"].get_by_id_with_details.return_value = reservation
    mock_repos["validator"].validate_equipment_availability.side_effect = HTTPException(
        status_code=409, detail={"error_type": "EQUIPMENT_UNAVAILABLE", "message": "Оборудование занято"}
    )
    manager = User(id=99, role="admin")
    # Досрочная выдача с 12 по 20, но 12-15 уже занято другой арендой
    request = RentalCreateFromReservationRequest(start_date=today, end_date=date(2026, 9, 20))

    with patch("api.services.order.rental_creation_service.get_business_today", return_value=today):
        with pytest.raises(HTTPException) as exc:
            await rental_creation_service.convert_reservation_to_rental(6, request, manager)

    assert exc.value.status_code == 409
    assert exc.value.detail["error_type"] == "EQUIPMENT_UNAVAILABLE"

