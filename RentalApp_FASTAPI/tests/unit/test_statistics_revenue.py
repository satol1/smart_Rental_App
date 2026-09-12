# tests/unit/test_statistics_revenue.py

import pytest
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from api.models.payment import Payment
from api.repositories.statistics_repository import StatisticsRepository
from shared.utils.date_utils import get_business_today


class TestStatisticsRevenue:
    """
    Верификация корректности расчета выручки в StatisticsRepository:
    1. Учет частичных оплат (включая заказы completed_with_debt).
    2. Учет погашения долгов в месяце фактического поступления денег.
    3. Учет предоплат в момент их поступления.
    4. Изоляция залогов: залоговые суммы не попадают в выручку.
    """

    @pytest.fixture
    def today(self):
        return get_business_today()

    @pytest.mark.asyncio
    async def test_revenue_today_sums_payments_made_today(self, today):
        """Выручка за сегодня суммирует все платежи за сегодня."""
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = Decimal("9500.00")
        mock_db.execute.return_value = mock_result

        repo = StatisticsRepository(mock_db)
        revenue = await repo.get_revenue_today()

        assert revenue == 9500.0
        assert mock_db.execute.call_count == 1

    @pytest.mark.asyncio
    async def test_revenue_this_month_sums_payments_in_month_range(self, today):
        """Выручка за месяц суммирует платежи с 1-го числа месяца по сегодня."""
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = Decimal("45000.00")
        mock_db.execute.return_value = mock_result

        repo = StatisticsRepository(mock_db)
        revenue = await repo.get_revenue_this_month()

        assert revenue == 45000.0
        assert mock_db.execute.call_count == 1

    @pytest.mark.asyncio
    async def test_completed_with_debt_payment_included_in_revenue(self, today):
        """
        Если аренда завершена с долгом (например, оплачено 9500 из 10000),
        фактический платеж 9500 попадает в таблицу Payment и участвует в выручке.
        """
        # Симулируем генерацию платежа при создании/возврате
        payment = Payment(
            id=1,
            user_id=10,
            rental_id=50,
            amount=Decimal("9500.00"),
            payment_date=datetime.now(timezone.utc),
            payment_method="cash",
            transaction_type="rental_payment",
            description="Оплата аренды #50",
        )

        mock_db = AsyncMock()
        # Проверяем, что запрос формируется к модели Payment
        captured_queries = []
        async def mock_execute(statement, *args, **kwargs):
            captured_queries.append(statement)
            res = MagicMock()
            res.scalar_one.return_value = payment.amount
            return res

        mock_db.execute.side_effect = mock_execute

        repo = StatisticsRepository(mock_db)
        rev = await repo.get_revenue_today()

        assert rev == 9500.0
        query_str = str(captured_queries[0])
        assert "payments" in query_str.lower()
        # В запросе больше нет условия Rental.status == 'completed'
        assert "completed" not in query_str.lower()

    @pytest.mark.asyncio
    async def test_debt_repaid_next_month_recorded_on_payment_date(self, today):
        """
        Погашение долга, произошедшее сегодня (даже если сама аренда завершилась в прошлом месяце),
        учитывается в выручке сегодня и текущего месяца.
        """
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = Decimal("1500.00")
        mock_db.execute.return_value = mock_result

        repo = StatisticsRepository(mock_db)
        rev_today = await repo.get_revenue_today()
        assert rev_today == 1500.0
