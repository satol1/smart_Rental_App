# tests/api/test_user_profile_api.py
"""
Тесты HTTP-слоя user_profile_api.py: смена пароля (PUT /api/user/change-password).

UserService подменяется через app.container.user_service.override, авторизация —
через app.dependency_overrides[get_current_user] (как в test_uploads_api.py),
CSRF — валидный токен из GET /api/auth/csrf-token.
Тесты не требуют БД.
"""
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from api.main_api import app
from api.dependencies import get_current_user
from api.models.user import User

from tests.conftest import get_csrf_headers


def _user_with_role(role: str) -> MagicMock:
    """Мок текущего пользователя с заданной ролью."""
    user = MagicMock(spec=User)
    user.id = 1
    user.email = f"{role}@example.com"
    user.role = role
    user.is_active = True
    return user


PASSWORD_PAYLOAD = {
    "current_password": "OldPass123",
    "new_password": "NewPass123",
}


@pytest.fixture
def client():
    """Создает тестовый клиент FastAPI."""
    return TestClient(app)


@pytest.fixture
def csrf_headers(client):
    """Заголовки с валидным CSRF-токеном (GET /auth/csrf-token)."""
    return get_csrf_headers(client)


@pytest.fixture
def as_user():
    """Подменяет текущего пользователя на обычного пользователя (role=user)."""
    app.dependency_overrides[get_current_user] = lambda: _user_with_role("user")
    yield
    app.dependency_overrides.clear()


class TestChangePassword:
    """Тесты PUT /api/user/change-password."""

    def test_requires_authentication(self, client, csrf_headers):
        """Без токена (даже с валидным CSRF) -> 401."""
        response = client.put("/api/user/change-password", json=PASSWORD_PAYLOAD, headers=csrf_headers)

        assert response.status_code == 401

    def test_requires_csrf_token(self, client, as_user):
        """Авторизован, но без X-CSRF-Token -> 403."""
        response = client.put("/api/user/change-password", json=PASSWORD_PAYLOAD)

        assert response.status_code == 403
        assert "CSRF" in response.json()["detail"]

    def test_change_password_success(self, client, csrf_headers, as_user):
        """Happy path: 200 {message}, сервис вызван с корректными аргументами."""
        user_service = MagicMock()
        user_service.change_password = AsyncMock(return_value=None)

        with app.container.user_service.override(user_service):
            response = client.put(
                "/api/user/change-password", json=PASSWORD_PAYLOAD, headers=csrf_headers
            )

        assert response.status_code == 200
        assert response.json() == {"message": "Пароль успешно изменен"}

        user_service.change_password.assert_awaited_once_with(
            1, "OldPass123", "NewPass123"
        )

    def test_wrong_current_password_returns_400(self, client, csrf_headers, as_user):
        """Регресс этапа 4.7: HTTPException(400) из сервиса пробрасывается, а не превращается в 500."""
        user_service = MagicMock()
        user_service.change_password = AsyncMock(
            side_effect=HTTPException(status_code=400, detail="Неверный текущий пароль")
        )

        with app.container.user_service.override(user_service):
            response = client.put(
                "/api/user/change-password", json=PASSWORD_PAYLOAD, headers=csrf_headers
            )

        assert response.status_code == 400
        assert response.json()["detail"] == "Неверный текущий пароль"

    def test_weak_new_password_rejected_in_router(self, client, csrf_headers, as_user):
        """Слабый пароль отклоняется на уровне роутера (validate_password_strength) -> 400."""
        user_service = MagicMock()
        user_service.change_password = AsyncMock(return_value=None)

        with app.container.user_service.override(user_service):
            response = client.put(
                "/api/user/change-password",
                json={**PASSWORD_PAYLOAD, "new_password": "123"},
                headers=csrf_headers,
            )

        assert response.status_code == 400
        assert response.json()["detail"].startswith("Слабый пароль")
        # Сервис не должен вызываться при слабом пароле
        user_service.change_password.assert_not_awaited()

    def test_missing_fields_returns_400(self, client, csrf_headers, as_user):
        """Отсутствие current_password/new_password -> 400 с понятной деталью."""
        user_service = MagicMock()
        user_service.change_password = AsyncMock(return_value=None)

        with app.container.user_service.override(user_service):
            response = client.put(
                "/api/user/change-password", json={}, headers=csrf_headers
            )

        assert response.status_code == 400
        assert "Требуются current_password и new_password" in response.json()["detail"]
        user_service.change_password.assert_not_awaited()
