#!/usr/bin/env python3
"""
Простой тест PeriodService без зависимостей от pytest и базы данных
"""

import sys
import os
from datetime import date, timedelta

# Добавляем путь к модулям
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from shared.services.period_service import PeriodService, PeriodType

def test_period_service():
    """Простой тест PeriodService"""
    print("🧪 Тестирование PeriodService...")
    
    period_service = PeriodService()
    
    # Тест 1: Недельный период
    print("\n1. Тест недельного периода:")
    start_date, end_date = period_service.get_period_dates("week", 0)
    print(f"   Текущая неделя: {start_date} - {end_date}")
    assert start_date.weekday() == 0, "Начало недели должно быть понедельником"
    assert end_date.weekday() == 6, "Конец недели должен быть воскресеньем"
    assert (end_date - start_date).days == 6, "Неделя должна длиться 6 дней"
    print("   ✅ Недельный период работает корректно")
    
    # Тест 2: Месячный период
    print("\n2. Тест месячного периода:")
    start_date, end_date = period_service.get_period_dates("month", 0)
    print(f"   Текущий месяц: {start_date} - {end_date}")
    assert start_date.day == 1, "Начало месяца должно быть 1 числом"
    assert end_date.month == start_date.month, "Конец должен быть в том же месяце"
    print("   ✅ Месячный период работает корректно")
    
    # Тест 3: Квартальный период
    print("\n3. Тест квартального периода:")
    start_date, end_date = period_service.get_period_dates("quarter", 0)
    print(f"   Текущий квартал: {start_date} - {end_date}")
    assert start_date.day == 1, "Начало квартала должно быть 1 числом"
    assert start_date.month in [1, 4, 7, 10], "Месяц должен быть началом квартала"
    print("   ✅ Квартальный период работает корректно")
    
    # Тест 4: Годовой период
    print("\n4. Тест годового периода:")
    start_date, end_date = period_service.get_period_dates("year", 0)
    print(f"   Текущий год: {start_date} - {end_date}")
    assert start_date.month == 1 and start_date.day == 1, "Начало года должно быть 1 января"
    assert end_date.month == 12 and end_date.day == 31, "Конец года должен быть 31 декабря"
    print("   ✅ Годовой период работает корректно")
    
    # Тест 5: Смещения
    print("\n5. Тест смещений:")
    current_week = period_service.get_period_dates("week", 0)
    prev_week = period_service.get_period_dates("week", -1)
    next_week = period_service.get_period_dates("week", 1)
    
    print(f"   Предыдущая неделя: {prev_week[0]} - {prev_week[1]}")
    print(f"   Текущая неделя: {current_week[0]} - {current_week[1]}")
    print(f"   Следующая неделя: {next_week[0]} - {next_week[1]}")
    
    assert (current_week[0] - prev_week[0]).days == 7, "Предыдущая неделя должна быть на 7 дней раньше"
    assert (next_week[0] - current_week[0]).days == 7, "Следующая неделя должна быть на 7 дней позже"
    print("   ✅ Смещения работают корректно")
    
    # Тест 6: Метки периодов
    print("\n6. Тест меток периодов:")
    week_label = period_service.get_period_label("week", 0)
    month_label = period_service.get_period_label("month", 0)
    quarter_label = period_service.get_period_label("quarter", 0)
    year_label = period_service.get_period_label("year", 0)
    
    print(f"   Неделя: {week_label}")
    print(f"   Месяц: {month_label}")
    print(f"   Квартал: {quarter_label}")
    print(f"   Год: {year_label}")
    
    assert "Неделя" in week_label, "Метка недели должна содержать 'Неделя'"
    assert "Q" in quarter_label, "Метка квартала должна содержать 'Q'"
    assert str(date.today().year) in year_label, "Метка года должна содержать текущий год"
    print("   ✅ Метки периодов работают корректно")
    
    # Тест 7: Валидация
    print("\n7. Тест валидации:")
    assert period_service.validate_period_params("week", 0) == True, "Валидные параметры должны проходить"
    assert period_service.validate_period_params("invalid", 0) == False, "Невалидный тип должен отклоняться"
    assert period_service.validate_period_params("week", 101) == False, "Большое смещение должно отклоняться"
    print("   ✅ Валидация работает корректно")
    
    # Тест 8: Полная информация о периоде
    print("\n8. Тест полной информации о периоде:")
    info = period_service.get_period_info("week", 0)
    print(f"   Информация: {info}")
    
    assert "type" in info and info["type"] == "week", "Тип должен быть 'week'"
    assert "offset" in info and info["offset"] == 0, "Смещение должно быть 0"
    assert "start_date" in info and "end_date" in info, "Должны быть даты начала и конца"
    assert "label" in info and "days_count" in info, "Должны быть метка и количество дней"
    assert info["days_count"] == 7, "Неделя должна длиться 7 дней"
    print("   ✅ Полная информация работает корректно")
    
    # Тест 9: Enum PeriodType
    print("\n9. Тест enum PeriodType:")
    assert PeriodType.WEEK == "week", "WEEK должен быть 'week'"
    assert PeriodType.MONTH == "month", "MONTH должен быть 'month'"
    assert PeriodType.QUARTER == "quarter", "QUARTER должен быть 'quarter'"
    assert PeriodType.YEAR == "year", "YEAR должен быть 'year'"
    print("   ✅ Enum PeriodType работает корректно")
    
    # Тест 10: Обработка ошибок
    print("\n10. Тест обработки ошибок:")
    try:
        period_service.get_period_dates("invalid", 0)
        assert False, "Должна была быть выброшена ошибка"
    except ValueError as e:
        assert "Неподдерживаемый тип периода" in str(e), "Ошибка должна содержать правильное сообщение"
        print("   ✅ Обработка ошибок работает корректно")
    
    print("\n🎉 Все тесты PeriodService прошли успешно!")
    return True

if __name__ == "__main__":
    try:
        success = test_period_service()
        if success:
            print("\n✅ PeriodService полностью функционален!")
            sys.exit(0)
        else:
            print("\n❌ Тесты PeriodService не прошли!")
            sys.exit(1)
    except Exception as e:
        print(f"\n💥 Ошибка при тестировании PeriodService: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
