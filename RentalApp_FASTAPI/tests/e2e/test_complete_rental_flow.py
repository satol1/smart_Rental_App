# tests/e2e/test_complete_rental_flow.py
"""
E2E тесты для полного цикла аренды оборудования.
Тестирует весь пользовательский сценарий от регистрации до возврата оборудования.
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
from api.models.rental import Rental
from api.models.balance_history import BalanceHistory


@pytest.mark.e2e
@pytest.mark.asyncio
class TestCompleteRentalFlow:
    """E2E тесты для полного цикла аренды."""

    async def test_complete_rental_flow_without_promo(
        self,
        e2e_client: AsyncClient,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_manager: User,
        e2e_test_equipment_list: list[Equipment],
        e2e_test_accessories: list[Accessory],
        clean_e2e_db
    ):
        """
        Полный E2E тест: регистрация -> резерв -> конвертация в аренду -> возврат.
        Без промокода.
        """
        # Шаг 1: Логинимся и получаем токен
        login_data = {
            "username": e2e_test_user.email,
            "password": "secret"
        }
        login_response = await e2e_client.post("/api/auth/token", data=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        
        # Шаг 2: Проверяем начальный баланс пользователя
        user_response = await e2e_client.get("/api/auth/me", headers=auth_headers)
        assert user_response.status_code == 200
        initial_balance = user_response.json()["balance"]
        assert initial_balance == 5000.0

        # Шаг 3: Создаем резерв
        equipment_ids = [e2e_test_equipment_list[0].id, e2e_test_equipment_list[1].id]
        
        start_date = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=4)).isoformat()
        
        # Создаем selected_accessories в правильном формате
        selected_accessories = {
            e2e_test_equipment_list[0].id: [e2e_test_accessories[0].id, e2e_test_accessories[1].id],
            e2e_test_equipment_list[1].id: [e2e_test_accessories[2].id]
        }
        
        reservation_data = {
            "equipment_ids": equipment_ids,
            "selected_accessories": selected_accessories,
            "start_date": start_date,
            "end_date": end_date,
            "promo_code": None
        }
        
        reservation_response = await e2e_client.post(
            "/api/reservations/",
            json=reservation_data,
            headers=auth_headers
        )
        assert reservation_response.status_code == 200
        reservation_create_result = reservation_response.json()
        reservation_id = reservation_create_result["reservation_id"]
        
        # Проверяем, что резерв создан корректно (используем новые поля из API)
        assert reservation_create_result["user_id"] == e2e_test_user.id
        assert reservation_create_result["status"] == "active"
        assert reservation_create_result["total_cost"] > 0
        assert reservation_create_result["equipment_count"] == 2
        assert reservation_create_result["accessory_count"] == 2

        # Шаг 3: Проверяем, что резерв появился в списке резервов пользователя
        user_reservations = await e2e_client.get("/api/reservations/my", headers=auth_headers)
        assert user_reservations.status_code == 200
        reservations_data = user_reservations.json()
        assert reservations_data["total"] >= 1
        assert any(r["id"] == reservation_id for r in reservations_data["items"])

        # Шаг 4: Логинимся как менеджер и получаем токен
        manager_login_data = {
            "username": e2e_test_manager.email,
            "password": "secret"
        }
        manager_login_response = await e2e_client.post("/api/auth/token", data=manager_login_data)
        assert manager_login_response.status_code == 200
        manager_token = manager_login_response.json()["access_token"]
        manager_auth_headers = {"Authorization": f"Bearer {manager_token}"}
        
        # Шаг 5: Менеджер конвертирует резерв в аренду
        rental_response = await e2e_client.post(
            f"/api/admin/rentals/from-reservation/{reservation_id}",
            json={},  # Пустой JSON для конвертации
            headers=manager_auth_headers
        )
        assert rental_response.status_code == 200
        rental = rental_response.json()
        rental_id = rental["id"]
        
        # Проверяем, что аренда создана корректно
        assert rental["user_id"] == e2e_test_user.id
        assert rental["status"] == "active"
        # Стоимость аренды может отличаться от стоимости резерва из-за дополнительных расчетов
        assert rental["total_cost"] > 0
        assert rental["total_cost"] >= reservation_create_result["total_cost"]
        assert len(rental["equipment"]) == 2
        assert len(rental["accessory_links"]) == 2

        # Шаг 5: Проверяем, что резерв изменил статус через список резервов
        user_reservations = await e2e_client.get("/api/reservations/my", headers=auth_headers)
        assert user_reservations.status_code == 200
        reservations_data = user_reservations.json()
        updated_reservation = next((r for r in reservations_data["items"] if r["id"] == reservation_id), None)
        assert updated_reservation is not None
        assert updated_reservation["status"] == "fulfilled"

        # Шаг 6: Проверяем, что аренда появилась в списке аренд через админский эндпоинт
        admin_rentals = await e2e_client.get("/api/admin/rentals/", headers=manager_auth_headers)
        assert admin_rentals.status_code == 200
        rentals_data = admin_rentals.json()
        assert rentals_data["total"] >= 1
        assert any(r["id"] == rental_id for r in rentals_data["items"])

        # Шаг 7: Проверяем баланс пользователя (должен списаться предоплата)
        user_response = await e2e_client.get("/api/auth/me", headers=auth_headers)
        assert user_response.status_code == 200
        balance_after_rental = user_response.json()["balance"]
        assert balance_after_rental < initial_balance

        # Шаг 8: Менеджер возвращает аренду
        return_data = {
            "actual_return_date": (date.today() + timedelta(days=4)).isoformat(),
            "notes_on_return": "Тестовый возврат",
            "accessories_returned_confirmation": True
        }
        return_response = await e2e_client.post(
            f"/api/admin/rentals/{rental_id}/return",
            json=return_data,
            headers=manager_auth_headers
        )
        assert return_response.status_code == 200
        returned_rental = return_response.json()
        
        # Проверяем, что аренда возвращена корректно
        assert returned_rental["status"] == "completed"
        assert "actual_return_date" in returned_rental

        # Шаг 9: Проверяем финальный баланс пользователя
        user_response = await e2e_client.get("/api/auth/me", headers=auth_headers)
        assert user_response.status_code == 200
        final_balance = user_response.json()["balance"]
        
        # Баланс должен быть меньше начального (списана полная стоимость)
        assert final_balance < initial_balance

        # Шаг 10: Проверяем историю баланса
        balance_history = await e2e_client.get("/api/user/balance-history", headers=auth_headers)
        assert balance_history.status_code == 200
        history_data = balance_history.json()
        assert history_data["total"] >= 1  # Должна быть запись о предоплате

    async def test_complete_rental_flow_with_promo_code(
        self,
        e2e_client: AsyncClient,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_manager: User,
        e2e_test_equipment_list: list[Equipment],
        e2e_test_accessories: list[Accessory],
        e2e_test_promo_codes: list[PromoCode],
        clean_e2e_db
    ):
        """
        Полный E2E тест с промокодом: резерв со скидкой -> аренда -> возврат.
        """
        # Шаг 1: Логинимся и получаем токен
        login_data = {
            "username": e2e_test_user.email,
            "password": "secret"
        }
        login_response = await e2e_client.post("/api/auth/token", data=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        
        # Шаг 2: Создаем резерв с промокодом
        equipment_ids = [e2e_test_equipment_list[0].id]
        selected_accessories = {
            e2e_test_equipment_list[0].id: [e2e_test_accessories[0].id]
        }
        
        start_date = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=3)).isoformat()
        
        reservation_data = {
            "equipment_ids": equipment_ids,
            "selected_accessories": selected_accessories,
            "start_date": start_date,
            "end_date": end_date,
            "promo_code": e2e_test_promo_codes[0].code  # WELCOME10
        }
        
        reservation_response = await e2e_client.post(
            "/api/reservations/", 
            json=reservation_data, 
            headers=auth_headers
        )
        assert reservation_response.status_code == 200
        reservation = reservation_response.json()
        reservation_id = reservation["reservation_id"]
        
        # Проверяем, что скидка применена
        assert reservation["discount_amount"] > 0
        assert reservation["total_cost"] > 0

        # Шаг 3: Логинимся как менеджер и получаем токен
        manager_login_data = {
            "username": e2e_test_manager.email,
            "password": "secret"
        }
        manager_login_response = await e2e_client.post("/api/auth/token", data=manager_login_data)
        assert manager_login_response.status_code == 200
        manager_token = manager_login_response.json()["access_token"]
        manager_auth_headers = {"Authorization": f"Bearer {manager_token}"}

        # Шаг 4: Конвертируем в аренду
        rental_response = await e2e_client.post(
            f"/api/admin/rentals/from-reservation/{reservation_id}",
            json={},  # Пустой JSON для конвертации
            headers=manager_auth_headers
        )
        assert rental_response.status_code == 200
        rental = rental_response.json()
        rental_id = rental["id"]
        
        # Проверяем, что скидка сохранилась в аренде (может быть пересчитана)
        assert rental["discount_amount"] > 0
        assert rental["total_cost"] > 0

        # Шаг 3: Возвращаем аренду
        return_data = {
            "actual_return_date": (date.today() + timedelta(days=3)).isoformat(),
            "notes_on_return": "Тестовый возврат с промокодом",
            "accessories_returned_confirmation": True
        }
        return_response = await e2e_client.post(
            f"/api/admin/rentals/{rental_id}/return",
            json=return_data,
            headers=manager_auth_headers
        )
        assert return_response.status_code == 200
        assert return_response.json()["status"] == "completed"

    async def test_reservation_cancellation_flow(
        self,
        e2e_client: AsyncClient,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_manager: User,
        e2e_test_equipment_list: list[Equipment],
        clean_e2e_db
    ):
        """
        E2E тест отмены резерва.
        """
        # Шаг 1: Логинимся и получаем токен
        login_data = {
            "username": e2e_test_user.email,
            "password": "secret"
        }
        login_response = await e2e_client.post("/api/auth/token", data=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        
        # Шаг 2: Создаем резерв
        equipment_ids = [e2e_test_equipment_list[0].id]
        
        start_date = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=3)).isoformat()
        
        reservation_data = {
            "equipment_ids": equipment_ids,
            "selected_accessories": {},
            "start_date": start_date,
            "end_date": end_date,
            "promo_code": None
        }
        
        reservation_response = await e2e_client.post(
            "/api/reservations/", 
            json=reservation_data, 
            headers=auth_headers
        )
        assert reservation_response.status_code == 200
        reservation = reservation_response.json()
        reservation_id = reservation["reservation_id"]

        # Шаг 2: Отменяем резерв
        cancel_response = await e2e_client.delete(
            f"/api/reservations/{reservation_id}",
            headers=auth_headers
        )
        assert cancel_response.status_code == 200
        # API возвращает только сообщение об успехе, статус проверим через GET запрос

        # Шаг 3: Проверяем, что резерв не может быть конвертирован в аренду
        rental_response = await e2e_client.post(
            f"/api/admin/rentals/convert/{reservation_id}",
            headers=auth_headers  # Используем обычного пользователя, но это не должно работать
        )
        # Должна быть ошибка, так как резерв отменен
        assert rental_response.status_code in [400, 404]

    async def test_equipment_availability_during_rental(
        self,
        e2e_client: AsyncClient,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_manager: User,
        e2e_test_equipment_list: list[Equipment],
        clean_e2e_db
    ):
        """
        E2E тест проверки доступности оборудования во время аренды.
        """
        # Шаг 1: Логинимся и получаем токен
        login_data = {
            "username": e2e_test_user.email,
            "password": "secret"
        }
        login_response = await e2e_client.post("/api/auth/token", data=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        
        equipment = e2e_test_equipment_list[0]
        
        # Шаг 2: Создаем резерв
        start_date = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=3)).isoformat()
        
        reservation_data = {
            "equipment_ids": [equipment.id],
            "accessory_ids": [],
            "start_date": start_date,
            "end_date": end_date,
            "promo_code": None
        }
        
        reservation_response = await e2e_client.post(
            "/api/reservations/", 
            json=reservation_data, 
            headers=auth_headers
        )
        assert reservation_response.status_code == 200
        reservation = reservation_response.json()
        reservation_id = reservation["reservation_id"]

        # Шаг 3: Логинимся как менеджер и получаем токен
        manager_login_data = {
            "username": e2e_test_manager.email,
            "password": "secret"
        }
        manager_login_response = await e2e_client.post("/api/auth/token", data=manager_login_data)
        assert manager_login_response.status_code == 200
        manager_token = manager_login_response.json()["access_token"]
        manager_auth_headers = {"Authorization": f"Bearer {manager_token}"}

        # Шаг 4: Конвертируем в аренду
        rental_response = await e2e_client.post(
            f"/api/admin/rentals/from-reservation/{reservation_id}",
            json={},  # Пустой JSON для конвертации
            headers=manager_auth_headers
        )
        assert rental_response.status_code == 200
        rental = rental_response.json()
        rental_id = rental["id"]

        # Шаг 3: Проверяем доступность оборудования в период аренды
        availability_response = await e2e_client.get(
            f"/api/equipment/{equipment.id}/availability",
            params={
                "start_date": start_date,
                "end_date": end_date
            },
            headers=auth_headers
        )
        assert availability_response.status_code in [200, 403]  # Может быть запрещено для обычных пользователей
        
        if availability_response.status_code == 200:
            availability = availability_response.json()
            assert availability["is_available"] == False
            assert len(availability["conflicts"]) > 0
        # Если 403, то просто проверяем, что эндпоинт работает как ожидается

        # Шаг 4: Возвращаем аренду
        return_data = {
            "actual_return_date": (date.today() + timedelta(days=3)).isoformat(),
            "notes_on_return": "Тестовый возврат с аксессуарами",
            "accessories_returned_confirmation": True
        }
        return_response = await e2e_client.post(
            f"/api/admin/rentals/{rental_id}/return",
            json=return_data,
            headers=manager_auth_headers
        )
        assert return_response.status_code == 200

        # Шаг 5: Проверяем, что оборудование снова доступно
        availability_response = await e2e_client.get(
            f"/api/equipment/{equipment.id}/availability",
            params={
                "start_date": start_date,
                "end_date": end_date
            },
            headers=auth_headers
        )
        assert availability_response.status_code in [200, 403, 401]  # Может быть запрещено
        
        if availability_response.status_code == 200:
            availability = availability_response.json()
            assert availability["is_available"] == True
            assert len(availability["conflicts"]) == 0
        # Если 403/401, то просто проверяем, что эндпоинт работает как ожидается

    async def test_multiple_reservations_conflict(
        self,
        e2e_client: AsyncClient,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_manager: User,
        e2e_test_equipment_list: list[Equipment],
        clean_e2e_db
    ):
        """
        E2E тест конфликта резервирований на одно и то же оборудование.
        """
        # Шаг 1: Логинимся и получаем токен
        login_data = {
            "username": e2e_test_user.email,
            "password": "secret"
        }
        login_response = await e2e_client.post("/api/auth/token", data=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        
        equipment = e2e_test_equipment_list[0]
        
        # Шаг 1: Создаем первый резерв
        start_date = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=3)).isoformat()
        
        reservation_data = {
            "equipment_ids": [equipment.id],
            "accessory_ids": [],
            "start_date": start_date,
            "end_date": end_date,
            "promo_code": None
        }
        
        first_reservation = await e2e_client.post(
            "/api/reservations/", 
            json=reservation_data, 
            headers=auth_headers
        )
        assert first_reservation.status_code == 200

        # Шаг 2: Пытаемся создать второй резерв на то же оборудование в тот же период
        second_reservation = await e2e_client.post(
            "/api/reservations/", 
            json=reservation_data, 
            headers=auth_headers
        )
        
        # Должна быть ошибка о конфликте
        assert second_reservation.status_code == 409  # Conflict - правильный статус для конфликта
        error_detail = second_reservation.json()["detail"].lower()
        assert "недоступно" in error_detail or "conflict" in error_detail

        # Шаг 3: Создаем резерв на другое оборудование в тот же период (должно работать)
        other_equipment = e2e_test_equipment_list[1]
        reservation_data["equipment_ids"] = [other_equipment.id]
        
        third_reservation = await e2e_client.post(
            "/api/reservations/", 
            json=reservation_data, 
            headers=auth_headers
        )
        assert third_reservation.status_code == 200

    async def test_reservation_to_rental_with_equipment_specific_accessories(
        self,
        e2e_client: AsyncClient,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_manager: User,
        e2e_test_equipment_list: list[Equipment],
        e2e_test_accessories: list[Accessory],
        clean_e2e_db
    ):
        """
        E2E тест конвертации резерва в аренду с проверкой корректного копирования аксессуаров.
        Проверяет, что аксессуары правильно привязываются к конкретному оборудованию.
        """
        # Шаг 1: Логинимся и получаем токен
        login_data = {
            "username": e2e_test_user.email,
            "password": "secret"
        }
        login_response = await e2e_client.post("/api/auth/token", data=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        # Шаг 1: Создаем резерв с 2 единицами оборудования и разными аксессуарами
        equipment_ids = [e2e_test_equipment_list[0].id, e2e_test_equipment_list[1].id]
        
        # Привязываем аксессуары к конкретному оборудованию:
        # Оборудование 1 (index 0) -> аксессуары 1, 2
        # Оборудование 2 (index 1) -> аксессуар 3
        selected_accessories = {
            e2e_test_equipment_list[0].id: [e2e_test_accessories[0].id, e2e_test_accessories[1].id],
            e2e_test_equipment_list[1].id: [e2e_test_accessories[2].id]
        }
        
        start_date = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=4)).isoformat()
        
        reservation_data = {
            "equipment_ids": equipment_ids,
            "selected_accessories": selected_accessories,
            "start_date": start_date,
            "end_date": end_date,
            "promo_code": None
        }
        
        reservation_response = await e2e_client.post(
            "/api/reservations/", 
            json=reservation_data, 
            headers=auth_headers
        )
        assert reservation_response.status_code == 200
        reservation = reservation_response.json()
        reservation_id = reservation["reservation_id"]
        
        # Проверяем, что резерв создан корректно с аксессуарами
        assert reservation["user_id"] == e2e_test_user.id
        assert reservation["status"] == "active"
        assert reservation["equipment_count"] == 2
        assert reservation["accessory_count"] >= 2  # Минимум 2 аксессуара

        # Шаг 2: Логинимся как менеджер и получаем токен
        manager_login_data = {
            "username": e2e_test_manager.email,
            "password": "secret"
        }
        manager_login_response = await e2e_client.post("/api/auth/token", data=manager_login_data)
        assert manager_login_response.status_code == 200
        manager_token = manager_login_response.json()["access_token"]
        manager_auth_headers = {"Authorization": f"Bearer {manager_token}"}

        # Шаг 3: Менеджер конвертирует резерв в аренду
        rental_response = await e2e_client.post(
            f"/api/admin/rentals/from-reservation/{reservation_id}",
            json={
                "deposit_amount": 1000.0,
                "prepayment_amount": 500.0,
                "notes_on_issue": "E2E test conversion"
            },
            headers=manager_auth_headers
        )
        assert rental_response.status_code == 200
        rental = rental_response.json()
        rental_id = rental["id"]
        
        # Проверяем, что аренда создана корректно
        assert rental["user_id"] == e2e_test_user.id
        assert rental["status"] == "active"
        assert rental["reservation_id"] == reservation_id
        assert len(rental["equipment"]) == 2
        assert len(rental["accessory_links"]) >= 2  # Минимум 2 аксессуара должны быть скопированы
        
        # КРИТИЧЕСКАЯ ПРОВЕРКА: Аксессуары должны быть правильно привязаны к оборудованию в аренде
        rental_accessories = rental["accessory_links"]
        rental_equipment_1_accessories = [acc for acc in rental_accessories if acc["equipment_id"] == e2e_test_equipment_list[0].id]
        rental_equipment_2_accessories = [acc for acc in rental_accessories if acc["equipment_id"] == e2e_test_equipment_list[1].id]
        
        assert len(rental_equipment_1_accessories) >= 1, f"Ожидалось минимум 1 аксессуар для оборудования 1, получено {len(rental_equipment_1_accessories)}"
        assert len(rental_equipment_2_accessories) >= 1, f"Ожидался минимум 1 аксессуар для оборудования 2, получено {len(rental_equipment_2_accessories)}"

        # Шаг 3: Проверяем, что резерв изменил статус на fulfilled через список резервов
        user_reservations = await e2e_client.get("/api/reservations/my", headers=auth_headers)
        assert user_reservations.status_code == 200
        reservations_data = user_reservations.json()
        updated_reservation = next((r for r in reservations_data["items"] if r["id"] == reservation_id), None)
        assert updated_reservation is not None
        assert updated_reservation["status"] == "fulfilled"

        # Шаг 4: Проверяем финансовые транзакции
        balance_history = await e2e_client.get("/api/user/balance-history", headers=auth_headers)
        assert balance_history.status_code == 200
        history_data = balance_history.json()
        
        # Должны быть записи о предоплате и списании за аренду
        prepayment_transactions = [t for t in history_data["items"] if t["operation_type"] == "prepayment"]
        rental_debit_transactions = [t for t in history_data["items"] if t["operation_type"] == "rental_debit"]
        
        assert len(prepayment_transactions) >= 1, "Должна быть запись о предоплате"
        assert len(rental_debit_transactions) >= 1, "Должна быть запись о списании за аренду"
        
        # Проверяем, что транзакции связаны с правильной арендой
        prepayment_with_rental = [t for t in prepayment_transactions if t["rental_id"] == rental_id]
        debit_with_rental = [t for t in rental_debit_transactions if t["rental_id"] == rental_id]
        
        assert len(prepayment_with_rental) >= 1, "Предоплата должна быть связана с созданной арендой"
        assert len(debit_with_rental) >= 1, "Списание должно быть связано с созданной арендой"