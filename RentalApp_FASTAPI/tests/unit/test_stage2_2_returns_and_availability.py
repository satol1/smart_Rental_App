# tests/unit/test_stage2_2_returns_and_availability.py
"""
Тесты для Этапа 2.2:
- Доступность сданного оборудования:
  * Единица оборудования, сданная в рамках частичного возврата, становится доступной
    для новых броней/аренд со следующего дня после возврата.
  * AvailabilityConflictsService исключает из конфликтов сданные единицы (или обрезает
    конфликт датой фактического возврата).
- Расчет кредита за досрочный возврат:
  * При частичном возврате кредит рассчитывается за возвращаемые позиции.
  * При последующем полном возврате остатка кредит рассчитывается за оставшиеся позиции
    без задвоения и искажений из-за уменьшенного rental.total_cost.
- Залог и аксессуары:
  * Удержание залога и начисление за утерю аксессуаров при возвратах.
"""

import pytest
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, Mock

from api.models.rental import Rental, RentalEquipment
from api.models.equipment import Equipment
from api.models.user import User
from shared.constants.order_status import OrderStatus
from shared.constants.balance_operations import BalanceOperationType
from shared.constants.deposit_status import DepositStatus
from shared.schemas.rental_schema import RentalReturnRequest
from api.services.order.rental_return_service import RentalReturnService
from api.services.financial_service import FinancialService
from api.services.availability.conflicts import AvailabilityConflictsService


@pytest.fixture
def mock_equipment_pair():
    eq1 = Mock(spec=Equipment, id=101, name="Камера Sony", daily_rate=1000.0)
    eq2 = Mock(spec=Equipment, id=102, name="Объектив 24-70", daily_rate=500.0)
    return eq1, eq2


@pytest.fixture
def active_multi_item_rental(mock_equipment_pair):
    eq1, eq2 = mock_equipment_pair
    rental = Rental(
        id=1,
        user_id=10,
        created_by_id=1,
        start_date=date(2026, 9, 10),
        end_date=date(2026, 9, 20),  # 10 дней
        status=OrderStatus.ACTIVE.value,
        total_cost=Decimal("15000.00"),
        discount_amount=Decimal("0.00"),
        deposit_amount=Decimal("5000.00"),
    )
    rental.equipment = [eq1, eq2]
    rental.rental_items = [
        RentalEquipment(rental_id=1, equipment_id=101, status="rented", daily_rate=Decimal("1000.00")),
        RentalEquipment(rental_id=1, equipment_id=102, status="rented", daily_rate=Decimal("500.00")),
    ]
    rental.accessory_links = []
    return rental


@pytest.mark.asyncio
async def test_conflicts_service_excludes_already_returned_equipment():
    """Конфликт-сервис не фиксирует конфликт для единицы, уже сданной до начала запрашиваемого интервала."""
    conflicts_service = AvailabilityConflictsService(
        db=AsyncMock(),
        reservation_repo=AsyncMock(),
        rental_repo=AsyncMock(),
    )

    eq1 = Mock(spec=Equipment, id=101)
    eq2 = Mock(spec=Equipment, id=102)

    rental = Rental(
        id=1,
        user_id=10,
        start_date=date(2026, 9, 10),
        end_date=date(2026, 9, 20),
        status=OrderStatus.ACTIVE.value,
    )
    rental.equipment = [eq1, eq2]
    # Позиция 101 возвращена 12 сентября, позиция 102 все еще на руках
    rental.rental_items = [
        RentalEquipment(rental_id=1, equipment_id=101, status="returned", actual_return_date=date(2026, 9, 12)),
        RentalEquipment(rental_id=1, equipment_id=102, status="rented", actual_return_date=None),
    ]

    conflicts_service._get_overlapping_reservations = AsyncMock(return_value=[])
    conflicts_service._get_overlapping_rentals = AsyncMock(return_value=[rental])

    # Запрос на интервал 13–18 сентября
    # Позиция 101 уже сдана 12 сентября -> конфликтов быть не должно!
    conflicts_101 = await conflicts_service.get_conflicts(
        equipment_ids=[101],
        start_date=date(2026, 9, 13),
        end_date=date(2026, 9, 18),
    )
    assert 101 not in conflicts_101 or len(conflicts_101[101]) == 0

    # Позиция 102 всё ещё на руках до 20 сентября -> должен быть зафиксирован конфликт!
    conflicts_102 = await conflicts_service.get_conflicts(
        equipment_ids=[102],
        start_date=date(2026, 9, 13),
        end_date=date(2026, 9, 18),
    )
    assert 102 in conflicts_102
    assert len(conflicts_102[102]) == 1
    assert conflicts_102[102][0]["type"] == "rental"
    assert conflicts_102[102][0]["id"] == 1


@pytest.mark.asyncio
async def test_conflicts_service_truncates_conflict_to_actual_return_date():
    """Если позиция сдана досрочно, но в процессе запрашиваемого интервала, конфликт оканчивается датой возврата."""
    conflicts_service = AvailabilityConflictsService(
        db=AsyncMock(),
        reservation_repo=AsyncMock(),
        rental_repo=AsyncMock(),
    )

    eq1 = Mock(spec=Equipment, id=101)
    rental = Rental(
        id=2,
        user_id=10,
        start_date=date(2026, 9, 10),
        end_date=date(2026, 9, 20),
        status=OrderStatus.ACTIVE.value,
    )
    rental.equipment = [eq1]
    rental.rental_items = [
        RentalEquipment(rental_id=2, equipment_id=101, status="returned", actual_return_date=date(2026, 9, 14)),
    ]

    conflicts_service._get_overlapping_reservations = AsyncMock(return_value=[])
    conflicts_service._get_overlapping_rentals = AsyncMock(return_value=[rental])

    # Запрос с 12 по 18 сентября. 12-14 камера была занята, 14 сдана
    conflicts = await conflicts_service.get_conflicts(
        equipment_ids=[101],
        start_date=date(2026, 9, 12),
        end_date=date(2026, 9, 18),
    )
    assert 101 in conflicts
    assert len(conflicts[101]) == 1
    # Дата окончания конфликта обрезана до даты фактического возврата (14 сентября вместо 20 сентября)
    assert conflicts[101][0]["end_date"] == date(2026, 9, 14)


@pytest.mark.asyncio
async def test_calculate_early_return_credit_prevents_double_credit_on_subsequent_return():
    """
    Тест защиты от задвоения кредита:
    Аренда на 2 камеры по 1000 руб. на 10 дней = 20000 руб.
    Возврат Камеры 1 на 5-й день.
    Затем возврат Камеры 2 на 7-й день.
    Кредит за Камеру 2 рассчитывается за 3 оставшихся неиспользованных дня Камеры 2,
    а не за всю оставшуюся сумму аренды.
    """
    eq1 = Mock(spec=Equipment, id=1, daily_rate=1000.0)
    eq2 = Mock(spec=Equipment, id=2, daily_rate=1000.0)

    fs = FinancialService(
        db=AsyncMock(),
        holiday_repo=AsyncMock(),
        discount_service=AsyncMock(),
        equipment_repo=AsyncMock(),
        accessory_repo=AsyncMock(),
        promo_code_logic=AsyncMock(),
    )
    # Корректная фильтрация по запрошенным ID
    fs.equipment_repo.get_by_ids = AsyncMock(side_effect=lambda ids: [eq for eq in [eq1, eq2] if eq.id in ids])
    fs.discount_service.get_duration_discount_percentage = AsyncMock(return_value=0)

    # Аренда изначально стоила 20 000 руб.
    # После возврата Камеры 1 на 5-й день (кредит 5000 руб.) остаток total_cost = 15000 руб.
    rental = Rental(
        id=10,
        user_id=5,
        created_by_id=1,
        start_date=date(2026, 9, 1),
        end_date=date(2026, 9, 11),  # 10 дней
        status=OrderStatus.ACTIVE.value,
        total_cost=Decimal("15000.00"),  # уже уменьшен на 5000
        discount_amount=Decimal("0.00"),
    )
    rental.equipment = [eq1, eq2]
    rental.rental_items = [
        RentalEquipment(rental_id=10, equipment_id=1, status="returned", actual_return_date=date(2026, 9, 6), daily_rate=Decimal("1000.00")),
        RentalEquipment(rental_id=10, equipment_id=2, status="rented", actual_return_date=None, daily_rate=Decimal("1000.00")),
    ]
    rental.accessory_links = []
    rental.promo_code = None

    # Теперь клиент на 7-й день (2026-09-08) возвращает оставшуюся Камеру 2
    credit = await fs.calculate_early_return_credit(
        rental=rental,
        actual_return_date=date(2026, 9, 8),
        planned_days=10,
        equipment_ids=[2]
    )

    # Камера 2 использовалась 7 дней из 10 (неиспользовано 3 дня: 3 * 1000 = 3000 руб.)
    # Раньше старый баг давал: 15000 (total_cost) - 7000 (used_cost) = 8000 руб. (задвоение на 5000 руб.!)
    # Исправленный расчет возвращает ровно 3000 руб.!
    assert credit == Decimal("3000.00")


@pytest.mark.asyncio
async def test_full_return_with_lost_accessories_and_deposit_retained(active_multi_item_rental):
    """
    При полном возврате с утерей аксессуаров и удержанием залога:
    - Компенсация за утерю списывается
    - Залог частично удерживается
    - Аренда успешно финализируется
    """
    mock_db = AsyncMock()
    nested_cm = MagicMock()
    nested_cm.__aenter__ = AsyncMock(return_value=mock_db)
    nested_cm.__aexit__ = AsyncMock(return_value=None)
    mock_db.begin_nested = MagicMock(return_value=nested_cm)

    rental_repo = AsyncMock()
    rental_repo.get_rental_by_id_or_fail.return_value = active_multi_item_rental
    rental_repo.finalize_rental_return = Mock()
    rental_repo.save_rental = AsyncMock()

    validator = Mock()
    validator.validate_rental_is_returnable = Mock()
    validator.validate_return_date = Mock()
    validator.validate_accessories_returned = Mock()

    balance_service = AsyncMock()
    financial_service = AsyncMock()
    financial_service.get_rental_days.return_value = 10
    financial_service.calculate_early_return_credit.return_value = Decimal("0.00")
    financial_service.calculate_overdue_surcharge.return_value = Decimal("0.00")

    service = RentalReturnService(
        db=mock_db,
        rental_repo=rental_repo,
        validator=validator,
        balance_service=balance_service,
        financial_service=financial_service,
    )

    manager = User(id=99, role="admin")
    request = RentalReturnRequest(
        actual_return_date=date(2026, 9, 20),
        accessories_returned_confirmation=True,
        equipment_ids=[101, 102],
        lost_accessory_ids=[501],
        lost_accessories_cost=Decimal("1200.00"),
        deposit_action="partial_retain",
        deposit_retained_amount=Decimal("1200.00"),
        deposit_notes="Утерян кабель питания",
    )

    await service.return_rental(1, request, manager)

    # Проверяем вызов finalize_rental_return
    rental_repo.finalize_rental_return.assert_called_once()
    call_args = rental_repo.finalize_rental_return.call_args
    # surcharge передан 5-м позиционным аргументом (индекс 4)
    assert call_args[0][4] == Decimal("1200.00")
    kwargs = call_args[1]
    assert kwargs["deposit_status"] == DepositStatus.PARTIALLY_RETAINED.value
    assert kwargs["deposit_retained_amount"] == Decimal("1200.00")
    assert kwargs["deposit_refunded_amount"] == Decimal("3800.00")
