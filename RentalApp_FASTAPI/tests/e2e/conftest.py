# tests/e2e/conftest.py
"""
Конфигурация для E2E тестов RentalApp_FASTAPI.
Содержит фикстуры для полного тестирования пользовательских сценариев.
"""

import pytest
import asyncio
from typing import AsyncGenerator, Generator, List
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from api.main_api import app
from api.database_models import Base
from containers import Container
from api.models.user import User
from api.models.equipment import Equipment
from api.models.accessory import Accessory
from api.models.promo_code import PromoCode
from api.models.holiday import Holiday
from api.models.rental import Rental
from api.models.reservation import Reservation
from api.models.balance_history import BalanceHistory
from api.models.association import Association
from api.models.discount import DurationDiscount
from api.models.pack import Pack
from api.models.rental import RentalAccessory, rental_equipment_association
from api.models.reservation import ReservationAccessory, reservation_equipment_association

# URL для E2E тестовой базы данных - используем PostgreSQL
import os
E2E_TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://unit_test_user:unit_test_password@unit-test-db:5432/unit_test_db")

# Создаем E2E тестовый движок с правильными настройками для изоляции
e2e_test_engine = create_async_engine(
    E2E_TEST_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=1,  # Уменьшаем размер пула для тестов
    max_overflow=0,  # Отключаем overflow для стабильности
    isolation_level="READ_COMMITTED",  # Используем READ_COMMITTED вместо AUTOCOMMIT
    connect_args={
        "server_settings": {
            "application_name": "e2e_tests",
        }
    }
)

# Создаем фабрику сессий для E2E тестов
E2ETestSessionLocal = async_sessionmaker(
    e2e_test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop():
    """Создает event loop для всех E2E тестов."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def setup_e2e_test_db():
    """Создает E2E тестовую базу данных и все таблицы."""
    # Создаем транзакцию для изоляции
    async with e2e_test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Очистка после всех тестов
    async with e2e_test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def e2e_db_session(setup_e2e_test_db) -> AsyncGenerator[AsyncSession, None]:
    """Создает сессию E2E базы данных для теста."""
    async with E2ETestSessionLocal() as session:
        # Не используем транзакционную изоляцию для E2E тестов
        # чтобы данные были видны между запросами
        yield session
        # Очищаем данные после теста
        await session.rollback()


@pytest.fixture
async def e2e_client(e2e_db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Создает HTTP клиент для E2E тестирования API."""
    # Создаем специальную версию приложения для E2E тестов
    # без DIContainerMiddleware, чтобы использовать одну сессию БД
    from api.main_api import app as original_app
    from fastapi import FastAPI
    from api.router import router as all_routes
    
    # Создаем новое приложение для E2E тестов
    e2e_app = FastAPI()
    
    # Копируем все middleware кроме DIContainerMiddleware
    for middleware in original_app.user_middleware:
        if middleware.cls.__name__ != "DIContainerMiddleware":
            e2e_app.add_middleware(middleware.cls, **middleware.kwargs)
    
    # Добавляем маршруты
    e2e_app.include_router(all_routes, prefix="/api")
    
    # Получаем контейнер из приложения
    container = original_app.container
    
    # Переопределяем "пустышку" db_session в контейнере на нашу тестовую сессию
    # и также переопределяем get_db_session в dependencies
    with container.db_session.override(e2e_db_session):
        # Переопределяем get_db_session в dependencies для E2E тестов
        import api.dependencies
        original_get_db_session = api.dependencies.get_db_session
        
        async def e2e_get_db_session():
            yield e2e_db_session
        
        api.dependencies.get_db_session = e2e_get_db_session
        
        try:
            from httpx import ASGITransport
            transport = ASGITransport(app=e2e_app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                yield ac
        finally:
            # Восстанавливаем оригинальную функцию
            api.dependencies.get_db_session = original_get_db_session


@pytest.fixture
def e2e_sync_client(e2e_db_session: AsyncSession) -> Generator[TestClient, None, None]:
    """Создает синхронный HTTP клиент для E2E тестирования API."""
    # Получаем контейнер из приложения
    container = app.container
    
    # Переопределяем "пустышку" db_session в контейнере на нашу тестовую сессию
    with container.db_session.override(e2e_db_session):
        with TestClient(app) as tc:
            yield tc
    # После завершения теста контекстный менеджер автоматически восстановит
    # оригинальный провайдер в контейнере.


async def cleanup_e2e_database(e2e_db_session: AsyncSession):
    """Очищает E2E базу данных от тестовых данных."""
    from sqlalchemy import text
    
    # Удаляем в правильном порядке из-за внешних ключей
    await e2e_db_session.execute(text("DELETE FROM rental_accessories"))
    await e2e_db_session.execute(text("DELETE FROM rental_equipment"))
    await e2e_db_session.execute(text("DELETE FROM reservation_accessories"))
    await e2e_db_session.execute(text("DELETE FROM reservation_equipment"))
    await e2e_db_session.execute(text("DELETE FROM balance_history"))
    await e2e_db_session.execute(text("DELETE FROM rentals"))
    await e2e_db_session.execute(text("DELETE FROM reservations"))
    await e2e_db_session.execute(text("DELETE FROM associations"))
    await e2e_db_session.execute(text("DELETE FROM duration_discounts"))
    await e2e_db_session.execute(text("DELETE FROM packs"))
    await e2e_db_session.execute(text("DELETE FROM holidays"))
    await e2e_db_session.execute(text("DELETE FROM promo_codes"))
    await e2e_db_session.execute(text("DELETE FROM accessories"))
    await e2e_db_session.execute(text("DELETE FROM equipment"))
    await e2e_db_session.execute(text("DELETE FROM users"))
    await e2e_db_session.commit()


@pytest.fixture
async def clean_e2e_db(e2e_db_session: AsyncSession):
    """Очищает E2E базу данных после каждого теста."""
    # НЕ очищаем данные перед тестом, чтобы не удалить пользователей из фикстур
    yield
    # Очищаем данные после теста
    await cleanup_e2e_database(e2e_db_session)


@pytest.fixture
async def e2e_test_user(e2e_db_session: AsyncSession) -> User:
    """Создает тестового пользователя для E2E тестов с балансом 5000."""
    user = User(
        email="e2e_user@example.com",
        full_name="E2E Test User",
        hashed_password="$2b$12$pYGV7rO0Ol8cP2BZaKXmT.IlCsVezgutAzCBWOBGYibI.B/4HJfYS",  # secret
        is_active=True,
        role="user",
        balance=5000.0  # Добавляем баланс для E2E тестов
    )
    e2e_db_session.add(user)
    await e2e_db_session.commit()  # Коммитим данные для E2E тестов
    await e2e_db_session.refresh(user)
    return user


@pytest.fixture
async def e2e_test_manager(e2e_db_session: AsyncSession) -> User:
    """Создает тестового менеджера для E2E тестов."""
    manager = User(
        email="e2e_manager@example.com",
        full_name="E2E Test Manager",
        hashed_password="$2b$12$pYGV7rO0Ol8cP2BZaKXmT.IlCsVezgutAzCBWOBGYibI.B/4HJfYS",  # secret
        is_active=True,
        role="manager"
    )
    e2e_db_session.add(manager)
    await e2e_db_session.commit()  # Коммитим данные для E2E тестов
    await e2e_db_session.refresh(manager)
    return manager


@pytest.fixture
async def e2e_test_admin(e2e_db_session: AsyncSession) -> User:
    """Создает главного админа для E2E тестов."""
    admin = User(
        email="admin@rentalapp.com",
        full_name="Main Admin",
        hashed_password="$2b$12$SPITPbrdbXAKtbQGhvOf5.ovgnoAn9mISn6M5xZsA8NUl2DDX8Iba",  # AdminRental2024!
        is_active=True,
        role="admin"
    )
    e2e_db_session.add(admin)
    await e2e_db_session.commit()  # Коммитим данные для E2E тестов
    await e2e_db_session.refresh(admin)
    return admin


@pytest.fixture
async def e2e_test_equipment_list(e2e_db_session: AsyncSession) -> List[Equipment]:
    """Создает список тестового оборудования для E2E тестов."""
    equipment_list = []
    
    for i in range(3):
        equipment = Equipment(
            name=f"E2E Test Equipment {i+1}",
            description=f"E2E test equipment {i+1} description",
            daily_rate=100.0 + (i * 50),
            equipment_type=f"test_category_{i+1}",
            brand="Test Brand",
            condition="Великолепно"
        )
        e2e_db_session.add(equipment)
        equipment_list.append(equipment)
    
    await e2e_db_session.commit()  # Коммитим данные для E2E тестов
    
    for equipment in equipment_list:
        await e2e_db_session.refresh(equipment)
    
    return equipment_list


@pytest.fixture
async def e2e_test_accessories(e2e_db_session: AsyncSession) -> List[Accessory]:
    """Создает список тестовых аксессуаров для E2E тестов."""
    accessories = []
    
    for i in range(3):  # Изменено с 2 на 3 для тестирования привязки аксессуаров к разному оборудованию
        accessory = Accessory(
            name=f"E2E Test Accessory {i+1}",
            description=f"E2E test accessory {i+1} description",
            price=25.0 + (i * 25),
            accessory_type="test_type"
        )
        e2e_db_session.add(accessory)
        accessories.append(accessory)
    
    await e2e_db_session.commit()  # Коммитим данные для E2E тестов
    
    for accessory in accessories:
        await e2e_db_session.refresh(accessory)
    
    return accessories


@pytest.fixture
async def e2e_test_promo_codes(e2e_db_session: AsyncSession) -> List[PromoCode]:
    """Создает список тестовых промо-кодов для E2E тестов."""
    promo_codes = []
    
    promo_code = PromoCode(
        code="E2E10",
        discount_percentage=10.0,
        is_active=True,
        times_used=0
    )
    e2e_db_session.add(promo_code)
    promo_codes.append(promo_code)
    
    await e2e_db_session.commit()  # Коммитим данные для E2E тестов
    
    for promo_code in promo_codes:
        await e2e_db_session.refresh(promo_code)
    
    return promo_codes


@pytest.fixture
async def e2e_auth_headers(e2e_client: AsyncClient, e2e_test_user: User) -> dict:
    """Создает заголовки авторизации для E2E тестового пользователя."""
    # Логинимся
    login_data = {
        "username": e2e_test_user.email,
        "password": "secret"
    }
    response = await e2e_client.post("/api/auth/token", data=login_data)
    
    # Отладочная информация
    print(f"Login response status: {response.status_code}")
    print(f"Login response text: {response.text}")
    
    if response.status_code != 200:
        raise Exception(f"Login failed: {response.status_code} - {response.text}")
    
    response_data = response.json()
    if "access_token" not in response_data:
        raise Exception(f"No access_token in response: {response_data}")
    
    token = response_data["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def e2e_manager_auth_headers(e2e_client: AsyncClient, e2e_test_manager: User) -> dict:
    """Создает заголовки авторизации для E2E тестового менеджера."""
    # Логинимся
    login_data = {
        "username": e2e_test_manager.email,
        "password": "secret"
    }
    response = await e2e_client.post("/api/auth/token", data=login_data)
    token = response.json()["access_token"]
    
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def e2e_admin_auth_headers(e2e_client: AsyncClient, e2e_test_admin: User) -> dict:
    """Создает заголовки авторизации для главного админа."""
    # Логинимся
    login_data = {
        "username": e2e_test_admin.email,
        "password": "AdminRental2024!"
    }
    response = await e2e_client.post("/api/auth/token", data=login_data)
    assert response.status_code == 200, f"Auth failed: {response.status_code} - {response.text}"
    token = response.json()["access_token"]
    
    return {"Authorization": f"Bearer {token}"}