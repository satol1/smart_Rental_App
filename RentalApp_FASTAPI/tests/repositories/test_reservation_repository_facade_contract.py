# tests/repositories/test_reservation_repository_facade_contract.py
"""
Контракт фасада ReservationRepository.

ReservationRepository — единая точка входа для сервисов: они дерут методы
прямо с фасада. Если в специализированный суб-репозиторий добавляют метод,
а делегирование на фасаде забывают, эндпоинт падает AttributeError 500
(инцидент 12.09.2026: админ-список резервов, count_for_admin).

Тест фиксирует контракт: каждый публичный метод каждого суб-репозитория,
внедряемого в фасад, обязан быть callable на самом фасаде.
"""

from unittest.mock import AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.reservation_repository import ReservationRepository
from api.repositories.reservation_filter_repository import ReservationFilterRepository
from api.repositories.reservation_query_repository import ReservationQueryRepository
from api.repositories.reservation_availability_repository import ReservationAvailabilityRepository
from shared.services.period_service import PeriodService


def _public_methods(cls) -> set:
    return {
        name
        for name in dir(cls)
        if not name.startswith("_") and callable(getattr(cls, name))
    }


def _make_facade() -> ReservationRepository:
    db = AsyncMock(spec=AsyncSession)
    period_service = PeriodService()
    return ReservationRepository(
        db=db,
        period_service=period_service,
        query_repo=ReservationQueryRepository(db),
        filter_repo=ReservationFilterRepository(db, period_service),
        availability_repo=ReservationAvailabilityRepository(db),
    )


class TestReservationRepositoryFacadeContract:
    def test_facade_exposes_all_filter_repository_methods(self):
        facade = _make_facade()
        missing = _public_methods(ReservationFilterRepository) - set(dir(facade))
        assert not missing, (
            f"ReservationRepository не делегирует методы ReservationFilterRepository: {sorted(missing)}"
        )

    def test_facade_exposes_all_query_repository_methods(self):
        facade = _make_facade()
        missing = _public_methods(ReservationQueryRepository) - set(dir(facade))
        assert not missing, (
            f"ReservationRepository не делегирует методы ReservationQueryRepository: {sorted(missing)}"
        )

    def test_facade_exposes_all_availability_repository_methods(self):
        facade = _make_facade()
        missing = _public_methods(ReservationAvailabilityRepository) - set(dir(facade))
        assert not missing, (
            f"ReservationRepository не делегирует методы ReservationAvailabilityRepository: {sorted(missing)}"
        )

    async def test_count_for_admin_delegates_to_filter_repo(self):
        # Регрессия инцидента 12.09.2026: админ-список резервов падал 500,
        # потому что сервис звал facade.count_for_admin, которого не было.
        facade = _make_facade()
        facade._filter_repo.count_for_admin = AsyncMock(return_value=7)
        result = await facade.count_for_admin(status="active", search_query=None, period_type=None, period_offset=0)
        assert result == 7
        facade._filter_repo.count_for_admin.assert_awaited_once()
