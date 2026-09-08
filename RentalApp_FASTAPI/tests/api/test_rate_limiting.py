# tests/api/test_rate_limiting.py
"""
T008: Тесты rate limiting auth-эндпоинтов (slowapi).

6-й запрос логина в минуту с одного IP -> 429.
"""

import os
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from api.main_api import app

pytestmark = pytest.mark.auth

CSRF_DISABLED = os.getenv("DISABLE_CSRF", "false").lower() == "true"

LOGIN_DATA = {"username": "ratelimit@example.com", "password": "Password123"}


@pytest.fixture
def client():
    """Тестовый клиент FastAPI."""
    return TestClient(app)


@pytest.fixture
def csrf_headers(client):
    """CSRF-пара для запросов к auth-эндпоинтам."""
    response = client.get("/api/auth/csrf-token")
    assert response.status_code == 200
    return {"X-CSRF-Token": response.json()["csrf_token"]}


@pytest.fixture
def failing_auth_service():
    """Мок auth-сервиса с неверными учётными данными (без обращения к БД)."""
    service = AsyncMock()
    service.authenticate_user.return_value = None
    return service


class TestAuthRateLimiting:
    """Лимит 5/minute на login/register/refresh."""

    def test_sixth_login_within_minute_returns_429(self, client, csrf_headers, failing_auth_service):
        """Первые 5 попыток логина обрабатываются (401), 6-я -> 429."""
        with app.container.auth_service.override(failing_auth_service):
            for attempt in range(5):
                response = client.post("/api/auth/token", data=LOGIN_DATA, headers=csrf_headers)
                assert response.status_code == 401, f"Попытка {attempt + 1}: ожидался 401"

            sixth = client.post("/api/auth/token", data=LOGIN_DATA, headers=csrf_headers)
            assert sixth.status_code == 429

    def test_sixth_register_within_minute_returns_429(self, client, csrf_headers, failing_auth_service):
        """Первые 5 регистраций обрабатываются, 6-я -> 429."""
        mock_user = MagicMock()
        mock_user.email = "user@example.com"
        mock_user.full_name = "Rate Limit"
        mock_user.role = "user"
        failing_auth_service.create_user.return_value = mock_user

        with app.container.auth_service.override(failing_auth_service):
            for attempt in range(5):
                response = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"user{attempt}@example.com",
                        "password": "RateLimit_Passw0rd!",
                        "full_name": "Rate Limit",
                    },
                    headers=csrf_headers,
                )
                # Бизнес-логика отработала (201), лимит ещё не исчерпан
                assert response.status_code == 201, (
                    f"Попытка {attempt + 1}: {response.status_code} {response.text}"
                )

            sixth = client.post(
                "/api/auth/register",
                json={
                    "email": "user5@example.com",
                    "password": "RateLimit_Passw0rd!",
                    "full_name": "Rate Limit",
                },
                headers=csrf_headers,
            )
            assert sixth.status_code == 429

    def test_sixth_refresh_within_minute_returns_429(self, client, csrf_headers):
        """Первые 5 /auth/refresh без cookie -> 401, 6-я -> 429."""
        for attempt in range(5):
            response = client.post("/api/auth/refresh", headers=csrf_headers)
            assert response.status_code == 401, f"Попытка {attempt + 1}: ожидался 401"

        sixth = client.post("/api/auth/refresh", headers=csrf_headers)
        assert sixth.status_code == 429

    def test_health_endpoint_not_rate_limited(self, client):
        """GET /health не подпадает под глобальный лимит (exempt)."""
        for _ in range(10):
            response = client.get("/health")
            assert response.status_code == 200
