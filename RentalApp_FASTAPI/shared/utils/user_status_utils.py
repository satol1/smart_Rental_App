# shared/utils/user_status_utils.py

"""
Утилиты для работы со статусами пользователей.
Предотвращает дублирование кода парсинга статусов.
"""

from typing import Optional
import logging

from shared.constants.user_status import UserStatus

logger = logging.getLogger(__name__)


def parse_user_status(status_str: Optional[str]) -> UserStatus:
    """
    Парсит статус пользователя из строки в UserStatus enum.
    
    Если статус некорректный или отсутствует, возвращает UserStatus.NEW по умолчанию.
    
    Args:
        status_str: Строка со статусом пользователя
        
    Returns:
        UserStatus enum с корректным статусом
        
    Example:
        >>> parse_user_status("VIP")
        UserStatus.VIP
        >>> parse_user_status("Некорректный статус")
        UserStatus.NEW
        >>> parse_user_status(None)
        UserStatus.NEW
    """
    if not status_str:
        return UserStatus.NEW
    
    try:
        return UserStatus(status_str)
    except ValueError:
        # Если статус не из enum, логируем и возвращаем NEW по умолчанию
        logger.warning(
            f"Некорректный статус пользователя: '{status_str}'. "
            f"Используется '{UserStatus.NEW.value}' по умолчанию."
        )
        return UserStatus.NEW

