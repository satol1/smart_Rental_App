# tests/services/test_order_validator_status.py

"""
Unit тесты для OrderValidator с учетом градации статусов пользователей.
Тестирует валидацию создания, редактирования, отмены резервов и выдачи аренд
для разных статусов пользователей.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date, timedelta
from fastapi import HTTPException

from api.services.order.order_validator import OrderValidator
from api.models.user import User
from api.models.reservation import Reservation
from shared.constants.user_status import UserStatus
from shared.constants.order_status import OrderStatus


class TestOrderValidatorStatus:
    """Тесты для OrderValidator с учетом статусов пользователей."""

    @pytest.fixture
    def mock_db(self):
        """Создает мок базы данных."""
        return AsyncMock()

    @pytest.fixture
    def mock_user_status_service(self):
        """Создает мок UserStatusService."""
        return AsyncMock()

    @pytest.fixture
    def mock_reservation_repo(self):
        """Создает мок ReservationRepository."""
        repo = AsyncMock()
        repo.count_active_reservations_by_user = AsyncMock(return_value=0)
        return repo

    @pytest.fixture
    def validator(self, mock_db, mock_user_status_service, mock_reservation_repo):
        """Создает экземпляр OrderValidator с моками."""
        return OrderValidator(
            db=mock_db,
            financial_service=None,
            availability_service=None,
            holiday_repo=None,
            reservation_repo=mock_reservation_repo,
            user_status_service=mock_user_status_service
        )

    @pytest.fixture
    def new_user(self):
        """Создает пользователя со статусом 'Новый'."""
        user = MagicMock(spec=User)
        user.id = 1
        user.status = UserStatus.NEW.value
        return user

    @pytest.fixture
    def regular_user(self):
        """Создает пользователя со статусом 'Постоянный'."""
        user = MagicMock(spec=User)
        user.id = 2
        user.status = UserStatus.REGULAR.value
        return user

    @pytest.fixture
    def vip_user(self):
        """Создает пользователя со статусом 'VIP'."""
        user = MagicMock(spec=User)
        user.id = 3
        user.status = UserStatus.VIP.value
        return user

    @pytest.fixture
    def blocked_user(self):
        """Создает пользователя со статусом 'Заблокирован'."""
        user = MagicMock(spec=User)
        user.id = 4
        user.status = UserStatus.BLOCKED.value
        return user

    @pytest.fixture
    def persona_non_grata_user(self):
        """Создает пользователя со статусом 'Персона НонГрата'."""
        user = MagicMock(spec=User)
        user.id = 5
        user.status = UserStatus.PERSONA_NON_GRATA.value
        return user

    @pytest.fixture
    def reservation_future(self):
        """Создает резерв на будущее (3 дня вперед)."""
        reservation = MagicMock(spec=Reservation)
        reservation.id = 1
        reservation.start_date = date.today() + timedelta(days=3)
        reservation.status = OrderStatus.ACTIVE
        return reservation

    @pytest.fixture
    def reservation_tomorrow(self):
        """Создает резерв на завтра (1 день вперед)."""
        reservation = MagicMock(spec=Reservation)
        reservation.id = 2
        reservation.start_date = date.today() + timedelta(days=1)
        reservation.status = OrderStatus.ACTIVE
        return reservation

    # Тесты для validate_user_can_create_reservation

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_create_reservation_new_user_within_limit(
        self, validator, new_user, mock_user_status_service, mock_reservation_repo
    ):
        """Тест: Пользователь 'Новый' может создать резерв в пределах лимита."""
        mock_user_status_service.can_user_create_reservation = AsyncMock(return_value=True)
        mock_user_status_service.get_user_max_reservations = AsyncMock(return_value=2)
        mock_reservation_repo.count_active_reservations_by_user = AsyncMock(return_value=1)
        
        # Не должно быть исключения
        await validator.validate_user_can_create_reservation(new_user)

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_create_reservation_new_user_exceeds_limit(
        self, validator, new_user, mock_user_status_service, mock_reservation_repo
    ):
        """Тест: Пользователь 'Новый' не может создать резерв сверх лимита."""
        mock_user_status_service.can_user_create_reservation = AsyncMock(return_value=True)
        mock_user_status_service.get_user_max_reservations = AsyncMock(return_value=2)
        mock_reservation_repo.count_active_reservations_by_user = AsyncMock(return_value=2)
        
        with pytest.raises(HTTPException) as exc_info:
            await validator.validate_user_can_create_reservation(new_user)
        
        assert exc_info.value.status_code == 403
        assert "лимит" in exc_info.value.detail.lower() or "limit" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_create_reservation_blocked_user(
        self, validator, blocked_user, mock_user_status_service
    ):
        """Тест: Заблокированный пользователь не может создать резерв."""
        mock_user_status_service.can_user_create_reservation = AsyncMock(return_value=False)
        
        with pytest.raises(HTTPException) as exc_info:
            await validator.validate_user_can_create_reservation(blocked_user)
        
        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_create_reservation_persona_non_grata(
        self, validator, persona_non_grata_user, mock_user_status_service
    ):
        """Тест: Пользователь 'Персона НонГрата' не может создать резерв."""
        mock_user_status_service.can_user_create_reservation = AsyncMock(return_value=False)
        
        with pytest.raises(HTTPException) as exc_info:
            await validator.validate_user_can_create_reservation(persona_non_grata_user)
        
        assert exc_info.value.status_code == 403

    # Тесты для validate_user_can_edit_reservation

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_edit_reservation_new_user_within_restriction(
        self, validator, new_user, reservation_future, mock_user_status_service
    ):
        """Тест: Пользователь 'Новый' может редактировать резерв за 2+ дня до начала."""
        mock_user_status_service.can_user_edit_reservation = AsyncMock(return_value=True)
        
        # Не должно быть исключения
        await validator.validate_user_can_edit_reservation(
            new_user, reservation_future, is_manager=False
        )

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_edit_reservation_new_user_outside_restriction(
        self, validator, new_user, reservation_tomorrow, mock_user_status_service
    ):
        """Тест: Пользователь 'Новый' не может редактировать резерв за менее 2 дней до начала."""
        mock_user_status_service.can_user_edit_reservation = AsyncMock(return_value=False)
        
        with pytest.raises(HTTPException) as exc_info:
            await validator.validate_user_can_edit_reservation(
                new_user, reservation_tomorrow, is_manager=False
            )
        
        assert exc_info.value.status_code == 403
        # «Новому» нужен запас >2 дней, т.е. от 3 дней; в сообщении и grace-период 24 ч
        assert "3" in exc_info.value.detail or "24" in exc_info.value.detail

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_edit_reservation_vip_no_restrictions(
        self, validator, vip_user, reservation_tomorrow, mock_user_status_service
    ):
        """Тест: Пользователь 'VIP' может редактировать резерв в любой момент."""
        mock_user_status_service.can_user_edit_reservation = AsyncMock(return_value=True)
        
        # Не должно быть исключения
        await validator.validate_user_can_edit_reservation(
            vip_user, reservation_tomorrow, is_manager=False
        )

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_edit_reservation_manager_always_allowed(
        self, validator, new_user, reservation_tomorrow, mock_user_status_service
    ):
        """Тест: Менеджер может редактировать резерв всегда, даже если пользователь не может."""
        mock_user_status_service.can_user_edit_reservation = AsyncMock(return_value=False)
        
        # Не должно быть исключения, так как is_manager=True
        await validator.validate_user_can_edit_reservation(
            new_user, reservation_tomorrow, is_manager=True
        )

    # Тесты для validate_user_can_cancel_reservation

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_cancel_reservation_regular_user_within_restriction(
        self, validator, regular_user, reservation_future, mock_user_status_service
    ):
        """Тест: Пользователь 'Постоянный' может отменить резерв за 1+ день до начала."""
        mock_user_status_service.can_user_cancel_reservation = AsyncMock(return_value=True)
        
        # Не должно быть исключения
        await validator.validate_user_can_cancel_reservation(
            regular_user, reservation_future, is_manager=False
        )

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_cancel_reservation_regular_user_outside_restriction(
        self, validator, regular_user, reservation_tomorrow, mock_user_status_service
    ):
        """Тест: Пользователь 'Постоянный' не может отменить резерв за менее 1 дня до начала."""
        mock_user_status_service.can_user_cancel_reservation = AsyncMock(return_value=False)
        
        with pytest.raises(HTTPException) as exc_info:
            await validator.validate_user_can_cancel_reservation(
                regular_user, reservation_tomorrow, is_manager=False
            )
        
        assert exc_info.value.status_code == 403
        # «Постоянному» нужен запас >1 дня, т.е. от 2 дней
        assert "2" in exc_info.value.detail or "24" in exc_info.value.detail

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_cancel_reservation_manager_always_allowed(
        self, validator, regular_user, reservation_tomorrow, mock_user_status_service
    ):
        """Тест: Менеджер может отменить резерв всегда."""
        mock_user_status_service.can_user_cancel_reservation = AsyncMock(return_value=False)
        
        # Не должно быть исключения, так как is_manager=True
        await validator.validate_user_can_cancel_reservation(
            regular_user, reservation_tomorrow, is_manager=True
        )

    # Тесты для validate_user_can_receive_rental

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_receive_rental_persona_non_grata(
        self, validator, persona_non_grata_user, mock_user_status_service
    ):
        """Тест: Пользователю 'Персона НонГрата' нельзя выдавать аренду."""
        mock_user_status_service.can_user_receive_rental = AsyncMock(return_value=False)
        
        with pytest.raises(HTTPException) as exc_info:
            await validator.validate_user_can_receive_rental(persona_non_grata_user)
        
        assert exc_info.value.status_code == 403
        assert "персона нонграта" in exc_info.value.detail.lower() or "non grata" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_receive_rental_allowed_statuses(
        self, validator, new_user, regular_user, vip_user, blocked_user, mock_user_status_service
    ):
        """Тест: Пользователям с другими статусами можно выдавать аренду."""
        mock_user_status_service.can_user_receive_rental = AsyncMock(return_value=True)
        
        # Не должно быть исключений
        await validator.validate_user_can_receive_rental(new_user)
        await validator.validate_user_can_receive_rental(regular_user)
        await validator.validate_user_can_receive_rental(vip_user)
        await validator.validate_user_can_receive_rental(blocked_user)

    # Тесты для отсутствия user_status_service (обратная совместимость)

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_without_user_status_service(
        self, mock_db, new_user, reservation_future
    ):
        """Тест: Валидация работает без user_status_service (обратная совместимость)."""
        validator = OrderValidator(
            db=mock_db,
            financial_service=None,
            availability_service=None,
            holiday_repo=None,
            reservation_repo=None,
            user_status_service=None
        )
        
        # Не должно быть исключения, так как user_status_service отсутствует
        await validator.validate_user_can_edit_reservation(
            new_user, reservation_future, is_manager=False
        )
        await validator.validate_user_can_cancel_reservation(
            new_user, reservation_future, is_manager=False
        )

