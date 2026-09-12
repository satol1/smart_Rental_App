# tests/unit/test_stage2_3_add_equipment_and_accessories.py
"""
Тесты для Этапа 2.3:
- Добор оборудования в активную аренду:
  * Корректная тарификация добавленного оборудования и платных аксессуаров.
  * Учет коэффициента скидки аренды при расчете стоимости аксессуаров.
  * Списание с баланса клиента и увеличение rental.total_cost на сумму оборудования + аксессуаров.
  * Запрет добавления уже активных в аренде позиций (400 Bad Request).
  * Повторное добавление ранее сданных позиций (реактивация в rental_items).
  * Запрет даты добавления позже даты окончания аренды (400 Bad Request).
"""

import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, Mock

from api.models.rental import Rental, RentalEquipment
from api.models.equipment import Equipment
from api.models.accessory import Accessory
from api.models.user import User
from shared.constants.order_status import OrderStatus
from shared.constants.balance_operations import BalanceOperationType
from shared.schemas.rental_schema import RentalAddItemsRequest
from api.services.order.rental_update_service import RentalUpdateService


@pytest.fixture
def base_active_rental():
    rental = Rental(
        id=10,
        user_id=5,
        created_by_id=1,
        start_date=date(2026, 9, 10),
        end_date=date(2026, 9, 20),  # 10 дней
        status=OrderStatus.ACTIVE.value,
        total_cost=Decimal("10000.00"),
        discount_amount=Decimal("0.00"),
    )
    eq1 = Equipment(id=101, name="Sony A7 IV", daily_rate=1000.0)
    rental.equipment = [eq1]
    rental.rental_items = [
        RentalEquipment(rental_id=10, equipment_id=101, status="rented", daily_rate=Decimal("1000.00")),
    ]
    rental.accessory_links = []
    return rental


@pytest.mark.asyncio
async def test_add_equipment_with_accessories_charges_both(base_active_rental):
    """
    При доборе оборудования с платными аксессуарами:
    - С клиента списывается стоимость оборудования + аксессуаров на оставшиеся дни
    - rental.total_cost увеличивается на полную сумму
    """
    mock_db = AsyncMock()
    nested_cm = MagicMock()
    nested_cm.__aenter__ = AsyncMock(return_value=mock_db)
    nested_cm.__aexit__ = AsyncMock(return_value=None)
    mock_db.begin_nested = MagicMock(return_value=nested_cm)

    rental_repo = AsyncMock()
    rental_repo.get_rental_by_id_or_fail.return_value = base_active_rental
    rental_repo.save_rental = AsyncMock()
    rental_repo.add_accessories_to_rental_async = AsyncMock()

    new_eq = Equipment(id=102, name="Canon R6", daily_rate=1500.0)
    new_acc = Accessory(id=201, name="Батарейный блок", price=300.0)

    # Мокаем execute для Equipment и Accessory
    def mock_db_execute(stmt):
        mock_res = Mock()
        stmt_str = str(stmt).lower()
        if "accessories" in stmt_str:
            mock_res.scalars.return_value.all.return_value = [new_acc]
        else:
            mock_res.scalars.return_value.all.return_value = [new_eq]
        return mock_res

    mock_db.execute = AsyncMock(side_effect=mock_db_execute)

    validator = Mock()
    validator.validate_equipment_availability = AsyncMock()

    balance_service = AsyncMock()
    financial_service = AsyncMock()
    # 4 оставшихся дня
    financial_service.get_rental_days.return_value = 4

    update_service = RentalUpdateService(
        db=mock_db,
        rental_repo=rental_repo,
        system_service=AsyncMock(),
        validator=validator,
        balance_service=balance_service,
        financial_service=financial_service,
        promo_code_logic=AsyncMock(),
    )

    manager = User(id=99, role="admin")
    request = RentalAddItemsRequest(
        equipment_ids=[102],
        selected_accessories={102: [201]},
        start_date=date(2026, 9, 16),
    )

    await update_service.add_equipment_to_rental(base_active_rental.id, request, manager)

    # Стоимость оборудования: 4 дня * 1500 = 6000 руб.
    # Стоимость аксессуара: 4 дня * 300 = 1200 руб.
    # Итого к списанию: 7200 руб.
    balance_service.add_transaction.assert_called_once()
    call_args = balance_service.add_transaction.call_args[1]
    assert call_args["amount"] == Decimal("-7200.00")
    assert call_args["operation_type"] == BalanceOperationType.RENTAL_DEBIT

    # rental.total_cost увеличился с 10000 до 17200
    assert base_active_rental.total_cost == Decimal("17200.00")
    # Аксессуары сохранены
    rental_repo.add_accessories_to_rental_async.assert_awaited_once_with(
        base_active_rental, {102: [201]}
    )


@pytest.mark.asyncio
async def test_add_equipment_applies_existing_discount_ratio_to_accessories(base_active_rental):
    """
    Если у аренды была скидка 20%, то при доборе скидка 20% применяется
    как к суточной ставке оборудования, так и к аксессуарам.
    """
    # Исходная стоимость 8000 + скидка 2000 = 10000 базовой стоимости (скидка 20%)
    base_active_rental.total_cost = Decimal("8000.00")
    base_active_rental.discount_amount = Decimal("2000.00")

    mock_db = AsyncMock()
    nested_cm = MagicMock()
    nested_cm.__aenter__ = AsyncMock(return_value=mock_db)
    nested_cm.__aexit__ = AsyncMock(return_value=None)
    mock_db.begin_nested = MagicMock(return_value=nested_cm)

    rental_repo = AsyncMock()
    rental_repo.get_rental_by_id_or_fail.return_value = base_active_rental
    rental_repo.save_rental = AsyncMock()
    rental_repo.add_accessories_to_rental_async = AsyncMock()

    new_eq = Equipment(id=102, name="Canon R6", daily_rate=1000.0)
    new_acc = Accessory(id=201, name="Батарейный блок", price=200.0)

    def mock_db_execute(stmt):
        mock_res = Mock()
        stmt_str = str(stmt).lower()
        if "accessories" in stmt_str:
            mock_res.scalars.return_value.all.return_value = [new_acc]
        else:
            mock_res.scalars.return_value.all.return_value = [new_eq]
        return mock_res

    mock_db.execute = AsyncMock(side_effect=mock_db_execute)

    validator = Mock()
    validator.validate_equipment_availability = AsyncMock()

    balance_service = AsyncMock()
    financial_service = AsyncMock()
    # 5 оставшихся дней
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

    manager = User(id=99, role="admin")
    request = RentalAddItemsRequest(
        equipment_ids=[102],
        selected_accessories={102: [201]},
        start_date=date(2026, 9, 15),
    )

    await update_service.add_equipment_to_rental(base_active_rental.id, request, manager)

    # Базовая ставка: eq=1000, acc=200. Со скидкой 20%: eq=800, acc=160. Итого в день: 960 руб.
    # За 5 дней: 960 * 5 = 4800 руб.
    call_args = balance_service.add_transaction.call_args[1]
    assert call_args["amount"] == Decimal("-4800.00")
    assert base_active_rental.total_cost == Decimal("12800.00")
