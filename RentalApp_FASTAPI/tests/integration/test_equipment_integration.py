# tests/integration/test_equipment_api.py

"""
Интеграционные тесты для API оборудования.
"""

import pytest
import os
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.equipment import Equipment
from api.models.user import User

# Фикстуры из critical conftest уже доступны


@pytest.mark.asyncio
@pytest.mark.integration
class TestEquipmentAPI:
    """Тесты для API оборудования."""
    
    async def get_csrf_token_if_needed(self, client: AsyncClient) -> dict:
        """Получить CSRF токен, если CSRF защита включена."""
        if os.getenv("DISABLE_CSRF", "false").lower() == "true":
            return {}
        
        response = await client.get("/api/auth/csrf-token")
        if response.status_code == 200:
            token = response.json()["csrf_token"]
            return {"X-CSRF-Token": token}
        return {}

    async def test_get_equipment_list_success(
        self, 
        client: AsyncClient,
        test_equipment: Equipment):
        """Тест получения списка оборудования."""
        response = await client.get("/api/equipment/")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) >= 1
        
        # Проверяем, что наше тестовое оборудование в списке
        equipment_ids = [item["id"] for item in data["items"]]
        assert test_equipment.id in equipment_ids

    async def test_get_equipment_by_id_success(
        self, 
        client: AsyncClient,
        test_equipment: Equipment):
        """Тест получения оборудования по ID."""
        response = await client.get(f"/api/equipment/{test_equipment.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_equipment.id
        assert data["name"] == test_equipment.name
        assert data["daily_rate"] == test_equipment.daily_rate

    async def test_get_equipment_by_id_not_found(
        self, 
        client: AsyncClient):
        """Тест получения несуществующего оборудования."""
        response = await client.get("/api/equipment/99999")
        
        assert response.status_code == 404
        assert "Оборудование не найдено" in response.json()["detail"]

    async def test_create_equipment_success(
        self, 
        client: AsyncClient,
        manager_auth_headers: dict,
        db_session: AsyncSession
    ):
        """Тест создания оборудования менеджером."""
        equipment_data = {
            "name": "New Camera",
            "description": "New camera description",
            "daily_rate": 150.0,
            "equipment_type": "camera",
            "brand": "Test Brand"
        }
        
        # Получаем CSRF токен
        csrf_headers = await self.get_csrf_token_if_needed(client)
        headers_with_csrf = {**manager_auth_headers, **csrf_headers}
        
        response = await client.post("/api/equipment/", json=equipment_data, headers=headers_with_csrf)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == equipment_data["name"]
        assert data["daily_rate"] == equipment_data["daily_rate"]
        assert "id" in data
        assert data["equipment_type"] == equipment_data["equipment_type"]
        assert data["brand"] == equipment_data["brand"]

    async def test_create_equipment_unauthorized(
        self, 
        client: AsyncClient,
        test_user: User,
        auth_headers: dict):
        """Тест создания оборудования обычным пользователем."""
        equipment_data = {
            "name": "New Camera",
            "description": "New camera description",
            "daily_rate": 150.0,
            "equipment_type": "camera",
            "brand": "Test Brand"
        }
        
        response = await client.post("/api/equipment/", json=equipment_data, headers=auth_headers)
        
        assert response.status_code == 403
        assert "Недостаточно прав" in response.json()["detail"]

    async def test_create_equipment_no_auth(
        self, 
        client: AsyncClient):
        """Тест создания оборудования без авторизации."""
        equipment_data = {
            "name": "New Camera",
            "description": "New camera description",
            "daily_rate": 150.0,
            "equipment_type": "camera",
            "brand": "Test Brand"
        }
        
        response = await client.post("/api/equipment/", json=equipment_data)
        
        assert response.status_code == 401

    async def test_update_equipment_success(
        self, 
        client: AsyncClient,
        test_equipment: Equipment,
        manager_auth_headers: dict):
        """Тест обновления оборудования менеджером."""
        update_data = {
            "name": "Updated Camera",
            "daily_rate": 120.0
        }
        
        response = await client.put(f"/api/equipment/{test_equipment.id}", json=update_data, headers=manager_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["daily_rate"] == update_data["daily_rate"]

    async def test_update_equipment_not_found(
        self, 
        client: AsyncClient,
        manager_auth_headers: dict):
        """Тест обновления несуществующего оборудования."""
        update_data = {
            "name": "Updated Camera",
            "daily_rate": 120.0
        }
        
        response = await client.put("/api/equipment/99999", json=update_data, headers=manager_auth_headers)
        
        assert response.status_code == 404

    async def test_delete_equipment_success(
        self, 
        client: AsyncClient,
        test_equipment: Equipment,
        manager_auth_headers: dict):
        """Тест удаления оборудования менеджером."""
        response = await client.delete(f"/api/equipment/{test_equipment.id}", headers=manager_auth_headers)
        
        assert response.status_code == 204

    async def test_delete_equipment_not_found(
        self, 
        client: AsyncClient,
        manager_auth_headers: dict):
        """Тест удаления несуществующего оборудования."""
        response = await client.delete("/api/equipment/99999", headers=manager_auth_headers)
        
        assert response.status_code == 404

    async def test_search_equipment_by_name(
        self, 
        client: AsyncClient,
        test_equipment: Equipment):
        """Тест поиска оборудования по названию."""
        response = await client.get(f"/api/equipment/?search={test_equipment.name}")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) >= 1
        
        # Проверяем, что найденное оборудование содержит искомое название
        found_equipment = next((item for item in data["items"] if item["id"] == test_equipment.id), None)
        assert found_equipment is not None
        assert test_equipment.name.lower() in found_equipment["name"].lower()

    async def test_get_equipment_availability(
        self, 
        client: AsyncClient,
        test_equipment: Equipment,
        manager_auth_headers: dict):
        """Тест получения доступности оборудования."""
        response = await client.get(
            f"/api/equipment/{test_equipment.id}/availability",
            headers=manager_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "has_active_reservations" in data
        assert "has_active_rentals" in data
        assert "active_reservations_count" in data
        assert "active_rentals_count" in data

    async def test_get_equipment_with_pagination(
        self, 
        client: AsyncClient):
        """Тест получения оборудования с пагинацией."""
        response = await client.get("/api/equipment/?skip=0&limit=5")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) <= 5

    async def test_get_equipment_with_invalid_pagination(
        self, 
        client: AsyncClient):
        """Тест получения оборудования с неверными параметрами пагинации."""
        response = await client.get("/api/equipment/?skip=-1&limit=0")
        
        assert response.status_code == 422  # Validation error
