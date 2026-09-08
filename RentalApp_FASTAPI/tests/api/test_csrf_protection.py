# tests/api/test_csrf_protection.py
"""
T006: Тесты реальной CSRF-защиты auth-эндпоинтов.

POST /auth/login (token), /auth/refresh, /auth/logout без валидного CSRF-токена
должны отклоняться с 403 (при DEBUG/DISABLE_CSRF не задан).
"""

import os
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
import jwt as pyjwt
from fastapi.testclient import TestClient

from api.main_api import app
from config.core import settings

pytestmark = pytest.mark.auth

CSRF_DISABLED = os.getenv("DISABLE_CSRF", "false").lower() == "true"


@pytest.fixture
def client():
    """Тестовый клиент FastAPI с включённой CSRF-защитой."""
    return TestClient(app)


@pytest.fixture
def csrf_headers(client):
    """Валидная пара (cookie + заголовок), полученная через GET /auth/csrf-token."""
    response = client.get("/api/auth/csrf-token")
    assert response.status_code == 200
    payload = response.json()
    assert "csrf_token" in payload
    return {"X-CSRF-Token": payload["csrf_token"]}


def _make_refresh_token(sub: str = "csrf_test@example.com") -> str:
    """Синтетический валидный refresh-токен для проверки /auth/refresh."""
    payload = {
        "sub": sub,
        "type": "refresh",
        "jti": "csrf-test-jti",
        "exp": datetime.now(timezone.utc) + timedelta(days=1),
    }
    return pyjwt.encode(payload, settings.SECRET_KEY.get_secret_value(), algorithm="HS256")


@pytest.mark.skipif(CSRF_DISABLED, reason="CSRF защита отключена (DISABLE_CSRF=true)")
class TestCsrfProtection:
    """CSRF-токен обязателен для мутирующих auth-эндпоинтов."""

    def test_login_without_csrf_token_returns_403(self, client):
        """POST /auth/token без CSRF-токена -> 403."""
        response = client.post(
            "/api/auth/token",
            data={"username": "user@example.com", "password": "Password123"},
        )
        assert response.status_code == 403

    def test_refresh_without_csrf_token_returns_403(self, client):
        """POST /auth/refresh без CSRF-токена -> 403."""
        response = client.post("/api/auth/refresh")
        assert response.status_code == 403

    def test_logout_without_csrf_token_returns_403(self, client):
        """POST /auth/logout без CSRF-токена -> 403."""
        response = client.post("/api/auth/logout")
        assert response.status_code == 403

    def test_register_without_csrf_token_returns_403(self, client):
        """POST /auth/register без CSRF-токена -> 403."""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "noreg@example.com",
                "password": "Noreg_Passw0rd!",
                "full_name": "No Reg",
            },
        )
        assert response.status_code == 403

    def test_login_with_forged_csrf_token_returns_403(self, client):
        """POST /auth/token с подделанным CSRF-токеном (без подписи) -> 403."""
        response = client.post(
            "/api/auth/token",
            data={"username": "user@example.com", "password": "Password123"},
            headers={"X-CSRF-Token": "forged-token-value"},
        )
        assert response.status_code == 403

    def test_login_with_valid_csrf_token_passes_csrf_check(self, client, csrf_headers):
        """POST /auth/token с валидным CSRF-токеном проходит проверку (не 403)."""
        mock_auth_service = AsyncMock()
        mock_auth_service.authenticate_user.return_value = None

        with app.container.auth_service.override(mock_auth_service):
            response = client.post(
                "/api/auth/token",
                data={"username": "user@example.com", "password": "Password123"},
                headers=csrf_headers,
            )

        # CSRF пройдена: дальше обычная бизнес-логика (неверные учётные данные -> 401)
        assert response.status_code == 401
        assert "CSRF" not in response.text

    def test_refresh_with_valid_csrf_token_passes_csrf_check(self, client, csrf_headers):
        """POST /auth/refresh с валидным CSRF-токеном и refresh-cookie -> 200."""
        client.cookies.set("refresh_token", _make_refresh_token(), path="/")

        response = client.post("/api/auth/refresh", headers=csrf_headers)

        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_logout_with_valid_csrf_token_passes_csrf_check(self, client, csrf_headers):
        """POST /auth/logout с валидным CSRF-токеном -> 200."""
        client.cookies.set("refresh_token", _make_refresh_token(), path="/")

        response = client.post("/api/auth/logout", headers=csrf_headers)

        assert response.status_code == 200
