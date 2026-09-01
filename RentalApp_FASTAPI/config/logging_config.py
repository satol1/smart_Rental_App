# config/logging_config.py

"""
Конфигурация логирования для проекта аренды фототехники.
"""

import logging
import os
from pathlib import Path
from config.core import settings

# Создаем директорию для логов если она не существует
log_file_path = settings.LOG_FILE
log_file_path.parent.mkdir(parents=True, exist_ok=True)

# Базовая настройка логирования
handlers = [logging.StreamHandler()]

# Добавляем файловый хендлер только если файл может быть создан
try:
    # Проверяем, можем ли мы создать файл
    if not log_file_path.exists():
        log_file_path.touch()
    handlers.append(logging.FileHandler(log_file_path, encoding="utf-8"))
except (OSError, PermissionError):
    # Если не можем создать файл, используем только консоль
    pass

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.WARNING,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    handlers=handlers
)

# Отключение ненужных логов
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("TelegramService").setLevel(logging.DEBUG)

# Включение логов для SQLAlchemy (SQL-запросы) и EquipmentService
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("EquipmentService").setLevel(logging.WARNING)
logging.getLogger("BaseManager").setLevel(logging.WARNING)
logging.getLogger("EquipmentManager").setLevel(logging.WARNING)
logging.getLogger("AvailabilityChecker").setLevel(logging.DEBUG)
logging.getLogger("matplotlib").setLevel(logging.WARNING)

# Настройка логирования для наших модулей диагностики
logging.getLogger("api.calendar_api").setLevel(logging.DEBUG)
logging.getLogger("api.services.availability.statuses").setLevel(logging.DEBUG)
logging.getLogger("api.services.availability.base").setLevel(logging.DEBUG)
logging.getLogger("api.services.availability.conflicts").setLevel(logging.DEBUG)


