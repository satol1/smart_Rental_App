# shared/constants/user_status.py

"""
Централизованные константы для статусов пользователей с градацией прав.
Обеспечивает синхронизацию между бэкендом и фронтендом.
"""

from enum import Enum


class UserStatus(str, Enum):
    """Статусы пользователей с градацией прав."""
    NEW = "Новый"
    REGULAR = "Постоянный"
    VIP = "VIP"
    BLOCKED = "Заблокирован"
    PERSONA_NON_GRATA = "Персона НонГрата"


# Пороги для автоматического изменения статусов
COMPLETED_RENTALS_FOR_REGULAR = 3
COMPLETED_RENTALS_FOR_VIP = 7
OVERDUE_RESERVATIONS_FOR_BLOCK = 3

# Лимиты на количество резервов по статусам
MAX_RESERVATIONS_BY_STATUS = {
    UserStatus.NEW: 2,
    UserStatus.REGULAR: 5,
    UserStatus.VIP: 10,
    UserStatus.BLOCKED: 0,  # Не может создавать сам
    UserStatus.PERSONA_NON_GRATA: 0
}

# Ограничения на редактирование/отмену (дни до начала)
EDIT_RESTRICTION_DAYS = {
    UserStatus.NEW: 2,
    UserStatus.REGULAR: 1,
    UserStatus.VIP: 0,  # Нет ограничений
    UserStatus.BLOCKED: 2,  # Если менеджер создает резерв
    UserStatus.PERSONA_NON_GRATA: 999  # Нельзя редактировать
}

# Grace-период после создания резерва: в течение этого времени пользователь
# может отменить/отредактировать резерв независимо от ограничения по дням
# до начала (защита от ошибки с датами сразу после оформления).
RESERVATION_GRACE_PERIOD_HOURS = 24

