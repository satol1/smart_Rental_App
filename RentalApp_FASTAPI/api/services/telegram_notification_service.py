# api/services/telegram_notification_service.py

import asyncio
import html
import logging
from datetime import date
from typing import Optional, List, Dict, Any, Coroutine
import httpx

from config.core import settings
from api.models.user import User
from api.models.reservation import Reservation

logger = logging.getLogger(__name__)


class TelegramNotificationService:
    """
    Сервис для отправки уведомлений о событиях резервов в Telegram-бот.
    
    Обеспечивает неблокирующую отправку сообщений через Telegram Bot API,
    безопасное экранирование HTML и гарантирует отсутствие сбоев в основном
    потоке приложения при сетевых неполадках или отсутствии конфигурации.
    """

    def __init__(
        self,
        bot_token: Optional[str] = None,
        default_chat_id: Optional[str] = None,
        timeout: float = 10.0,
        max_attempts: int = 3,
        retry_base_delay: float = 1.0,
    ):
        raw_token = (
            bot_token
            if bot_token is not None
            else settings.TELEGRAM_TOKEN.get_secret_value()
        )
        self.bot_token = (raw_token or "").strip()

        raw_chat_id = (
            default_chat_id
            if default_chat_id is not None
            else settings.DEFAULT_TELEGRAM_CHAT_ID
        )
        self.default_chat_id = (raw_chat_id or "").strip()
        self.timeout = timeout
        self.max_attempts = max(1, max_attempts)
        self.retry_base_delay = retry_base_delay

    @property
    def is_configured(self) -> bool:
        """Проверяет, заданы ли валидные настройки для отправки сообщений."""
        if not self.bot_token or self.bot_token in ("default_token_for_dev", "your_telegram_token_here"):
            return False
        if not self.default_chat_id or self.default_chat_id == "your_telegram_chat_id_here":
            return False
        return True

    def _get_api_url(self, endpoint: str = "sendMessage") -> str:
        return f"https://api.telegram.org/bot{self.bot_token}/{endpoint}"

    async def send_message(
        self,
        text: str,
        chat_id: Optional[str] = None,
        parse_mode: str = "HTML",
        disable_web_page_preview: bool = True,
    ) -> bool:
        """
        Асинхронно отправляет сообщение в указанный Telegram чат.

        Транзиентные сбои (429 rate limit, 5xx, таймаут/транспорт) ретраятся
        до max_attempts раз с экспоненциальной паузой. Ошибки уровня API
        (ok=False, прочие 4xx) не ретраятся — повтор не имеет смысла.

        Возвращает True при успешной доставке, False при отключенном боте или ошибке.
        Исключения перехватываются, гарантируя стабильность бизнес-логики.
        """
        target_chat_id = chat_id or self.default_chat_id

        if not self.is_configured:
            logger.debug(
                "[TelegramNotificationService] Уведомления отключены: "
                "не настроен TELEGRAM_TOKEN или DEFAULT_TELEGRAM_CHAT_ID"
            )
            return False

        if not target_chat_id:
            logger.warning("[TelegramNotificationService] Не указан chat_id для отправки")
            return False

        payload = {
            "chat_id": target_chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": disable_web_page_preview,
        }

        for attempt in range(1, self.max_attempts + 1):
            retry_delay: Optional[float] = None
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(self._get_api_url("sendMessage"), json=payload)

                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok"):
                        logger.info(
                            f"[TelegramNotificationService] Сообщение успешно отправлено в чат {target_chat_id}"
                        )
                        return True
                    logger.error(
                        f"[TelegramNotificationService] Ошибка API Telegram: {data.get('description')}"
                    )
                    return False

                if response.status_code == 429:
                    # Telegram сам сообщает, сколько ждать
                    try:
                        retry_after = response.json().get("parameters", {}).get("retry_after")
                    except ValueError:
                        retry_after = None
                    retry_delay = min(float(retry_after or self.retry_base_delay), 30.0)
                    logger.warning(
                        f"[TelegramNotificationService] Попытка {attempt}/{self.max_attempts}: "
                        f"rate limit (429), повтор через {retry_delay:.1f}s"
                    )
                elif response.status_code >= 500:
                    retry_delay = self.retry_base_delay * (2 ** (attempt - 1))
                    logger.warning(
                        f"[TelegramNotificationService] Попытка {attempt}/{self.max_attempts}: "
                        f"Telegram ответил {response.status_code}, повтор через {retry_delay:.1f}s"
                    )
                else:
                    logger.error(
                        f"[TelegramNotificationService] Неуспешный HTTP-статус {response.status_code}: {response.text}"
                    )
                    return False

            except httpx.TransportError as e:
                retry_delay = self.retry_base_delay * (2 ** (attempt - 1))
                logger.warning(
                    f"[TelegramNotificationService] Попытка {attempt}/{self.max_attempts}: "
                    f"сетевая ошибка ({type(e).__name__}), повтор через {retry_delay:.1f}s"
                )
            except Exception as e:
                logger.error(
                    f"[TelegramNotificationService] Исключение при отправке в Telegram: {e}", exc_info=True
                )
                return False

            if retry_delay is not None and attempt < self.max_attempts:
                await asyncio.sleep(retry_delay)

        logger.error(
            f"[TelegramNotificationService] Не удалось доставить сообщение в чат "
            f"{target_chat_id} после {self.max_attempts} попыток"
        )
        return False

    def send_in_background(self, coro: Coroutine) -> Optional[asyncio.Task]:
        """
        Запускает отправку уведомления в фоновой задаче event loop.
        Позволяет не задерживать ответ клиенту и безопасно изолирует сетевые задержки.
        """
        try:
            loop = asyncio.get_running_loop()
            task = loop.create_task(coro)
            
            def _log_result(t: asyncio.Task):
                try:
                    t.result()
                except asyncio.CancelledError:
                    pass
                except Exception as ex:
                    logger.error(f"[TelegramNotificationService] Ошибка в фоновой задаче отправки: {ex}", exc_info=True)

            task.add_done_callback(_log_result)
            return task
        except RuntimeError:
            # Если вызывается вне запущенного event loop (например, в синхронных юнит-тестах)
            logger.debug("[TelegramNotificationService] Event loop не запущен, фоновая задача не создана")
            return None

    # =========================================================================
    # Форматирование и отправка 4 целевых типов уведомлений
    # =========================================================================

    def _format_user_info(self, user: Optional[User]) -> str:
        if not user:
            return "Неизвестный пользователь"
        name = html.escape(user.full_name or "Клиент")
        phone = html.escape(user.phone or "не указан")
        tg_info = f", @{html.escape(user.telegram_username)}" if user.telegram_username else ""
        return f"{name} (тел: {phone}{tg_info})"

    def _format_equipment_list(self, reservation: Reservation) -> List[str]:
        lines = []
        if not getattr(reservation, "equipment", None):
            return ["• Оборудование не указано"]

        accessories_by_eq: Dict[int, List[str]] = {}
        if hasattr(reservation, "accessory_links") and reservation.accessory_links:
            for link in reservation.accessory_links:
                acc_name = getattr(link.accessory, "name", None) if getattr(link, "accessory", None) else None
                if acc_name:
                    accessories_by_eq.setdefault(link.equipment_id, []).append(acc_name)

        for eq in reservation.equipment:
            eq_name = f"{eq.brand} {eq.name}".strip() if getattr(eq, "brand", None) else eq.name
            lines.append(f"• <b>{html.escape(eq_name)}</b>")
            accs = accessories_by_eq.get(eq.id, [])
            for acc in accs:
                lines.append(f"  └ <i>{html.escape(acc)}</i>")
        return lines

    async def notify_new_reservation(
        self,
        reservation: Reservation,
        user: Optional[User] = None,
    ) -> bool:
        """
        Уведомление 1: Новый резерв оборудования.
        """
        actual_user = user or getattr(reservation, "user", None)
        days = (reservation.end_date - reservation.start_date).days + 1 if reservation.start_date and reservation.end_date else 0
        eq_lines = "\n".join(self._format_equipment_list(reservation))
        
        user_name = html.escape(actual_user.full_name or "Клиент") if actual_user else "Клиент"
        user_phone = html.escape(actual_user.phone or "не указан") if actual_user else "не указан"
        user_email = html.escape(actual_user.email or "не указан") if actual_user else "не указан"
        tg_line = f"\n💬 <b>Telegram:</b> @{html.escape(actual_user.telegram_username)}" if (actual_user and actual_user.telegram_username) else ""

        message = (
            f"🆕 <b>Новый резерв #{reservation.id}</b>\n\n"
            f"👤 <b>Клиент:</b> {user_name}\n"
            f"📞 <b>Телефон:</b> {user_phone}\n"
            f"✉️ <b>Email:</b> {user_email}"
            f"{tg_line}\n\n"
            f"📅 <b>Период:</b> {reservation.start_date.strftime('%d.%m.%Y')} — {reservation.end_date.strftime('%d.%m.%Y')} ({days} дн.)\n\n"
            f"📦 <b>Состав резерва:</b>\n{eq_lines}\n\n"
            f"💰 <b>Сумма:</b> {reservation.total_cost:,.2f} ₽".replace(",", " ")
        )
        if getattr(reservation, "discount_amount", 0) and reservation.discount_amount > 0:
            message += f"\n🏷️ <b>Скидка:</b> {reservation.discount_amount:,.2f} ₽".replace(",", " ")

        return await self.send_message(message)

    async def notify_reservation_dates_changed(
        self,
        reservation: Reservation,
        old_start_date: date,
        old_end_date: date,
        user: Optional[User] = None,
    ) -> bool:
        """
        Уведомление 2: Изменение дат резерва пользователем.
        """
        actual_user = user or getattr(reservation, "user", None)
        user_info = self._format_user_info(actual_user)
        new_days = (reservation.end_date - reservation.start_date).days + 1

        message = (
            f"📅 <b>Изменение дат резерва #{reservation.id}</b>\n\n"
            f"👤 <b>Клиент:</b> {user_info}\n\n"
            f"Было: {old_start_date.strftime('%d.%m.%Y')} — {old_end_date.strftime('%d.%m.%Y')}\n"
            f"Стало: <b>{reservation.start_date.strftime('%d.%m.%Y')} — {reservation.end_date.strftime('%d.%m.%Y')}</b> ({new_days} дн.)\n\n"
            f"💰 <b>Итоговая сумма:</b> {reservation.total_cost:,.2f} ₽".replace(",", " ")
        )
        return await self.send_message(message)

    async def notify_reservation_equipment_changed(
        self,
        reservation: Reservation,
        old_equipment_names: List[str],
        user: Optional[User] = None,
    ) -> bool:
        """
        Уведомление 3: Изменение списка оборудования пользователем.
        """
        actual_user = user or getattr(reservation, "user", None)
        user_info = self._format_user_info(actual_user)
        new_eq_lines = "\n".join(self._format_equipment_list(reservation))
        old_eq_lines = "\n".join([f"• {html.escape(name)}" for name in old_equipment_names]) if old_equipment_names else "• Не указано"

        message = (
            f"📦 <b>Изменение оборудования в резерве #{reservation.id}</b>\n\n"
            f"👤 <b>Клиент:</b> {user_info}\n"
            f"📅 <b>Период:</b> {reservation.start_date.strftime('%d.%m.%Y')} — {reservation.end_date.strftime('%d.%m.%Y')}\n\n"
            f"<b>Было:</b>\n{old_eq_lines}\n\n"
            f"<b>Стало:</b>\n{new_eq_lines}\n\n"
            f"💰 <b>Итоговая сумма:</b> {reservation.total_cost:,.2f} ₽".replace(",", " ")
        )
        return await self.send_message(message)

    async def notify_reservation_updated(
        self,
        reservation: Reservation,
        old_start_date: date,
        old_end_date: date,
        old_equipment_names: List[str],
        dates_changed: bool,
        equipment_changed: bool,
        user: Optional[User] = None,
    ) -> bool:
        """
        Комплексное уведомление при обновлении резерва пользователем:
        - если изменились только даты -> вызывает notify_reservation_dates_changed
        - если изменилось только оборудование -> вызывает notify_reservation_equipment_changed
        - если изменились и даты, и оборудование -> отправляет подробное объединённое сообщение
        """
        if dates_changed and not equipment_changed:
            return await self.notify_reservation_dates_changed(
                reservation, old_start_date, old_end_date, user
            )
        if equipment_changed and not dates_changed:
            return await self.notify_reservation_equipment_changed(
                reservation, old_equipment_names, user
            )
        if dates_changed and equipment_changed:
            actual_user = user or getattr(reservation, "user", None)
            user_info = self._format_user_info(actual_user)
            new_days = (reservation.end_date - reservation.start_date).days + 1
            new_eq_lines = "\n".join(self._format_equipment_list(reservation))
            old_eq_lines = "\n".join([f"• {html.escape(name)}" for name in old_equipment_names]) if old_equipment_names else "• Не указано"

            message = (
                f"🔄 <b>Изменение дат и оборудования в резерве #{reservation.id}</b>\n\n"
                f"👤 <b>Клиент:</b> {user_info}\n\n"
                f"📅 <b>Даты:</b>\n"
                f"Было: {old_start_date.strftime('%d.%m.%Y')} — {old_end_date.strftime('%d.%m.%Y')}\n"
                f"Стало: <b>{reservation.start_date.strftime('%d.%m.%Y')} — {reservation.end_date.strftime('%d.%m.%Y')}</b> ({new_days} дн.)\n\n"
                f"📦 <b>Оборудование:</b>\n"
                f"<i>Было:</i>\n{old_eq_lines}\n"
                f"<i>Стало:</i>\n{new_eq_lines}\n\n"
                f"💰 <b>Итоговая сумма:</b> {reservation.total_cost:,.2f} ₽".replace(",", " ")
            )
            return await self.send_message(message)
        return False

    async def notify_reservation_cancelled(
        self,
        reservation_id: int,
        user: Optional[User],
        start_date: date,
        end_date: date,
        equipment_names: List[str],
        total_cost: float,
    ) -> bool:
        """
        Уведомление 4: Отмена резерва пользователем.
        """
        user_info = self._format_user_info(user)
        eq_lines = "\n".join([f"• {html.escape(name)}" for name in equipment_names]) if equipment_names else "• Не указано"
        days = (end_date - start_date).days + 1

        message = (
            f"❌ <b>Резерв #{reservation_id} отменён пользователем</b>\n\n"
            f"👤 <b>Клиент:</b> {user_info}\n"
            f"📅 <b>Период:</b> {start_date.strftime('%d.%m.%Y')} — {end_date.strftime('%d.%m.%Y')} ({days} дн.)\n\n"
            f"📦 <b>Освободившееся оборудование:</b>\n{eq_lines}\n\n"
            f"💰 <b>Сумма резерва:</b> {total_cost:,.2f} ₽".replace(",", " ")
        )
        return await self.send_message(message)
