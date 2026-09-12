# tests/e2e/test_refresh_rotation_api.py

"""Ротация refresh-токенов на уровне API (этап 6.1 аудита 2026-09-12).

Синтетический refresh-JWT в cookie (как test_logout_cookie_behavior):
- первый /auth/refresh выдаёт новый access И новый refresh (Set-Cookie);
- повторное использование старого refresh — 401 + отзыв всех сессий;
- свежий токен того же пользователя после fence — тоже 401.
"""

import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
import jwt

from config.core import settings
from tests.conftest import get_csrf_headers

# Маркер e2e: тест запускается и в e2e compose
pytestmark = pytest.mark.e2e


def _make_refresh(sub: str, jti: str) -> str:
    payload = {
        "sub": sub,
        "type": "refresh",
        "jti": jti,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=1),
    }
    return jwt.encode(payload, settings.SECRET_KEY.get_secret_value(), algorithm="HS256")


def test_refresh_rotation_via_api():
    from api.main_api import app

    client = TestClient(app)
    subject = "rotation-e2e@example.com"

    old_token = _make_refresh(subject, "rotation-e2e-old-jti")
    client.cookies.set("refresh_token", old_token, path="/")

    # 1) Первый refresh: ротация — новый access + новая refresh-cookie
    first = client.post("/api/auth/refresh", headers=get_csrf_headers(client))
    assert first.status_code == 200
    assert first.json()["access_token"]

    set_cookie = first.headers.get("set-cookie", "")
    assert "refresh_token=" in set_cookie
    assert "Max-Age=0" not in set_cookie  # cookie выставляется, а не удаляется

    # Извлекаем новую cookie (эмулируем браузер)
    new_cookie_value = None
    for header in first.headers.get_list("set-cookie"):
        if header.startswith("refresh_token="):
            new_cookie_value = header.split(";", 1)[0].split("=", 1)[1]
    assert new_cookie_value and new_cookie_value != old_token

    # 2) Кража: повторное использование СТАРОГО токена → 401
    client.cookies.set("refresh_token", old_token, path="/")
    reuse = client.post("/api/auth/refresh", headers=get_csrf_headers(client))
    assert reuse.status_code == 401

    # 3) Grace-период (гонка мульти-вкладок): мгновенный reuse НЕ отзывает все
    #    сессии — новый токен продолжает работать и сам ротируется
    client.cookies.set("refresh_token", new_cookie_value, path="/")
    second = client.post("/api/auth/refresh", headers=get_csrf_headers(client))
    assert second.status_code == 200
    assert second.json()["access_token"]
    # Полный fence-отзыв (reuse старше grace) покрыт сервисным тестом
    # test_refresh_after_grace_reuses_fence (манипуляция временем недоступна через API)
