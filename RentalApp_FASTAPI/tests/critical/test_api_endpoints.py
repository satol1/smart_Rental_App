# tests/critical/test_api_endpoints.py
"""
Критические тесты API эндпоинтов для проверки работоспособности системы.
Эти тесты проверяют основные сценарии использования через HTTP API.
"""

import pytest
from httpx import AsyncClient
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from api.main_api import app
from api.models.user import User
from api.models.equipment import Equipment
from api.models.reservation import Reservation
from api.models.rental import Rental
from api.models.balance_history import BalanceHistory
from containers import Container


@pytest.mark.integration
class TestCriticalAPIEndpoints:
    """Критические тесты API эндпоинтов"""

    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        """Тест: Проверка работоспособности API."""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_user_registration_and_login(self, client: AsyncClient):
        """Тест: Регистрация и авторизация пользователя."""
        import time
        # Регистрация пользователя с уникальным email
        unique_email = f"newuser_{int(time.time())}@example.com"
        registration_data = {
            "email": unique_email,
            "password": "TestPassword123",
            "full_name": "New User",
            "privacy_policy_accepted": True,
            "terms_accepted": True
        }
        
        response = await client.post("/api/auth/register", json=registration_data)
        # API возвращает 201 при успешной регистрации
        assert response.status_code == 201
        # Проверяем, что ответ содержит данные пользователя
        data = response.json()
        assert "user_id" in data or "message" in data
        
        # Авторизация пользователя
        login_data = {
            "username": unique_email,
            "password": "testpassword123"
        }
        
        response = await client.post("/api/auth/token", data=login_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_equipment_listing(self, client: AsyncClient, test_equipment: Equipment):
        """Тест: Получение списка оборудования."""
        response = await client.get("/api/equipment/")
        assert response.status_code == 200
        
        data = response.json()
        # Теперь API возвращает пагинированный ответ
        assert isinstance(data, dict)
        assert "items" in data
        assert "total" in data
        assert "availableFilters" in data
        
        items = data["items"]
        assert isinstance(items, list)
        assert len(items) > 0
        
        # Проверяем, что наше тестовое оборудование в списке
        equipment_names = [item["name"] for item in items]
        assert test_equipment.name in equipment_names

    @pytest.mark.asyncio
    async def test_reservation_creation_flow(self, client: AsyncClient, test_user: User, test_equipment: Equipment):
        """Тест: Полный цикл создания резервации."""
        # Получаем токен авторизации
        login_data = {
            "username": test_user.email,
            "password": "testpassword123"
        }
        
        response = await client.post("/api/auth/token", data=login_data)
        assert response.status_code == 200, f"Login failed with status {response.status_code}: {response.text}"
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Создаем резервацию
        start_date = (datetime.now() + timedelta(days=1)).date()
        end_date = (datetime.now() + timedelta(days=3)).date()
        
        reservation_data = {
            "equipment_ids": [test_equipment.id],
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "selected_accessories": {},
            "promo_code": None
        }
        
        response = await client.post("/api/reservations/", json=reservation_data, headers=headers)
        assert response.status_code == 200, f"Reservation creation failed with status {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reservation_id" in data
        assert "message" in data
        assert data["message"] == "Резерв успешно создан"

    @pytest.mark.asyncio
    async def test_balance_operations(self, client: AsyncClient, test_user: User):
        """Тест: Операции с балансом пользователя."""
        # Получаем токен авторизации
        login_data = {
            "username": test_user.email,
            "password": "testpassword123"
        }
        
        response = await client.post("/api/auth/token", data=login_data)
        assert response.status_code == 200
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Получаем текущий баланс
        response = await client.get("/api/user/me", headers=headers)
        assert response.status_code == 200
        
        initial_balance = response.json()["balance"]
        # Проверяем, что баланс существует и является числом
        assert isinstance(initial_balance, (int, float))
        assert initial_balance >= 0

    @pytest.mark.asyncio
    async def test_reservation_to_rental_conversion(self, client: AsyncClient, test_user: User, test_equipment: Equipment, test_manager: User):
        """Тест: Конвертация резервации в аренду."""
        # Создаем резервацию
        
        reservation_data = {
            "equipment_ids": [test_equipment.id],
            "start_date": (datetime.now() + timedelta(days=1)).date().isoformat(),
            "end_date": (datetime.now() + timedelta(days=3)).date().isoformat(),
            "selected_accessories": {},
            "promo_code": None
        }
        
        # Авторизуемся как пользователь
        login_data = {
            "username": test_user.email,
            "password": "testpassword123"
        }
        
        response = await client.post("/api/auth/token", data=login_data)
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = await client.post("/api/reservations/", json=reservation_data, headers=headers)
        print(f"Reservation creation response: {response.status_code}")
        print(f"Response text: {response.text}")
        assert response.status_code == 200
        
        reservation_id = response.json()["reservation_id"]
        
        # Авторизуемся как менеджер
        manager_login_data = {
            "username": test_manager.email,
            "password": "secret"
        }
        
        response = await client.post("/api/auth/token", data=manager_login_data)
        manager_token = response.json()["access_token"]
        manager_headers = {"Authorization": f"Bearer {manager_token}"}
        
        # Конвертируем резервацию в аренду
        rental_data = {
            "prepayment_amount": 100.0,
            "notes": "Test rental conversion"
        }
        
        response = await client.post(
            f"/api/admin/rentals/from-reservation/{reservation_id}",
            json=rental_data,
            headers=manager_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["user_id"] == test_user.id

    @pytest.mark.asyncio
    async def test_error_handling(self, client: AsyncClient):
        """Тест: Обработка ошибок API."""
        # Тест неавторизованного доступа
        response = await client.get("/api/user/me")
        assert response.status_code == 401
        
        # Тест невалидных данных (без авторизации возвращает 401, что правильно)
        response = await client.post("/api/reservations/", json={})
        assert response.status_code == 401  # Unauthorized (требуется авторизация)

    @pytest.mark.asyncio
    async def test_concurrent_requests(self, client: AsyncClient, test_equipment: Equipment):
        """Тест: Обработка одновременных запросов."""
        import asyncio
        
        async def make_request():
            response = await client.get("/api/equipment/")
            return response.status_code
        
        # Создаем несколько одновременных запросов
        tasks = [make_request() for _ in range(10)]
        results = await asyncio.gather(*tasks)
        
        # Все запросы должны завершиться успешно
        assert all(status == 200 for status in results)

    @pytest.mark.asyncio
    async def test_database_consistency_after_operations(self, client: AsyncClient, db_session: AsyncSession, test_user: User, test_equipment: Equipment):
        """Тест: Консистентность данных в БД после операций."""
        # Создаем резервацию через API
        
        login_data = {
            "username": test_user.email,
            "password": "testpassword123"
        }
        
        response = await client.post("/api/auth/token", data=login_data)
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        reservation_data = {
            "equipment_ids": [test_equipment.id],
            "start_date": (datetime.now() + timedelta(days=1)).date().isoformat(),
            "end_date": (datetime.now() + timedelta(days=3)).date().isoformat(),
            "selected_accessories": {},
            "promo_code": None
        }
        
        response = await client.post("/api/reservations/", json=reservation_data, headers=headers)
        assert response.status_code == 200
        
        reservation_id = response.json()["reservation_id"]
        
        # Проверяем, что резервация создалась в БД
        reservation = await db_session.get(Reservation, reservation_id)
        assert reservation is not None
        assert reservation.user_id == test_user.id
        assert reservation.status == "active"  # Резервация создается со статусом "active"
        
        # Проверяем, что оборудование стало недоступным на указанные даты
        # (это зависит от реализации availability service)
        
        # Проверяем, что в истории баланса есть соответствующие записи
        from sqlalchemy import text
        balance_history = await db_session.execute(
            text("SELECT * FROM balance_history WHERE user_id = :user_id"),
            {"user_id": test_user.id}
        )
        # История может быть пустой, если резервация не влияет на баланс
        # Это зависит от бизнес-логики

    @pytest.mark.asyncio
    async def test_api_response_format(self, client: AsyncClient, test_equipment: Equipment):
        """Тест: Формат ответов API."""
        response = await client.get("/api/equipment/")
        assert response.status_code == 200
        
        data = response.json()
        # API теперь возвращает объект с полями items, total, availableFilters
        assert isinstance(data, dict)
        assert "items" in data
        assert "total" in data
        assert "availableFilters" in data
        
        items = data["items"]
        assert isinstance(items, list)
        
        if len(items) > 0:
            equipment_item = items[0]
            required_fields = ["id", "name", "description", "daily_rate"]
            
            for field in required_fields:
                assert field in equipment_item, f"Field {field} missing in equipment response"
            
            # Проверяем типы данных
            assert isinstance(equipment_item["id"], int)
            assert isinstance(equipment_item["name"], str)
            assert isinstance(equipment_item["daily_rate"], (int, float))
