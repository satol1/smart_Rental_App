# tests/services/test_refresh_rotation.py

"""Ротация refresh-токенов (этап 6.1 аудита 2026-09-12).

Сервисный уровень: AuthService.rotate_refresh_token поверх реального
(in-memory) denylist — без моков хранилища, чтобы покрыть и fence-механизм.
"""

import time
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import HTTPException

from api.services.auth_service import AuthService
from api.services.token_denylist_service import TokenDenylistService
from config.core import settings


def _decode(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY.get_secret_value(), algorithms=["HS256"])


@pytest.fixture
def clean_denylist():
    denylist = TokenDenylistService()
    yield denylist
    denylist.clear()


@pytest.fixture
def service(clean_denylist):
    async def _noop_log(*args, **kwargs):
        return None

    return AuthService(
        user_repo=type("R", (), {})(),
        security_audit_service=type("A", (), {"log_login_attempt": _noop_log})(),
        brute_force_protection=type("B", (), {})(),
        token_denylist=clean_denylist,
    )


def _make_refresh_token(subject: str, jti: str, iat_ts: float) -> str:
    """Синтетический refresh-JWT с заданным iat (эмулирует выдачу в прошлом)."""
    import uuid
    payload = {
        "sub": subject,
        "type": "refresh",
        "jti": jti or uuid.uuid4().hex,
        "iat": datetime.fromtimestamp(iat_ts, tz=timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=1),
    }
    return jwt.encode(payload, settings.SECRET_KEY.get_secret_value(), algorithm="HS256")


def _backdate_denial(denylist: TokenDenylistService, jti: str, seconds_ago: float = 60) -> None:
    """Сдвигает момент отзыва jti в прошлое (имитация reuse ПОСЛЕ grace-периода)."""
    with denylist._lock:
        denied_at, expires_at = denylist._denied[jti]
        denylist._denied[jti] = (denied_at - seconds_ago, expires_at)


class TestRotateRefreshToken:

    async def test_rotation_issues_new_token_with_new_jti_and_denies_old(self, service, clean_denylist):
        old_token = service.create_refresh_token({"sub": "user@example.com"})

        new_token, subject = await service.rotate_refresh_token(old_token)

        assert subject == "user@example.com"
        assert new_token != old_token

        old_payload = _decode(old_token)
        new_payload = _decode(new_token)
        assert new_payload["jti"] != old_payload["jti"]
        assert new_payload["type"] == "refresh"
        assert new_payload["sub"] == "user@example.com"

        # Старый токен отозван
        assert await clean_denylist.is_denied(old_payload["jti"]) is True

    async def test_reuse_of_rotated_token_revokes_all_user_sessions(self, service, clean_denylist):
        subject = "victim@example.com"
        # Токен жертвы, выданный за минуту до инцидента (iat в прошлом)
        victim_token = _make_refresh_token(subject, "victim-jti", time.time() - 60)
        stolen_token = _make_refresh_token(subject, "stolen-jti", time.time() - 120)
        await service.rotate_refresh_token(stolen_token)  # ротация: stolen отозван

        # Кража ПОСЛЕ grace-периода: атакующий повторно использует СТАРЫЙ токен
        _backdate_denial(clean_denylist, "stolen-jti")
        with pytest.raises(HTTPException) as exc_info:
            await service.rotate_refresh_token(stolen_token)
        assert exc_info.value.status_code == 401

        # Fence выставлен: валидный токен жертвы (iat < fence) тоже отклонён
        with pytest.raises(HTTPException) as exc_info2:
            await service.rotate_refresh_token(victim_token)
        assert exc_info2.value.status_code == 401

    async def test_token_issued_after_fence_is_accepted(self, service, clean_denylist):
        subject = "fresh@example.com"
        old_token = service.create_refresh_token({"sub": subject})
        await service.rotate_refresh_token(old_token)

        # Reuse старого (после grace) → fence
        _backdate_denial(clean_denylist, _decode(old_token)["jti"])
        with pytest.raises(HTTPException):
            await service.rotate_refresh_token(old_token)

        # Токен, выданный ПОСЛЕ fence (новый логин в следующей секунде), работает.
        # Fence округляется вверх до целой секунды, поэтому выжидаем её.
        time.sleep(1.1)
        fresh_token = service.create_refresh_token({"sub": subject})
        _, refreshed_subject = await service.rotate_refresh_token(fresh_token)
        assert refreshed_subject == subject

    async def test_logout_denied_token_triggers_session_revocation_on_reuse(self, service, clean_denylist):
        subject = "logged-out@example.com"
        token = _make_refresh_token(subject, "logout-jti", time.time() - 60)
        other_session = _make_refresh_token(subject, "other-session-jti", time.time() - 30)
        await service.revoke_refresh_token(token)  # logout
        # Logout-отзыв старше grace — replay означает кражу сохранённой cookie
        _backdate_denial(clean_denylist, "logout-jti")

        with pytest.raises(HTTPException) as exc_info:
            await service.rotate_refresh_token(token)
        assert exc_info.value.status_code == 401

        # Все прочие сессии пользователя отозваны fence
        with pytest.raises(HTTPException):
            await service.rotate_refresh_token(other_session)

    async def test_reuse_within_grace_does_not_revoke_all_sessions(self, service, clean_denylist):
        """Гонка мульти-вкладок: мгновенный повторный refresh откатывается 401,
        но НЕ отзывает все сессии пользователя (митигация self-DoS, этап 6.1)."""
        from api.services import auth_service as auth_service_module

        subject = "multitab@example.com"
        old_token = service.create_refresh_token({"sub": subject})
        new_token, _ = await service.rotate_refresh_token(old_token)

        # Вторая вкладка шлёт старую cookie СРАЗУ (в пределах grace)
        with pytest.raises(HTTPException) as exc_info:
            await service.rotate_refresh_token(old_token)
        assert exc_info.value.status_code == 401

        # Fence НЕ выставлен: новый токен продолжает работать
        _, refreshed = await service.rotate_refresh_token(new_token)
        assert refreshed == subject
        assert await clean_denylist.get_user_fence(subject) is None

    async def test_invalid_signature_rejected(self, service):
        forged = jwt.encode(
            {"sub": "x@example.com", "type": "refresh", "jti": " forged", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            "wrong-secret-wrong-secret-wrong-secret",
            algorithm="HS256",
        )
        with pytest.raises(HTTPException) as exc_info:
            await service.rotate_refresh_token(forged)
        assert exc_info.value.status_code == 401

    async def test_access_token_is_not_rotatable(self, service):
        access = service.create_access_token({"sub": "user@example.com"})
        with pytest.raises(HTTPException) as exc_info:
            await service.rotate_refresh_token(access)
        assert exc_info.value.status_code == 401


class TestAccessTokenTtl:

    def test_access_token_ttl_is_15_minutes(self, service):
        """Короткий access — часть этапа 6.1 (окно утечки 15 минут)."""
        token = service.create_access_token({"sub": "user@example.com"})
        payload = _decode(token)
        issued_at = datetime.now(timezone.utc).timestamp()
        assert payload["exp"] - issued_at <= 15 * 60 + 5  # ~15 минут
        assert payload["exp"] - issued_at > 14 * 60

    def test_refresh_token_carries_iat(self, service):
        token = service.create_refresh_token({"sub": "user@example.com"})
        payload = _decode(token)
        assert "iat" in payload
        assert abs(payload["iat"] - time.time()) < 10
