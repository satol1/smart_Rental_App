"""
Unit тесты для PeriodService
"""

import pytest
from datetime import date, timedelta
from shared.services.period_service import PeriodService, PeriodType


class TestPeriodService:
    """Тесты для PeriodService"""

    def setup_method(self):
        """Настройка для каждого теста"""
        self.period_service = PeriodService()

    def test_get_period_dates_week(self):
        """Тест вычисления дат для недельного периода"""
        # Тестируем текущую неделю (offset = 0)
        start_date, end_date = self.period_service.get_period_dates("week", 0)
        
        # Проверяем, что это понедельник и воскресенье
        assert start_date.weekday() == 0  # Понедельник
        assert end_date.weekday() == 6    # Воскресенье
        assert (end_date - start_date).days == 6

    def test_get_period_dates_week_offset(self):
        """Тест вычисления дат для недельного периода со смещением"""
        # Тестируем предыдущую неделю (offset = -1)
        start_date_prev, end_date_prev = self.period_service.get_period_dates("week", -1)
        start_date_curr, end_date_curr = self.period_service.get_period_dates("week", 0)
        
        # Предыдущая неделя должна быть на 7 дней раньше
        assert (start_date_curr - start_date_prev).days == 7
        assert (end_date_curr - end_date_prev).days == 7

    def test_get_period_dates_month(self):
        """Тест вычисления дат для месячного периода"""
        start_date, end_date = self.period_service.get_period_dates("month", 0)
        
        # Проверяем, что это первый и последний день месяца
        assert start_date.day == 1
        # Последний день месяца должен быть в том же месяце
        assert end_date.month == start_date.month
        assert end_date.year == start_date.year

    def test_get_period_dates_month_offset(self):
        """Тест вычисления дат для месячного периода со смещением"""
        start_date_prev, end_date_prev = self.period_service.get_period_dates("month", -1)
        start_date_curr, end_date_curr = self.period_service.get_period_dates("month", 0)
        
        # Предыдущий месяц должен быть раньше текущего
        if start_date_curr.month == 1:
            assert start_date_prev.month == 12
            assert start_date_prev.year == start_date_curr.year - 1
        else:
            assert start_date_prev.month == start_date_curr.month - 1
            assert start_date_prev.year == start_date_curr.year

    def test_get_period_dates_quarter(self):
        """Тест вычисления дат для квартального периода"""
        start_date, end_date = self.period_service.get_period_dates("quarter", 0)
        
        # Проверяем, что это первый день квартала
        assert start_date.day == 1
        # Месяц должен быть началом квартала (1, 4, 7, 10)
        assert start_date.month in [1, 4, 7, 10]

    def test_get_period_dates_quarter_offset(self):
        """Тест вычисления дат для квартального периода со смещением"""
        start_date_prev, end_date_prev = self.period_service.get_period_dates("quarter", -1)
        start_date_curr, end_date_curr = self.period_service.get_period_dates("quarter", 0)
        
        # Предыдущий квартал должен быть на 3 месяца раньше
        if start_date_curr.month in [1, 4, 7]:
            expected_month = start_date_curr.month - 3
            if expected_month <= 0:
                expected_month += 12
                expected_year = start_date_curr.year - 1
            else:
                expected_year = start_date_curr.year
        else:  # month == 10
            expected_month = 7
            expected_year = start_date_curr.year
        
        assert start_date_prev.month == expected_month
        assert start_date_prev.year == expected_year

    def test_get_period_dates_year(self):
        """Тест вычисления дат для годового периода"""
        start_date, end_date = self.period_service.get_period_dates("year", 0)
        
        # Проверяем, что это первый и последний день года
        assert start_date.month == 1
        assert start_date.day == 1
        assert end_date.month == 12
        assert end_date.day == 31
        assert start_date.year == end_date.year

    def test_get_period_dates_year_offset(self):
        """Тест вычисления дат для годового периода со смещением"""
        start_date_prev, end_date_prev = self.period_service.get_period_dates("year", -1)
        start_date_curr, end_date_curr = self.period_service.get_period_dates("year", 0)
        
        # Предыдущий год должен быть на 1 год раньше
        assert start_date_prev.year == start_date_curr.year - 1
        assert end_date_prev.year == end_date_curr.year - 1

    def test_get_period_dates_invalid_type(self):
        """Тест с недопустимым типом периода"""
        with pytest.raises(ValueError, match="Неподдерживаемый тип периода"):
            self.period_service.get_period_dates("invalid", 0)

    def test_get_period_label_week(self):
        """Тест генерации метки для недельного периода"""
        label = self.period_service.get_period_label("week", 0)
        assert "Неделя" in label
        assert " - " in label

    def test_get_period_label_month(self):
        """Тест генерации метки для месячного периода"""
        label = self.period_service.get_period_label("month", 0)
        # Должна содержать название месяца и год
        assert len(label) > 0

    def test_get_period_label_quarter(self):
        """Тест генерации метки для квартального периода"""
        label = self.period_service.get_period_label("quarter", 0)
        assert "Q" in label
        assert any(str(i) in label for i in range(1, 5))  # Q1, Q2, Q3, Q4

    def test_get_period_label_year(self):
        """Тест генерации метки для годового периода"""
        label = self.period_service.get_period_label("year", 0)
        assert str(date.today().year) in label

    def test_validate_period_params_valid(self):
        """Тест валидации корректных параметров"""
        assert self.period_service.validate_period_params("week", 0) == True
        assert self.period_service.validate_period_params("month", -1) == True
        assert self.period_service.validate_period_params("quarter", 5) == True
        assert self.period_service.validate_period_params("year", -10) == True
        assert self.period_service.validate_period_params(None, 0) == True

    def test_validate_period_params_invalid_type(self):
        """Тест валидации недопустимого типа периода"""
        assert self.period_service.validate_period_params("invalid", 0) == False

    def test_validate_period_params_invalid_offset(self):
        """Тест валидации недопустимого смещения"""
        assert self.period_service.validate_period_params("week", 101) == False
        assert self.period_service.validate_period_params("week", -101) == False

    def test_get_period_info(self):
        """Тест получения полной информации о периоде"""
        info = self.period_service.get_period_info("week", 0)
        
        assert "type" in info
        assert "offset" in info
        assert "start_date" in info
        assert "end_date" in info
        assert "label" in info
        assert "days_count" in info
        
        assert info["type"] == "week"
        assert info["offset"] == 0
        assert isinstance(info["start_date"], date)
        assert isinstance(info["end_date"], date)
        assert isinstance(info["label"], str)
        assert isinstance(info["days_count"], int)
        assert info["days_count"] == 7

    def test_period_type_enum(self):
        """Тест enum PeriodType"""
        assert PeriodType.WEEK == "week"
        assert PeriodType.MONTH == "month"
        assert PeriodType.QUARTER == "quarter"
        assert PeriodType.YEAR == "year"

    def test_edge_cases_year_boundary(self):
        """Тест граничных случаев для перехода между годами"""
        # Тестируем переход с декабря на январь
        start_date, end_date = self.period_service.get_period_dates("month", 1)
        current_month = date.today().month
        
        if current_month == 12:
            assert start_date.month == 1
            assert start_date.year == date.today().year + 1

    def test_edge_cases_quarter_boundary(self):
        """Тест граничных случаев для перехода между кварталами"""
        # Тестируем переход с Q4 на Q1
        start_date, end_date = self.period_service.get_period_dates("quarter", 1)
        current_month = date.today().month
        
        if current_month in [10, 11, 12]:  # Q4
            assert start_date.month == 1
            assert start_date.year == date.today().year + 1

    def test_period_consistency(self):
        """Тест согласованности периодов"""
        # Проверяем, что период всегда начинается раньше, чем заканчивается
        for period_type in ["week", "month", "quarter", "year"]:
            for offset in [-2, -1, 0, 1, 2]:
                start_date, end_date = self.period_service.get_period_dates(period_type, offset)
                assert start_date <= end_date
                
                # Проверяем, что период имеет разумную длительность
                days_diff = (end_date - start_date).days
                if period_type == "week":
                    assert days_diff == 6
                elif period_type == "month":
                    assert 27 <= days_diff <= 31  # Разные месяцы имеют разное количество дней
                elif period_type == "quarter":
                    assert 89 <= days_diff <= 92  # Разные кварталы имеют разное количество дней
                elif period_type == "year":
                    # Период inclusive: 1 янв .. 31 дек = 364 дня (365 в високосный)
                    assert days_diff in (364, 365)
