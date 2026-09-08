# tests/services/test_reservation_grace_period.py

"""
Unit тесты grace-периода отмены/редактирования резерва (24 ч после создания)
 и валидации фактической даты возврата аренды.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException

from api.services.user.user_status_service import UserStatusService
from api.services.order.order_validator import OrderValidator
from api.models.user import User
from api.models.rental import Rental
from shared.constants.user_status import UserStatus, RESERVATION_GRACE_PERIOD_HOURS


@pytest.mark.unit
class TestReservationGracePeriod:
    """Grace-период: свежесозданный резерв можно отменить/изменить
    независимо от ограничения по дням до начала."""

    @pytest.fixture
    def user_status_service(self):
        UserStatusService.clear_cache()
        return UserStatusService(
            db=AsyncMock(),
            user_repo=AsyncMock(),
            reservation_repo=AsyncMock(),
            rental_repo=AsyncMock(),
        )

    @pytest.fixture
    def new_user(self):
        user = User()
        user.id = 1
        user.status = UserStatus.NEW.value
        user.role = "user"
        return user

    @pytest.mark.asyncio
    async def test_fresh_reservation_starting_tomorrow_is_cancellable(self, user_status_service, new_user):
        """«Новый» создал резерв на завтра 2 часа назад — отменить можно (grace)."""
        created_at = datetime.now(timezone.utc) - timedelta(hours=2)
        start = date.today() + timedelta(days=1)

        assert await user_status_service.can_user_cancel_reservation(new_user, start, created_at) is True
        assert await user_status_service.can_user_edit_reservation(new_user, start, created_at) is True

    @pytest.mark.asyncio
    async def test_grace_expired_reservation_starting_tomorrow_is_not_cancellable(self, user_status_service, new_user):
        """Grace истёк — работает обычное правило «Новый: >2 дней»."""
        created_at = datetime.now(timezone.utc) - timedelta(hours=RESERVATION_GRACE_PERIOD_HOURS + 1)
        start = date.today() + timedelta(days=1)

        assert await user_status_service.can_user_cancel_reservation(new_user, start, created_at) is False

    @pytest.mark.asyncio
    async def test_grace_does_not_help_for_past_start_date(self, user_status_service, new_user):
        """Прошедшая дата начала недоступна даже в grace-периоде."""
        created_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        start = date.today() - timedelta(days=1)

        assert await user_status_service.can_user_edit_reservation(new_user, start, created_at) is False

    @pytest.mark.asyncio
    async def test_grace_does_not_help_persona_non_grata(self, user_status_service, new_user):
        """«Персона Нон Грата» не может редактировать даже свежий резерв."""
        new_user.status = UserStatus.PERSONA_NON_GRATA.value
        created_at = datetime.now(timezone.utc) - timedelta(minutes=5)
        start = date.today() + timedelta(days=1)

        assert await user_status_service.can_user_edit_reservation(new_user, start, created_at) is False

    @pytest.mark.asyncio
    async def test_naive_created_at_treated_as_utc(self, user_status_service, new_user):
        """Наивное created_at не ломает сравнение (трактуется как UTC)."""
        created_at = datetime.utcnow() - timedelta(hours=1)
        start = date.today() + timedelta(days=1)

        assert await user_status_service.can_user_cancel_reservation(new_user, start, created_at) is True

    @pytest.mark.asyncio
    async def test_no_created_at_means_no_grace(self, user_status_service, new_user):
        """created_at не передан — grace не применяется (обратная совместимость)."""
        start = date.today() + timedelta(days=1)

        assert await user_status_service.can_user_cancel_reservation(new_user, start, None) is False


@pytest.mark.unit
class TestValidatorUsesGracePeriod:
    """OrderValidator передаёт created_at в UserStatusService и корректно
    формирует сообщение об отказе."""

    @pytest.fixture
    def validator(self):
        return OrderValidator(
            db=AsyncMock(),
            financial_service=None,
            availability_service=MagicMock(),
            holiday_repo=AsyncMock(),
        )

    @pytest.fixture
    def reservation(self):
        reservation = MagicMock()
        reservation.start_date = date.today() + timedelta(days=1)
        reservation.created_at = datetime.now(timezone.utc) - timedelta(minutes=30)
        return reservation

    @pytest.mark.asyncio
    async def test_cancel_passes_created_at_to_service(self, validator, reservation):
        """Валидатор прокидывает created_at резерва в сервис статусов."""
        from api.models.user import User as UserModel

        user = UserModel()
        user.id = 1
        user.status = UserStatus.NEW.value

        validator.user_status_service = AsyncMock()
        validator.user_status_service.can_user_cancel_reservation = AsyncMock(return_value=True)

        await validator.validate_user_can_cancel_reservation(user, reservation, is_manager=False)

        validator.user_status_service.can_user_cancel_reservation.assert_awaited_once_with(
            user, reservation.start_date, reservation.created_at
        )

    @pytest.mark.asyncio
    async def test_edit_checks_new_start_date_too(self, validator, reservation):
        """«Далёкий» резерв нельзя передвинуть на близкую дату в обход правила."""
        from api.models.user import User as UserModel

        user = UserModel()
        user.id = 1
        user.status = UserStatus.NEW.value

        validator.user_status_service = AsyncMock()
        # старая дата (через 10 дней) — можно, новая (завтра, вне grace) — нельзя
        validator.user_status_service.can_user_edit_reservation = AsyncMock(side_effect=[True, False])

        with pytest.raises(HTTPException) as exc_info:
            await validator.validate_user_can_edit_reservation(
                user, reservation, is_manager=False,
                new_start_date=date.today() + timedelta(days=1),
            )

        assert exc_info.value.status_code == 403


@pytest.mark.unit
class TestValidateReturnDate:
    """Фактическая дата возврата ограничена [начало аренды; сегодня]."""

    @pytest.fixture
    def validator(self):
        return OrderValidator(
            db=AsyncMock(),
            financial_service=None,
            availability_service=MagicMock(),
            holiday_repo=AsyncMock(),
        )

    @pytest.fixture
    def rental(self):
        rental = MagicMock(spec=Rental)
        rental.id = 7
        rental.start_date = date.today() - timedelta(days=5)
        rental.end_date = date.today() - timedelta(days=1)
        return rental

    @pytest.fixture
    def future_rental(self):
        """Аренда с будущим плановым окончанием (только что выдана)."""
        rental = MagicMock(spec=Rental)
        rental.id = 8
        rental.start_date = date.today()
        rental.end_date = date.today() + timedelta(days=3)
        return rental

    def test_return_before_start_rejected(self, validator, rental):
        with pytest.raises(HTTPException) as exc_info:
            validator.validate_return_date(rental, rental.start_date - timedelta(days=1))
        assert exc_info.value.status_code == 422

    def test_future_overdue_rejected(self, validator, rental):
        """Просрочку нельзя зарегистрировать заранее: дата позже end и позже сегодня — 422."""
        with pytest.raises(HTTPException) as exc_info:
            validator.validate_return_date(rental, date.today() + timedelta(days=1))
        assert exc_info.value.status_code == 422

    def test_return_today_accepted(self, validator, rental):
        validator.validate_return_date(rental, date.today())

    def test_return_on_start_accepted(self, validator, rental):
        validator.validate_return_date(rental, rental.start_date)

    def test_planned_future_end_return_accepted(self, validator, future_rental):
        """«Возврат по плану» в будущую плановую дату окончания разрешён."""
        validator.validate_return_date(future_rental, future_rental.end_date)

    def test_early_future_return_accepted(self, validator, future_rental):
        """Досрочный возврат будущей датой (раньше планового конца) разрешён."""
        validator.validate_return_date(future_rental, date.today() + timedelta(days=1))
