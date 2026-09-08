# tests/e2e/test_user_status_workflow.py

"""
E2E тесты для полного цикла работы со статусами пользователей.
Тестирует автоматическое повышение статусов, блокировку, и ограничения.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta
from sqlalchemy import select

from api.models.user import User
from api.models.equipment import Equipment
from api.models.reservation import Reservation
from api.models.rental import Rental
from api.repositories.user_repository import UserRepository
from api.repositories.reservation_repository import ReservationRepository
from api.repositories.rental_repository import RentalRepository
from api.services.user.user_status_service import UserStatusService
from shared.constants.user_status import UserStatus
from shared.constants.order_status import OrderStatus


@pytest.mark.e2e
@pytest.mark.asyncio
class TestUserStatusWorkflow:
    """E2E тесты для работы со статусами пользователей."""

    async def test_status_upgrade_to_regular_after_3_rentals(
        self,
        e2e_client: AsyncClient,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_manager: User,
        e2e_test_equipment_list: list[Equipment],
        clean_e2e_db
    ):
        """
        Упрощенный тест: статус меняется на "Постоянный" после 3 завершенных аренд.
        """
        from shared.constants.user_status import COMPLETED_RENTALS_FOR_REGULAR
        
        # Устанавливаем начальный статус "Новый"
        user_repo = UserRepository(e2e_db_session)
        e2e_test_user.status = UserStatus.NEW.value
        await user_repo.save_object(e2e_test_user)
        await e2e_db_session.commit()
        
        # get_user_completed_rentals_count делегируется в query_repo — он нужен реальный
        from api.repositories.rental_query_repository import RentalQueryRepository
        rental_repo = RentalRepository(
            db=e2e_db_session,
            query_repo=RentalQueryRepository(db=e2e_db_session, period_service=None),
            command_repo=None,
            financial_repo=None
        )
        
        user_status_service = UserStatusService(
            db=e2e_db_session,
            user_repo=user_repo,
            reservation_repo=None,
            rental_repo=rental_repo
        )
        
        # Создаем завершенные аренды напрямую в БД (для упрощения теста)
        from api.models.rental import Rental
        from shared.constants.order_status import OrderStatus
        
        equipment = e2e_test_equipment_list[0]
        today = date.today()
        
        # Используем менеджера для created_by_id
        manager_id = e2e_test_manager.id if e2e_test_manager else e2e_test_user.id
        
        for i in range(COMPLETED_RENTALS_FOR_REGULAR):
            rental = Rental(
                user_id=e2e_test_user.id,
                created_by_id=manager_id,  # Обязательное поле
                start_date=today - timedelta(days=10 + i),
                end_date=today - timedelta(days=5 + i),
                actual_return_date=today - timedelta(days=5 + i),
                status=OrderStatus.COMPLETED,
                total_cost=1000.0
            )
            rental.equipment = [equipment]
            await rental_repo.save_object(rental)
        
        await e2e_db_session.commit()
        
        # Обновляем статус
        new_status = await user_status_service.update_user_status_by_rentals(e2e_test_user.id)
        
        # Проверяем результат
        await e2e_db_session.refresh(e2e_test_user)
        assert new_status == UserStatus.REGULAR
        assert e2e_test_user.status == UserStatus.REGULAR.value

    async def test_status_upgrade_to_vip_after_7_rentals(
        self,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_equipment_list: list[Equipment],
        clean_e2e_db
    ):
        """
        Упрощенный тест: статус меняется на "VIP" после 7 завершенных аренд (всего).
        """
        from shared.constants.user_status import COMPLETED_RENTALS_FOR_VIP
        
        # Устанавливаем начальный статус "Новый" (будет обновлен до VIP)
        user_repo = UserRepository(e2e_db_session)
        e2e_test_user.status = UserStatus.NEW.value
        await user_repo.save_object(e2e_test_user)
        await e2e_db_session.commit()
        
        # get_user_completed_rentals_count делегируется в query_repo — он нужен реальный
        from api.repositories.rental_query_repository import RentalQueryRepository
        rental_repo = RentalRepository(
            db=e2e_db_session,
            query_repo=RentalQueryRepository(db=e2e_db_session, period_service=None),
            command_repo=None,
            financial_repo=None
        )
        
        user_status_service = UserStatusService(
            db=e2e_db_session,
            user_repo=user_repo,
            reservation_repo=None,
            rental_repo=rental_repo
        )
        
        # Создаем 7 завершенных аренд (всего для VIP статуса)
        from api.models.rental import Rental
        from shared.constants.order_status import OrderStatus
        
        equipment = e2e_test_equipment_list[0]
        today = date.today()
        
        # Используем менеджера для created_by_id (если доступен, иначе самого пользователя)
        # Для упрощенного теста используем самого пользователя
        for i in range(COMPLETED_RENTALS_FOR_VIP):
            rental = Rental(
                user_id=e2e_test_user.id,
                created_by_id=e2e_test_user.id,  # Обязательное поле - используем самого пользователя
                start_date=today - timedelta(days=10 + i),
                end_date=today - timedelta(days=5 + i),
                actual_return_date=today - timedelta(days=5 + i),
                status=OrderStatus.COMPLETED,
                total_cost=1000.0
            )
            rental.equipment = [equipment]
            await rental_repo.save_object(rental)
        
        await e2e_db_session.commit()
        
        # Обновляем статус
        new_status = await user_status_service.update_user_status_by_rentals(e2e_test_user.id)
        
        # Проверяем результат
        await e2e_db_session.refresh(e2e_test_user)
        assert new_status == UserStatus.VIP
        assert e2e_test_user.status == UserStatus.VIP.value

    async def test_automatic_block_on_overdue_reservations(
        self,
        e2e_client: AsyncClient,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_equipment_list: list[Equipment],
        clean_e2e_db
    ):
        """
        Тест: Автоматическая блокировка при просроченных резервах.
        
        Проверяет:
        1. Создание 3 просроченных резервов
        2. Автоматическая блокировка пользователя
        """
        # Устанавливаем начальный статус "Новый"
        user_repo = UserRepository(e2e_db_session)
        e2e_test_user.status = UserStatus.NEW.value
        await user_repo.save_object(e2e_test_user)
        
        reservation_repo = ReservationRepository(
            db=e2e_db_session,
            period_service=None,
            query_repo=None,
            filter_repo=None,
            availability_repo=None
        )
        
        # get_user_completed_rentals_count делегируется в query_repo — он нужен реальный
        from api.repositories.rental_query_repository import RentalQueryRepository
        rental_repo = RentalRepository(
            db=e2e_db_session,
            query_repo=RentalQueryRepository(db=e2e_db_session, period_service=None),
            command_repo=None,
            financial_repo=None
        )
        
        user_status_service = UserStatusService(
            db=e2e_db_session,
            user_repo=user_repo,
            reservation_repo=reservation_repo,
            rental_repo=rental_repo
        )
        
        # Создаем 3 просроченных резерва (дата начала в прошлом, статус ACTIVE, нет rental)
        equipment = e2e_test_equipment_list[0]
        past_date = date.today() - timedelta(days=5)
        
        for i in range(3):
            reservation = Reservation(
                user_id=e2e_test_user.id,
                start_date=past_date + timedelta(days=i),
                end_date=past_date + timedelta(days=i+3),
                status=OrderStatus.ACTIVE,
                total_cost=1000.0
            )
            reservation.equipment = [equipment]
            await reservation_repo.save_object(reservation)
        
        await e2e_db_session.commit()
        
        # Проверяем и блокируем пользователя
        was_blocked = await user_status_service.check_and_block_on_overdue(e2e_test_user.id)
        assert was_blocked is True
        
        # Проверяем, что статус изменился на "Заблокирован"
        await e2e_db_session.refresh(e2e_test_user)
        updated_user = await user_repo.get_by_id(e2e_test_user.id)
        assert updated_user.status == UserStatus.BLOCKED.value

    async def test_manager_create_reservation_for_blocked_user(
        self,
        e2e_client: AsyncClient,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_manager: User,
        e2e_test_equipment_list: list[Equipment],
        clean_e2e_db
    ):
        """
        Тест: Создание резерва менеджером для заблокированного пользователя.
        
        Проверяет:
        1. Пользователь заблокирован
        2. Пользователь не может создать резерв самостоятельно
        3. Менеджер может создать резерв для заблокированного пользователя
        """
        # Устанавливаем статус "Заблокирован"
        user_repo = UserRepository(e2e_db_session)
        e2e_test_user.status = UserStatus.BLOCKED.value
        await user_repo.save_object(e2e_test_user)
        await e2e_db_session.commit()
        
        # Логинимся как пользователь
        login_data = {
            "username": e2e_test_user.email,
            "password": "secret"
        }
        login_response = await e2e_client.post("/api/auth/token", data=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        
        # Пользователь не может создать резерв самостоятельно
        equipment_id = e2e_test_equipment_list[0].id
        reservation_data = {
            "equipment_ids": [equipment_id],
            "selected_accessories": {},
            "start_date": (date.today() + timedelta(days=1)).isoformat(),
            "end_date": (date.today() + timedelta(days=4)).isoformat()
        }
        user_reservation_response = await e2e_client.post(
            "/api/reservations/",
            json=reservation_data,
            headers=auth_headers
        )
        assert user_reservation_response.status_code == 403
        
        # Логинимся как менеджер
        manager_login_data = {
            "username": e2e_test_manager.email,
            "password": "secret"
        }
        manager_login_response = await e2e_client.post("/api/auth/token", data=manager_login_data)
        manager_token = manager_login_response.json()["access_token"]
        manager_headers = {"Authorization": f"Bearer {manager_token}"}
        
        # Менеджер может создать резерв для заблокированного пользователя
        admin_reservation_data = {
            "user_id": e2e_test_user.id,
            "equipment_ids": [equipment_id],
            "selected_accessories": {},
            "start_date": (date.today() + timedelta(days=1)).isoformat(),
            "end_date": (date.today() + timedelta(days=4)).isoformat()
        }
        manager_reservation_response = await e2e_client.post(
            "/api/admin/reservations/",
            json=admin_reservation_data,
            headers=manager_headers
        )
        assert manager_reservation_response.status_code == 200

    async def test_persona_non_grata_cannot_receive_rental(
        self,
        e2e_client: AsyncClient,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_manager: User,
        e2e_test_equipment_list: list[Equipment],
        clean_e2e_db
    ):
        """
        Тест: Отказ в выдаче аренды для "Персона НонГрата".
        
        Проверяет:
        1. Пользователь со статусом "Персона НонГрата"
        2. Создание резерва для него (менеджером)
        3. Попытка конвертировать резерв в аренду - должна быть отклонена
        """
        # Устанавливаем статус "Персона НонГрата"
        user_repo = UserRepository(e2e_db_session)
        e2e_test_user.status = UserStatus.PERSONA_NON_GRATA.value
        await user_repo.save_object(e2e_test_user)
        await e2e_db_session.commit()
        
        # Логинимся как менеджер
        manager_login_data = {
            "username": e2e_test_manager.email,
            "password": "secret"
        }
        manager_login_response = await e2e_client.post("/api/auth/token", data=manager_login_data)
        manager_token = manager_login_response.json()["access_token"]
        manager_headers = {"Authorization": f"Bearer {manager_token}"}
        
        # Менеджер НЕ может создать резерв для "Персона НонГрата"
        equipment_id = e2e_test_equipment_list[0].id
        admin_reservation_data = {
            "user_id": e2e_test_user.id,
            "equipment_ids": [equipment_id],
            "selected_accessories": {},
            "start_date": (date.today() + timedelta(days=1)).isoformat(),
            "end_date": (date.today() + timedelta(days=4)).isoformat()
        }
        reservation_response = await e2e_client.post(
            "/api/admin/reservations/",
            json=admin_reservation_data,
            headers=manager_headers
        )
        assert reservation_response.status_code == 403
        assert "персона нонграта" in reservation_response.json()["detail"].lower() or "non grata" in reservation_response.json()["detail"].lower()

    async def test_reservation_limit_by_status(
        self,
        e2e_client: AsyncClient,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_equipment_list: list[Equipment],
        clean_e2e_db
    ):
        """
        Тест: Ограничение количества резервов по статусам.
        
        Проверяет:
        1. Пользователь "Новый" может создать максимум 2 резерва
        2. Попытка создать третий резерв должна быть отклонена
        """
        # Устанавливаем статус "Новый"
        user_repo = UserRepository(e2e_db_session)
        e2e_test_user.status = UserStatus.NEW.value
        await user_repo.save_object(e2e_test_user)
        await e2e_db_session.commit()
        
        # Логинимся как пользователь
        login_data = {
            "username": e2e_test_user.email,
            "password": "secret"
        }
        login_response = await e2e_client.post("/api/auth/token", data=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        
        equipment_id = e2e_test_equipment_list[0].id
        
        # Создаем 2 резерва (до лимита) на разные периоды, чтобы избежать конфликта доступности
        for i in range(2):
            start_date = (date.today() + timedelta(days=1 + i*5)).isoformat()  # Разные даты
            end_date = (date.today() + timedelta(days=4 + i*5)).isoformat()
            
            reservation_data = {
                "equipment_ids": [equipment_id],
                "selected_accessories": {},
                "start_date": start_date,
                "end_date": end_date
            }
            
            reservation_response = await e2e_client.post(
                "/api/reservations/",
                json=reservation_data,
                headers=auth_headers
            )
            assert reservation_response.status_code == 200
        
        # Попытка создать третий резерв должна быть отклонена (на другой период, чтобы избежать конфликта доступности)
        third_start_date = (date.today() + timedelta(days=15)).isoformat()
        third_end_date = (date.today() + timedelta(days=18)).isoformat()
        third_reservation_data = {
            "equipment_ids": [equipment_id],
            "selected_accessories": {},
            "start_date": third_start_date,
            "end_date": third_end_date
        }
        third_reservation_response = await e2e_client.post(
            "/api/reservations/",
            json=third_reservation_data,
            headers=auth_headers
        )
        assert third_reservation_response.status_code == 403
        assert "лимит" in third_reservation_response.json()["detail"].lower() or "limit" in third_reservation_response.json()["detail"].lower()

