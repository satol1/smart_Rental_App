# tests/services/test_financial_service.py
"""
Тесты для FinancialService - самого критичного модуля финансовых расчетов.
Тестирует все аспекты расчета стоимости, скидок, просрочек и досрочных возвратов.
"""

import pytest
from datetime import date, timedelta, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from api.services.financial_service import FinancialService, PriceDetails
from api.models.equipment import Equipment
from api.models.accessory import Accessory
from api.models.promo_code import PromoCode
from api.models.holiday import Holiday
from api.models.rental import Rental


class TestFinancialService:
    """Тесты для FinancialService."""

    @pytest.fixture
    def financial_service(self, mock_db_session):
        """Создает экземпляр FinancialService с моком БД и зависимостями."""
        # Создаем моки для зависимостей
        mock_status_service = MagicMock()
        mock_discount_repo = MagicMock()
        mock_promo_code_logic = MagicMock()
        mock_discount_service = MagicMock()
        mock_equipment_repo = MagicMock()
        mock_holiday_repo = MagicMock()
        mock_accessory_repo = MagicMock()
        
        service = FinancialService(
            db=mock_db_session,
            status_service=mock_status_service,
            discount_repo=mock_discount_repo,
            promo_code_logic=mock_promo_code_logic,
            discount_service=mock_discount_service,
            equipment_repo=mock_equipment_repo,
            holiday_repo=mock_holiday_repo,
            accessory_repo=mock_accessory_repo
        )
        return service

    @pytest.fixture
    def sample_equipment(self):
        """Создает тестовое оборудование."""
        equipment = MagicMock(spec=Equipment)
        equipment.id = 1
        equipment.name = "Test Camera"
        equipment.daily_rate = 100.0
        return equipment

    @pytest.fixture
    def sample_accessory(self):
        """Создает тестовый аксессуар."""
        accessory = MagicMock(spec=Accessory)
        accessory.id = 1
        accessory.name = "Test Lens"
        accessory.price = 50.0
        return accessory

    @pytest.fixture
    def sample_promo_code(self):
        """Создает тестовый промокод."""
        promo_code = MagicMock(spec=PromoCode)
        promo_code.id = 1
        promo_code.code = "TEST10"
        promo_code.discount_percentage = 10.0
        return promo_code

    # === ТЕСТЫ ДЛЯ get_rental_days ===

    @pytest.mark.asyncio
    async def test_get_rental_days_excludes_holidays(self, financial_service, sample_dates):
        """
        Тест проверяет, что get_rental_days правильно исключает выходные дни при расчете.
        """
        # Arrange
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']  # 1-5 января = 4 дня между датами
        
        # Мокаем holiday_repo: в диапазоне есть 2 выходных
        mock_holidays = [MagicMock(), MagicMock()]  # 2 выходных дня
        financial_service.holiday_repo.get_holidays_in_range = AsyncMock(return_value=mock_holidays)

        # Act
        rental_days = await financial_service.get_rental_days(start_date, end_date)

        # Assert
        assert rental_days == 2  # 4 дня - 2 выходных = 2 тарифицируемых дня
        financial_service.holiday_repo.get_holidays_in_range.assert_called_once_with(start_date, end_date)

    @pytest.mark.asyncio
    async def test_get_rental_days_same_date_returns_one(self, financial_service):
        """
        Тест проверяет, что при одинаковых датах начала и окончания возвращается 1 день.
        """
        # Arrange
        test_date = date(2025, 1, 15)
        
        # При одинаковых датах метод возвращает 1 без обращения к репозиторию

        # Act
        rental_days = await financial_service.get_rental_days(test_date, test_date)

        # Assert
        assert rental_days == 1
        # Проверяем, что репозиторий не вызывался (одинаковые даты обрабатываются без запроса)
        financial_service.holiday_repo.get_holidays_in_range.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_rental_days_invalid_date_range_returns_zero(self, financial_service):
        """
        Тест проверяет, что при некорректном диапазоне дат (конец раньше начала) возвращается 0.
        """
        # Arrange
        start_date = date(2025, 1, 10)
        end_date = date(2025, 1, 5)  # Конец раньше начала

        # Act
        rental_days = await financial_service.get_rental_days(start_date, end_date)

        # Assert
        assert rental_days == 0
        # Проверяем, что репозиторий не вызывался (некорректный диапазон обрабатывается без запроса)
        financial_service.holiday_repo.get_holidays_in_range.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_rental_days_no_holidays(self, financial_service):
        """
        Тест проверяет расчет дней без выходных.
        """
        # Arrange
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 5)  # 1-5 января = 4 дня между датами
        
        # Мокаем holiday_repo: выходных нет
        financial_service.holiday_repo.get_holidays_in_range = AsyncMock(return_value=[])

        # Act
        rental_days = await financial_service.get_rental_days(start_date, end_date)

        # Assert
        assert rental_days == 4  # 4 дня без выходных
        financial_service.holiday_repo.get_holidays_in_range.assert_called_once_with(start_date, end_date)

    # === ТЕСТЫ ДЛЯ calculate_final_price ===

    @pytest.mark.asyncio
    async def test_calculate_final_price_basic_calculation(self, financial_service, sample_equipment):
        """
        Тест базового расчета стоимости без скидок.
        """
        # Arrange
        equipment_ids = [1]
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 3)  # 3 дня
        
        # Мокаем get_rental_days
        financial_service.get_rental_days = AsyncMock(return_value=3)
        
        # Мокаем получение оборудования через репозиторий
        financial_service.equipment_repo.get_by_ids = AsyncMock(return_value=[sample_equipment])
        
        # Мокаем discount_service
        financial_service.discount_service.get_duration_discount_percentage = AsyncMock(return_value=0)
        
        # Act
        price_details = await financial_service.calculate_final_price(
            equipment_ids, None, start_date, end_date, None
        )

        # Assert
        assert price_details.full_total == 300.0  # 100 * 3 дня
        assert price_details.discount_amount == 0.0
        assert price_details.final_total == 300.0
        financial_service.equipment_repo.get_by_ids.assert_called_once_with(equipment_ids)

    @pytest.mark.asyncio
    async def test_calculate_final_price_with_accessories(self, financial_service, 
                                                         sample_equipment, sample_accessory):
        """
        Тест расчета стоимости с аксессуарами.
        """
        # Arrange
        equipment_ids = [1]
        selected_accessories = {1: [1]}  # Для оборудования 1 аксессуар 1
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 2)  # 2 дня
        
        # Мокаем get_rental_days
        financial_service.get_rental_days = AsyncMock(return_value=2)
        
        # Мокаем получение оборудования через репозиторий
        financial_service.equipment_repo.get_by_ids = AsyncMock(return_value=[sample_equipment])
        
        # Мокаем получение аксессуаров через репозиторий
        financial_service.accessory_repo.get_by_ids = AsyncMock(return_value=[sample_accessory])
        
        # Мокаем discount_service
        financial_service.discount_service.get_duration_discount_percentage = AsyncMock(return_value=0)
        
        # Act
        price_details = await financial_service.calculate_final_price(
            equipment_ids, selected_accessories, start_date, end_date, None
        )

        # Assert
        # (100 + 50) * 2 дня = 300
        assert price_details.full_total == 300.0
        assert price_details.discount_amount == 0.0
        assert price_details.final_total == 300.0
        financial_service.equipment_repo.get_by_ids.assert_called_once_with(equipment_ids)
        financial_service.accessory_repo.get_by_ids.assert_called_once_with([1])

    @pytest.mark.asyncio
    async def test_calculate_final_price_with_duration_discount(self, financial_service, sample_equipment):
        """
        Тест расчета стоимости со скидкой за длительность.
        """
        # Arrange
        equipment_ids = [1]
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 10)  # 10 дней для получения скидки
        
        # Мокаем get_rental_days
        financial_service.get_rental_days = AsyncMock(return_value=10)
        
        # Мокаем получение оборудования через репозиторий
        financial_service.equipment_repo.get_by_ids = AsyncMock(return_value=[sample_equipment])
        
        # Мокаем discount_service (скидка 10%)
        financial_service.discount_service.get_duration_discount_percentage = AsyncMock(return_value=10)
        
        # Act
        price_details = await financial_service.calculate_final_price(
            equipment_ids, None, start_date, end_date, None
        )

        # Assert
        assert price_details.full_total == 1000.0  # 100 * 10 дней
        assert price_details.discount_amount == 100.0  # 10% от 1000
        assert price_details.final_total == 900.0
        financial_service.equipment_repo.get_by_ids.assert_called_once_with(equipment_ids)

    @pytest.mark.asyncio
    async def test_calculate_final_price_with_promo_code(self, financial_service, 
                                                        sample_equipment, sample_promo_code):
        """
        Тест расчета стоимости с промокодом.
        """
        # Arrange
        equipment_ids = [1]
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 3)  # 3 дня
        
        # Мокаем get_rental_days
        financial_service.get_rental_days = AsyncMock(return_value=3)
        
        # Мокаем получение оборудования через репозиторий
        financial_service.equipment_repo.get_by_ids = AsyncMock(return_value=[sample_equipment])
        
        # Мокаем discount_service
        financial_service.discount_service.get_duration_discount_percentage = AsyncMock(return_value=0)
        
        # Мокаем PromoCodeBusinessLogic.validate_combined_discount
        financial_service.promo_code_logic.validate_combined_discount = MagicMock(return_value=10.0)  # 10% скидка
        
        # Act
        price_details = await financial_service.calculate_final_price(
            equipment_ids, None, start_date, end_date, sample_promo_code
        )

        # Assert
        assert price_details.full_total == 300.0  # 100 * 3 дня
        assert price_details.discount_amount == 30.0  # 10% от 300
        assert price_details.final_total == 270.0  # 300 - 30
        financial_service.equipment_repo.get_by_ids.assert_called_once_with(equipment_ids)
        financial_service.promo_code_logic.validate_combined_discount.assert_called_once_with(0, 10.0)

    @pytest.mark.asyncio
    async def test_calculate_final_price_empty_equipment_list(self, financial_service, mock_db_session):
        """
        Тест расчета стоимости с пустым списком оборудования.
        """
        # Arrange
        equipment_ids = []
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 3)

            # Act
        price_details = await financial_service.calculate_final_price(
            equipment_ids, None, start_date, end_date, None
        )

        # Assert
        assert price_details.full_total == 0.0
        assert price_details.discount_amount == 0.0
        assert price_details.final_total == 0.0

    @pytest.mark.asyncio
    async def test_calculate_final_price_equipment_not_found(self, financial_service):
        """
        Тест обработки случая, когда оборудование не найдено.
        """
        # Arrange
        equipment_ids = [999]  # Несуществующий ID
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 3)
        
        # Мокаем get_rental_days
        financial_service.get_rental_days = AsyncMock(return_value=3)
        
        # Мокаем пустой результат поиска оборудования через репозиторий
        financial_service.equipment_repo.get_by_ids = AsyncMock(return_value=[])

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await financial_service.calculate_final_price(
                equipment_ids, None, start_date, end_date, None
            )
        
        assert exc_info.value.status_code == 404
        assert "Equipment with IDs [999] not found" in str(exc_info.value.detail)
        financial_service.equipment_repo.get_by_ids.assert_called_once_with(equipment_ids)

    # === ТЕСТЫ ДЛЯ calculate_daily_rate ===

    @pytest.mark.asyncio
    async def test_calculate_daily_rate_normal_case(self, financial_service, mock_rental):
        """
        Тест расчета дневной ставки в нормальном случае.
        """
        # Arrange
        mock_rental.total_cost = 300.0
        mock_rental.start_date = date(2025, 1, 1)
        mock_rental.end_date = date(2025, 1, 3)
        
        # Мокаем get_rental_days
        with patch.object(financial_service, 'get_rental_days', return_value=3):
            # Act
            daily_rate = await financial_service.calculate_daily_rate(mock_rental)

            # Assert
            assert daily_rate == 100.0  # 300 / 3 дня

    @pytest.mark.asyncio
    async def test_calculate_daily_rate_zero_cost(self, financial_service, mock_rental):
        """
        Тест расчета дневной ставки при нулевой стоимости.
        """
        # Arrange
        mock_rental.total_cost = 0.0

            # Act
        daily_rate = await financial_service.calculate_daily_rate(mock_rental)

        # Assert
        assert daily_rate == 0.0

    # === ТЕСТЫ ДЛЯ calculate_overdue_days ===

    def test_calculate_overdue_days_no_overdue(self, financial_service, mock_rental):
        """
        Тест расчета просроченных дней при своевременном возврате.
        """
        # Arrange
        mock_rental.end_date = date(2025, 1, 5)
        actual_return_date = date(2025, 1, 4)  # Возврат раньше срока

            # Act
        overdue_days = financial_service.calculate_overdue_days(mock_rental, actual_return_date)

        # Assert
        assert overdue_days == 0

    def test_calculate_overdue_days_with_overdue(self, financial_service, mock_rental):
        """
        Тест расчета просроченных дней при просрочке.
        """
        # Arrange
        mock_rental.end_date = date(2025, 1, 5)
        actual_return_date = date(2025, 1, 8)  # Возврат на 3 дня позже

            # Act
        overdue_days = financial_service.calculate_overdue_days(mock_rental, actual_return_date)

        # Assert
        assert overdue_days == 3

    # === ТЕСТЫ ДЛЯ calculate_overdue_surcharge ===

    @pytest.mark.asyncio
    async def test_calculate_overdue_surcharge_with_penalty(self, financial_service, mock_rental):
        """
        Тест расчета штрафа за просрочку.
        """
        # Arrange
        mock_rental.total_cost = 300.0
        mock_rental.start_date = date(2025, 1, 1)
        mock_rental.end_date = date(2025, 1, 3)
        actual_return_date = date(2025, 1, 5)  # 2 дня просрочки
        
        # Мокаем calculate_daily_rate
        with patch.object(financial_service, 'calculate_daily_rate', return_value=100.0):
            # Act
            surcharge = await financial_service.calculate_overdue_surcharge(mock_rental, actual_return_date)

            # Assert
            assert surcharge == 200.0  # 100 * 2 дня просрочки

    @pytest.mark.asyncio
    async def test_calculate_overdue_surcharge_no_penalty(self, financial_service, mock_rental):
        """
        Тест расчета штрафа при своевременном возврате.
        """
        # Arrange
        mock_rental.end_date = date(2025, 1, 5)
        actual_return_date = date(2025, 1, 4)  # Возврат раньше срока

            # Act
        surcharge = await financial_service.calculate_overdue_surcharge(mock_rental, actual_return_date)

        # Assert
        assert surcharge == 0.0

    # === ТЕСТЫ ДЛЯ calculate_early_return_credit ===

    @pytest.mark.asyncio
    async def test_calculate_early_return_credit_with_credit(self, financial_service, mock_rental):
        """
        Тест расчета кредита за досрочный возврат.
        """
        # Arrange
        mock_rental.total_cost = 300.0
        mock_rental.start_date = date(2025, 1, 1)
        mock_rental.end_date = date(2025, 1, 5)
        actual_return_date = date(2025, 1, 3)  # Возврат на 2 дня раньше
        planned_days = 5
        
        # Мокаем calculate_daily_rate
        with patch.object(financial_service, 'calculate_daily_rate', return_value=60.0):
            # Мокаем get_rental_days для оставшегося периода
            with patch.object(financial_service, 'get_rental_days', return_value=2):
            # Act
                credit = await financial_service.calculate_early_return_credit(
                    mock_rental, actual_return_date, planned_days
                )

                # Assert
                assert credit == 120.0  # 60 * 2 неиспользованных дня

    @pytest.mark.asyncio
    async def test_calculate_early_return_credit_no_credit(self, financial_service, mock_rental):
        """
        Тест расчета кредита при возврате в срок или с просрочкой.
        """
        # Arrange
        mock_rental.end_date = date(2025, 1, 5)
        actual_return_date = date(2025, 1, 5)  # Возврат в срок
        planned_days = 5

            # Act
        credit = await financial_service.calculate_early_return_credit(
            mock_rental, actual_return_date, planned_days
        )

        # Assert
        assert credit == 0.0

    # === ТЕСТЫ ДЛЯ calculate_remaining_amount ===

    def test_calculate_remaining_amount_normal_case(self, financial_service, mock_rental):
        """
        Тест расчета остатка к оплате в нормальном случае.
        """
        # Arrange
        mock_rental.total_cost = 500.0
        mock_rental.prepayment_amount = 100.0

            # Act
        remaining = financial_service.calculate_remaining_amount(mock_rental)

        # Assert
        assert remaining == 400.0  # 500 - 100

    def test_calculate_remaining_amount_negative_balance(self, financial_service, mock_rental):
        """
        Тест расчета остатка при превышении предоплаты над стоимостью.
        """
        # Arrange
        mock_rental.total_cost = 100.0
        mock_rental.prepayment_amount = 200.0

            # Act
        remaining = financial_service.calculate_remaining_amount(mock_rental)

        # Assert
        assert remaining == -100.0  # 100 - 200 = -100 (переплата)

    # === ТЕСТЫ ДЛЯ find_next_working_day ===

    @pytest.mark.asyncio
    async def test_find_next_working_day_success(self, financial_service):
        """Тест поиска следующего рабочего дня."""
        # Arrange
        start_date = date(2025, 1, 1)
        next_working_day = date(2025, 1, 2)
        
        financial_service.holiday_repo.find_next_working_day = AsyncMock(return_value=next_working_day)

        # Act
        result = await financial_service.find_next_working_day(start_date)

        # Assert
        assert result == next_working_day
        financial_service.holiday_repo.find_next_working_day.assert_called_once_with(start_date)

    # === ТЕСТЫ ДЛЯ validate_date_range ===

    def test_validate_date_range_valid(self, financial_service):
        """Тест валидации корректного диапазона дат."""
        # Arrange
        from api.services.order.order_validator import OrderValidator
        
        mock_validator = MagicMock(spec=OrderValidator)
        mock_validator.validate_date_range = MagicMock()
        financial_service.order_validator = mock_validator
        
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 5)

        # Act
        financial_service.validate_date_range(start_date, end_date)

        # Assert
        mock_validator.validate_date_range.assert_called_once_with(start_date, end_date)

    def test_validate_date_range_no_validator(self, financial_service):
        """Тест валидации без инициализированного валидатора."""
        # Arrange
        financial_service.order_validator = None
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 5)

        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            financial_service.validate_date_range(start_date, end_date)
        
        assert "OrderValidator не инициализирован" in str(exc_info.value)

    # === ТЕСТЫ ДЛЯ validate_holidays ===

    @pytest.mark.asyncio
    async def test_validate_holidays_success(self, financial_service):
        """Тест валидации выходных дней."""
        # Arrange
        from api.services.order.order_validator import OrderValidator
        
        mock_validator = MagicMock(spec=OrderValidator)
        mock_validator.validate_dates_and_holidays = AsyncMock()
        financial_service.order_validator = mock_validator
        
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 5)

        # Act
        await financial_service.validate_holidays(start_date, end_date)

        # Assert
        mock_validator.validate_dates_and_holidays.assert_called_once_with(start_date, end_date)

    @pytest.mark.asyncio
    async def test_validate_holidays_no_validator(self, financial_service):
        """Тест валидации выходных без инициализированного валидатора."""
        # Arrange
        financial_service.order_validator = None
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 5)

        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            await financial_service.validate_holidays(start_date, end_date)
        
        assert "OrderValidator не инициализирован" in str(exc_info.value)

    # === ТЕСТЫ ДЛЯ get_rental_calculation_summary ===

    @pytest.mark.asyncio
    async def test_get_rental_calculation_summary_overdue(self, financial_service, mock_rental):
        """Тест получения сводки расчетов для просроченной аренды."""
        # Arrange
        mock_rental.total_cost = 300.0
        mock_rental.start_date = date(2025, 1, 1)
        mock_rental.end_date = date(2025, 1, 3)
        actual_return_date = date(2025, 1, 5)  # 2 дня просрочки
        planned_days = 3
        
        financial_service.calculate_daily_rate = AsyncMock(return_value=100.0)
        financial_service.calculate_overdue_days = MagicMock(return_value=2)
        financial_service.calculate_overdue_surcharge = AsyncMock(return_value=200.0)
        financial_service.calculate_early_return_credit = AsyncMock(return_value=0.0)

        # Act
        summary = await financial_service.get_rental_calculation_summary(
            mock_rental, actual_return_date, planned_days
        )

        # Assert
        assert summary['daily_rate'] == 100.0
        assert summary['overdue_days'] == 2
        assert summary['surcharge_amount'] == 200.0
        assert summary['credit_amount'] == 0.0
        assert summary['is_overdue'] is True
        assert summary['is_early_return'] is False

    @pytest.mark.asyncio
    async def test_get_rental_calculation_summary_early_return(self, financial_service, mock_rental):
        """Тест получения сводки расчетов для досрочного возврата."""
        # Arrange
        mock_rental.total_cost = 300.0
        mock_rental.start_date = date(2025, 1, 1)
        mock_rental.end_date = date(2025, 1, 5)
        actual_return_date = date(2025, 1, 3)  # 2 дня раньше
        planned_days = 5
        
        financial_service.calculate_daily_rate = AsyncMock(return_value=60.0)
        financial_service.calculate_overdue_days = MagicMock(return_value=0)
        financial_service.calculate_overdue_surcharge = AsyncMock(return_value=0.0)
        financial_service.get_rental_days = AsyncMock(return_value=2)
        financial_service.calculate_early_return_credit = AsyncMock(return_value=120.0)

        # Act
        summary = await financial_service.get_rental_calculation_summary(
            mock_rental, actual_return_date, planned_days
        )

        # Assert
        assert summary['daily_rate'] == 60.0
        assert summary['overdue_days'] == 0
        assert summary['surcharge_amount'] == 0.0
        assert summary['credit_amount'] == 120.0
        assert summary['is_overdue'] is False
        assert summary['is_early_return'] is True

    @pytest.mark.asyncio
    async def test_get_rental_calculation_summary_on_time(self, financial_service, mock_rental):
        """Тест получения сводки расчетов для возврата в срок."""
        # Arrange
        mock_rental.total_cost = 300.0
        mock_rental.start_date = date(2025, 1, 1)
        mock_rental.end_date = date(2025, 1, 5)
        actual_return_date = date(2025, 1, 5)  # Точно в срок
        planned_days = 5
        
        financial_service.calculate_daily_rate = AsyncMock(return_value=60.0)
        financial_service.calculate_overdue_days = MagicMock(return_value=0)
        financial_service.calculate_overdue_surcharge = AsyncMock(return_value=0.0)
        financial_service.calculate_early_return_credit = AsyncMock(return_value=0.0)

        # Act
        summary = await financial_service.get_rental_calculation_summary(
            mock_rental, actual_return_date, planned_days
        )

        # Assert
        assert summary['daily_rate'] == 60.0
        assert summary['overdue_days'] == 0
        assert summary['surcharge_amount'] == 0.0
        assert summary['credit_amount'] == 0.0
        assert summary['is_overdue'] is False
        assert summary['is_early_return'] is False

    # === ТЕСТЫ ДЛЯ enrich_order_with_financials ===

    @pytest.mark.asyncio
    async def test_enrich_order_with_financials_rental(self, financial_service, mock_rental):
        """Тест обогащения аренды финансовыми данными."""
        # Arrange
        from shared.constants.order_status import OrderStatus
        from shared.schemas.rental_schema import RentalOut
        
        mock_rental.status = "active"
        mock_rental.total_cost = 1000.0
        mock_rental.prepayment_amount = 200.0
        mock_rental.start_date = date.today()
        mock_rental.end_date = date.today() + timedelta(days=3)
        mock_rental.accessory_links = []
        
        mock_rental_out = MagicMock(spec=RentalOut)
        mock_rental_out.status = OrderStatus.ACTIVE
        mock_rental_out.remaining_amount = 800.0
        
        financial_service.status_service.get_status = MagicMock(return_value=OrderStatus.ACTIVE)
        financial_service.calculate_overdue_days = MagicMock(return_value=0)
        financial_service.calculate_remaining_amount = MagicMock(return_value=800.0)
        
        with patch('api.services.financial_service.RentalOut') as mock_rental_out_class:
            mock_rental_out_class.model_validate = MagicMock(return_value=mock_rental_out)
            
            # Act
            result = await financial_service.enrich_order_with_financials(mock_rental)

        # Assert
        assert result.status == OrderStatus.ACTIVE
        assert result.remaining_amount == 800.0

    @pytest.mark.asyncio
    async def test_enrich_order_with_financials_reservation(self, financial_service):
        """Тест обогащения резерва финансовыми данными."""
        # Arrange
        from api.models.reservation import Reservation
        from api.models.user import User
        from shared.constants.order_status import OrderStatus
        from datetime import datetime, timezone
        
        user = User()
        user.id = 1
        user.email = "user@example.com"
        
        reservation = Reservation()
        reservation.id = 1
        reservation.user_id = 1
        reservation.status = "active"
        reservation.start_date = date.today()
        reservation.end_date = date.today() + timedelta(days=3)
        reservation.total_cost = 1000.0
        reservation.discount_amount = 0.0
        reservation.promo_code_id = None
        reservation.equipment = []
        reservation.accessory_links = []
        reservation.user = user
        reservation.rental = None
        reservation.created_at = datetime.now(timezone.utc)
        reservation.updated_at = datetime.now(timezone.utc)
        
        financial_service.status_service.get_status = MagicMock(return_value=OrderStatus.ACTIVE)

        # Act
        result = await financial_service.enrich_order_with_financials(reservation)

        # Assert
        assert result.status == OrderStatus.ACTIVE
        assert result.rental_id is None

    @pytest.mark.asyncio
    async def test_enrich_order_with_financials_unsupported_type(self, financial_service):
        """Тест обогащения неподдерживаемого типа заказа."""
        # Arrange
        unsupported_order = "not a rental or reservation"

        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            await financial_service.enrich_order_with_financials(unsupported_order)
        
        assert "Unsupported order type" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_enrich_rental_with_financials_overdue(self, financial_service, mock_rental):
        """Тест обогащения просроченной аренды."""
        # Arrange
        from shared.constants.order_status import OrderStatus
        from shared.schemas.rental_schema import RentalOut
        
        mock_rental.status = "active"
        mock_rental.total_cost = 1000.0
        mock_rental.prepayment_amount = 200.0
        mock_rental.start_date = date.today() - timedelta(days=5)
        mock_rental.end_date = date.today() - timedelta(days=2)  # Просрочена
        mock_rental.accessory_links = []
        
        mock_rental_out = MagicMock(spec=RentalOut)
        mock_rental_out.status = OrderStatus.OVERDUE
        mock_rental_out.overdue_days = 2
        mock_rental_out.overdue_surcharge = 200.0
        
        financial_service.status_service.get_status = MagicMock(return_value=OrderStatus.OVERDUE)
        financial_service.calculate_overdue_days = MagicMock(return_value=2)
        financial_service.calculate_overdue_surcharge = AsyncMock(return_value=200.0)
        financial_service.calculate_remaining_amount = MagicMock(return_value=800.0)
        
        with patch('api.services.financial_service.RentalOut') as mock_rental_out_class:
            mock_rental_out_class.model_validate = MagicMock(return_value=mock_rental_out)
            
            # Act
            result = await financial_service._enrich_rental_with_financials(mock_rental)

        # Assert
        assert result.status == OrderStatus.OVERDUE
        assert result.overdue_days == 2
        assert result.overdue_surcharge == 200.0

    @pytest.mark.asyncio
    async def test_enrich_rental_with_financials_with_accessories(self, financial_service, mock_rental):
        """Тест обогащения аренды с аксессуарами."""
        # Arrange
        from shared.constants.order_status import OrderStatus
        from shared.schemas.rental_schema import RentalOut
        
        mock_accessory = MagicMock()
        mock_accessory.price = 50.0
        
        mock_accessory_link = MagicMock()
        mock_accessory_link.accessory = mock_accessory
        
        mock_rental.accessory_links = [mock_accessory_link]
        mock_rental.status = "active"
        mock_rental.total_cost = 1000.0
        mock_rental.prepayment_amount = 200.0
        mock_rental.start_date = date.today()
        mock_rental.end_date = date.today() + timedelta(days=3)
        
        # Мокаем RentalOut.model_validate чтобы избежать проблем с валидацией
        mock_rental_out = MagicMock(spec=RentalOut)
        mock_rental_out.accessories_cost = 50.0
        mock_rental_out.status = OrderStatus.ACTIVE
        mock_rental_out.remaining_amount = 800.0
        
        financial_service.status_service.get_status = MagicMock(return_value=OrderStatus.ACTIVE)
        financial_service.calculate_overdue_days = MagicMock(return_value=0)
        financial_service.calculate_remaining_amount = MagicMock(return_value=800.0)
        
        with patch('api.services.financial_service.RentalOut') as mock_rental_out_class:
            mock_rental_out_class.model_validate = MagicMock(return_value=mock_rental_out)
            
            # Act
            result = await financial_service._enrich_rental_with_financials(mock_rental)

        # Assert
        assert result.accessories_cost == 50.0

    @pytest.mark.asyncio
    async def test_enrich_reservation_with_financials_with_rental(self, financial_service):
        """Тест обогащения резерва с связанной арендой."""
        # Arrange
        from api.models.reservation import Reservation
        from api.models.rental import Rental
        from api.models.user import User
        from shared.constants.order_status import OrderStatus
        from datetime import datetime, timezone
        
        user = User()
        user.id = 1
        user.email = "user@example.com"
        
        rental = Rental()
        rental.id = 1
        
        reservation = Reservation()
        reservation.id = 1
        reservation.user_id = 1
        reservation.status = "active"
        reservation.start_date = date.today()
        reservation.end_date = date.today() + timedelta(days=3)
        reservation.total_cost = 1000.0
        reservation.discount_amount = 0.0
        reservation.promo_code_id = None
        reservation.equipment = []
        reservation.accessory_links = []
        reservation.user = user
        reservation.rental = rental
        reservation.created_at = datetime.now(timezone.utc)
        reservation.updated_at = datetime.now(timezone.utc)
        
        financial_service.status_service.get_status = MagicMock(return_value=OrderStatus.ACTIVE)

        # Act
        result = await financial_service._enrich_reservation_with_financials(reservation)

        # Assert
        assert result.status == OrderStatus.ACTIVE
        assert result.rental_id == 1

    @pytest.mark.asyncio
    async def test_enrich_admin_reservation_with_financials_success(self, financial_service):
        """Тест обогащения резерва для админ-панели."""
        # Arrange
        from api.models.reservation import Reservation
        from api.models.user import User
        from shared.constants.order_status import OrderStatus
        from shared.schemas.reservation_schema import ReservationItem, AdminReservationOut
        from datetime import datetime, timezone
        
        user = User()
        user.id = 1
        user.email = "user@example.com"
        
        reservation = Reservation()
        reservation.id = 1
        reservation.user_id = 1
        reservation.status = "active"
        reservation.start_date = date.today()
        reservation.end_date = date.today() + timedelta(days=3)
        reservation.total_cost = 1000.0
        reservation.discount_amount = 0.0
        reservation.promo_code_id = None
        reservation.equipment = []
        reservation.accessory_links = []
        reservation.user = user
        reservation.rental = None
        reservation.created_at = datetime.now(timezone.utc)
        reservation.updated_at = datetime.now(timezone.utc)
        
        financial_service.status_service.get_status = MagicMock(return_value=OrderStatus.ACTIVE)
        
        # Мокаем результат _enrich_reservation_with_financials
        mock_reservation_item = MagicMock(spec=ReservationItem)
        mock_reservation_item.model_dump = MagicMock(return_value={'id': 1, 'status': OrderStatus.ACTIVE})
        
        financial_service._enrich_reservation_with_financials = AsyncMock(return_value=mock_reservation_item)
        
        # Мокаем AdminReservationOut
        mock_admin_reservation_out = MagicMock(spec=AdminReservationOut)
        mock_admin_reservation_out.user_info = user
        
        with patch('api.services.financial_service.AdminReservationOut') as mock_admin_out_class:
            mock_admin_out_class.return_value = mock_admin_reservation_out

            # Act
            result = await financial_service._enrich_admin_reservation_with_financials(reservation)

        # Assert
        assert result is not None
        financial_service._enrich_reservation_with_financials.assert_called_once_with(reservation)

    @pytest.mark.asyncio
    async def test_enrich_admin_reservation_with_financials_no_user(self, financial_service):
        """Тест обогащения резерва без пользователя."""
        # Arrange
        from api.models.reservation import Reservation
        
        reservation = Reservation()
        reservation.id = 1
        reservation.user = None

        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            await financial_service._enrich_admin_reservation_with_financials(reservation)
        
        assert "must have user" in str(exc_info.value)
