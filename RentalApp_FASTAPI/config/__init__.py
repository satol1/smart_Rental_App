# config/__init__.py

"""
Пакет конфигурации проекта аренды фототехники.
Импортирует централизованные настройки и конфигурацию логирования.
"""

# Инициализация логирования сразу при импорте config
from config import logging_config

# Экспорт централизованных настроек
from config.core import settings

__all__ = ["settings", "logging_config"]