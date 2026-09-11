# tests/services/test_optimistic_locking_and_promo_race.py
"""Тесты механизмов этапа 2: оптимистичная блокировка резервов и
гонки на промокодах (условный инкремент, savepoint на PK-конфликте)."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException

from api.services.order.reservation_service import ReservationLifecycleService
from api.repositories.promo_code_repository import PromoCodeRepository
from api.services.promo_code.exceptions import PromoCodeUserUsageLimitError


def _make_execute_result(rowcount):
    result = MagicMock()
    result.rowcount = rowcount
    return result


class TestOptimisticVersionLocking:
    """_ensure_reservation_version: условный UPDATE по version -> 409 при конфликте."""

    @pytest.fixture
    def service(self):
        svc = ReservationLifecycleService.__new__(ReservationLifecycleService)
        svc.db = AsyncMock()
        return svc

    @pytest.mark.asyncio
    async def test_version_bump_success(self, service):
        reservation = MagicMock()
        reservation.id = 10
        reservation.version = 3
        service.db.execute = AsyncMock(return_value=_make_execute_result(1))

        await service._ensure_reservation_version(reservation)

        assert reservation.version == 4
        service.db.execute.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_version_conflict_returns_409(self, service):
        """Параллельная транзакция уже incremented version -> rowcount 0 -> 409."""
        reservation = MagicMock()
        reservation.id = 10
        reservation.version = 3
        # UPDATE ... WHERE version=3 не совпал (уже 4)
        service.db.execute = AsyncMock(return_value=_make_execute_result(0))

        with pytest.raises(HTTPException) as exc_info:
            await service._ensure_reservation_version(reservation)

        assert exc_info.value.status_code == 409

    @pytest.mark.asyncio
    async def test_none_version_treated_as_one(self, service):
        """У старых записей/моков version=None — трактуется как 1."""
        reservation = MagicMock()
        reservation.id = 10
        reservation.version = None
        service.db.execute = AsyncMock(return_value=_make_execute_result(1))

        await service._ensure_reservation_version(reservation)

        assert reservation.version == 2


class TestPromoCodeUsageRace:
    """Атомарность записи использования промокода."""

    @pytest.fixture
    def repo(self):
        return PromoCodeRepository.__new__(PromoCodeRepository)

    @pytest.mark.asyncio
    async def test_repeated_usage_raises_domain_error(self, repo):
        """Условный upsert: RETURNING пуст (лимит на пользователя исчерпан)
        -> PromoCodeUserUsageLimitError, а не молчаливое превышение."""
        from datetime import datetime, timezone

        repo.db = AsyncMock()
        # Пустой RETURNING = условие usage_count < max не выполнилось
        empty_returning = MagicMock()
        empty_returning.first.return_value = None
        repo.db.execute = AsyncMock(return_value=empty_returning)

        with pytest.raises(PromoCodeUserUsageLimitError):
            await repo.record_promo_code_usage(
                1, 2, datetime.now(timezone.utc), max_uses_per_user=1
            )

    @pytest.mark.asyncio
    async def test_increment_returns_false_when_limit_reached(self, repo):
        """Условный инкремент: rowcount=0 (лимит исчерпан) -> False."""
        repo.db = AsyncMock(return_value=None)
        repo.db.execute = AsyncMock(return_value=_make_execute_result(0))

        result = await repo.increment_usage_counter(promo_code_id=5)

        assert result is False

    @pytest.mark.asyncio
    async def test_increment_returns_true_on_success(self, repo):
        repo.db = AsyncMock(return_value=None)
        repo.db.execute = AsyncMock(return_value=_make_execute_result(1))

        result = await repo.increment_usage_counter(promo_code_id=5)

        assert result is True
