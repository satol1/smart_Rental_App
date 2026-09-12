# tests/services/test_token_type_safety.py
"""
T007: Тесты type-safety JWT-токенов и denylist отозванных refresh-токенов.

- refresh-токен, предъявленный как access, отклоняется;
- refresh-токен после logout отклоняется (in-memory denylist по jti).
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
import jwt as pyjwt
from fastapi import HTTPException
from fastapi.testclient import TestClient

from api.dependencies import get_user_by_token
from api.main_api import app
from api.models.user import User
from api.repositories.user_repository import UserRepository
from api.services.auth_service import AuthService
from api.services.brute_force_protection_service import BruteForceProtectionService
from api.services.security_audit_service import SecurityAuditService
from api.services.token_denylist_service import get_token_denylist
from config.core import settings

pytestmark = pytest.mark.auth


@pytest.fixture
def mock_user_repo():
    repo = AsyncMock(spec=UserRepository)
    repo.db = AsyncMock()
    return repo


@pytest.fixture
def auth_service(mock_user_repo):
    mock_audit = MagicMock(spec=SecurityAuditService)
    mock_bruteforce = MagicMock(spec=BruteForceProtectionService)
    return AuthService(mock_user_repo, mock_audit, mock_bruteforce)


@pytest.fixture
def clean_denylist():
    """Изолированный (очищенный) denylist для каждого теста."""
    denylist = get_token_denylist()
    denylist.clear()
    yield denylist
    denylist.clear()


@pytest.fixture
def mock_user():
    user = MagicMock(spec=User)
    user.id = 1
    user.email = "typesafety@example.com"
    user.is_active = True
    user.role = "user"
    return user


def decode_token(token: str) -> dict:
    return pyjwt.decode(token, settings.SECRET_KEY.get_secret_value(), algorithms=["HS256"])


class TestTokenTypeClaims:
    """Токены содержат обязательные claim'ы type и jti."""

    def test_access_token_contains_type_access(self, auth_service):
        token = auth_service.create_access_token({"sub": "typesafety@example.com"})

        payload = decode_token(token)
        assert payload["type"] == "access"

    def test_refresh_token_contains_type_refresh(self, auth_service):
        token = auth_service.create_refresh_token({"sub": "typesafety@example.com"})

        payload = decode_token(token)
        assert payload["type"] == "refresh"

    def test_refresh_token_contains_unique_jti(self, auth_service):
        first = auth_service.create_refresh_token({"sub": "typesafety@example.com"})
        second = auth_service.create_refresh_token({"sub": "typesafety@example.com"})

        first_jti = decode_token(first)["jti"]
        second_jti = decode_token(second)["jti"]

        assert first_jti
        assert second_jti
        assert first_jti != second_jti


class TestTokenTypeSafety:
    """Refresh-токен нельзя использовать как access и наоборот."""

    async def test_refresh_token_rejected_as_access_token(self, auth_service, mock_user_repo, mock_user):
        """get_user_by_token(refresh) -> None (401 у потребителя), репозиторий не звать."""
        refresh_token = auth_service.create_refresh_token({"sub": "typesafety@example.com"})

        user = await get_user_by_token(refresh_token, mock_user_repo)

        assert user is None
        mock_user_repo.get_by_email.assert_not_awaited()

    async def test_access_token_accepted_as_access_token(self, auth_service, mock_user_repo, mock_user):
        """get_user_by_token(access) возвращает пользователя."""
        mock_user_repo.get_by_email.return_value = mock_user
        access_token = auth_service.create_access_token({"sub": "typesafety@example.com"})

        user = await get_user_by_token(access_token, mock_user_repo)

        assert user is mock_user
        mock_user_repo.get_by_email.assert_awaited_once_with("typesafety@example.com")

    async def test_token_without_type_claim_rejected(self, mock_user_repo):
        """Токен без claim type (легаси/самодельный) не принимается как access."""
        payload = {
            "sub": "typesafety@example.com",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        }
        legacy_token = pyjwt.encode(payload, settings.SECRET_KEY.get_secret_value(), algorithm="HS256")

        user = await get_user_by_token(legacy_token, mock_user_repo)

        assert user is None
        mock_user_repo.get_by_email.assert_not_awaited()

    async def test_verify_refresh_token_rejects_access_token(self, auth_service):
        """verify_refresh_token(access) -> 401."""
        access_token = auth_service.create_access_token({"sub": "typesafety@example.com"})

        with pytest.raises(HTTPException) as exc_info:
            await auth_service.verify_refresh_token(access_token)

        assert exc_info.value.status_code == 401


class TestRefreshTokenDenylist:
    """Refresh-токен после logout отклоняется через denylist."""

    async def test_denylist_deny_and_check(self, clean_denylist):
        await clean_denylist.deny("jti-1", expires_at=time_offset(seconds=3600))

        assert await clean_denylist.is_denied("jti-1") is True
        assert await clean_denylist.is_denied("jti-unknown") is False

    async def test_denylist_entry_expires(self, clean_denylist):
        """Запись с истёкшим TTL автоматически удаляется."""
        await clean_denylist.deny("jti-expired", expires_at=time_offset(seconds=-10))

        assert await clean_denylist.is_denied("jti-expired") is False

    async def test_denied_refresh_token_rejected_by_verify(self, auth_service, clean_denylist):
        """verify_refresh_token отозванного токена -> 401."""
        refresh_token = auth_service.create_refresh_token({"sub": "typesafety@example.com"})
        payload = decode_token(refresh_token)

        await clean_denylist.deny(payload["jti"], expires_at=payload["exp"])

        with pytest.raises(HTTPException) as exc_info:
            await auth_service.verify_refresh_token(refresh_token)

        assert exc_info.value.status_code == 401

    async def test_logout_adds_refresh_jti_to_denylist(self, clean_denylist):
        """API: logout декодирует refresh из cookie и отзывает его по jti."""
        auth_service = AuthService(
            AsyncMock(spec=UserRepository), MagicMock(spec=SecurityAuditService),
            MagicMock(spec=BruteForceProtectionService),
        )
        refresh_token = auth_service.create_refresh_token({"sub": "logout@example.com"})
        payload = decode_token(refresh_token)

        client = TestClient(app)
        client.cookies.set("refresh_token", refresh_token, path="/")

        from tests.conftest import get_csrf_headers
        headers = get_csrf_headers(client)

        response = client.post("/api/auth/logout", headers=headers)

        assert response.status_code == 200
        assert await clean_denylist.is_denied(payload["jti"]) is True

    async def test_refresh_after_logout_rejected(self, clean_denylist):
        """API: использованный после logout refresh-токен -> 401."""
        auth_service = AuthService(
            AsyncMock(spec=UserRepository), MagicMock(spec=SecurityAuditService),
            MagicMock(spec=BruteForceProtectionService),
        )
        refresh_token = auth_service.create_refresh_token({"sub": "logout@example.com"})

        client = TestClient(app)
        client.cookies.set("refresh_token", refresh_token, path="/")

        from tests.conftest import get_csrf_headers
        headers = get_csrf_headers(client)

        logout_response = client.post("/api/auth/logout", headers=headers)
        assert logout_response.status_code == 200

        # Cookie удалена локально, но если клиент сохранил токен и шлёт его снова —
        # denylist должен отклонить его даже при наличии новой CSRF-пары.
        client.cookies.set("refresh_token", refresh_token, path="/")
        from tests.conftest import get_csrf_headers
        headers = get_csrf_headers(client)

        refresh_response = client.post("/api/auth/refresh", headers=headers)

        assert refresh_response.status_code == 401


def time_offset(seconds: float) -> float:
    from time import time

    return time() + seconds
