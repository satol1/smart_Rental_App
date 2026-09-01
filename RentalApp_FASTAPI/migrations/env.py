# migrations/env.py

import sys
import os
from logging.config import fileConfig
import asyncio

from sqlalchemy import engine_from_config, pool
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# 1. Добавляем путь к корневой папке проекта
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# 2. Указываем Alembic на базовый класс моделей
from api.database_models import Base

# 3. Импортируем ВСЕ АКТУАЛЬНЫЕ модели
# +++ ДОБАВЬТЕ balance_history В ЭТОТ СПИСОК +++
from api.models import user, equipment, reservation, rental, accessory, payment, promo_code, holiday, discount, association, balance_history, pack

# 4. Передаем метаданные ваших моделей в Alembic
target_metadata = Base.metadata

# This is the Alembic Config object...
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    # Конвертируем асинхронный URL в синхронный для offline режима
    if url and "postgresql+asyncpg://" in url:
        url = url.replace("postgresql+asyncpg://", "postgresql://")
    
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    """Выполняет миграции с переданным соединением."""
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    """Выполняет миграции в асинхронном режиме."""
    # Сначала пытаемся получить URL из переменных окружения
    url = os.getenv("DATABASE_URL")
    if not url:
        # Fallback к конфигурации alembic.ini
        url = config.get_main_option("sqlalchemy.url")
    
    if url and "postgresql+asyncpg://" in url:
        # Используем асинхронный движок
        connectable = create_async_engine(url)
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)
    else:
        # Fallback к синхронному режиму
        connectable = engine_from_config(
            config.get_section(config.config_ini_section, {}),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )
        with connectable.connect() as connection:
            do_run_migrations(connection)


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Сначала пытаемся получить URL из переменных окружения
    url = os.getenv("DATABASE_URL")
    if not url:
        # Fallback к конфигурации alembic.ini
        url = config.get_main_option("sqlalchemy.url")
    
    if url and "postgresql+asyncpg://" in url:
        # Запускаем асинхронные миграции
        asyncio.run(run_async_migrations())
    else:
        # Fallback к синхронному режиму
        connectable = engine_from_config(
            config.get_section(config.config_ini_section, {}),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )
        with connectable.connect() as connection:
            do_run_migrations(connection)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()