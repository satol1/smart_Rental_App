# api/services/notification_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Optional
from datetime import date
import logging

from api.models.user import User
from api.models.rental import Rental
from api.models.reservation import Reservation
from api.repositories.notification_repository import NotificationRepository

logger = logging.getLogger(__name__)


class NotificationService:
    """Сервис для отправки уведомлений пользователям об автоматических изменениях."""
    
    def __init__(self, db: AsyncSession, notification_repo: NotificationRepository = None):
        self.db = db
        self.notification_repo = notification_repo or NotificationRepository(db)
    
    async def notify_auto_extension(
        self, 
        extended_rentals: List[Dict], 
        extended_reservations: List[Dict],
        holiday_date: date,
        next_working_day: date
    ) -> None:
        """
        Отправляет уведомления пользователям об автоматическом продлении их заказов.
        
        Args:
            extended_rentals: Список продленных аренд с информацией об изменениях
            extended_reservations: Список продленных резервов с информацией об изменениях
            holiday_date: Дата нового выходного дня
            next_working_day: Следующий рабочий день
        """
        try:
            # Загружаем заказы одним батч-запросом на тип и группируем по
            # пользователям в Python — вместо запроса на каждый заказ × пользователя
            rentals = await self.notification_repo.get_rentals_by_ids(
                [info["id"] for info in extended_rentals]
            )
            reservations = await self.notification_repo.get_reservations_by_ids(
                [info["id"] for info in extended_reservations]
            )
            rental_user = {r.id: r.user_id for r in rentals}
            reservation_user = {r.id: r.user_id for r in reservations}

            user_ids = set(rental_user.values()) | set(reservation_user.values())

            # Отправляем уведомления каждому пользователю (только его заказы)
            for user_id in user_ids:
                user_rentals = [
                    info for info in extended_rentals
                    if rental_user.get(info["id"]) == user_id
                ]
                user_reservations = [
                    info for info in extended_reservations
                    if reservation_user.get(info["id"]) == user_id
                ]
                await self._send_auto_extension_notification(
                    user_id,
                    holiday_date,
                    next_working_day,
                    user_rentals,
                    user_reservations
                )
                
            logger.info(f"Отправлено уведомлений об автоматическом продлении {len(user_ids)} пользователям")
            
        except Exception as e:
            logger.error(f"Ошибка при отправке уведомлений об автоматическом продлении: {e}")
    
    
    async def _send_auto_extension_notification(
        self,
        user_id: int,
        holiday_date: date,
        next_working_day: date,
        extended_rentals: List[Dict],
        extended_reservations: List[Dict]
    ) -> None:
        """
        Отправляет уведомление конкретному пользователю об автоматическом продлении.
        
        В реальном приложении здесь может быть:
        - Отправка email
        - Push-уведомление
        - SMS
        - Сохранение в таблицу уведомлений для отображения в UI
        """
        try:
            # Получаем информацию о пользователе
            user = await self.notification_repo.get_user_by_id(user_id)
            if not user:
                logger.warning(f"Пользователь с ID {user_id} не найден")
                return
            
            # Заказы пользователя уже отфильтрованы вызывающей стороной
            # Формируем сообщение
            message = self._format_auto_extension_message(
                holiday_date,
                next_working_day,
                extended_rentals,
                extended_reservations
            )
            
            # В реальном приложении здесь была бы отправка уведомления
            # Пока просто логируем
            logger.info(f"Уведомление для пользователя {user.email}: {message}")
            
            # TODO: Реализовать отправку уведомления
            # await self._send_email(user.email, "Автоматическое продление заказа", message)
            # await self._save_notification_to_db(user_id, message)
            
        except Exception as e:
            logger.error(f"Ошибка при отправке уведомления пользователю {user_id}: {e}")
    
    
    def _format_auto_extension_message(
        self,
        holiday_date: date,
        next_working_day: date,
        user_rentals: List[Dict],
        user_reservations: List[Dict]
    ) -> str:
        """Форматирует сообщение об автоматическом продлении."""
        message_parts = [
            f"Уважаемый клиент!",
            f"",
            f"В связи с добавлением выходного дня {holiday_date.strftime('%d.%m.%Y')} ",
            f"ваши заказы были автоматически продлены до следующего рабочего дня {next_working_day.strftime('%d.%m.%Y')}.",
            f""
        ]
        
        if user_rentals:
            message_parts.append("Продленные аренды:")
            for rental in user_rentals:
                message_parts.append(f"- Аренда #{rental['id']}: {rental['old_end_date']} → {rental['new_end_date']}")
            message_parts.append("")
        
        if user_reservations:
            message_parts.append("Продленные резервы:")
            for reservation in user_reservations:
                message_parts.append(f"- Резерв #{reservation['id']}: {reservation['old_end_date']} → {reservation['new_end_date']}")
            message_parts.append("")
        
        message_parts.extend([
            "Стоимость аренды не изменилась, так как выходные дни не тарифицируются.",
            "",
            "С уважением,",
            "Команда проката оборудования"
        ])
        
        return "\n".join(message_parts)
