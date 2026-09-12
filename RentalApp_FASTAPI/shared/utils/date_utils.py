# shared/utils/date_utils.py
"""
Централизованные утилиты для работы с датами и временем в часовом поясе сервиса (Europe/Astrakhan).
"""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo
from typing import Optional

ASTRAKHAN_TZ = ZoneInfo("Europe/Astrakhan")


def get_business_now() -> datetime:
    """Возвращает текущее время в часовом поясе проекта (Europe/Astrakhan)."""
    return datetime.now(ASTRAKHAN_TZ)


def get_business_today() -> date:
    """Возвращает текущую календарную дату в часовом поясе проекта (Europe/Astrakhan)."""
    return datetime.now(ASTRAKHAN_TZ).date()


def to_business_date(dt: Optional[datetime]) -> Optional[date]:
    """
    Переводит datetime (naive или aware) в часовой пояс проекта (Europe/Astrakhan)
    и возвращает календарную дату.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Если временная метка naive, трактуем её как UTC (стандарт хранения в PostgreSQL)
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(ASTRAKHAN_TZ).date()


def to_business_datetime(dt: Optional[datetime]) -> Optional[datetime]:
    """
    Переводит datetime в часовой пояс проекта (Europe/Astrakhan).
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(ASTRAKHAN_TZ)
