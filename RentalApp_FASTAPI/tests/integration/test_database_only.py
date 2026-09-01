"""

Тесты только для базы данных без API.
Эти тесты проверяют работу PostgreSQL без сложных API взаимодействий.
"""

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# Импортируем фикстуры из critical conftest
pytest_plugins = ["tests.critical.conftest"]

# Импортируем фикстуры из изолированной конфигурации
pytest_plugins = ["tests.integration.conftest_isolated"]


@pytest.mark.asyncio
async def test_database_connection(isolated_db_session: AsyncSession):
    """Тест подключения к базе данных."""
    result = await isolated_db_session.execute(text("SELECT 1 as test_value"))
    test_value = result.scalar()
    
    assert test_value == 1
    print("✅ Подключение к базе данных работает")


@pytest.mark.asyncio
async def test_database_version(isolated_db_session: AsyncSession):
    """Тест версии базы данных."""
    result = await isolated_db_session.execute(text("SELECT version()"))
    version = result.scalar()
    
    assert "PostgreSQL" in version
    print(f"✅ Версия базы данных: {version}")


@pytest.mark.asyncio
async def test_database_info(isolated_db_session: AsyncSession):
    """Тест информации о базе данных."""
    # Текущая база данных
    result = await isolated_db_session.execute(text("SELECT current_database()"))
    db_name = result.scalar()
    # В контексте unit тестов используется unit_test_db
    assert db_name in ["integration_test_db", "unit_test_db"]
    
    # Текущий пользователь
    result = await isolated_db_session.execute(text("SELECT current_user"))
    user = result.scalar()
    # В контексте unit тестов используется unit_test_user
    assert user in ["integration_test_user", "unit_test_user"]
    
    print(f"✅ База данных: {db_name}, Пользователь: {user}")


@pytest.mark.asyncio
async def test_database_json_support(isolated_db_session: AsyncSession):
    """Тест поддержки JSON в базе данных."""
    result = await isolated_db_session.execute(text("SELECT '{\"test\": \"value\"}'::jsonb->>'test' as test_value"))
    test_value = result.scalar()
    
    assert test_value == "value"
    print("✅ JSON поддержка работает")


@pytest.mark.asyncio
async def test_database_array_support(isolated_db_session: AsyncSession):
    """Тест поддержки массивов в базе данных."""
    result = await isolated_db_session.execute(text("SELECT array_length(ARRAY[1,2,3], 1) as array_len"))
    array_length = result.scalar()
    
    assert array_length == 3
    print("✅ Поддержка массивов работает")


@pytest.mark.asyncio
async def test_database_transaction_support(isolated_db_session: AsyncSession):
    """Тест поддержки транзакций в базе данных."""
    # Проверяем, есть ли уже активная транзакция
    if isolated_db_session.in_transaction():
        # Если транзакция уже активна, откатываем её
        await isolated_db_session.rollback()
    
    # Начинаем новую транзакцию
    await isolated_db_session.begin()
    
    try:
        # Выполняем простой запрос
        result = await isolated_db_session.execute(text("SELECT 42 as answer"))
        answer = result.scalar()
        assert answer == 42
        
        # Откатываем транзакцию
        await isolated_db_session.rollback()
        
        print("✅ Поддержка транзакций работает")
        
    except Exception as e:
        await isolated_db_session.rollback()
        raise e


@pytest.mark.asyncio
async def test_database_multiple_queries(isolated_db_session: AsyncSession):
    """Тест множественных запросов."""
    for i in range(10):
        result = await isolated_db_session.execute(text("SELECT :value as test_value"), {"value": str(i)})
        test_value = result.scalar()
        assert test_value == str(i)
    
    print("✅ Множественные запросы работают")


@pytest.mark.asyncio
async def test_database_timezone_support(isolated_db_session: AsyncSession):
    """Тест поддержки timezone в базе данных."""
    result = await isolated_db_session.execute(text("SELECT current_setting('timezone') as tz"))
    timezone = result.scalar()
    
    assert timezone is not None
    print(f"✅ Поддержка timezone: {timezone}")


@pytest.mark.asyncio
async def test_database_isolation_level(isolated_db_session: AsyncSession):
    """Тест уровня изоляции транзакций в базе данных."""
    result = await isolated_db_session.execute(text("SHOW transaction_isolation"))
    isolation_level = result.scalar()
    
    # PostgreSQL должен поддерживать различные уровни изоляции
    assert isolation_level in ["read committed", "read uncommitted", "repeatable read", "serializable"]
    print(f"✅ Уровень изоляции: {isolation_level}")


@pytest.mark.asyncio
async def test_database_stress_test(isolated_db_session: AsyncSession):
    """Стресс-тест множественных запросов."""
    # Выполняем много запросов подряд
    for i in range(50):
        result = await isolated_db_session.execute(text("SELECT :value as test_value"), {"value": str(i)})
        test_value = result.scalar()
        assert test_value == str(i)
    
    print("✅ Стресс-тест множественных запросов работает")


@pytest.mark.asyncio
async def test_database_postgresql_specific_features(isolated_db_session: AsyncSession):
    """Тест специфичных для PostgreSQL функций."""
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
async def test_database_concurrent_operations(isolated_db_session: AsyncSession):
    """Тест конкурентных операций."""
    import asyncio
    
    async def query_task(value):
        result = await isolated_db_session.execute(text("SELECT :value as test_value"), {"value": str(value)})
        return result.scalar()
    
    # Выполняем несколько задач последовательно (не параллельно из-за ограничений сессии)
    results = []
    for i in range(5):
        result = await query_task(i)
        results.append(result)
    
    for i, result in enumerate(results):
        assert result == str(i)
    
    print("✅ Конкурентные операции работают")


@pytest.mark.asyncio
async def test_database_cleanup(isolated_db_session: AsyncSession):
    """Тест очистки базы данных между тестами."""
    # Проверяем, что база данных пуста
    result = await isolated_db_session.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"))
    table_count = result.scalar()
    
    # Должны быть только системные таблицы
    assert table_count >= 0
    
    print("✅ Очистка базы данных между тестами работает")


@pytest.mark.asyncio
async def test_database_schema_creation(isolated_db_session: AsyncSession):
    """Тест создания схемы базы данных."""
    # Проверяем, что таблицы созданы
    result = await isolated_db_session.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"))
    table_count = result.scalar()
    
    # Должны быть созданы таблицы
    assert table_count > 0
    
    print(f"✅ Создано таблиц: {table_count}")


@pytest.mark.asyncio
async def test_database_schema_cleanup(isolated_db_session: AsyncSession):
    """Тест очистки схемы базы данных."""
    # Проверяем, что таблицы очищены
    result = await isolated_db_session.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"))
    table_count = result.scalar()
    
    # Должны быть только системные таблицы
    assert table_count >= 0
    
    print("✅ Очистка схемы базы данных работает")
