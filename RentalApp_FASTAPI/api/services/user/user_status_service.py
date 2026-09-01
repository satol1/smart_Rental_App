# api/services/user/user_status_service.py

"""
Сервис управления статусами пользователей с градацией прав.
Отвечает за автоматическое изменение статусов на основе успешных аренд,
проверку и установку статуса "Заблокирован" при просроченных резервах,
а также проверку прав на изменение статусов.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from typing import Optional, Dict
import logging

from api.models.user import User
from api.repositories.user_repository import UserRepository
from api.repositories.reservation_repository import ReservationRepository
from api.repositories.rental_repository import RentalRepository
from shared.constants.user_status import (
    UserStatus,
    COMPLETED_RENTALS_FOR_REGULAR,
    COMPLETED_RENTALS_FOR_VIP,
    OVERDUE_RESERVATIONS_FOR_BLOCK,
    MAX_RESERVATIONS_BY_STATUS,
    EDIT_RESTRICTION_DAYS
)
from shared.utils.user_status_utils import parse_user_status

logger = logging.getLogger(__name__)


class UserStatusService:
    """
    Сервис для управления статусами пользователей.
    
    Использует паттерн "Фасад" - один сервис для всей логики статусов,
    координация с репозиториями.
    
    Оптимизация: Использует in-memory кэш для количества завершенных аренд
    для снижения нагрузки на БД при частых проверках статусов.
    """
    
    # Классовый кэш для количества завершенных аренд (user_id -> count)
    # Обновляется при каждом вызове update_user_status_by_rentals
    _completed_rentals_cache: Dict[int, int] = {}
    
    def __init__(
        self,
        db: AsyncSession,
        user_repo: UserRepository,
        reservation_repo: ReservationRepository,
        rental_repo: RentalRepository
    ):
        self.db = db
        self.user_repo = user_repo
        self.reservation_repo = reservation_repo
        self.rental_repo = rental_repo
    
    async def update_user_status_by_rentals(self, user_id: int) -> UserStatus:
        """
        Автоматически обновляет статус пользователя на основе количества успешных аренд.
        
        Логика:
        - ≥7 завершенных аренд → "VIP"
        - ≥3 завершенных аренд → "Постоянный"
        - Иначе → "Новый" (если текущий статус не "Заблокирован" или "Персона НонГрата")
        
        ВАЖНО: Если статус был изменен вручную (status_changed_manually = True),
        автоматическое обновление не выполняется для сохранения приоритета ручного изменения.
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Новый статус пользователя (или текущий, если обновление не выполнено)
        """
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            logger.warning(f"Пользователь {user_id} не найден при обновлении статуса")
            return UserStatus.NEW
        
        # Проверяем, был ли статус изменен вручную
        if getattr(user, 'status_changed_manually', False):
            current_status = parse_user_status(user.status)
            logger.debug(f"Статус пользователя {user_id} был изменен вручную, автоматическое обновление пропущено (текущий статус: {current_status.value})")
            return current_status
        
        # Не изменяем статусы "Заблокирован" и "Персона НонГрата" автоматически
        current_status = parse_user_status(user.status)
        if current_status in [UserStatus.BLOCKED, UserStatus.PERSONA_NON_GRATA]:
            return current_status
        
        # Получаем количество завершенных аренд (с использованием кэша)
        completed_count = await self._get_user_completed_rentals_count(user_id)
        
        # Обновляем кэш
        self._completed_rentals_cache[user_id] = completed_count
        
        # Определяем новый статус
        if completed_count >= COMPLETED_RENTALS_FOR_VIP:
            new_status = UserStatus.VIP
        elif completed_count >= COMPLETED_RENTALS_FOR_REGULAR:
            new_status = UserStatus.REGULAR
        else:
            new_status = UserStatus.NEW
        
        # Обновляем статус, если он изменился
        if current_status != new_status:
            await self._update_user_status(user, new_status, manually=False)
            logger.info(f"Статус пользователя {user_id} изменен с '{current_status.value}' на '{new_status.value}' (завершено аренд: {completed_count})")
        
        return new_status
    
    async def check_and_block_on_overdue(self, user_id: int) -> bool:
        """
        Проверяет просроченные резервы и блокирует пользователя, если их ≥3.
        
        Просроченный резерв определяется как:
        - Резерв со статусом ACTIVE
        - start_date < сегодня (дата начала уже прошла)
        - rental is None (не был преобразован в аренду)
        
        ВАЖНО: Статус VIP не блокируется автоматически (имеет приоритет над автоматической блокировкой).
        Статус "Персона НонГрата" также не блокируется автоматически (устанавливается только вручную).
        
        Args:
            user_id: ID пользователя
            
        Returns:
            True, если пользователь был заблокирован, False - если нет
        """
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            logger.warning(f"Пользователь {user_id} не найден при проверке просроченных резервов")
            return False
        
        current_status = parse_user_status(user.status)
        
        # Не блокируем "Персона НонГрата" (этот статус устанавливается только вручную)
        if current_status == UserStatus.PERSONA_NON_GRATA:
            return False
        
        # Не блокируем VIP статус (VIP имеет приоритет над автоматической блокировкой)
        if current_status == UserStatus.VIP:
            logger.debug(f"Пользователь {user_id} со статусом VIP не будет заблокирован автоматически (VIP имеет приоритет)")
            return False
        
        # Получаем количество просроченных резервов
        overdue_count = await self._get_user_overdue_reservations_count(user_id)
        
        if overdue_count >= OVERDUE_RESERVATIONS_FOR_BLOCK:
            # Блокировка - принудительное действие, выполняется независимо от status_changed_manually
            # (но не для VIP и Persona Non Grata)
            await self._update_user_status(user, UserStatus.BLOCKED, manually=False)
            logger.warning(f"Пользователь {user_id} заблокирован автоматически из-за {overdue_count} просроченных резервов")
            return True
        
        return False
    
    async def can_manager_change_status(self, current_user: User, target_status: UserStatus) -> bool:
        """
        Проверяет, может ли менеджер изменить статус на указанный.
        
        Правила:
        - Администратор может изменять любой статус
        - Менеджер может изменять любой статус, кроме "Персона НонГрата"
        
        Args:
            current_user: Текущий пользователь (менеджер или админ)
            target_status: Целевой статус
            
        Returns:
            True, если изменение разрешено, False - если нет
        """
        if current_user.role == "admin":
            return True
        
        if current_user.role == "manager":
            # Менеджер не может устанавливать статус "Персона НонГрата"
            return target_status != UserStatus.PERSONA_NON_GRATA
        
        return False
    
    async def get_user_max_reservations(self, user: User) -> int:
        """
        Получает максимальное количество резервов для пользователя на основе его статуса.
        
        Args:
            user: Объект пользователя
            
        Returns:
            Максимальное количество резервов
        """
        user_status = parse_user_status(user.status)
        return MAX_RESERVATIONS_BY_STATUS.get(user_status, 0)
    
    async def can_user_edit_reservation(self, user: User, reservation_start_date: date) -> bool:
        """
        Проверяет, может ли пользователь редактировать резерв.
        
        Правила:
        - VIP: нет ограничений (кроме прошедших дат)
        - Постоянный: за 1 день до начала - только через менеджера
        - Новый: за 2 дня до начала - только через менеджера
        - Заблокирован: за 2 дня до начала - только через менеджера
        - Персона НонГрата: нельзя редактировать
        
        Args:
            user: Объект пользователя
            reservation_start_date: Дата начала резерва
            
        Returns:
            True, если пользователь может редактировать, False - если нет
        """
        user_status = parse_user_status(user.status)
        
        if user_status == UserStatus.PERSONA_NON_GRATA:
            return False
        
        # Прошедшие даты нельзя редактировать
        if reservation_start_date < date.today():
            return False
        
        restriction_days = EDIT_RESTRICTION_DAYS.get(user_status, 0)
        if restriction_days == 0:
            return True  # VIP - нет ограничений (кроме прошедших дат)
        
        days_until_start = (reservation_start_date - date.today()).days
        return days_until_start > restriction_days
    
    async def can_user_cancel_reservation(self, user: User, reservation_start_date: date) -> bool:
        """
        Проверяет, может ли пользователь отменить резерв.
        
        Использует те же правила, что и редактирование.
        
        Args:
            user: Объект пользователя
            reservation_start_date: Дата начала резерва
            
        Returns:
            True, если пользователь может отменить, False - если нет
        """
        return await self.can_user_edit_reservation(user, reservation_start_date)
    
    async def can_user_create_reservation(self, user: User) -> bool:
        """
        Проверяет, может ли пользователь создавать резервы.
        
        Правила:
        - "Персона НонГрата": нельзя создавать резервы
        - "Заблокирован": не может создавать сам (только менеджер)
        - Остальные: могут создавать (с учетом лимита)
        
        Args:
            user: Объект пользователя
            
        Returns:
            True, если пользователь может создавать резервы, False - если нет
        """
        user_status = parse_user_status(user.status)
        
        if user_status == UserStatus.PERSONA_NON_GRATA:
            return False
        
        if user_status == UserStatus.BLOCKED:
            return False  # Менеджер может создавать, но не сам пользователь
        
        return True
    
    async def can_user_receive_rental(self, user: User) -> bool:
        """
        Проверяет, может ли пользователь получать аренду.
        
        Правила:
        - "Персона НонГрата": нельзя выдавать в аренду даже менеджерам
        - Остальные: можно выдавать
        
        Args:
            user: Объект пользователя
            
        Returns:
            True, если можно выдавать аренду, False - если нет
        """
        user_status = parse_user_status(user.status)
        return user_status != UserStatus.PERSONA_NON_GRATA
    
    # Приватные методы
    
    async def _get_user_completed_rentals_count(self, user_id: int, use_cache: bool = True) -> int:
        """
        Получает количество завершенных аренд для пользователя.
        
        Args:
            user_id: ID пользователя
            use_cache: Использовать ли кэш (по умолчанию True)
            
        Returns:
            Количество завершенных аренд
        """
        # Проверяем кэш, если он включен и данные есть
        if use_cache and user_id in self._completed_rentals_cache:
            cached_count = self._completed_rentals_cache[user_id]
            logger.debug(f"Использован кэш для количества завершенных аренд пользователя {user_id}: {cached_count}")
            return cached_count
        
        # Запрашиваем из БД
        counts = await self.rental_repo.get_user_completed_rentals_count([user_id])
        count = counts.get(user_id, 0)
        
        # Обновляем кэш
        if use_cache:
            self._completed_rentals_cache[user_id] = count
        
        return count
    
    @classmethod
    def invalidate_cache(cls, user_id: int) -> None:
        """
        Инвалидирует кэш для пользователя.
        
        Вызывать после создания/возврата аренды для обновления кэша.
        
        Args:
            user_id: ID пользователя
        """
        if user_id in cls._completed_rentals_cache:
            del cls._completed_rentals_cache[user_id]
            logger.debug(f"Кэш количества завершенных аренд для пользователя {user_id} инвалидирован")
    
    @classmethod
    def clear_cache(cls) -> None:
        """Очищает весь кэш (для тестов или при необходимости)."""
        cls._completed_rentals_cache.clear()
        logger.debug("Кэш количества завершенных аренд очищен")
    
    async def _get_user_overdue_reservations_count(self, user_id: int) -> int:
        """
        Получает количество просроченных резервов для пользователя.
        
        Просроченный резерв:
        - status == ACTIVE
        - start_date < сегодня
        - rental is None
        """
        today = date.today()
        return await self.reservation_repo.count_overdue_reservations_by_user(user_id, today)
    
    async def _update_user_status(self, user: User, new_status: UserStatus, manually: bool = False) -> None:
        """
        Обновляет статус пользователя.
        
        Args:
            user: Объект пользователя
            new_status: Новый статус
            manually: True, если статус изменяется вручную (админом/менеджером), False - автоматически
        """
        await self.user_repo.update_user_status(user, new_status, manually=manually)

