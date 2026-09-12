# tests/unit/test_stage2_soft_cancel_and_timezone.py
"""
Тесты для Этапа 2:
- Soft-cancel резервов (перевод в CANCELLED вместо DELETE, сохранение в БД)
- Запрет повторной отмены и редактирования отмененного резерва
- Корректная обработка часового пояса Europe/Astrakhan в окнах отмены
- Защита CORS fail-fast при DEBUG=False и CORS_ALLOW_WILDCARD=True
"""

import pytest
from datetime import date, datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

from shared.utils.date_utils import (
    ASTRAKHAN_TZ,
    get_business_today,
    get_business_now,
    to_business_date,
)
from shared.constants.order_status import OrderStatus
from api.models.reservation import Reservation
from api.models.rental import Rental
from api.services.order.order_validator import OrderValidator
from config.core import Settings


def test_astrakhan_timezone_utils():
    """Тест перевода времени в часовой пояс Астрахани."""
    # 23:30 UTC 10 сентября -> 03:30 11 сентября в Астрахани (UTC+4)
    utc_dt = datetime(2026, 9, 10, 23, 30, tzinfo=timezone.utc)
    astrakhan_date = to_business_date(utc_dt)
    assert astrakhan_date == date(2026, 9, 11)

    # 01:00 UTC 11 сентября -> 05:00 11 сентября в Астрахани
    utc_dt2 = datetime(2026, 9, 11, 1, 0, tzinfo=timezone.utc)
    assert to_business_date(utc_dt2) == date(2026, 9, 11)

    # Naive datetime (трактуется как UTC)
    naive_dt = datetime(2026, 9, 10, 22, 0)
    assert to_business_date(naive_dt) == date(2026, 9, 11)


def test_validator_rejects_cancelled_reservation_actions():
    """Валидатор запрещает отмену и редактирование уже отмененного резерва."""
    cancelled_res = Reservation(id=10, status=OrderStatus.CANCELLED.value)

    # Повторная отмена -> 400 Bad Request
    with pytest.raises(HTTPException) as exc_cancel:
        OrderValidator.validate_reservation_is_cancellable(None, cancelled_res)
    assert exc_cancel.value.status_code == 400
    assert "уже отменен" in exc_cancel.value.detail

    # Попытка редактирования -> 400 Bad Request
    with pytest.raises(HTTPException) as exc_edit:
        OrderValidator.validate_reservation_is_editable(None, cancelled_res)
    assert exc_edit.value.status_code == 400
    assert "отмененный резерв" in exc_edit.value.detail

    # Попытка конвертации в аренду -> 409 Conflict
    with pytest.raises(HTTPException) as exc_convert:
        OrderValidator.validate_reservation_for_conversion(None, cancelled_res)
    assert exc_convert.value.status_code == 409


def test_validator_revert_uses_business_day():
    """Тест отмены выдачи аренды в пределах одного астраханского дня."""
    now_astrakhan = datetime.now(ASTRAKHAN_TZ)
    
    # Аренда создана сегодня в Астрахани (сохранена в UTC)
    rental_today = Rental(
        id=1,
        reservation_id=5,
        status=OrderStatus.ACTIVE.value,
        created_at=now_astrakhan.astimezone(timezone.utc)
    )
    # Не должно бросать исключение
    OrderValidator.validate_rental_for_revert(None, rental_today)

    # Аренда создана вчера в Астрахани
    yesterday_astrakhan = now_astrakhan - timedelta(days=1)
    rental_yesterday = Rental(
        id=2,
        reservation_id=6,
        status=OrderStatus.ACTIVE.value,
        created_at=yesterday_astrakhan.astimezone(timezone.utc)
    )
    with pytest.raises(HTTPException) as exc:
        OrderValidator.validate_rental_for_revert(None, rental_yesterday)
    assert exc.value.status_code == 403


def test_cors_wildcard_fail_fast_in_production():
    """CORS_ALLOW_WILDCARD=True при DEBUG=False вызывает fail-fast ошибку конфигурации."""
    with pytest.raises(ValueError, match="CORS_ALLOW_WILDCARD"):
        Settings(
            DEBUG=False,
            CORS_ALLOW_WILDCARD=True,
            SECRET_KEY="a" * 32,
            CSRF_SECRET_KEY="b" * 32,
            POSTGRES_PASSWORD="pass"
        )
