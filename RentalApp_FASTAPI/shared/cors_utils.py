"""
Утилиты для работы с CORS настройками.
Функции для парсинга, валидации и преобразования CORS конфигурации.
"""

import re
from typing import List
from urllib.parse import urlparse


def parse_cors_origins(origins_str: str) -> List[str]:
    """
    Парсит строку источников CORS через запятую.
    
    Args:
        origins_str: Строка источников через запятую (например, "http://localhost:5173,https://example.com")
    
    Returns:
        Список источников без пробелов
    
    Raises:
        ValueError: Если строка пустая или содержит только пробелы
    """
    if not origins_str or not origins_str.strip():
        raise ValueError("CORS_ORIGINS не может быть пустым")
    
    # Разделяем по запятой и убираем пробелы
    origins = [origin.strip() for origin in origins_str.split(",")]
    # Фильтруем пустые строки
    origins = [origin for origin in origins if origin]
    
    if not origins:
        raise ValueError("CORS_ORIGINS должен содержать хотя бы один источник")
    
    return origins


def validate_cors_origin(origin: str, debug: bool = True) -> bool:
    """
    Валидирует формат CORS источника.
    
    Args:
        origin: URL источника (например, "http://localhost:5173")
        debug: Флаг режима отладки (если False, требует HTTPS)
    
    Returns:
        True если валидный, False если невалидный
    
    Raises:
        ValueError: Если источник невалидный
    """
    if not origin or not origin.strip():
        raise ValueError("Источник не может быть пустым")

    # Wildcard проверяем до urlparse: у "*" нет схемы, и парсер упал бы
    # на более ранней проверке протокола, не дойдя до этого сообщения
    if origin == "*":
        raise ValueError("Wildcard '*' разрешен только через CORS_ALLOW_WILDCARD=True")

    try:
        parsed = urlparse(origin)

        # Проверяем наличие схемы (http/https: urlparse трактует "localhost:5173"
        # как scheme="localhost", поэтому явно ограничиваем допустимые схемы)
        if parsed.scheme not in ("http", "https"):
            raise ValueError(f"Источник '{origin}' должен содержать протокол (http:// или https://)")

        # В production режиме требуем HTTPS (кроме localhost)
        if not debug and parsed.scheme != "https":
            # Разрешаем HTTP только для localhost в любом режиме
            if "localhost" not in parsed.netloc.lower() and "127.0.0.1" not in parsed.netloc:
                raise ValueError(
                    f"В production режиме источники должны использовать HTTPS. "
                    f"Источник '{origin}' использует {parsed.scheme}"
                )

        # Проверяем наличие netloc (домена)
        if not parsed.netloc:
            raise ValueError(f"Источник '{origin}' должен содержать домен")

        return True

    except Exception as e:
        if isinstance(e, ValueError):
            raise
        raise ValueError(f"Ошибка парсинга источника '{origin}': {str(e)}")


def parse_cors_list(list_str: str) -> List[str]:
    """
    Универсальная функция для парсинга списков через запятую (методы, заголовки).
    
    Args:
        list_str: Строка значений через запятую (например, "GET,POST,PUT")
    
    Returns:
        Список значений без пробелов
    
    Raises:
        ValueError: Если строка пустая
    """
    if not list_str or not list_str.strip():
        raise ValueError("Список не может быть пустым")
    
    # Разделяем по запятой и убираем пробелы
    items = [item.strip().upper() for item in list_str.split(",")]
    # Фильтруем пустые строки
    items = [item for item in items if item]
    
    if not items:
        raise ValueError("Список должен содержать хотя бы один элемент")
    
    return items


def get_cors_config(settings) -> dict:
    """
    Возвращает конфигурацию для CORSMiddleware на основе настроек.
    
    Args:
        settings: Экземпляр Settings с CORS настройками
    
    Returns:
        Словарь конфигурации для CORSMiddleware
    
    Raises:
        ValueError: Если настройки невалидны
    """
    # Импортируем Settings здесь для избежания циклических зависимостей
    from config.core import Settings as SettingsType
    import logging
    logger = logging.getLogger(__name__)
    
    # Предупреждение о wildcard в production
    if settings.CORS_ALLOW_WILDCARD and not settings.DEBUG:
        logger.warning(
            "⚠️ БЕЗОПАСНОСТЬ: CORS_ALLOW_WILDCARD=True в production режиме! "
            "Это создает серьезную уязвимость безопасности."
        )
    
    config = {}
    
    # Обработка источников
    if settings.CORS_ALLOW_WILDCARD and settings.DEBUG:
        # В dev режиме с wildcard разрешаем все источники
        logger.info("🔓 CORS: Wildcard режим включен (только для dev)")
        config["allow_origins"] = ["*"]
    else:
        # Парсим и валидируем источники
        origins = parse_cors_origins(settings.CORS_ORIGINS)
        validated_origins = []
        for origin in origins:
            validate_cors_origin(origin, settings.DEBUG)
            validated_origins.append(origin)
        config["allow_origins"] = validated_origins
    
    # Credentials
    config["allow_credentials"] = settings.CORS_ALLOW_CREDENTIALS
    
    # Методы
    if settings.CORS_ALLOW_WILDCARD and settings.DEBUG:
        config["allow_methods"] = ["*"]
    else:
        methods = parse_cors_list(settings.CORS_ALLOW_METHODS)
        config["allow_methods"] = methods
    
    # Заголовки
    if settings.CORS_ALLOW_WILDCARD and settings.DEBUG:
        config["allow_headers"] = ["*"]
    else:
        headers = parse_cors_list(settings.CORS_ALLOW_HEADERS)
        # Всегда добавляем X-CSRF-Token если его нет
        if "X-CSRF-TOKEN" not in headers:
            headers.append("X-CSRF-TOKEN")
        config["allow_headers"] = headers
    
    # Expose headers
    if settings.CORS_EXPOSE_HEADERS:
        expose_headers = parse_cors_list(settings.CORS_EXPOSE_HEADERS)
        config["expose_headers"] = expose_headers
    else:
        config["expose_headers"] = []
    
    # Max age
    config["max_age"] = settings.CORS_MAX_AGE
    
    return config

