# tests/unit/test_stage4_deposit_and_financials.py

import pytest
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, Mock, patch
from fastapi import HTTPException

from api.models.user import User
from api.models.rental import Rental, RentalEquipment, RentalAccessory
from api.models.equipment import Equipment
from api.models.accessory import Accessory
from api.services.order.rental_return_service import RentalReturnService
from api.services.financial_service import FinancialService
from api.repositories.rental_command_repository import RentalCommandRepository
from shared.constants.deposit_status import DepositStatus
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
    client = Mock(spec=User)
    client.id = 15
    client.balance = 500.0
    return client


@pytest.fixture
def active_rental_with_deposit():
    rental = Rental(
        id=201,
        user_id=15,
        created_by_id=99,
        start_date=date(2026, 9, 10),
        end_date=date(2026, 9, 20),
        status="active",
        total_cost=Decimal("15000.00"),
        discount_amount=Decimal("0.00"),
        prepayment_amount=Decimal("5000.00"),
        deposit_amount=Decimal("5000.00"),
        deposit_status="held",
    )
    eq1 = Equipment(id=1, name="Sony FX3", daily_rate=1500.0)
    rental.equipment = [eq1]
    rental.rental_items = [
        RentalEquipment(
            rental_id=201,
            equipment_id=1,
            status="rented",
            daily_rate=Decimal("1500.00"),
        )
    ]
    rental.accessory_links = []
    return rental


class TestStage4DepositLifecycle:
    """Тестирование учета и жизненного цикла залогов (Этап 4.1)."""

    def test_rental_creation_initializes_deposit_status(self):
        """Создание аренды с залогом выставляет deposit_status='held', а без залога - None."""
        repo = RentalCommandRepository(AsyncMock())
        user = Mock(spec=User, id=10)
        manager = Mock(spec=User, id=99)
        eq = [Mock(spec=Equipment, id=1)]

        # С залогом 5000
        rental_with_dep = repo.create_rental_instance(
            user=user,
            manager=manager,
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 20),
            equipment=eq,
            total_cost=10000.0,
            deposit_amount=5000.0,
        )
        assert rental_with_dep.deposit_status == DepositStatus.HELD.value
        assert rental_with_dep.deposit_amount == 5000.0

        # Без залога (0.0)
        rental_without_dep = repo.create_rental_instance(
            user=user,
            manager=manager,
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 20),
            equipment=eq,
            total_cost=10000.0,
            deposit_amount=0.0,
        )
        assert rental_without_dep.deposit_status is None

    @pytest.mark.asyncio
    async def test_full_return_refunds_deposit_by_default(
        self, mock_db, mock_manager, mock_client, active_rental_with_deposit
    ):
        """При полном возврате по умолчанию залог переходит в refunded и возвращается клиенту."""
        rental = active_rental_with_deposit
        mock_db.get.return_value = mock_client

        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail.return_value = rental

        def mock_finalize(r, ret_d, n, c, s, has_debt=False, **kwargs):
            r.status = OrderStatus.COMPLETED.value
            r.actual_return_date = ret_d
            if "deposit_status" in kwargs:
                r.deposit_status = kwargs["deposit_status"]
            if "deposit_refunded_amount" in kwargs:
                r.deposit_refunded_amount = kwargs["deposit_refunded_amount"]
            if "deposit_retained_amount" in kwargs:
                r.deposit_retained_amount = kwargs["deposit_retained_amount"]

        rental_repo.finalize_rental_return = Mock(side_effect=mock_finalize)

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
            equipment_ids=[1],
            # deposit_action не указан - по умолчанию refund
        )

        await service.return_rental(rental.id, request, mock_manager)

        assert rental.deposit_status == DepositStatus.REFUNDED.value
        assert rental.deposit_refunded_amount == Decimal("5000.00")
        assert rental.deposit_retained_amount == Decimal("0.00")

    @pytest.mark.asyncio
    async def test_full_return_retains_deposit_for_damage(
        self, mock_db, mock_manager, mock_client, active_rental_with_deposit
    ):
        """Полное удержание залога за ущерб переводит статус в retained_for_damage."""
        rental = active_rental_with_deposit
        mock_db.get.return_value = mock_client

        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail.return_value = rental

        def mock_finalize(r, ret_d, n, c, s, has_debt=False, **kwargs):
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

        rental_repo.finalize_rental_return = Mock(side_effect=mock_finalize)

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
            equipment_ids=[1],
            deposit_action="retain",
            deposit_notes="Разбит дисплей камеры",
        )

        await service.return_rental(rental.id, request, mock_manager)

        assert rental.deposit_status == DepositStatus.RETAINED_FOR_DAMAGE.value
        assert rental.deposit_retained_amount == Decimal("5000.00")
        assert rental.deposit_refunded_amount == Decimal("0.00")
        assert rental.deposit_notes == "Разбит дисплей камеры"

    @pytest.mark.asyncio
    async def test_full_return_partially_retains_deposit(
        self, mock_db, mock_manager, mock_client, active_rental_with_deposit
    ):
        """Частичное удержание залога фиксирует удержанную и возвращенную часть."""
        rental = active_rental_with_deposit
        mock_db.get.return_value = mock_client

        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail.return_value = rental

        def mock_finalize(r, ret_d, n, c, s, has_debt=False, **kwargs):
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

        rental_repo.finalize_rental_return = Mock(side_effect=mock_finalize)

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

        # Удерживаем 1500 из 5000
        request = RentalReturnRequest(
            actual_return_date=date(2026, 9, 20),
            accessories_returned_confirmation=True,
            equipment_ids=[1],
            deposit_action="partial_retain",
            deposit_retained_amount=1500.0,
            deposit_notes="Утеряна бленда",
        )

        await service.return_rental(rental.id, request, mock_manager)

        assert rental.deposit_status == DepositStatus.PARTIALLY_RETAINED.value
        assert rental.deposit_retained_amount == Decimal("1500.00")
        assert rental.deposit_refunded_amount == Decimal("3500.00")
        assert rental.deposit_notes == "Утеряна бленда"

    @pytest.mark.asyncio
    async def test_partial_retain_exceeding_deposit_raises_400(
        self, mock_db, mock_manager, mock_client, active_rental_with_deposit
    ):
        """Попытка удержать сумму больше суммы залога вызывает ошибку 400."""
        rental = active_rental_with_deposit
        rental_repo = AsyncMock()
        rental_repo.get_rental_by_id_or_fail.return_value = rental

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

        # Залог 5000, пытаемся удержать 6000
        request = RentalReturnRequest(
            actual_return_date=date(2026, 9, 20),
            accessories_returned_confirmation=True,
            equipment_ids=[1],
            deposit_action="partial_retain",
            deposit_retained_amount=6000.0,
        )

        with pytest.raises(HTTPException) as exc_info:
            await service.return_rental(rental.id, request, mock_manager)

        assert exc_info.value.status_code == 400
        assert "не может превышать сумму залога" in exc_info.value.detail


@pytest.fixture
def standalone_financial_service():
    """Создает изолированный FinancialService для проверки пересчета тарифов и штрафов."""
    db = AsyncMock()
    status_service = MagicMock()
    discount_repo = MagicMock()
    promo_code_logic = MagicMock()
    discount_service = AsyncMock()
    equipment_repo = AsyncMock()
    holiday_repo = AsyncMock()
    accessory_repo = AsyncMock()

    # По умолчанию праздников нет
    holiday_repo.get_holidays_in_range = AsyncMock(return_value=[])

    service = FinancialService(
        db=db,
        status_service=status_service,
        discount_repo=discount_repo,
        promo_code_logic=promo_code_logic,
        discount_service=discount_service,
        equipment_repo=equipment_repo,
        holiday_repo=holiday_repo,
        accessory_repo=accessory_repo
    )
    return service


class TestStage4EarlyReturnRecalculation:
    """Тестирование пересчета досрочного возврата по фактическому сроку (Этап 4.2)."""

    @pytest.mark.asyncio
    async def test_early_return_recalculates_used_days_at_actual_duration_tier(self, standalone_financial_service):
        """
        Защита от злоупотребления оптовой скидкой:
        Клиент взял технику на 30 дней со скидкой 40% (18 000 руб вместо 30 000 руб).
        Возвращает на 2-й день.
        Старая логика вернула бы: 28 * 600 = 16 800 руб (клиент заплатил бы 1 200 руб за 2 дня).
        Новая логика пересчитывает 2 дня по шкале для 2 дней (0% скидки) = 2 000 руб.
        Кредит = 18 000 - 2 000 = 16 000 руб (клиент честно платит 2 000 руб за 2 дня).
        """
        fs = standalone_financial_service

        eq = Mock(spec=Equipment, id=1, daily_rate=1000.0)
        fs.equipment_repo.get_by_ids = AsyncMock(return_value=[eq])

        # При расчете на 2 дня скидка за длительность = 0%
        fs.discount_service.get_duration_discount_percentage = AsyncMock(return_value=0)
        fs.promo_code_logic.validate_combined_discount = Mock(return_value=0)

        rental = Rental(
            id=101,
            user_id=1,
            created_by_id=99,
            start_date=date(2026, 6, 1),
            end_date=date(2026, 7, 1),  # 30 дней
            status="active",
            total_cost=Decimal("18000.00"),  # Оплачено с 40% скидкой
            discount_amount=Decimal("12000.00"),
        )
        rental.equipment = [eq]
        rental.accessory_links = []
        rental.promo_code = None

        # Возврат на 2-й день (2026-06-03: get_rental_days вернет 2 дня)
        credit = await fs.calculate_early_return_credit(
            rental=rental,
            actual_return_date=date(2026, 6, 3),
            planned_days=30
        )

        # 2 дня * 1000 = 2000 руб. Кредит = 18000 - 2000 = 16000 руб.
        assert credit == Decimal("16000.00")

    @pytest.mark.asyncio
    async def test_early_return_same_day_counts_as_one_day_minimum(self, standalone_financial_service):
        """
        Досрочный возврат в день старта аренды тарифицируется как минимум 1 день.
        """
        fs = standalone_financial_service

        eq = Mock(spec=Equipment, id=1, daily_rate=1000.0)
        fs.equipment_repo.get_by_ids = AsyncMock(return_value=[eq])
        fs.discount_service.get_duration_discount_percentage = AsyncMock(return_value=0)
        fs.promo_code_logic.validate_combined_discount = Mock(return_value=0)

        rental = Rental(
            id=102,
            user_id=1,
            created_by_id=99,
            start_date=date(2026, 6, 1),
            end_date=date(2026, 6, 11),  # 10 дней
            status="active",
            total_cost=Decimal("8000.00"),  # со скидкой 20%
            discount_amount=Decimal("2000.00"),
        )
        rental.equipment = [eq]
        rental.accessory_links = []

        # Возврат в день старта
        credit = await fs.calculate_early_return_credit(
            rental=rental,
            actual_return_date=date(2026, 6, 1),
            planned_days=10
        )

        # 1 день * 1000 = 1000 руб. Кредит = 8000 - 1000 = 7000 руб.
        assert credit == Decimal("7000.00")

    @pytest.mark.asyncio
    async def test_early_return_cost_exceeds_paid_yields_zero_credit(self, standalone_financial_service):
        """
        Если пересчитанная стоимость использованных дней превышает или равна уже уплаченной сумме,
        кредит равен 0 (клиенту не начисляется отрицательный кредит).
        """
        fs = standalone_financial_service

        eq = Mock(spec=Equipment, id=1, daily_rate=1000.0)
        fs.equipment_repo.get_by_ids = AsyncMock(return_value=[eq])
        fs.discount_service.get_duration_discount_percentage = AsyncMock(return_value=0)

        rental = Rental(
            id=103,
            user_id=1,
            created_by_id=99,
            start_date=date(2026, 6, 1),
            end_date=date(2026, 6, 11),
            status="active",
            total_cost=Decimal("2000.00"),  # сильно заниженная или льготная стоимость
            discount_amount=Decimal("8000.00"),
        )
        rental.equipment = [eq]
        rental.accessory_links = []

        # Использовано 3 дня: 3 * 1000 = 3000 > 2000
        credit = await fs.calculate_early_return_credit(
            rental=rental,
            actual_return_date=date(2026, 6, 4),
            planned_days=10
        )
        assert credit == Decimal("0.00")

    @pytest.mark.asyncio
    async def test_early_return_with_promo_code_preserves_promo(self, standalone_financial_service):
        """
        При пересчете досрочного возврата промокод клиента сохраняется и учитывается для фактически использованных дней.
        """
        fs = standalone_financial_service

        eq = Mock(spec=Equipment, id=1, daily_rate=1000.0)
        fs.equipment_repo.get_by_ids = AsyncMock(return_value=[eq])

        # Длительность 2 дня дает 0% скидки
        fs.discount_service.get_duration_discount_percentage = AsyncMock(return_value=0)

        # Промокод 15%
        promo = Mock(code="SUMMER15", discount_percentage=15)
        fs.promo_code_logic.promo_repo.get_by_code = AsyncMock(return_value=promo)
        fs.promo_code_logic.validate_combined_discount = Mock(return_value=15)

        rental = Rental(
            id=104,
            user_id=1,
            created_by_id=99,
            start_date=date(2026, 6, 1),
            end_date=date(2026, 7, 1),
            status="active",
            total_cost=Decimal("15000.00"),
            discount_amount=Decimal("15000.00"),
            promo_code="SUMMER15",
        )
        rental.equipment = [eq]
        rental.accessory_links = []

        credit = await fs.calculate_early_return_credit(
            rental=rental,
            actual_return_date=date(2026, 6, 3),
            planned_days=30
        )

        # 2 дня * 1000 = 2000. Скидка промокода 15% = 300 руб. Фактическая стоимость = 1700 руб.
        # Кредит = 15000 - 1700 = 13300 руб.
        assert credit == Decimal("13300.00")


class TestStage4FairOverdueSurcharge:
    """Тестирование справедливого штрафа за просрочку по базовой ставке (Этап 4.3)."""

    @pytest.mark.asyncio
    async def test_overdue_surcharge_charged_at_base_rate_without_duration_discount(self, standalone_financial_service):
        """
        Просрочка начисляется по базовой ставке оборудования (1000 руб/сутки),
        а не по льготной оптовой ставке (600 руб/сутки), которая действовала на период аренды.
        """
        fs = standalone_financial_service

        eq = Mock(spec=Equipment, id=1, daily_rate=1000.0)
        rental = Rental(
            id=201,
            user_id=1,
            created_by_id=99,
            start_date=date(2026, 6, 1),
            end_date=date(2026, 7, 1),
            status="active",
            total_cost=Decimal("18000.00"),  # 30 дней по 600 руб/сутки
        )
        rental.equipment = [eq]
        rental.accessory_links = []

        # Просрочка на 3 дня (возврат 2026-07-04)
        surcharge = await fs.calculate_overdue_surcharge(
            rental=rental,
            actual_return_date=date(2026, 7, 4)
        )

        # 3 дня * 1000 руб = 3000 руб (НЕ 3 * 600 = 1800)
        assert surcharge == Decimal("3000.00")

    @pytest.mark.asyncio
    async def test_overdue_surcharge_includes_accessories_base_rate(self, standalone_financial_service):
        """
        Штраф за просрочку учитывает базовую суточную стоимость оборудования и всех аксессуаров.
        """
        fs = standalone_financial_service

        eq = Equipment(id=1, name="Sony FX3", daily_rate=1500.0)
        acc = Accessory(id=10, name="Tripod", price=300.0)
        acc_link = RentalAccessory(rental_id=202, equipment_id=1, accessory_id=10)
        acc_link.accessory = acc

        rental = Rental(
            id=202,
            user_id=1,
            created_by_id=99,
            start_date=date(2026, 6, 1),
            end_date=date(2026, 6, 5),
            status="active",
            total_cost=Decimal("7200.00"),
        )
        rental.equipment = [eq]
        rental.accessory_links = [acc_link]

        # Просрочка на 2 дня
        surcharge = await fs.calculate_overdue_surcharge(
            rental=rental,
            actual_return_date=date(2026, 6, 7)
        )

        # Базовая ставка = 1500 + 300 = 1800 руб/сутки.
        # За 2 дня = 3600 руб.
        assert surcharge == Decimal("3600.00")

    @pytest.mark.asyncio
    async def test_overdue_surcharge_with_equipment_ids_filter(self, standalone_financial_service):
        """
        При частичном или поэтапном возврате штраф начисляется только на указанные позиции.
        """
        fs = standalone_financial_service

        eq1 = Mock(spec=Equipment, id=1, daily_rate=1000.0)
        eq2 = Mock(spec=Equipment, id=2, daily_rate=2500.0)

        rental = Rental(
            id=203,
            user_id=1,
            created_by_id=99,
            start_date=date(2026, 6, 1),
            end_date=date(2026, 6, 5),
            status="active",
            total_cost=Decimal("14000.00"),
        )
        rental.equipment = [eq1, eq2]
        rental.accessory_links = []

        # Просрочка на 2 дня, но сдается только eq1
        surcharge = await fs.calculate_overdue_surcharge(
            rental=rental,
            actual_return_date=date(2026, 6, 7),
            equipment_ids=[1]
        )

        # 2 дня * 1000 = 2000 руб (eq2 за 2500 не включается в расчет)
        assert surcharge == Decimal("2000.00")

    @pytest.mark.asyncio
    async def test_overdue_surcharge_zero_when_on_time_or_early(self, standalone_financial_service):
        """
        Штраф за просрочку строго равен 0, если возврат вовремя или досрочный.
        """
        fs = standalone_financial_service

        eq = Mock(spec=Equipment, id=1, daily_rate=1000.0)
        rental = Rental(
            id=204,
            user_id=1,
            created_by_id=99,
            start_date=date(2026, 6, 1),
            end_date=date(2026, 6, 5),
            status="active",
            total_cost=Decimal("4000.00"),
        )
        rental.equipment = [eq]

        # Вовремя
        assert await fs.calculate_overdue_surcharge(rental, date(2026, 6, 5)) == Decimal("0")
        # Досрочно
        assert await fs.calculate_overdue_surcharge(rental, date(2026, 6, 3)) == Decimal("0")
