# tests/api/test_admin_rental_api.py
"""
Минимальные тесты HTTP-слоя admin_rental_api.py: права доступа и guard
удалённого маршрута создания аренды из резерва.

Авторизация подменяется через app.dependency_overrides[get_current_user]
(как в test_uploads_api.py), CSRF — валидный токен из GET /api/auth/csrf-token.
Тесты не требуют БД.
"""
from unittest.mock import MagicMock

import pytest
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


@pytest.fixture
def as_manager():
    """Подменяет текущего пользователя на менеджера (role=manager)."""
    app.dependency_overrides[get_current_user] = lambda: _user_with_role("manager")
    yield
    app.dependency_overrides.clear()


class TestAdminRentalsAccessControl:
    """POST /api/admin/rentals/ — создание аренды требует менеджера."""

    def test_create_rental_requires_authentication(self, client, csrf_headers):
        """Анонимный запрос (даже с валидным CSRF) -> 401."""
        rental_payload = {
            "user_id": 2,
            "equipment_ids": [1],
            "start_date": "2026-10-01",
            "end_date": "2026-10-05",
            "prepayment_amount": 100.0,
        }
        response = client.post("/api/admin/rentals/", json=rental_payload, headers=csrf_headers)

        assert response.status_code == 401

    def test_create_rental_forbidden_for_plain_user(self, client, csrf_headers, as_user):
        """Обычный пользователь -> 403 (требуется manager или admin)."""
        rental_payload = {
            "user_id": 2,
            "equipment_ids": [1],
            "start_date": "2026-10-01",
            "end_date": "2026-10-05",
            "prepayment_amount": 100.0,
        }
        response = client.post("/api/admin/rentals/", json=rental_payload, headers=csrf_headers)

        assert response.status_code == 403
        assert "Недостаточно прав" in response.json()["detail"]


class TestRemovedFromReservationRoute:
    """Guard этапа 4.2: маршрут /api/admin/rentals/from-reservation/{id} удалён."""

    def test_from_reservation_route_not_found_anonymous(self, client):
        """Анонимный запрос к удалённому маршруту -> 404 (route not found, не 401/405)."""
        response = client.post("/api/admin/rentals/from-reservation/999")

        assert response.status_code == 404
        assert response.json()["detail"] == "Not Found"

    def test_from_reservation_route_not_found_for_manager(self, client, csrf_headers, as_manager):
        """Даже авторизованный менеджер получает 404 — маршрута больше нет."""
        response = client.post(
            "/api/admin/rentals/from-reservation/999",
            json={"prepayment_amount": 100.0},
            headers=csrf_headers,
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Not Found"
