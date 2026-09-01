# tests/integration/conftest.py

import pytest
import pytest_asyncio
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import text

from api.main_api import app
from api.database_models import Base
from containers import Container
from api.models.user import User
from api.models.equipment import Equipment
from api.models.accessory import Accessory
from api.models.promo_code import PromoCode


# Настройка тестовой базы данных - используем PostgreSQL для тестов
# URL будет переопределен через переменную окружения в Docker
import os
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://unit_test_user:unit_test_password@unit-test-db:5432/unit_test_db")

# Создаем движок для тестов с правильными настройками для изоляции
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,  # Включаем ping для стабильности
    pool_recycle=300,
    pool_size=1,
    max_overflow=0,
    isolation_level="READ_COMMITTED",  # Используем READ_COMMITTED вместо AUTOCOMMIT
    connect_args={
        "server_settings": {
            "application_name": "integration_tests",
            "statement_timeout": "30s",  # Таймаут для запросов
            "idle_in_transaction_session_timeout": "10s"  # Таймаут для idle транзакций
        }
    }
)

# Создаем фабрику сессий для тестов
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=True,
)


@pytest_asyncio.fixture(scope="function")
async def setup_test_db():
    """Настройка тестовой базы данных для каждого теста."""
    # Создаем все таблицы
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # Очищаем все таблицы после теста
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session(setup_test_db) -> AsyncGenerator[AsyncSession, None]:
    """Создает сессию базы данных для теста."""
    async with TestSessionLocal() as session:
        # Не используем транзакционную изоляцию для integration тестов
        # чтобы избежать конфликтов с конкурентным доступом
        try:
            yield session
        finally:
            # Очищаем данные после теста
            await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Создает HTTP клиент для тестирования API."""
    # Получаем контейнер из приложения
    container = app.container
    
    # Переопределяем "пустышку" db_session в контейнере на нашу тестовую сессию
    with container.db_session.override(db_session):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
    # После завершения теста контекстный менеджер автоматически восстановит
    # оригинальный провайдер в контейнере.


@pytest_asyncio.fixture
async def clean_db():
    """Фикстура для совместимости - база данных уже очищается в setup_test_db."""
    # База данных уже очищается в setup_test_db, эта фикстура нужна только для совместимости
    pass


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Создает тестового пользователя."""
    user = User(
        email="test@example.com",
        full_name="Test User",
        hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # secret
        is_active=True,
        role="user"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_manager(db_session: AsyncSession) -> User:
    """Создает тестового менеджера."""
    manager = User(
        email="manager@example.com",
        full_name="Test Manager",
        hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # secret
        is_active=True,
        role="manager"
    )
    db_session.add(manager)
    await db_session.commit()
    await db_session.refresh(manager)
    return manager


@pytest_asyncio.fixture
async def test_equipment(db_session: AsyncSession) -> Equipment:
    """Создает тестовое оборудование."""
    equipment = Equipment(
        equipment_type="test_category",
        brand="Test Brand",
        name="Test Equipment",
        condition="Великолепно",
        daily_rate=100.0,
        description="Test equipment description"
    )
    db_session.add(equipment)
    await db_session.commit()
    await db_session.refresh(equipment)
    return equipment


@pytest_asyncio.fixture
async def test_accessory(db_session: AsyncSession) -> Accessory:
    """Создает тестовый аксессуар."""
    accessory = Accessory(
        name="Test Accessory",
        accessory_type="Test Type",
        price=50.0,
        description="Test accessory description"
    )
    db_session.add(accessory)
    await db_session.commit()
    await db_session.refresh(accessory)
    return accessory


@pytest_asyncio.fixture
async def test_promo_code(db_session: AsyncSession) -> PromoCode:
    """Создает тестовый промокод."""
    promo_code = PromoCode(
        code="TEST10",
        description="Test promo code",
        discount_percentage=10.0,
        is_active=True,
        times_used=0
    )
    db_session.add(promo_code)
    await db_session.commit()
    await db_session.refresh(promo_code)
    return promo_code


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, test_user: User) -> dict:
    """Создает заголовки авторизации для тестового пользователя."""
    # Логинимся как тестовый пользователь
    login_data = {
        "username": test_user.email,
        "password": "secret"
    }
    response = await client.post("/api/auth/token", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def manager_auth_headers(client: AsyncClient, test_manager: User) -> dict:
    """Создает заголовки авторизации для тестового менеджера."""
    # Логинимся как тестовый менеджер
    login_data = {
        "username": test_manager.email,
        "password": "secret"
    }
    response = await client.post("/api/auth/token", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def user_auth_headers(client: AsyncClient, test_user: User) -> dict:
    """Создает заголовки авторизации для тестового пользователя."""
    # Логинимся как тестовый пользователь
    login_data = {
        "username": test_user.email,
        "password": "secret"
    }
    response = await client.post("/api/auth/token", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}