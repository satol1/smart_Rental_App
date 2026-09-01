"""
Сервис для работы с временными периодами.
Предоставляет функциональность для вычисления дат начала и окончания периодов.
"""

from datetime import datetime, date, timedelta
from typing import Optional, Tuple, Dict, Any
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class PeriodType(str, Enum):
    """Типы временных периодов."""
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


class PeriodService:
    """Сервис для работы с временными периодами."""
    
    def get_period_dates(self, period_type: str, period_offset: int = 0) -> Tuple[date, date]:
        """
        Вычисляет даты начала и окончания для указанного периода.
        
        Args:
            period_type: Тип периода (week, month, quarter, year)
            period_offset: Смещение периода (0 = текущий, -1 = предыдущий, 1 = следующий)
            
        Returns:
            Кортеж (дата начала, дата окончания)
            
        Raises:
            ValueError: Если указан неподдерживаемый тип периода
        """
        try:
            period_type_enum = PeriodType(period_type)
        except ValueError:
            raise ValueError(f"Неподдерживаемый тип периода: {period_type}")
        
        today = date.today()
        
        if period_type_enum == PeriodType.WEEK:
            return self._get_week_dates(today, period_offset)
        elif period_type_enum == PeriodType.MONTH:
            return self._get_month_dates(today, period_offset)
        elif period_type_enum == PeriodType.QUARTER:
            return self._get_quarter_dates(today, period_offset)
        elif period_type_enum == PeriodType.YEAR:
            return self._get_year_dates(today, period_offset)
    
    def _get_week_dates(self, base_date: date, offset: int) -> Tuple[date, date]:
        """Вычисляет даты для недельного периода."""
        # Находим понедельник текущей недели
        days_since_monday = base_date.weekday()
        monday = base_date - timedelta(days=days_since_monday)
        
        # Применяем смещение
        target_monday = monday + timedelta(weeks=offset)
        target_sunday = target_monday + timedelta(days=6)
        
        return target_monday, target_sunday
    
    def _get_month_dates(self, base_date: date, offset: int) -> Tuple[date, date]:
        """Вычисляет даты для месячного периода."""
        # Находим первый день текущего месяца
        first_day = base_date.replace(day=1)
        
        # Применяем смещение
        if offset >= 0:
            for _ in range(offset):
                if first_day.month == 12:
                    first_day = first_day.replace(year=first_day.year + 1, month=1)
                else:
                    first_day = first_day.replace(month=first_day.month + 1)
        else:
            for _ in range(abs(offset)):
                if first_day.month == 1:
                    first_day = first_day.replace(year=first_day.year - 1, month=12)
                else:
                    first_day = first_day.replace(month=first_day.month - 1)
        
        # Находим последний день месяца
        if first_day.month == 12:
            next_month = first_day.replace(year=first_day.year + 1, month=1)
        else:
            next_month = first_day.replace(month=first_day.month + 1)
        
        last_day = next_month - timedelta(days=1)
        
        return first_day, last_day
    
    def _get_quarter_dates(self, base_date: date, offset: int) -> Tuple[date, date]:
        """Вычисляет даты для квартального периода."""
        # Определяем текущий квартал
        current_quarter = (base_date.month - 1) // 3 + 1
        quarter_start_month = (current_quarter - 1) * 3 + 1
        
        # Находим первый день текущего квартала
        first_day = base_date.replace(month=quarter_start_month, day=1)
        
        # Применяем смещение
        if offset >= 0:
            for _ in range(offset):
                if first_day.month <= 9:
                    first_day = first_day.replace(month=first_day.month + 3)
                else:
                    first_day = first_day.replace(year=first_day.year + 1, month=1)
        else:
            for _ in range(abs(offset)):
                if first_day.month > 3:
                    first_day = first_day.replace(month=first_day.month - 3)
                else:
                    first_day = first_day.replace(year=first_day.year - 1, month=10)
        
        # Находим последний день квартала
        if first_day.month <= 9:
            next_quarter_start = first_day.replace(month=first_day.month + 3)
        else:
            next_quarter_start = first_day.replace(year=first_day.year + 1, month=1)
        
        last_day = next_quarter_start - timedelta(days=1)
        
        return first_day, last_day
    
    def _get_year_dates(self, base_date: date, offset: int) -> Tuple[date, date]:
        """Вычисляет даты для годового периода."""
        # Находим первый день текущего года
        first_day = base_date.replace(month=1, day=1)
        
        # Применяем смещение
        target_year = first_day.year + offset
        first_day = first_day.replace(year=target_year)
        
        # Последний день года
        last_day = first_day.replace(month=12, day=31)
        
        return first_day, last_day
    
    def get_period_label(self, period_type: str, period_offset: int = 0) -> str:
        """
        Генерирует читаемую метку для периода.
        
        Args:
            period_type: Тип периода
            period_offset: Смещение периода
            
        Returns:
            Строка с описанием периода
        """
        start_date, end_date = self.get_period_dates(period_type, period_offset)
        
        if period_type == PeriodType.WEEK:
            return f"Неделя {start_date.strftime('%d.%m')} - {end_date.strftime('%d.%m.%Y')}"
        elif period_type == PeriodType.MONTH:
            return f"{start_date.strftime('%B %Y')}"
        elif period_type == PeriodType.QUARTER:
            quarter_num = (start_date.month - 1) // 3 + 1
            return f"Q{quarter_num} {start_date.year}"
        elif period_type == PeriodType.YEAR:
            return f"{start_date.year}"
        
        return f"Период {start_date} - {end_date}"
    
    def validate_period_params(self, period_type: Optional[str], period_offset: int = 0) -> bool:
        """
        Валидирует параметры периода.
        
        Args:
            period_type: Тип периода
            period_offset: Смещение периода
            
        Returns:
            True если параметры валидны, False иначе
        """
        if period_type is None:
            return True  # Период не задан - это валидно
        
        try:
            PeriodType(period_type)
        except ValueError:
            return False
        
        # Проверяем разумные пределы смещения
        if abs(period_offset) > 100:  # Ограничиваем смещение разумными пределами
            return False
        
        return True
    
    def get_period_info(self, period_type: str, period_offset: int = 0) -> Dict[str, Any]:
        """
        Возвращает полную информацию о периоде.
        
        Args:
            period_type: Тип периода
            period_offset: Смещение периода
            
        Returns:
            Словарь с информацией о периоде
        """
        start_date, end_date = self.get_period_dates(period_type, period_offset)
        
        return {
            "type": period_type,
            "offset": period_offset,
            "start_date": start_date,
            "end_date": end_date,
            "label": self.get_period_label(period_type, period_offset),
            "days_count": (end_date - start_date).days + 1
        }
