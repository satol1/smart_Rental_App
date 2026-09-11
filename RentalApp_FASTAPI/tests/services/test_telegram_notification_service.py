# tests/services/test_telegram_notification_service.py
"""
Тесты для TelegramNotificationService и интеграции уведомлений с ReservationLifecycleService.
"""

import pytest
import asyncio
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from api.services.telegram_notification_service import TelegramNotificationService
from api.models.user import User
from api.models.reservation import Reservation, ReservationAccessory
from api.models.equipment import Equipment
from api.models.accessory import Accessory
from api.services.order.reservation_service import ReservationLifecycleService
from shared.schemas.reservation_schema import ReservationCreateRequest, ReservationUpdateRequest


class TestTelegramNotificationService:
    """Тесты функционала TelegramNotificationService."""

    @pytest.fixture
    def configured_service(self):
        return TelegramNotificationService(
            bot_token="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ",
            default_chat_id="-1001234567890",
            timeout=5.0,
        )

    @pytest.fixture
    def unconfigured_service(self):
        return TelegramNotificationService(
            bot_token="default_token_for_dev",
            default_chat_id="",
        )

    @pytest.fixture
    def sample_user(self):
        return User(
            id=42,
            full_name="Иван <Тестовый> & Ко",
            phone="+7 (999) 123-45-67",
            email="ivan@example.com",
            telegram_username="ivan_tg",
        )

    @pytest.fixture
    def sample_equipment(self):
        eq1 = Equipment(id=1, brand="Sony", name="Alpha A7 IV", equipment_type="Камера")
        eq2 = Equipment(id=2, brand="Canon", name="EOS R5", equipment_type="Камера")
        return [eq1, eq2]

    @pytest.fixture
    def sample_reservation(self, sample_user, sample_equipment):
        res = Reservation(
            id=101,
            user_id=sample_user.id,
            start_date=date(2026, 9, 15),
            end_date=date(2026, 9, 18),
            total_cost=7500.0,
            discount_amount=500.0,
            status="active",
            created_at=datetime.now(timezone.utc),
        )
        res.user = sample_user
        res.equipment = sample_equipment
        return res

    def test_is_configured_true(self, configured_service):
        assert configured_service.is_configured is True

    def test_is_configured_false_for_dev_token(self, unconfigured_service):
        assert unconfigured_service.is_configured is False

    def test_is_configured_false_for_empty_values(self):
        svc = TelegramNotificationService(bot_token="", default_chat_id="")
        assert svc.is_configured is False

    @pytest.mark.asyncio
    async def test_send_message_unconfigured_skips(self, unconfigured_service):
        result = await unconfigured_service.send_message("Test message")
        assert result is False

    @pytest.mark.asyncio
    async def test_send_message_success(self, configured_service):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {"ok": True, "result": {"message_id": 999}}

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await configured_service.send_message("<b>Привет!</b>")
            assert result is True
            mock_post.assert_called_once()
            call_kwargs = mock_post.call_args.kwargs
            assert call_kwargs["json"]["chat_id"] == "-1001234567890"
            assert "<b>Привет!</b>" in call_kwargs["json"]["text"]
            assert call_kwargs["json"]["parse_mode"] == "HTML"

    @pytest.mark.asyncio
    async def test_send_message_api_error_handled_gracefully(self, configured_service):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {"ok": False, "description": "Chat not found"}

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await configured_service.send_message("Привет")
            assert result is False

    @pytest.mark.asyncio
    async def test_send_message_http_error_handled_gracefully(self, configured_service):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            result = await configured_service.send_message("Привет")
            assert result is False

    @pytest.mark.asyncio
    async def test_send_message_timeout_handled_gracefully(self, configured_service):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post,                 patch("api.services.telegram_notification_service.asyncio.sleep", new_callable=AsyncMock):
            mock_post.side_effect = httpx.TimeoutException("Connection timed out")

            result = await configured_service.send_message("Привет")
            assert result is False
            # Транзиентная ошибка: исчерпаны все попытки
            assert mock_post.await_count == configured_service.max_attempts

    @pytest.mark.asyncio
    async def test_send_message_retries_on_5xx_then_succeeds(self, configured_service):
        ok_response = MagicMock(spec=httpx.Response)
        ok_response.status_code = 200
        ok_response.json.return_value = {"ok": True, "result": {"message_id": 1}}
        server_error = MagicMock(spec=httpx.Response)
        server_error.status_code = 503
        server_error.text = "Service Unavailable"

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post,                 patch("api.services.telegram_notification_service.asyncio.sleep", new_callable=AsyncMock):
            mock_post.side_effect = [server_error, ok_response]

            result = await configured_service.send_message("Привет")
            assert result is True
            assert mock_post.await_count == 2

    @pytest.mark.asyncio
    async def test_send_message_respects_429_retry_after(self, configured_service):
        rate_limited = MagicMock(spec=httpx.Response)
        rate_limited.status_code = 429
        rate_limited.json.return_value = {"ok": False, "parameters": {"retry_after": 7}}
        ok_response = MagicMock(spec=httpx.Response)
        ok_response.status_code = 200
        ok_response.json.return_value = {"ok": True, "result": {"message_id": 2}}

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post,                 patch("api.services.telegram_notification_service.asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            mock_post.side_effect = [rate_limited, ok_response]

            result = await configured_service.send_message("Привет")
            assert result is True
            # Пауза взята из retry_after ответа Telegram
            mock_sleep.assert_awaited_once_with(7.0)

    @pytest.mark.asyncio
    async def test_send_message_no_retry_on_4xx(self, configured_service):
        not_found = MagicMock(spec=httpx.Response)
        not_found.status_code = 404
        not_found.text = "Not Found"

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = not_found

            result = await configured_service.send_message("Привет")
            assert result is False
            mock_post.assert_called_once()

    @pytest.mark.asyncio
    async def test_notify_new_reservation_formatting(self, configured_service, sample_reservation, sample_user):
        with patch.object(configured_service, "send_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True

            result = await configured_service.notify_new_reservation(sample_reservation, sample_user)
            assert result is True
            mock_send.assert_called_once()
            text = mock_send.call_args[0][0]

            # Проверяем ключевые поля и экранирование HTML
            assert "Новый резерв #101" in text
            assert "Иван &lt;Тестовый&gt; &amp; Ко" in text
            assert "+7 (999) 123-45-67" in text
            assert "@ivan_tg" in text
            assert "15.09.2026 — 18.09.2026" in text
            assert "Sony Alpha A7 IV" in text
            assert "Canon EOS R5" in text
            assert "7 500.00 ₽" in text
            assert "500.00 ₽" in text

    @pytest.mark.asyncio
    async def test_notify_reservation_dates_changed_formatting(self, configured_service, sample_reservation, sample_user):
        with patch.object(configured_service, "send_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True

            result = await configured_service.notify_reservation_dates_changed(
                reservation=sample_reservation,
                old_start_date=date(2026, 9, 10),
                old_end_date=date(2026, 9, 12),
                user=sample_user,
            )
            assert result is True
            text = mock_send.call_args[0][0]

            assert "Изменение дат резерва #101" in text
            assert "Было: 10.09.2026 — 12.09.2026" in text
            assert "Стало: <b>15.09.2026 — 18.09.2026</b>" in text
            assert "7 500.00 ₽" in text

    @pytest.mark.asyncio
    async def test_notify_reservation_equipment_changed_formatting(self, configured_service, sample_reservation, sample_user):
        with patch.object(configured_service, "send_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True

            result = await configured_service.notify_reservation_equipment_changed(
                reservation=sample_reservation,
                old_equipment_names=["Sony A7 III"],
                user=sample_user,
            )
            assert result is True
            text = mock_send.call_args[0][0]

            assert "Изменение оборудования в резерве #101" in text
            assert "Sony A7 III" in text
            assert "Sony Alpha A7 IV" in text
            assert "7 500.00 ₽" in text

    @pytest.mark.asyncio
    async def test_notify_reservation_updated_combined(self, configured_service, sample_reservation, sample_user):
        with patch.object(configured_service, "send_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True

            result = await configured_service.notify_reservation_updated(
                reservation=sample_reservation,
                old_start_date=date(2026, 9, 10),
                old_end_date=date(2026, 9, 12),
                old_equipment_names=["Sony A7 III"],
                dates_changed=True,
                equipment_changed=True,
                user=sample_user,
            )
            assert result is True
            text = mock_send.call_args[0][0]

            assert "Изменение дат и оборудования в резерве #101" in text
            assert "10.09.2026" in text
            assert "15.09.2026" in text
            assert "Sony A7 III" in text
            assert "Sony Alpha A7 IV" in text

    @pytest.mark.asyncio
    async def test_notify_reservation_cancelled_formatting(self, configured_service, sample_user):
        with patch.object(configured_service, "send_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True

            result = await configured_service.notify_reservation_cancelled(
                reservation_id=101,
                user=sample_user,
                start_date=date(2026, 9, 15),
                end_date=date(2026, 9, 18),
                equipment_names=["Sony Alpha A7 IV"],
                total_cost=7500.0,
            )
            assert result is True
            text = mock_send.call_args[0][0]

            assert "Резерв #101 отменён пользователем" in text
            assert "Иван &lt;Тестовый&gt; &amp; Ко" in text
            assert "15.09.2026 — 18.09.2026" in text
            assert "Sony Alpha A7 IV" in text
            assert "7 500.00 ₽" in text


class TestReservationLifecycleTelegramIntegration:
    """Тесты вызова Telegram уведомлений из ReservationLifecycleService."""

    @pytest.fixture
    def mock_db_session(self):
        session = AsyncMock()
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = None
        mock_context.__aexit__.return_value = None
        session.begin_nested = MagicMock(return_value=mock_context)
        return session

    @pytest.fixture
    def mock_telegram_service(self):
        svc = MagicMock(spec=TelegramNotificationService)
        svc.send_in_background = MagicMock()
        return svc

    @pytest.fixture
    def lifecycle_service(self, mock_db_session, mock_telegram_service):
        from api.repositories.reservation_repository import ReservationRepository
        from api.repositories.user_repository import UserRepository
        from api.repositories.equipment_repository import EquipmentRepository
        from api.services.order.system_repository import SystemService

        mock_reservation_repo = MagicMock(spec=ReservationRepository)
        mock_user_repo = MagicMock(spec=UserRepository)
        mock_equipment_repo = MagicMock(spec=EquipmentRepository)
        mock_system_service = MagicMock(spec=SystemService)
        mock_validator = AsyncMock()
        mock_financial_service = AsyncMock()
        mock_promo_code_logic = AsyncMock()

        return ReservationLifecycleService(
            db=mock_db_session,
            reservation_repo=mock_reservation_repo,
            user_repo=mock_user_repo,
            equipment_repo=mock_equipment_repo,
            system_service=mock_system_service,
            validator=mock_validator,
            financial_service=mock_financial_service,
            promo_code_logic=mock_promo_code_logic,
            telegram_service=mock_telegram_service,
        )

    @pytest.mark.asyncio
    async def test_create_user_reservation_triggers_telegram(self, lifecycle_service, mock_telegram_service):
        user = User(id=1, full_name="Тест", email="test@example.com")
        request = ReservationCreateRequest(
            start_date=date(2026, 9, 20),
            end_date=date(2026, 9, 22),
            equipment_ids=[1],
        )

        mock_reservation = Reservation(
            id=55,
            user_id=user.id,
            start_date=request.start_date,
            end_date=request.end_date,
            total_cost=3000.0,
        )
        lifecycle_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=[MagicMock()])
        lifecycle_service.financial_service.calculate_final_price = AsyncMock(
            return_value=MagicMock(final_total=3000.0, discount_amount=0.0)
        )
        lifecycle_service.reservation_repo.save_object = AsyncMock()
        lifecycle_service.reservation_repo.get_by_id_with_details = AsyncMock(return_value=mock_reservation)

        await lifecycle_service.create_user_reservation(request, user)

        mock_telegram_service.send_in_background.assert_called_once()
        mock_telegram_service.notify_new_reservation.assert_called_once_with(mock_reservation, user)

    @pytest.mark.asyncio
    async def test_update_user_reservation_dates_triggers_telegram(self, lifecycle_service, mock_telegram_service):
        user = User(id=1, full_name="Тест", email="test@example.com")
        old_res = Reservation(
            id=55,
            user_id=user.id,
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 12),
            total_cost=2000.0,
        )
        old_res.equipment = [Equipment(id=1, name="Камера", brand="Sony")]

        new_res = Reservation(
            id=55,
            user_id=user.id,
            start_date=date(2026, 9, 15),  # Дата изменилась
            end_date=date(2026, 9, 18),
            total_cost=4000.0,
        )
        new_res.equipment = old_res.equipment

        lifecycle_service.reservation_repo.get_by_id_with_details = AsyncMock(
            side_effect=[old_res, new_res]
        )
        lifecycle_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=old_res.equipment)
        lifecycle_service.financial_service.calculate_final_price = AsyncMock(
            return_value=MagicMock(final_total=4000.0, discount_amount=0.0)
        )
        lifecycle_service.reservation_repo.save_object = AsyncMock()

        request = ReservationUpdateRequest(
            start_date=date(2026, 9, 15),
            end_date=date(2026, 9, 18),
            equipment_ids=[1],
        )

        await lifecycle_service.update_user_reservation(55, request, user)

        mock_telegram_service.send_in_background.assert_called_once()
        mock_telegram_service.notify_reservation_updated.assert_called_once()
        call_kwargs = mock_telegram_service.notify_reservation_updated.call_args.kwargs
        assert call_kwargs["dates_changed"] is True
        assert call_kwargs["equipment_changed"] is False

    @pytest.mark.asyncio
    async def test_update_user_reservation_equipment_triggers_telegram(self, lifecycle_service, mock_telegram_service):
        user = User(id=1, full_name="Тест", email="test@example.com")
        eq1 = Equipment(id=1, name="Камера A", brand="Sony")
        eq2 = Equipment(id=2, name="Камера B", brand="Canon")

        old_res = Reservation(
            id=55,
            user_id=user.id,
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 12),
            total_cost=2000.0,
        )
        old_res.equipment = [eq1]

        new_res = Reservation(
            id=55,
            user_id=user.id,
            start_date=date(2026, 9, 10),  # Дата НЕ изменилась
            end_date=date(2026, 9, 12),
            total_cost=3500.0,
        )
        new_res.equipment = [eq1, eq2]  # Оборудование изменилось

        lifecycle_service.reservation_repo.get_by_id_with_details = AsyncMock(
            side_effect=[old_res, new_res]
        )
        lifecycle_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=[eq1, eq2])
        lifecycle_service.financial_service.calculate_final_price = AsyncMock(
            return_value=MagicMock(final_total=3500.0, discount_amount=0.0)
        )
        lifecycle_service.reservation_repo.save_object = AsyncMock()

        request = ReservationUpdateRequest(
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 12),
            equipment_ids=[1, 2],
        )

        await lifecycle_service.update_user_reservation(55, request, user)

        mock_telegram_service.send_in_background.assert_called_once()
        mock_telegram_service.notify_reservation_updated.assert_called_once()
        call_kwargs = mock_telegram_service.notify_reservation_updated.call_args.kwargs
        assert call_kwargs["dates_changed"] is False
        assert call_kwargs["equipment_changed"] is True

    @pytest.mark.asyncio
    async def test_update_user_reservation_no_changes_no_telegram(self, lifecycle_service, mock_telegram_service):
        user = User(id=1, full_name="Тест", email="test@example.com")
        eq1 = Equipment(id=1, name="Камера A", brand="Sony")

        old_res = Reservation(
            id=55,
            user_id=user.id,
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 12),
            total_cost=2000.0,
        )
        old_res.equipment = [eq1]

        new_res = Reservation(
            id=55,
            user_id=user.id,
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 12),
            total_cost=2000.0,
        )
        new_res.equipment = [eq1]

        lifecycle_service.reservation_repo.get_by_id_with_details = AsyncMock(
            side_effect=[old_res, new_res]
        )
        lifecycle_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=[eq1])
        lifecycle_service.financial_service.calculate_final_price = AsyncMock(
            return_value=MagicMock(final_total=2000.0, discount_amount=0.0)
        )
        lifecycle_service.reservation_repo.save_object = AsyncMock()

        request = ReservationUpdateRequest(
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 12),
            equipment_ids=[1],
        )

        await lifecycle_service.update_user_reservation(55, request, user)

        # Никаких изменений нет -> бот не должен слать уведомления!
        mock_telegram_service.send_in_background.assert_not_called()

    @pytest.mark.asyncio
    async def test_cancel_user_reservation_triggers_telegram(self, lifecycle_service, mock_telegram_service):
        user = User(id=1, full_name="Тест", email="test@example.com")
        res = Reservation(
            id=55,
            user_id=user.id,
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 12),
            total_cost=2000.0,
        )
        res.equipment = [Equipment(id=1, name="Камера", brand="Sony")]

        lifecycle_service.reservation_repo.get_by_id_with_details = AsyncMock(return_value=res)
        lifecycle_service.reservation_repo.delete = AsyncMock()

        await lifecycle_service.cancel_user_reservation(55, user)

        mock_telegram_service.send_in_background.assert_called_once()
        mock_telegram_service.notify_reservation_cancelled.assert_called_once_with(
            reservation_id=55,
            user=user,
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 12),
            equipment_names=["Sony Камера"],
            total_cost=2000.0,
        )
