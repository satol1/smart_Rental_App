# tests/api/test_promo_code_api.py
"""
Тесты HTTP-слоя promo_code_api.py: публичная валидация промокода и список промокодов.

PromoCodeBusinessLogic и PromoCodeManager подменяются через
app.container.<provider>.override, авторизация — через
app.dependency_overrides[get_current_user] (как в test_uploads_api.py).
Тесты не требуют БД.
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from api.main_api import app
from api.dependencies import get_current_user
from api.models.user import User
from shared.schemas.promo_code_schema import PromoCodeValidateResponse

from tests.conftest import get_csrf_headers


def _user_with_role(role: str) -> MagicMock:
    """Мок текущего пользователя с заданной ролью."""
    user = MagicMock(spec=User)
    user.id = 1
    user.email = f"{role}@example.com"
    user.role = role
    user.is_active = True
    return user


def _promo_code_orm(code: str = "SUMMER20", discount: float = 20.0) -> MagicMock:
    """Мок ORM-объекта промокода со всеми полями PromoCodeOut."""
    promo = MagicMock()
    promo.id = 1
    promo.code = code
    promo.description = "Летняя распродажа"
    promo.discount_percentage = discount
    promo.is_active = True
    promo.valid_from = None
    promo.expires_at = None
    promo.max_uses = 100
    promo.max_uses_per_user = None
    promo.min_order_amount = None
    promo.specific_to_user_id = None
    promo.applicable_to_equipment_ids = None
    promo.applicable_to_equipment_types = None
    promo.times_used = 3
    promo.created_at = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    promo.created_by_id = 7
    return promo


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


class TestValidatePromoCode:
    """Тесты POST /api/promocodes/validate — контракт PromoCodeValidateResponse."""

    def test_validate_success_snake_case_contract(self, client):
        """Happy path: 200, тело {code, discount_percentage, message} в snake_case."""
        business_logic = MagicMock()
        business_logic.validate_and_get_promo_code = AsyncMock(
            return_value=_promo_code_orm(code="SUMMER20", discount=20.0)
        )
        business_logic.create_validation_response = MagicMock(
            return_value=PromoCodeValidateResponse(
                code="SUMMER20",
                discount_percentage=20.0,
                message="Промокод успешно применен!",
            )
        )

        with app.container.promo_code_business_logic.override(business_logic):
            response = client.post(
                "/api/promocodes/validate",
                json={"code": "SUMMER20", "order_amount": 5000.0, "equipment_ids": [1, 2]},
            )

        assert response.status_code == 200
        data = response.json()
        # Контракт фиксирован: snake_case-поля и ничего лишнего
        assert set(data.keys()) == {"code", "discount_percentage", "message"}
        assert data["code"] == "SUMMER20"
        assert data["discount_percentage"] == 20.0
        assert data["message"] == "Промокод успешно применен!"
        # Регресс: camelCase-варианты не должны появляться в ответе
        assert "discountPercentage" not in data
        assert "discount_percent" not in data

        business_logic.validate_and_get_promo_code.assert_awaited_once_with(
            code="SUMMER20", order_amount=5000.0, equipment_ids=[1, 2], user=None
        )

    def test_validate_invalid_code_propagates_http_exception(self, client):
        """Невалидный код: HTTPException из бизнес-логики пробрасывается (статус + detail)."""
        business_logic = MagicMock()
        business_logic.validate_and_get_promo_code = AsyncMock(
            side_effect=HTTPException(status_code=404, detail="Промокод не найден или истек")
        )

        with app.container.promo_code_business_logic.override(business_logic):
            response = client.post(
                "/api/promocodes/validate",
                json={"code": "NOPE", "order_amount": 100.0, "equipment_ids": [1]},
            )

        assert response.status_code == 404
        assert response.json()["detail"] == "Промокод не найден или истек"

    def test_validate_missing_fields_returns_422(self, client):
        """Отсутствие обязательных полей -> 422."""
        business_logic = MagicMock()
        business_logic.validate_and_get_promo_code = AsyncMock()

        with app.container.promo_code_business_logic.override(business_logic):
            response = client.post("/api/promocodes/validate", json={"code": "SUMMER20"})

        assert response.status_code == 422
        business_logic.validate_and_get_promo_code.assert_not_awaited()


class TestGetAllPromoCodes:
    """Тесты GET /api/promocodes/ — доступ только менеджерам, форма {items, total}."""

    def test_requires_authentication(self, client):
        """Анонимный запрос -> 401."""
        response = client.get("/api/promocodes/")

        assert response.status_code == 401

    def test_forbidden_for_plain_user(self, client, as_user):
        """Обычный пользователь -> 403 (требуется manager или admin)."""
        response = client.get("/api/promocodes/")

        assert response.status_code == 403
        assert "Недостаточно прав" in response.json()["detail"]

    def test_manager_gets_items_and_total(self, client, as_manager):
        """Менеджер: 200, форма {items, total}, элементы сериализуются в PromoCodeOut."""
        manager = MagicMock()
        manager.get_all_promo_codes = AsyncMock(
            return_value=[
                _promo_code_orm(code="SUMMER20", discount=20.0),
                _promo_code_orm(code="WINTER10", discount=10.0),
            ]
        )

        with app.container.promo_code_manager.override(manager):
            response = client.get("/api/promocodes/")

        assert response.status_code == 200
        data = response.json()
        assert set(data.keys()) == {"items", "total"}
        assert data["total"] == 2
        assert [item["code"] for item in data["items"]] == ["SUMMER20", "WINTER10"]
        assert data["items"][0]["discount_percentage"] == 20.0
        assert data["items"][0]["is_active"] is True

    def test_manager_pagination_applied(self, client, as_manager):
        """Пагинация применяется на уровне роутера: limit=1 -> 1 элемент, total=2."""
        manager = MagicMock()
        manager.get_all_promo_codes = AsyncMock(
            return_value=[
                _promo_code_orm(code="SUMMER20", discount=20.0),
                _promo_code_orm(code="WINTER10", discount=10.0),
            ]
        )

        with app.container.promo_code_manager.override(manager):
            response = client.get("/api/promocodes/", params={"limit": 1})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["items"]) == 1
