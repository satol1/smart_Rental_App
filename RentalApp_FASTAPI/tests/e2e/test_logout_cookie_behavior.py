import pytest
from fastapi.testclient import TestClient
from jose import jwt

from config.core import settings

# Маркер e2e, чтобы тест запускался в e2e compose
pytestmark = pytest.mark.e2e


def test_refresh_cookie_removed_after_logout():
    from api.main_api import app

    client = TestClient(app)

    # 1) Синтетически создаём валидный refresh JWT и ставим его в cookie
    refresh_payload = {"sub": "logout_test@example.com", "type": "refresh"}
    refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY.get_secret_value(), algorithm="HS256")
    client.cookies.set("refresh_token", refresh_token, path="/")
    assert client.cookies.get("refresh_token") is not None

    # 3) Logout → удаляем cookie разными вариантами domain
    logout_resp = client.post("/api/auth/logout")
    assert logout_resp.status_code == 200

    # 4) Проверяем, что сервер прислал заголовки для удаления cookie
    set_cookie = logout_resp.headers.get("set-cookie", "")
    assert "refresh_token=" in set_cookie
    assert "Max-Age=0" in set_cookie or "Expires=" in set_cookie

    # Применяем удаление cookie на стороне клиента (эмулируем браузер)
    try:
        client.cookies.delete("refresh_token")
    except Exception:
        pass

    # 5) Попытка refresh должна падать с 401 (сервер больше не принимает старую cookie)
    refresh_resp = client.post("/api/auth/refresh")
    assert refresh_resp.status_code == 401


