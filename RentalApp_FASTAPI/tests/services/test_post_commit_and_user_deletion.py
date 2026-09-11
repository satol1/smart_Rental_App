# tests/services/test_post_commit_and_user_deletion.py
"""
Этап 2 аудита 2026-09-12:
- schedule_after_commit / run_post_commit_callbacks: побочные эффекты только
  после успешного commit (механизм — middleware, не SQLAlchemy-события);
- delete_user: запрет при активных/выполненных резервах, активных арендах,
  финансовой истории и платежах.
"""

import asyncio
import pytest
from unittest.mock import AsyncMock

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from api.services.post_commit import schedule_after_commit, run_post_commit_callbacks
from api.services.user_service import UserService
from api.models.user import User


class TestScheduleAfterCommit:
    """Отложенные побочные эффекты: механизм продакшена (AsyncSession + middleware)."""

    @pytest.fixture
    def async_session(self):
        # AsyncSession без бинда — ровно то, что сервисы получают из DI
        return AsyncSession()

    @pytest.mark.asyncio
    async def test_callback_runs_only_after_commit_hook(self, async_session):
        ran = []
        schedule_after_commit(async_session, lambda: ran.append(1))
        await asyncio.sleep(0)
        assert ran == []  # до вызова run_post_commit_callbacks — ничего

        # «middleware после session.commit()»:
        run_post_commit_callbacks(async_session)
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        assert ran == [1]

    @pytest.mark.asyncio
    async def test_callback_discarded_on_no_commit(self, async_session):
        ran = []
        schedule_after_commit(async_session, lambda: ran.append(1))
        # сессия закрылась без коммита — run_post_commit_callbacks не вызывался
        await async_session.close()
        assert ran == []

    @pytest.mark.asyncio
    async def test_coroutine_callback_awaited(self, async_session):
        done = []

        async def effect():
            await asyncio.sleep(0)
            done.append("ok")

        schedule_after_commit(async_session, effect)
        run_post_commit_callbacks(async_session)
        for _ in range(4):
            await asyncio.sleep(0)
        assert done == ["ok"]

    @pytest.mark.asyncio
    async def test_second_run_is_noop(self, async_session):
        ran = []
        schedule_after_commit(async_session, lambda: ran.append(1))
        run_post_commit_callbacks(async_session)
        await asyncio.sleep(0)
        run_post_commit_callbacks(async_session)  # повторный вызов — пусто
        await asyncio.sleep(0)
        assert ran == [1]

    @pytest.mark.asyncio
    async def test_non_session_object_runs_eagerly(self):
        ran = []
        schedule_after_commit(AsyncMock(), lambda: ran.append(1))
        assert ran == [1]  # мок без .info-dict → немедленный запуск

    @pytest.mark.asyncio
    async def test_failing_callback_does_not_break_others(self, async_session):
        ran = []

        def bad():
            raise RuntimeError("boom")

        schedule_after_commit(async_session, bad)
        schedule_after_commit(async_session, lambda: ran.append(2))
        run_post_commit_callbacks(async_session)
        for _ in range(4):
            await asyncio.sleep(0)
        assert ran == [2]


class TestUserDeletionGuard:
    """Защита при удалении пользователя.

    Порядок запросов в _validate_user_deletable:
    резервы ACTIVE → резервы FULFILLED → аренды ACTIVE → история баланса → платежи.
    """

    @pytest.fixture
    def user_service(self):
        service = UserService.__new__(UserService)
        service.db = AsyncMock()
        service.user_repo = AsyncMock()
        return service

    @pytest.fixture
    def admin(self):
        return User(id=99, email="admin@test.ru", full_name="Admin", role="admin")

    @pytest.mark.asyncio
    async def test_active_reservations_block_deletion(self, user_service, admin):
        user_service.user_repo.get_by_id.return_value = User(
            id=1, email="u@t.ru", full_name="U", role="user"
        )
        user_service.db.scalar = AsyncMock(side_effect=[
            2,   # ACTIVE-резервы
            0,   # FULFILLED-резервы (запрашивается до проверки)
        ])

        with pytest.raises(HTTPException) as exc:
            await user_service.delete_user(1, admin)
        assert exc.value.status_code == 409
        assert "активных" in exc.value.detail
        user_service.user_repo.delete.assert_not_called()

    @pytest.mark.asyncio
    async def test_fulfilled_reservations_block_deletion(self, user_service, admin):
        user_service.user_repo.get_by_id.return_value = User(
            id=1, email="u@t.ru", full_name="U", role="user"
        )
        user_service.db.scalar = AsyncMock(side_effect=[
            0,   # ACTIVE-резервы
            3,   # FULFILLED-резервы
        ])

        with pytest.raises(HTTPException) as exc:
            await user_service.delete_user(1, admin)
        assert exc.value.status_code == 409
        assert "выполненных" in exc.value.detail

    @pytest.mark.asyncio
    async def test_active_rentals_block_deletion(self, user_service, admin):
        user_service.user_repo.get_by_id.return_value = User(
            id=1, email="u@t.ru", full_name="U", role="user"
        )
        user_service.db.scalar = AsyncMock(side_effect=[
            0,   # ACTIVE-резервы
            0,   # FULFILLED-резервы
            1,   # активные аренды
        ])

        with pytest.raises(HTTPException) as exc:
            await user_service.delete_user(1, admin)
        assert exc.value.status_code == 409
        assert "активных аренд" in exc.value.detail

    @pytest.mark.asyncio
    async def test_balance_history_blocks_deletion(self, user_service, admin):
        user_service.user_repo.get_by_id.return_value = User(
            id=1, email="u@t.ru", full_name="U", role="user"
        )
        user_service.db.scalar = AsyncMock(side_effect=[
            0, 0, 0,   # резервы ×2, аренды
            5,         # история баланса
            0,         # платежи (запрашиваются до проверки)
        ])

        with pytest.raises(HTTPException) as exc:
            await user_service.delete_user(1, admin)
        assert exc.value.status_code == 409
        assert "финансовая история" in exc.value.detail

    @pytest.mark.asyncio
    async def test_payments_block_deletion(self, user_service, admin):
        user_service.user_repo.get_by_id.return_value = User(
            id=1, email="u@t.ru", full_name="U", role="user"
        )
        user_service.db.scalar = AsyncMock(side_effect=[
            0, 0, 0,   # резервы ×2, аренды
            0,         # история баланса
            2,         # платежи
        ])

        with pytest.raises(HTTPException) as exc:
            await user_service.delete_user(1, admin)
        assert exc.value.status_code == 409
        assert "финансовая история" in exc.value.detail

    @pytest.mark.asyncio
    async def test_clean_user_deleted(self, user_service, admin):
        target = User(id=1, email="u@t.ru", full_name="U", role="user")
        user_service.user_repo.get_by_id.return_value = target
        user_service.db.scalar = AsyncMock(side_effect=[0, 0, 0, 0, 0])

        result = await user_service.delete_user(1, admin)
        user_service.user_repo.delete.assert_called_once_with(target)
        assert "удален" in result["message"]

    @pytest.mark.asyncio
    async def test_self_deletion_forbidden(self, user_service, admin):
        with pytest.raises(HTTPException) as exc:
            await user_service.delete_user(99, admin)
        assert exc.value.status_code == 400
