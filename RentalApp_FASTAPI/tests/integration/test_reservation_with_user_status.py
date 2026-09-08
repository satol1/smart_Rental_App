# tests/integration/test_reservation_with_user_status.py

"""
Интеграционные тесты для резерваций с учетом градации статусов пользователей.
Тестирует полный цикл работы с резервами для разных статусов пользователей.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta

from api.models.user import User
from api.models.equipment import Equipment
from api.models.reservation import Reservation
from api.models.rental import Rental
from api.repositories.user_repository import UserRepository
from api.repositories.reservation_repository import ReservationRepository
from api.repositories.rental_repository import RentalRepository
from api.services.order.reservation_service import ReservationLifecycleService
from api.services.user.user_status_service import UserStatusService
from shared.constants.user_status import UserStatus
from shared.constants.order_status import OrderStatus
from shared.schemas.reservation_schema import ReservationCreateRequest, ReservationUpdateRequest


@pytest.mark.asyncio
@pytest.mark.integration
class TestReservationWithUserStatus:
    """Интеграционные тесты резерваций с учетом статусов пользователей."""

    async def test_create_reservation_new_user_within_limit(
        self,
        db_session: AsyncSession,
        test_user: User,
        test_equipment: Equipment
    ):
        """Тест: Пользователь 'Новый' может создать резерв в пределах лимита (2 резерва)."""
        # Устанавливаем статус "Новый"
        user_repo = UserRepository(db_session)
        test_user.status = UserStatus.NEW.value
        await user_repo.save_object(test_user)
        
        # Создаем первый резерв
        reservation_service = ReservationLifecycleService(
            db=db_session,
            reservation_repo=ReservationRepository(
                db=db_session,
                period_service=None,
                query_repo=None,
                filter_repo=None,
                availability_repo=None
            ),
            user_repo=user_repo,
            equipment_repo=None,
            system_service=None,
            validator=None,
            financial_service=None,
            promo_code_logic=None
        )
        
        start_date = date.today() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        
        request = ReservationCreateRequest(
            equipment_ids=[test_equipment.id],
            start_date=start_date,
            end_date=end_date
        )
        
        # Упрощенный тест - проверяем только права на создание
        from api.services.user.user_status_service import UserStatusService
        from api.repositories.rental_repository import RentalRepository
        
        rental_repo = RentalRepository(
            db=db_session,
            query_repo=None,
            command_repo=None,
            financial_repo=None
        )
        
        user_status_service = UserStatusService(
            db=db_session,
            user_repo=user_repo,
            reservation_repo=None,
            rental_repo=rental_repo
        )
        
        # Проверяем, что пользователь может создавать резервы
        can_create = await user_status_service.can_user_create_reservation(test_user)
        assert can_create is True
        
        # Проверяем лимит резервов
        max_reservations = await user_status_service.get_user_max_reservations(test_user)
        assert max_reservations == 2  # Лимит для статуса "Новый"

    async def test_create_reservation_new_user_exceeds_limit(
        self,
        db_session: AsyncSession,
        test_user: User,
        test_equipment: Equipment
    ):
        """Тест: Пользователь 'Новый' не может создать третий резерв (лимит 2)."""
        from fastapi import HTTPException
        
        user_repo = UserRepository(db_session)
        test_user.status = UserStatus.NEW.value
        await user_repo.save_object(test_user)
        
        # Создаем два резерва (до лимита)
        reservation_repo = ReservationRepository(
            db=db_session,
            period_service=None,
            query_repo=None,
            filter_repo=None,
            availability_repo=None
        )
        
        start_date = date.today() + timedelta(days=1)
        
        for i in range(2):
            reservation = Reservation(
                user_id=test_user.id,
                start_date=start_date + timedelta(days=i*5),
                end_date=start_date + timedelta(days=i*5+3),
                status=OrderStatus.ACTIVE,
                total_cost=1000.0
            )
            reservation.equipment = [test_equipment]
            await reservation_repo.save_object(reservation)
        
        # Попытка создать третий резерв должна вызвать ошибку
        from api.services.order.order_validator import OrderValidator
        from api.services.user.user_status_service import UserStatusService
        
        user_status_service = UserStatusService(
            db=db_session,
            user_repo=user_repo,
            reservation_repo=reservation_repo,
            rental_repo=None
        )
        
        validator = OrderValidator(
            db=db_session,
            financial_service=None,
            availability_service=None,
            holiday_repo=None,
            reservation_repo=reservation_repo,
            user_status_service=user_status_service
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await validator.validate_user_can_create_reservation(test_user)
        
        assert exc_info.value.status_code == 403
        assert "лимит" in exc_info.value.detail.lower() or "limit" in exc_info.value.detail.lower()

    async def test_edit_reservation_new_user_within_restriction(
        self,
        db_session: AsyncSession,
        test_user: User,
        test_equipment: Equipment
    ):
        """Тест: Пользователь 'Новый' может редактировать резерв за 2+ дня до начала."""
        user_repo = UserRepository(db_session)
        test_user.status = UserStatus.NEW.value
        await user_repo.save_object(test_user)
        
        reservation_repo = ReservationRepository(
            db=db_session,
            period_service=None,
            query_repo=None,
            filter_repo=None,
            availability_repo=None
        )
        
        # Создаем резерв на 3 дня вперед
        start_date = date.today() + timedelta(days=3)
        reservation = Reservation(
            user_id=test_user.id,
            start_date=start_date,
            end_date=start_date + timedelta(days=3),
            status=OrderStatus.ACTIVE,
            total_cost=1000.0
        )
        reservation.equipment = [test_equipment]
        await reservation_repo.save_object(reservation)
        
        # Проверяем права на редактирование
        user_status_service = UserStatusService(
            db=db_session,
            user_repo=user_repo,
            reservation_repo=reservation_repo,
            rental_repo=None
        )
        
        can_edit = await user_status_service.can_user_edit_reservation(test_user, start_date)
        assert can_edit is True

    async def test_edit_reservation_new_user_outside_restriction(
        self,
        db_session: AsyncSession,
        test_user: User,
        test_equipment: Equipment
    ):
        """Тест: Пользователь 'Новый' не может редактировать резерв за менее 2 дней до начала."""
        user_repo = UserRepository(db_session)
        test_user.status = UserStatus.NEW.value
        await user_repo.save_object(test_user)
        
        reservation_repo = ReservationRepository(
            db=db_session,
            period_service=None,
            query_repo=None,
            filter_repo=None,
            availability_repo=None
        )
        
        # Создаем резерв на 1 день вперед (меньше чем 2 дня)
        start_date = date.today() + timedelta(days=1)
        reservation = Reservation(
            user_id=test_user.id,
            start_date=start_date,
            end_date=start_date + timedelta(days=3),
            status=OrderStatus.ACTIVE,
            total_cost=1000.0
        )
        reservation.equipment = [test_equipment]
        await reservation_repo.save_object(reservation)
        
        # Проверяем права на редактирование
        user_status_service = UserStatusService(
            db=db_session,
            user_repo=user_repo,
            reservation_repo=reservation_repo,
            rental_repo=None
        )
        
        can_edit = await user_status_service.can_user_edit_reservation(test_user, start_date)
        assert can_edit is False

    async def test_edit_reservation_vip_no_restrictions(
        self,
        db_session: AsyncSession,
        test_user: User,
        test_equipment: Equipment
    ):
        """Тест: Пользователь 'VIP' может редактировать резерв в любой момент."""
        user_repo = UserRepository(db_session)
        test_user.status = UserStatus.VIP.value
        await user_repo.save_object(test_user)
        
        reservation_repo = ReservationRepository(
            db=db_session,
            period_service=None,
            query_repo=None,
            filter_repo=None,
            availability_repo=None
        )
        
        # Создаем резерв на сегодня (0 дней)
        start_date = date.today()
        reservation = Reservation(
            user_id=test_user.id,
            start_date=start_date,
            end_date=start_date + timedelta(days=3),
            status=OrderStatus.ACTIVE,
            total_cost=1000.0
        )
        reservation.equipment = [test_equipment]
        await reservation_repo.save_object(reservation)
        
        # Проверяем права на редактирование
        user_status_service = UserStatusService(
            db=db_session,
            user_repo=user_repo,
            reservation_repo=reservation_repo,
            rental_repo=None
        )
        
        can_edit = await user_status_service.can_user_edit_reservation(test_user, start_date)
        assert can_edit is True

    async def test_blocked_user_cannot_create_reservation(
        self,
        db_session: AsyncSession,
        test_user: User
    ):
        """Тест: Заблокированный пользователь не может создать резерв самостоятельно."""
        from fastapi import HTTPException
        
        user_repo = UserRepository(db_session)
        test_user.status = UserStatus.BLOCKED.value
        await user_repo.save_object(test_user)
        
        reservation_repo = ReservationRepository(
            db=db_session,
            period_service=None,
            query_repo=None,
            filter_repo=None,
            availability_repo=None
        )
        
        user_status_service = UserStatusService(
            db=db_session,
            user_repo=user_repo,
            reservation_repo=reservation_repo,
            rental_repo=None
        )
        
        can_create = await user_status_service.can_user_create_reservation(test_user)
        assert can_create is False

