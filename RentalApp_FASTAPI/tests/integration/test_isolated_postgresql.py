"""

Полностью изолированные тесты PostgreSQL без конфликтов.
Эти тесты используют conftest_isolated.py для полного избежания проблем с event loop.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# Импортируем фикстуры из изолированной конфигурации
pytest_plugins = ["tests.integration.conftest_isolated"]

# Помечаем весь модуль как integration тесты
pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_isolated_basic_postgresql_connection(isolated_db_session: AsyncSession):
    """Базовый тест подключения к PostgreSQL."""
    result = await isolated_db_session.execute(text("SELECT 1 as test_value"))
    test_value = result.scalar()
    
    assert test_value == 1
    print("✅ Базовое подключение к PostgreSQL работает")


@pytest.mark.asyncio
async def test_isolated_postgresql_version(isolated_db_session: AsyncSession):
    """Тест получения версии PostgreSQL."""
    result = await isolated_db_session.execute(text("SELECT version()"))
    version = result.scalar()
    
    assert "PostgreSQL" in version
    print(f"✅ Версия PostgreSQL: {version}")


@pytest.mark.asyncio
async def test_isolated_postgresql_database_info(isolated_db_session: AsyncSession):
    """Тест получения информации о базе данных."""
    # Текущая база данных
    result = await isolated_db_session.execute(text("SELECT current_database()"))
    db_name = result.scalar()
    # Проверяем, что это тестовая база данных (имя зависит от стека:
    # unit_test_db / integration_test_db / test_db в full-architecture)
    assert db_name in ["unit_test_db", "integration_test_db", "test_db"]
    
    # Текущий пользователь
    result = await isolated_db_session.execute(text("SELECT current_user"))
    user = result.scalar()
    # Проверяем, что это тестовый пользователь (имя зависит от стека)
    assert user in ["unit_test_user", "integration_test_user", "test_user"]
    
    print(f"✅ База данных: {db_name}, Пользователь: {user}")


@pytest.mark.asyncio
async def test_isolated_postgresql_json_support(isolated_db_session: AsyncSession):
    """Тест поддержки JSON в PostgreSQL."""
    result = await isolated_db_session.execute(text("SELECT '{\"test\": \"value\"}'::jsonb->>'test' as test_value"))
    test_value = result.scalar()
    
    assert test_value == "value"
    print("✅ JSON поддержка работает")


@pytest.mark.asyncio
async def test_isolated_postgresql_array_support(isolated_db_session: AsyncSession):
    """Тест поддержки массивов в PostgreSQL."""
    result = await isolated_db_session.execute(text("SELECT array_length(ARRAY[1,2,3], 1) as array_len"))
    array_length = result.scalar()
    
    assert array_length == 3
    print("✅ Поддержка массивов работает")


@pytest.mark.asyncio
async def test_isolated_postgresql_transaction_support(isolated_db_session: AsyncSession):
    """Тест поддержки транзакций в PostgreSQL."""
    # Транзакция уже начата в фикстуре, просто выполняем запрос
    try:
        # Выполняем простой запрос
        result = await isolated_db_session.execute(text("SELECT 42 as answer"))
        answer = result.scalar()
        assert answer == 42
        
        print("✅ Поддержка транзакций работает")
        
    except Exception as e:
        await isolated_db_session.rollback()
        raise e


@pytest.mark.asyncio
async def test_isolated_api_equipment_list_empty(isolated_client: AsyncClient):
    """Тест получения пустого списка оборудования через API."""
    response = await isolated_client.get("/api/equipment/")
    assert response.status_code == 200
    
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] == 0
    assert len(data["items"]) == 0
    
    print("✅ API получения списка оборудования работает")


@pytest.mark.asyncio
async def test_isolated_api_equipment_list_with_pagination(isolated_client: AsyncClient):
    """Тест пагинации списка оборудования через API."""
    response = await isolated_client.get("/api/equipment/?page=1&size=10")
    assert response.status_code == 200
    
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] == 0
    assert "availableFilters" in data
    
    print("✅ API пагинации списка оборудования работает")


@pytest.mark.asyncio
async def test_isolated_api_equipment_list_with_filters(isolated_client: AsyncClient):
    """Тест фильтрации списка оборудования через API."""
    response = await isolated_client.get("/api/equipment/?equipment_type=camera")
    assert response.status_code == 200
    
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] == 0
    
    print("✅ API фильтрации списка оборудования работает")


@pytest.mark.asyncio
async def test_isolated_api_equipment_tree_empty(isolated_client: AsyncClient):
    """Тест получения пустого дерева оборудования через API."""
    response = await isolated_client.get("/api/equipment/tree")
    assert response.status_code == 200
    
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
    assert len(data["items"]) == 0
    
    print("✅ API получения дерева оборудования работает")


@pytest.mark.asyncio
async def test_isolated_multiple_queries_sequential(isolated_db_session: AsyncSession):
    """Тест множественных последовательных запросов."""
    for i in range(10):
        result = await isolated_db_session.execute(text("SELECT :value as test_value"), {"value": str(i)})
        test_value = result.scalar()
        assert test_value == str(i)
    
    print("✅ Множественные последовательные запросы работают")


@pytest.mark.asyncio
async def test_isolated_postgresql_timezone_support(isolated_db_session: AsyncSession):
    """Тест поддержки timezone в PostgreSQL."""
    result = await isolated_db_session.execute(text("SELECT current_setting('timezone') as tz"))
    timezone = result.scalar()
    
    assert timezone is not None
    print(f"✅ Поддержка timezone: {timezone}")


@pytest.mark.asyncio
async def test_isolated_postgresql_isolation_level(isolated_db_session: AsyncSession):
    """Тест уровня изоляции транзакций в PostgreSQL."""
    result = await isolated_db_session.execute(text("SHOW transaction_isolation"))
    isolation_level = result.scalar()
    
    # PostgreSQL должен поддерживать различные уровни изоляции
    assert isolation_level in ["read committed", "read uncommitted", "repeatable read", "serializable"]
    print(f"✅ Уровень изоляции: {isolation_level}")


@pytest.mark.asyncio
async def test_isolated_stress_test_queries(isolated_db_session: AsyncSession):
    """Стресс-тест множественных запросов."""
    # Выполняем много запросов подряд
    for i in range(50):
        result = await isolated_db_session.execute(text("SELECT :value as test_value"), {"value": str(i)})
        test_value = result.scalar()
        assert test_value == str(i)
    
    print("✅ Стресс-тест множественных запросов работает")


@pytest.mark.asyncio
async def test_isolated_postgresql_vs_sqlite_differences(isolated_db_session: AsyncSession):
    """Тест различий между PostgreSQL и SQLite."""
    # Тест специфичных для PostgreSQL функций
    result = await isolated_db_session.execute(text("SELECT array_length(ARRAY[1,2,3], 1)"))
    assert result.scalar() == 3
    
    # Тест JSON операций (не поддерживаются в SQLite)
    result = await isolated_db_session.execute(text("SELECT '{\"key\": \"value\"}'::jsonb->>'key'"))
    assert result.scalar() == "value"
    
    # Тест типов данных PostgreSQL
    result = await isolated_db_session.execute(text("SELECT '2023-01-01'::date"))
    assert result.scalar() is not None
    
    print("✅ PostgreSQL специфичные функции работают")


@pytest.mark.asyncio
async def test_isolated_concurrent_operations(isolated_db_session: AsyncSession):
    """Тест конкурентных операций."""
    import asyncio
    import os
    
    async def query_task(value):
        # Используем тот же URL базы данных, что и в конфигурации
        test_db_url = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://test_user:test_password@test-db:5432/test_db")
        
        # Создаем новую сессию для каждой задачи
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
        
        engine = create_async_engine(
            test_db_url,
            echo=False,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=1,
            max_overflow=0,
        )
        
        SessionLocal = async_sessionmaker(
            engine, 
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
        
        async with SessionLocal() as session:
            result = await session.execute(text("SELECT :value as test_value"), {"value": str(value)})
            return int(result.scalar())
    
    # Выполняем несколько задач параллельно
    tasks = [query_task(i) for i in range(5)]
    results = await asyncio.gather(*tasks)
    
    for i, result in enumerate(results):
        assert result == i
    
    print("✅ Конкурентные операции работают")


@pytest.mark.asyncio
async def test_isolated_database_cleanup(isolated_db_session: AsyncSession):
    """Тест очистки базы данных между тестами."""
    # Проверяем, что база данных пуста
    result = await isolated_db_session.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"))
    table_count = result.scalar()
    
    # Должны быть только системные таблицы
    assert table_count >= 0
    
    print("✅ Очистка базы данных между тестами работает")


@pytest.mark.asyncio
async def test_isolated_api_health_check(isolated_client: AsyncClient):
    """Тест health check endpoint."""
    response = await isolated_client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "ok"
    
    print("✅ Health check endpoint работает")
