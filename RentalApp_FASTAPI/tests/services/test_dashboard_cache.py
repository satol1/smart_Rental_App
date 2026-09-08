# tests/services/test_dashboard_cache.py
"""
T050: Кэш агрегата дашборда (dashboard:summary, TTL 60с).

Storage мокается fake-объектом (redis-путь): проверяется, что второй вызов
get_summary не дёргает под-сервисы/репозитории, а инвалидация заставляет
пересчитать агрегат заново.
"""

import time

import pytest
from unittest.mock import AsyncMock, MagicMock

from api.services import redis_client as redis_module
from api.services.cache_service import (
    app_cache,
    DASHBOARD_SUMMARY_KEY,
    DASHBOARD_SUMMARY_TTL_SECONDS,
    invalidate_dashboard_summary,
)
from api.services.dashboard.dashboard_service import DashboardService

KPI_DATA = {
    "total_users": 10,
    "active_users": 5,
    "total_equipment": 20,
    "total_reservations": 30,
    "revenue_today": 1000.0,
    "revenue_this_month": 25000.0,
    "occupancy_rate": 0.42,
    "avg_rental_duration": 3.5,
    "active_reservations": 4,
    "total_rentals": 15,
    "active_rentals": 6,
    "overdue_rentals": 1,
    "total_accessories": 25,
    "total_associations": 8,
}


class FakeDashboardStorage:
    """Fake redis-хранилище кэша: get/setex/delete."""

    def __init__(self):
        self.data: dict = {}
        self.expires: dict = {}
        self.now = time.time()

    def get(self, key):
        if key in self.data and self.expires.get(key, float("inf")) > self.now:
            return self.data[key]
        return None

    def setex(self, key, ttl_seconds, value):
        self.data[key] = value
        self.expires[key] = self.now + int(ttl_seconds)
        return True

    def delete(self, *keys):
        deleted = 0
        for key in keys:
            if key in self.data:
                del self.data[key]
                self.expires.pop(key, None)
                deleted += 1
        return deleted


@pytest.fixture
def fake_storage(monkeypatch):
    fake = FakeDashboardStorage()
    monkeypatch.setattr(redis_module.redis_client, "is_available", lambda: True)
    monkeypatch.setattr(redis_module.redis_client, "get", fake.get)
    monkeypatch.setattr(redis_module.redis_client, "setex", fake.setex)
    monkeypatch.setattr(redis_module.redis_client, "delete", fake.delete)
    return fake


@pytest.fixture(autouse=True)
def isolated_cache(fake_storage):
    """Кэш dashboard:summary чист перед и после каждого теста."""
    app_cache.clear()
    invalidate_dashboard_summary()
    yield
    app_cache.clear()
    invalidate_dashboard_summary()


@pytest.fixture
def dashboard_service():
    focus, kpi, activity, equipment = AsyncMock(), AsyncMock(), AsyncMock(), AsyncMock()
    focus.get_pickups_today.return_value = []
    focus.get_returns_today.return_value = []
    focus.get_overdue_rentals.return_value = []
    kpi.get_kpi_data.return_value = dict(KPI_DATA)
    activity.get_recent_activity.return_value = []
    equipment.get_popular_equipment.return_value = []
    service = DashboardService(
        db=MagicMock(),
        dashboard_repo=AsyncMock(),
        focus_service=focus,
        kpi_service=kpi,
        activity_service=activity,
        equipment_service=equipment,
    )
    service._deps = (focus, kpi, activity, equipment)
    return service


def _compute_calls(service) -> int:
    focus, kpi, activity, equipment = service._deps
    return (
        focus.get_pickups_today.await_count
        + kpi.get_kpi_data.await_count
        + activity.get_recent_activity.await_count
        + equipment.get_popular_equipment.await_count
    )


class TestDashboardSummaryCache:

    async def test_second_call_served_from_cache(self, dashboard_service, fake_storage):
        first = await dashboard_service.get_summary()

        assert DASHBOARD_SUMMARY_KEY in fake_storage.data
        calls_after_first = _compute_calls(dashboard_service)
        assert calls_after_first == 4  # каждая зависимость ровно один раз

        second = await dashboard_service.get_summary()

        assert second == first
        assert _compute_calls(dashboard_service) == calls_after_first  # репозитории не дёргались

    async def test_result_roundtrips_through_cache(self, dashboard_service):
        first = await dashboard_service.get_summary()
        await dashboard_service.get_summary()

        assert first.pickups_today == []

    async def test_invalidate_forces_recompute(self, dashboard_service, fake_storage):
        await dashboard_service.get_summary()
        calls_after_first = _compute_calls(dashboard_service)

        invalidate_dashboard_summary()

        await dashboard_service.get_summary()
        assert _compute_calls(dashboard_service) == calls_after_first * 2
        assert DASHBOARD_SUMMARY_KEY in fake_storage.data  # кэш перезаписан

    async def test_ttl_expiry_forces_recompute(self, dashboard_service, fake_storage):
        await dashboard_service.get_summary()
        calls_after_first = _compute_calls(dashboard_service)

        fake_storage.now += DASHBOARD_SUMMARY_TTL_SECONDS + 1

        await dashboard_service.get_summary()
        assert _compute_calls(dashboard_service) == calls_after_first * 2

    async def test_corrupted_cache_is_ignored(self, dashboard_service, fake_storage):
        await dashboard_service.get_summary()
        calls_after_first = _compute_calls(dashboard_service)

        fake_storage.data[DASHBOARD_SUMMARY_KEY] = b"not-a-json"

        summary = await dashboard_service.get_summary()

        assert summary is not None
        assert _compute_calls(dashboard_service) == calls_after_first * 2
