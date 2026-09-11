# tests/services/test_promo_code_usages_counter.py
"""
Счётчик использований промокода (этап 1 аудита 2026-09-12):
- usage_count в строке usages делает max_uses_per_user > 1 физически возможным;
- условный upsert защищает от гонки мимо валидатора;
- PromoCodeOut сериализует применимость к оборудованию/типам.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

from api.models.promo_code import PromoCode, PromoCodeApplicableType
from api.repositories.promo_code_repository import PromoCodeRepository
from shared.schemas.promo_code_schema import PromoCodeOut


def _row(**kw):
    row = MagicMock()
    for k, v in kw.items():
        setattr(row, k, v)
    return row


class TestUsageCounter:
    """Репозиторий usages: семантика счётчика."""

    @pytest.fixture
    def repo(self):
        return PromoCodeRepository.__new__(PromoCodeRepository)

    @pytest.mark.asyncio
    async def test_get_user_usage_count_reads_counter(self, repo):
        repo.db = AsyncMock()
        scalar_result = MagicMock()
        scalar_result.scalar.return_value = 3
        repo.db.execute = AsyncMock(return_value=scalar_result)

        assert await repo.get_user_usage_count(1, 2) == 3

    @pytest.mark.asyncio
    async def test_get_user_usage_count_zero_when_no_row(self, repo):
        repo.db = AsyncMock()
        scalar_result = MagicMock()
        scalar_result.scalar.return_value = None
        repo.db.execute = AsyncMock(return_value=scalar_result)

        assert await repo.get_user_usage_count(1, 2) == 0

    @pytest.mark.asyncio
    async def test_record_usage_within_limit_returns_count(self, repo):
        """RETURNING вернул новое значение счётчика — использование записано."""
        repo.db = AsyncMock()
        returning = MagicMock()
        returning.first.return_value = _row(usage_count=2)
        repo.db.execute = AsyncMock(return_value=returning)

        # Не бросает — лимит не исчерпан
        await repo.record_promo_code_usage(
            1, 2, datetime.now(timezone.utc), max_uses_per_user=5
        )

    @pytest.mark.asyncio
    async def test_record_usage_exceeding_limit_raises(self, repo):
        from api.services.promo_code.exceptions import PromoCodeUserUsageLimitError

        repo.db = AsyncMock()
        returning = MagicMock()
        returning.first.return_value = None  # условие usage_count < max не выполнилось
        repo.db.execute = AsyncMock(return_value=returning)

        with pytest.raises(PromoCodeUserUsageLimitError):
            await repo.record_promo_code_usage(
                1, 2, datetime.now(timezone.utc), max_uses_per_user=1
            )

    @pytest.mark.asyncio
    async def test_remove_usage_decrements_when_count_above_one(self, repo):
        repo.db = AsyncMock()
        repo.db.execute = AsyncMock(return_value=MagicMock(rowcount=1))

        await repo.remove_latest_promo_code_usage(1, 2)

        # Один UPDATE, DELETE не выполнялся
        assert repo.db.execute.await_count == 1

    @pytest.mark.asyncio
    async def test_remove_usage_deletes_row_when_last(self, repo):
        repo.db = AsyncMock()
        repo.db.execute = AsyncMock(return_value=MagicMock(rowcount=0))

        await repo.remove_latest_promo_code_usage(1, 2)

        # UPDATE (rowcount=0) + DELETE строки с usage_count == 1
        assert repo.db.execute.await_count == 2


class TestPromoCodeOutApplicability:
    """Применимость промокода сериализуется в ответе API."""

    def _promo(self, equipment_ids, type_names):
        promo = PromoCode(
            code="TEST10",
            discount_percentage=10.0,
            is_active=True,
        )
        promo.id = 1
        promo.times_used = 0
        promo.created_at = datetime.now(timezone.utc)
        promo.created_by_id = 1
        eq = [MagicMock() for _ in equipment_ids]
        for mock, eid in zip(eq, equipment_ids):
            mock.id = eid
        promo.applicable_equipment = eq
        promo.applicable_types = [
            PromoCodeApplicableType(promo_code_id=1, type_name=t) for t in type_names
        ]
        return promo

    def test_serializes_equipment_ids_and_types(self):
        out = PromoCodeOut.model_validate(self._promo([5, 7], ["ski", "boots"]))
        assert out.applicable_to_equipment_ids == [5, 7]
        assert out.applicable_to_equipment_types == ["ski", "boots"]

    def test_empty_applicability_serializes_as_empty_lists(self):
        out = PromoCodeOut.model_validate(self._promo([], []))
        assert out.applicable_to_equipment_ids == []
        assert out.applicable_to_equipment_types == []
