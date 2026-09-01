"""
Полностью изолированная конфигурация для интеграционных тестов с PostgreSQL.
Эта конфигурация полностью избегает конфликтов с существующим conftest.py.
"""

import pytest
import pytest_asyncio
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text

from api.main_api import app
from api.database_models import Base
from containers import Container

# Настройка тестовой базы данных
import os
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://test_user:test_password@test-db:5432/test_db")


@pytest_asyncio.fixture(scope="function")
async def isolated_test_engine():
    """Создает полностью изолированный тестовый движок для каждого теста."""
    import uuid
    import time
    
    # Создаем уникальное имя для каждого теста
    test_id = f"test_{uuid.uuid4().hex[:8]}_{int(time.time())}"
    
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=1,
        max_overflow=0,
        # Используем READ COMMITTED для лучшей совместимости
        isolation_level="READ_COMMITTED",
        # Добавляем параметры для избежания конфликтов
        connect_args={
            "server_settings": {
                "application_name": f"test_isolated_{test_id}",
                "statement_timeout": "30s",
                "idle_in_transaction_session_timeout": "30s"
            }
        }
    )
    
    # Создаем таблицы
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Очищаем таблицы
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def isolated_db_session(isolated_test_engine):
    """Создает полностью изолированную тестовую сессию для каждого теста."""
    SessionLocal = async_sessionmaker(
        isolated_test_engine, 
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )
    
    # Создаем сессию с явным управлением транзакциями
    session = SessionLocal()
    try:
        # Начинаем транзакцию
        await session.begin()
        yield session
        # Коммитим транзакцию
        await session.commit()
    except Exception:
        # Откатываем транзакцию при ошибке
        await session.rollback()
        raise
    finally:
        # Закрываем сессию
        await session.close()


@pytest_asyncio.fixture(scope="function")
async def isolated_client(isolated_db_session: AsyncSession):
    """Создает полностью изолированный тестовый клиент для каждого теста."""
    # Получаем контейнер из приложения
    container = app.container
    
    # Переопределяем "пустышку" db_session в контейнере на нашу тестовую сессию
    with container.db_session.override(isolated_db_session):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
    # После завершения теста контекстный менеджер автоматически восстановит
    # оригинальный провайдер в контейнере.


@pytest_asyncio.fixture(scope="function")
async def isolated_clean_db():
    """Фикстура для совместимости."""
    pass


@pytest_asyncio.fixture(scope="function")
async def isolated_setup_test_db():
    """Фикстура для совместимости."""
    pass
