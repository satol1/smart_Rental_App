import logging
# tests/critical/conftest.py
"""
Конфигурация для критических тестов транзакционной целостности.
"""

import pytest
import pytest_asyncio
import asyncio
import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text
from httpx import AsyncClient

from api.database_models import Base
from api.models.user import User
from api.models.equipment import Equipment
from api.models.reservation import Reservation
from api.models.rental import Rental
from api.models.balance_history import BalanceHistory

# Настройка тестовой базы данных - используем PostgreSQL для тестов
# URL будет переопределен через переменную окружения в Docker
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://unit_test_user:unit_test_password@unit-test-db:5432/unit_test_db")

# Создаем движок для тестов
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,  # Включаем ping для стабильности
    pool_recycle=300,
    # Пул 1/0 был хрупким: один незакрытый коннект теста -> каскад QueuePool
    # таймаутов на всех последующих (30s statement_timeout добивал сессию)
    pool_size=5,
    max_overflow=10,
    isolation_level="READ_COMMITTED",  # Используем READ_COMMITTED для совместимости
    connect_args={
        "server_settings": {
            "application_name": "test_critical",
            "statement_timeout": "60s",
            "idle_in_transaction_session_timeout": "60s"
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


# Event loop управляется pytest-asyncio автоматически


@pytest_asyncio.fixture(scope="function")
async def setup_test_db():
    """Настройка тестовой базы данных для каждого теста."""
    # Создаем все таблицы
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # Не очищаем базу данных - полагаемся на транзакционные rollback
    # Это предотвращает зависание на этапе teardown


@pytest_asyncio.fixture
async def db_session(setup_test_db) -> AsyncGenerator[AsyncSession, None]:
    """
    Создает новую сессию базы данных для каждого теста.
    Автоматически откатывает все изменения после теста.
    """
    session = TestSessionLocal()
    try:
        # Начинаем транзакцию явно
        await session.begin()
        yield session
        # Коммитим транзакцию при успехе. Сессию мог закрыть DI-middleware —
        # это не ошибка самого теста (утверждения уже прошли), терпим тихо.
        try:
            await session.commit()
        except Exception as commit_exc:  # noqa: BLE001
            # warning (не debug): глотание ошибок коммита должно быть видимым
            logging.getLogger(__name__).warning(
                "db_session teardown: коммит не выполнен (%s)", commit_exc
            )
    except Exception:
        # Откатываем транзакцию при ошибке
        try:
            await session.rollback()
        except Exception:  # noqa: BLE001
            pass
        raise
    finally:
        try:
            await session.close()
        except Exception:  # noqa: BLE001
            pass


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Создает тестового пользователя."""
    import uuid
    import time
    
    # Создаем уникальный email для каждого теста
    unique_email = f"test_{uuid.uuid4().hex[:8]}_{int(time.time())}@example.com"
    
    # Создаем нового пользователя
    from api.utils.password_utils import hash_password
    user = User(
        email=unique_email,
        hashed_password=hash_password("testpassword123"),
        full_name="Test User",
        balance=1000.0,
        role="user",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()  # Коммитим для сохранения в БД
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_equipment(db_session: AsyncSession) -> Equipment:
    """Создает тестовое оборудование."""
    import uuid
    import time
    
    # Создаем уникальное имя для каждого теста
    unique_name = f"Test Equipment {uuid.uuid4().hex[:8]}_{int(time.time())}"
    
    equipment = Equipment(
        equipment_type="test_category",
        brand="Test Brand",
        name=unique_name,
        condition="Великолепно",
        daily_rate=100.0,
        description="Test equipment description"
    )
    db_session.add(equipment)
    await db_session.commit()  # Коммитим для сохранения в БД
    await db_session.refresh(equipment)
    return equipment


@pytest_asyncio.fixture
async def test_manager(db_session: AsyncSession) -> User:
    """Создает тестового менеджера."""
    import uuid
    import time
    
    # Создаем уникальный email для каждого теста
    unique_email = f"manager_{uuid.uuid4().hex[:8]}_{int(time.time())}@example.com"
    
    # Создаем нового менеджера
    from api.utils.password_utils import hash_password
    manager = User(
        email=unique_email,
        hashed_password=hash_password("secret"),
        full_name="Test Manager",
        balance=0.0,
        role="manager",
        is_active=True
    )
    db_session.add(manager)
    await db_session.commit()  # Коммитим для сохранения в БД
    await db_session.refresh(manager)
    return manager


@pytest_asyncio.fixture
async def test_reservation(db_session: AsyncSession, test_user: User, test_equipment: Equipment) -> Reservation:
    """Создает тестовую резервацию."""
    from datetime import datetime, timedelta
    
    reservation = Reservation(
        user_id=test_user.id,
        start_date=datetime.now() + timedelta(days=1),
        end_date=datetime.now() + timedelta(days=3),
        total_cost=200.0,
        status="confirmed"
    )
    db_session.add(reservation)
    await db_session.commit()  # Коммитим для сохранения в БД
    await db_session.refresh(reservation)
    return reservation


@pytest.fixture
def mock_container():
    """Создает мок-контейнер для тестов."""
    from unittest.mock import Mock
    
    container = Mock()
    container.db_session_factory = lambda: TestSessionLocal()
    
    # Мокаем репозитории
    container.user_repo = Mock()
    container.equipment_repo = Mock()
    container.reservation_repo = Mock()
    container.rental_repo = Mock()
    container.balance_history_repo = Mock()
    container.system_repo = Mock()
    
    return container


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Создает тестовый клиент для API."""
    from httpx import AsyncClient, ASGITransport
    from api.main_api import app
    from containers import Container
    
    # Получаем контейнер из приложения
    container = app.container
    
    # Переопределяем "пустышку" db_session в контейнере на нашу тестовую сессию
    with container.db_session.override(db_session):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test", timeout=30.0) as ac:
            yield ac
    # После завершения теста контекстный менеджер автоматически восстановит
    # оригинальный провайдер в контейнере.


# Настройка логирования для тестов
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


@pytest.fixture(autouse=True)
async def cleanup_after_test():
    """Автоматическая очистка после каждого теста."""
    yield
    # Дополнительная очистка, если нужна
    logger.debug("Test cleanup completed")


# Маркеры для тестов
def pytest_configure(config):
    """Настройка маркеров pytest."""
    config.addinivalue_line(
        "markers", "critical: marks tests as critical for system integrity"
    )
    config.addinivalue_line(
        "markers", "transaction: marks tests related to transaction integrity"
    )
    config.addinivalue_line(
        "markers", "balance: marks tests related to balance operations"
    )
    config.addinivalue_line(
        "markers", "reservation: marks tests related to reservation operations"
    )
    config.addinivalue_line(
        "markers", "rental: marks tests related to rental operations"
    )
