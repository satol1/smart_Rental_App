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
            # Получаем пользователей, которых нужно уведомить
            user_ids = set()
            
            # Собираем ID пользователей из аренд
            for rental_info in extended_rentals:
                rental = await self.notification_repo.get_rental_by_id(rental_info["id"])
                if rental and rental.user_id:
                    user_ids.add(rental.user_id)
            
            # Собираем ID пользователей из резервов
            for reservation_info in extended_reservations:
                reservation = await self.notification_repo.get_reservation_by_id(reservation_info["id"])
                if reservation and reservation.user_id:
                    user_ids.add(reservation.user_id)
            
            # Отправляем уведомления каждому пользователю
            for user_id in user_ids:
                await self._send_auto_extension_notification(
                    user_id, 
                    holiday_date, 
                    next_working_day,
                    extended_rentals,
                    extended_reservations
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
            
            # Фильтруем заказы пользователя
            user_rentals = [
                rental for rental in extended_rentals 
                if await self._is_rental_belongs_to_user(rental["id"], user_id)
            ]
            user_reservations = [
                reservation for reservation in extended_reservations 
                if await self._is_reservation_belongs_to_user(reservation["id"], user_id)
            ]
            
            if not user_rentals and not user_reservations:
                return
            
            # Формируем сообщение
            message = self._format_auto_extension_message(
                holiday_date,
                next_working_day,
                user_rentals,
                user_reservations
            )
            
            # В реальном приложении здесь была бы отправка уведомления
            # Пока просто логируем
            logger.info(f"Уведомление для пользователя {user.email}: {message}")
            
            # TODO: Реализовать отправку уведомления
            # await self._send_email(user.email, "Автоматическое продление заказа", message)
            # await self._save_notification_to_db(user_id, message)
            
        except Exception as e:
            logger.error(f"Ошибка при отправке уведомления пользователю {user_id}: {e}")
    
    
    async def _is_rental_belongs_to_user(self, rental_id: int, user_id: int) -> bool:
        """Проверяет, принадлежит ли аренда пользователю."""
        rental = await self.notification_repo.get_rental_by_id(rental_id)
        return rental and rental.user_id == user_id
    
    async def _is_reservation_belongs_to_user(self, reservation_id: int, user_id: int) -> bool:
        """Проверяет, принадлежит ли резерв пользователю."""
        reservation = await self.notification_repo.get_reservation_by_id(reservation_id)
        return reservation and reservation.user_id == user_id
    
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
