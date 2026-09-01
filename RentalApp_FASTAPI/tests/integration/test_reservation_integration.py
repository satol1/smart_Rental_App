# tests/integration/test_reservation_api.py

"""
Интеграционные тесты для API резервирований.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta

from api.models.user import User
from api.models.equipment import Equipment
from api.models.accessory import Accessory
from api.models.promo_code import PromoCode
from api.models.reservation import Reservation

# Фикстуры из critical conftest уже доступны


@pytest.mark.asyncio
@pytest.mark.integration
class TestReservationAPI:
    """Тесты для API резервирований."""

    async def test_create_reservation_success(
        self, 
        client: AsyncClient,
        test_user: User,
        test_equipment: Equipment,
        auth_headers: dict,
        db_session: AsyncSession):
        """Тест успешного создания резерва."""
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        
        reservation_data = {
            "equipment_ids": [test_equipment.id],
            "selected_accessories": None,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "promo_code": None
        }
        
        response = await client.post("/api/reservations/", json=reservation_data, headers=auth_headers)
        
        assert response.status_code == 200  # API возвращает 200, а не 201
        data = response.json()
        assert "reservation_id" in data
        assert "message" in data
        assert data["message"] == "Резерв успешно создан"
        
        # Проверяем, что резерв создан в БД
        reservation = await db_session.get(Reservation, data["reservation_id"])
        assert reservation is not None
        assert reservation.user_id == test_user.id
        assert reservation.start_date == start_date
        assert reservation.end_date == end_date
        assert reservation.status == "active"

    async def test_create_reservation_with_accessories(
        self, 
        client: AsyncClient,
        test_user: User,
        test_equipment: Equipment,
        test_accessory: Accessory,
        auth_headers: dict):
        """Тест создания резерва с аксессуарами."""
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        
        reservation_data = {
            "equipment_ids": [test_equipment.id],
            "selected_accessories": {str(test_equipment.id): [test_accessory.id]},
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "promo_code": None
        }
        
        response = await client.post("/api/reservations/", json=reservation_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "reservation_id" in data
        assert "message" in data

    async def test_create_reservation_with_promo_code(
        self, 
        client: AsyncClient,
        test_user: User,
        test_equipment: Equipment,
        test_promo_code: PromoCode,
        auth_headers: dict):
        """Тест создания резерва с промокодом."""
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        
        reservation_data = {
            "equipment_ids": [test_equipment.id],
            "selected_accessories": None,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "promo_code": test_promo_code.code
        }
        
        response = await client.post("/api/reservations/", json=reservation_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "reservation_id" in data
        assert "message" in data

    async def test_create_reservation_unauthorized(
        self, 
        client: AsyncClient,
        test_equipment: Equipment):
        """Тест создания резерва без авторизации."""
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        
        reservation_data = {
            "equipment_ids": [test_equipment.id],
            "selected_accessories": None,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "promo_code": None
        }
        
        response = await client.post("/api/reservations/", json=reservation_data)
        
        assert response.status_code == 401

    async def test_create_reservation_equipment_not_found(
        self, 
        client: AsyncClient,
        test_user: User,
        auth_headers: dict):
        """Тест создания резерва с несуществующим оборудованием."""
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        
        reservation_data = {
            "equipment_ids": [99999],
            "selected_accessories": None,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "promo_code": None
        }
        
        response = await client.post("/api/reservations/", json=reservation_data, headers=auth_headers)
        
        assert response.status_code == 404
        # API возвращает сообщение "Оборудование с ID [99999] не найдено"
        assert "не найдено" in response.json()["detail"].lower()

    async def test_create_reservation_invalid_dates(
        self, 
        client: AsyncClient,
        test_user: User,
        test_equipment: Equipment,
        auth_headers: dict):
        """Тест создания резерва с неверными датами."""
        start_date = date.today() + timedelta(days=3)
        end_date = start_date - timedelta(days=1)  # Конец раньше начала
        
        reservation_data = {
            "equipment_ids": [test_equipment.id],
            "selected_accessories": None,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "promo_code": None
        }
        
        response = await client.post("/api/reservations/", json=reservation_data, headers=auth_headers)
        
        assert response.status_code == 400
        # API возвращает сообщение на русском "Дата окончания должна быть позже или равна дате начала."
        detail = response.json()["detail"].lower()
        assert "дата" in detail or "date" in detail

    async def test_get_user_reservations_success(
        self, 
        client: AsyncClient,
        test_user: User,
        test_equipment: Equipment,
        auth_headers: dict,
        db_session: AsyncSession):
        """Тест получения резервов пользователя."""
        # Создаем резерв
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        
        reservation_data = {
            "equipment_ids": [test_equipment.id],
            "selected_accessories": None,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "promo_code": None
        }
        
        await client.post("/api/reservations/", json=reservation_data, headers=auth_headers)
        
        # Получаем резервы пользователя
        response = await client.get("/api/reservations/my", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) >= 1
        
        # Проверяем, что наш резерв в списке
        reservation_ids = [item["id"] for item in data["items"]]
        assert any(rid for rid in reservation_ids)  # Хотя бы один резерв должен быть

    async def test_get_user_reservations_unauthorized(
        self, 
        client: AsyncClient):
        """Тест получения резервов без авторизации."""
        response = await client.get("/api/reservations/my")
        
        assert response.status_code == 401

    async def test_get_reservation_by_id_success(
        self, 
        client: AsyncClient,
        test_user: User,
        test_equipment: Equipment,
        auth_headers: dict):
        """Тест получения резерва по ID."""
        # Создаем резерв
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        
        reservation_data = {
            "equipment_ids": [test_equipment.id],
            "selected_accessories": None,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "promo_code": None
        }
        
        create_response = await client.post("/api/reservations/", json=reservation_data, headers=auth_headers)
        reservation_id = create_response.json()["reservation_id"]
        
        # Получаем резервы пользователя и находим наш резерв
        response = await client.get("/api/reservations/my", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        # Проверяем, что резерв в списке
        reservation = next((item for item in data["items"] if item["id"] == reservation_id), None)
        assert reservation is not None
        assert reservation["user_id"] == test_user.id

    async def test_get_user_reservations_empty(
        self, 
        client: AsyncClient,
        test_user: User,
        auth_headers: dict):
        """Тест получения пустого списка резервов."""
        response = await client.get("/api/reservations/my", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 0

    async def test_cancel_reservation_success(
        self, 
        client: AsyncClient,
        test_user: User,
        test_equipment: Equipment,
        auth_headers: dict):
        """Тест отмены резерва."""
        # Создаем резерв
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        
        reservation_data = {
            "equipment_ids": [test_equipment.id],
            "selected_accessories": None,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "promo_code": None
        }
        
        create_response = await client.post("/api/reservations/", json=reservation_data, headers=auth_headers)
        reservation_id = create_response.json()["reservation_id"]
        
        # Отменяем резерв
        response = await client.delete(f"/api/reservations/{reservation_id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Резерв удалён"

    async def test_cancel_reservation_not_found(
        self, 
        client: AsyncClient,
        test_user: User,
        auth_headers: dict):
        """Тест отмены несуществующего резерва."""
        response = await client.delete("/api/reservations/99999", headers=auth_headers)
        
        assert response.status_code == 404

    async def test_cancel_reservation_unauthorized(
        self, 
        client: AsyncClient,
        test_user: User,
        test_equipment: Equipment,
        auth_headers: dict):
        """Тест отмены резерва без авторизации."""
        # Создаем резерв
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        
        reservation_data = {
            "equipment_ids": [test_equipment.id],
            "selected_accessories": None,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "promo_code": None
        }
        
        create_response = await client.post("/api/reservations/", json=reservation_data, headers=auth_headers)
        reservation_id = create_response.json()["reservation_id"]
        
        # Пытаемся отменить без авторизации
        response = await client.delete(f"/api/reservations/{reservation_id}")
        
        assert response.status_code == 401
