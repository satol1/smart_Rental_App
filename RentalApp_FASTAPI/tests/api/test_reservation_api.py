# tests/api/test_reservation_api.py
"""
Тесты HTTP-слоя reservation_api.py: расчёт стоимости и создание резерва.

Все сервисы (FinancialService, PromoCodeService, DiscountService,
ReservationLifecycleService) подменяются через app.container.<provider>.override,
поэтому тесты не требуют БД. Авторизация подменяется через
app.dependency_overrides[get_current_user] (как в test_uploads_api.py),
CSRF — валидный токен из GET /api/auth/csrf-token (как в test_auth_api.py).
"""
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from api.main_api import app
from api.dependencies import get_current_user
from api.models.user import User
from api.services.financial_service import PriceDetails

from tests.conftest import get_csrf_headers


def _user_with_role(role: str) -> MagicMock:
    """Мок текущего пользователя с заданной ролью."""
    user = MagicMock(spec=User)
    user.id = 1
    user.email = f"{role}@example.com"
    user.role = role
    user.is_active = True
    return user


def _financial_mock() -> MagicMock:
    """Мок FinancialService: 4000 за 4 дня, скидка 40, к оплате 360."""
    financial = MagicMock()
    financial.validate_date_range = MagicMock(return_value=None)
    financial.calculate_final_price = AsyncMock(
        return_value=PriceDetails(
            full_total=Decimal("400.00"),
            discount_amount=Decimal("40.00"),
            final_total=Decimal("360.00"),
        )
    )
    financial.get_rental_days = AsyncMock(return_value=4)
    return financial


def _discount_mock() -> MagicMock:
    """Мок DiscountService со скидкой за продолжительность 5%."""
    discount = MagicMock()
    discount.get_duration_discount_percentage = AsyncMock(return_value=5)
    return discount


def _reservation_mock() -> MagicMock:
    """Мок ORM-объекта резерва, возвращаемого ReservationLifecycleService."""
    reservation = MagicMock()
    reservation.id = 5
    reservation.user_id = 1
    reservation.status = "active"
    reservation.total_cost = Decimal("400.00")
    reservation.discount_amount = Decimal("40.00")
    reservation.equipment_ids = [1, 2]
    reservation.accessory_links = []
    reservation.start_date = date(2026, 10, 1)
    reservation.end_date = date(2026, 10, 5)
    return reservation


CALCULATE_PAYLOAD = {
    "equipment_ids": [1, 2],
    "start_date": "2026-10-01",
    "end_date": "2026-10-05",
    "selected_accessories": {},
    "promo_code": None,
}

CREATE_PAYLOAD = {
    "equipment_ids": [1, 2],
    "start_date": "2026-10-01",
    "end_date": "2026-10-05",
    "selected_accessories": {},
    "promo_code": None,
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


class TestCalculatePrice:
    """Тесты POST /api/reservations/calculate — контракт PriceCalculationResponse."""

    def test_contract_200_without_promo_code(self, client):
        """Happy path: 200 и точный набор полей схемы PriceCalculationResponse."""
        financial = _financial_mock()

        with (
            app.container.financial_service.override(financial),
            app.container.discount_service.override(_discount_mock()),
        ):
            response = client.post("/api/reservations/calculate", json=CALCULATE_PAYLOAD)

        assert response.status_code == 200
        data = response.json()
        # Контракт ответа фиксирован схемой (snake_case)
        assert set(data.keys()) == {
            "day_count",
            "full_total",
            "final_total",
            "discount_amount",
            "duration_discount_percentage",
            "promo_discount_percentage",
            "promo_code_message",
        }
        assert data["day_count"] == 4
        assert data["full_total"] == 400.0
        assert data["final_total"] == 360.0
        assert data["discount_amount"] == 40.0
        assert data["duration_discount_percentage"] == 5
        assert data["promo_discount_percentage"] == 0.0
        assert data["promo_code_message"] is None

        # Без промокода роутер считает цену один раз (этап 5: убран лишний
        # предварительный расчёт — он нужен только для валидации промокода)
        assert financial.calculate_final_price.await_count == 1
        financial.calculate_final_price.assert_awaited_with(
            [1, 2], {}, date(2026, 10, 1), date(2026, 10, 5), None
        )
        financial.validate_date_range.assert_called_once_with(
            date(2026, 10, 1), date(2026, 10, 5)
        )

    def test_invalid_promo_code_does_not_fail_calculation(self, client):
        """Невалидный промокод не ломает расчёт: 200, текст ошибки в promo_code_message."""
        financial = _financial_mock()
        promo_service = MagicMock()
        promo_service.validate_promo_code_for_use = AsyncMock(
            side_effect=HTTPException(status_code=404, detail="Промокод не найден или истек")
        )

        with (
            app.container.financial_service.override(financial),
            app.container.discount_service.override(_discount_mock()),
            app.container.promo_code_service.override(promo_service),
        ):
            response = client.post(
                "/api/reservations/calculate", json={**CALCULATE_PAYLOAD, "promo_code": "EXPIRED"}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["promo_code_message"] == "Промокод не найден или истек"
        assert data["promo_discount_percentage"] == 0.0

    def test_date_validation_error_returns_400(self, client):
        """FinancialService бросает HTTPException(400) — статус и detail пробрасываются."""
        financial = _financial_mock()
        financial.validate_date_range = MagicMock(
            side_effect=HTTPException(status_code=400, detail="Дата окончания раньше даты начала")
        )

        with app.container.financial_service.override(financial):
            response = client.post("/api/reservations/calculate", json=CALCULATE_PAYLOAD)

        assert response.status_code == 400
        assert response.json()["detail"] == "Дата окончания раньше даты начала"

    def test_missing_required_fields_returns_422(self, client):
        """Отсутствие обязательных полей запроса -> 422, сервисы не вызываются."""
        with app.container.financial_service.override(_financial_mock()):
            response = client.post("/api/reservations/calculate", json={"start_date": "2026-10-01"})

        assert response.status_code == 422


class TestCreateReservation:
    """Тесты POST /api/reservations/ — авторизация, CSRF, контракт ReservationResponse."""

    def test_requires_authentication(self, client, csrf_headers):
        """Без токена (даже с валидным CSRF) -> 401."""
        response = client.post("/api/reservations/", json=CREATE_PAYLOAD, headers=csrf_headers)

        assert response.status_code == 401

    def test_requires_csrf_token(self, client, as_user):
        """Авторизован, но без X-CSRF-Token -> 403."""
        response = client.post("/api/reservations/", json=CREATE_PAYLOAD)

        assert response.status_code == 403
        assert "CSRF" in response.json()["detail"]

    def test_create_success_contract(self, client, csrf_headers, as_user):
        """Happy path: 200 и поля ReservationResponse."""
        lifecycle = MagicMock()
        lifecycle.create_user_reservation = AsyncMock(return_value=_reservation_mock())

        with app.container.reservation_lifecycle_service.override(lifecycle):
            response = client.post(
                "/api/reservations/", json=CREATE_PAYLOAD, headers=csrf_headers
            )

        assert response.status_code == 200
        data = response.json()
        assert data["reservation_id"] == 5
        assert data["message"] == "Резерв успешно создан"
        assert data["user_id"] == 1
        assert data["status"] == "active"
        assert data["total_cost"] == 400.0
        assert data["discount_amount"] == 40.0
        assert data["equipment_count"] == 2
        assert data["accessory_count"] == 0
        assert data["start_date"] == "2026-10-01"
        assert data["end_date"] == "2026-10-05"

        lifecycle.create_user_reservation.assert_awaited_once()

    def test_service_conflict_returns_409(self, client, csrf_headers, as_user):
        """ReservationLifecycleService бросает HTTPException(409) -> 409 пробрасывается."""
        lifecycle = MagicMock()
        lifecycle.create_user_reservation = AsyncMock(
            side_effect=HTTPException(status_code=409, detail="Оборудование уже занято на выбранные даты")
        )

        with app.container.reservation_lifecycle_service.override(lifecycle):
            response = client.post(
                "/api/reservations/", json=CREATE_PAYLOAD, headers=csrf_headers
            )

        assert response.status_code == 409
        assert response.json()["detail"] == "Оборудование уже занято на выбранные даты"

    def test_list_requires_authentication(self, client):
        """GET /api/reservations/ без токена -> 401."""
        response = client.get("/api/reservations/")

        assert response.status_code == 401
