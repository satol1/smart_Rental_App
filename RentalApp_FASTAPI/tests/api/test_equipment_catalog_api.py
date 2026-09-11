# tests/api/test_equipment_catalog_api.py
"""
Тесты HTTP-слоя каталога оборудования (equipment_api.py, GET-эндпоинты).

EquipmentServiceApi, EquipmentRepository и EquipmentCRUDService подменяются через
app.container.<provider>.override, авторизация — через
app.dependency_overrides[get_current_user] (как в test_uploads_api.py).
Тесты не требуют БД.
"""
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from api.main_api import app
from api.dependencies import get_current_user
from api.models.user import User
from shared.schemas.equipment_schema import EquipmentOut

from tests.conftest import get_csrf_headers


def _user_with_role(role: str) -> MagicMock:
    """Мок текущего пользователя с заданной ролью."""
    user = MagicMock(spec=User)
    user.id = 1
    user.email = f"{role}@example.com"
    user.role = role
    user.is_active = True
    return user


def _catalog_item(item_id: int, name: str) -> EquipmentOut:
    """Элемент каталога (EquipmentOut), который возвращает EquipmentServiceApi."""
    return EquipmentOut(
        id=item_id,
        equipment_type="camera",
        brand="Canon",
        name=name,
        condition="excellent",
        daily_rate=100.0,
    )


def _equipment_orm(equipment_id: int = 1) -> MagicMock:
    """Мок ORM-объекта оборудования со всеми полями EquipmentOut."""
    equipment = MagicMock()
    equipment.id = equipment_id
    equipment.entity_type = "equipment"
    equipment.equipment_type = "camera"
    equipment.brand = "Canon"
    equipment.name = "EOS R5"
    equipment.serial_number = "SN-001"
    equipment.condition = "excellent"
    equipment.daily_rate = 100.0
    equipment.notes = None
    equipment.description = None
    equipment.last_maintenance = None
    equipment.image_url = None
    equipment.image_urls = None
    equipment.short_description = None
    equipment.accessories = None
    equipment.associations = None
    return equipment


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


class TestEquipmentCatalog:
    """Тесты GET /api/equipment/ — публичный каталог."""

    def test_list_contract_items_total_available_filters(self, client):
        """200; ключи items/total/availableFilters; items — список."""
        service = MagicMock()
        service.get_paginated_equipment = AsyncMock(
            return_value=(
                [_catalog_item(1, "EOS R5"), _catalog_item(2, "EOS R6")],
                2,
                {"types": ["camera"], "brands": [], "associations": []},
            )
        )

        with app.container.equipment_service_api.override(service):
            response = client.get("/api/equipment/")

        assert response.status_code == 200
        data = response.json()
        assert set(data.keys()) == {"items", "total", "availableFilters"}
        assert isinstance(data["items"], list)
        assert data["total"] == 2
        assert [item["name"] for item in data["items"]] == ["EOS R5", "EOS R6"]
        assert set(data["availableFilters"].keys()) == {"types", "brands", "associations"}
        assert data["availableFilters"]["types"] == ["camera"]

        # Дефолтные параметры фильтрации пробрасываются в сервис
        service.get_paginated_equipment.assert_awaited_once_with(
            skip=0, limit=10, query=None, type=None, brand_system_id=None,
            association_id=None, start_date=None, end_date=None,
            available_only=False, group_similar=True,
        )

    def test_list_passes_query_params(self, client):
        """Параметры запроса (availableOnly, limit, type) пробрасываются в сервис."""
        service = MagicMock()
        service.get_paginated_equipment = AsyncMock(return_value=([], 0, {"types": [], "brands": [], "associations": []}))

        with app.container.equipment_service_api.override(service):
            response = client.get(
                "/api/equipment/",
                params={"limit": 1, "type": "camera", "availableOnly": "true"},
            )

        assert response.status_code == 200
        service.get_paginated_equipment.assert_awaited_once_with(
            skip=0, limit=1, query=None, type="camera", brand_system_id=None,
            association_id=None, start_date=None, end_date=None,
            available_only=True, group_similar=True,
        )


class TestEquipmentById:
    """Тесты GET /api/equipment/{id}."""

    def test_get_by_id_success(self, client):
        """Оборудование найдено -> 200, поля EquipmentOut."""
        repo = MagicMock()
        repo.get_by_id_with_details = AsyncMock(return_value=_equipment_orm(equipment_id=1))

        with app.container.equipment_repo.override(repo):
            response = client.get("/api/equipment/1")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["name"] == "EOS R5"
        assert data["daily_rate"] == 100.0

    def test_get_by_id_not_found(self, client):
        """Оборудование не найдено -> 404 с деталью."""
        repo = MagicMock()
        repo.get_by_id_with_details = AsyncMock(return_value=None)

        with app.container.equipment_repo.override(repo):
            response = client.get("/api/equipment/999")

        assert response.status_code == 404
        assert response.json()["detail"] == "Оборудование не найдено"


class TestEquipmentAvailability:
    """Тесты GET /api/equipment/{id}/availability — только для менеджеров."""

    def test_requires_authentication(self, client):
        """Анонимный запрос -> 401."""
        response = client.get("/api/equipment/1/availability")

        assert response.status_code == 401

    def test_forbidden_for_plain_user(self, client, as_user):
        """Обычный пользователь -> 403 (требуется manager или admin)."""
        response = client.get("/api/equipment/1/availability")

        assert response.status_code == 403
        assert "Недостаточно прав" in response.json()["detail"]

    def test_manager_gets_availability_status(self, client, as_manager):
        """Менеджер: 200, контракт EquipmentAvailabilityStatus."""
        crud = MagicMock()
        crud.get_equipment_by_id = AsyncMock(return_value=_equipment_orm())
        crud.count_active_links = AsyncMock(return_value=(2, 1))

        with app.container.equipment_crud_service.override(crud):
            response = client.get("/api/equipment/1/availability")

        assert response.status_code == 200
        data = response.json()
        assert set(data.keys()) == {
            "has_active_reservations",
            "has_active_rentals",
            "active_reservations_count",
            "active_rentals_count",
        }
        assert data["has_active_reservations"] is True
        assert data["has_active_rentals"] is True
        assert data["active_reservations_count"] == 2
        assert data["active_rentals_count"] == 1
