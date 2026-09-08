"""
Фикстуры для автоматического создания тестовой базы данных.
"""

import asyncio
import pytest
import subprocess
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

@pytest.fixture(scope="session", autouse=True)
def create_test_database():
    """Автоматически создает тестовую базу данных перед запуском тестов.

    Работает только внутри docker-окружения (каталог /app существует).
    Локально (Windows/macOS без контейнера) тестовая БД недоступна,
    поэтому создание пропускается — mock-тесты в ней не нуждаются.
    """
    from pathlib import Path

    if not Path("/app").exists():
        print("\n⚙️ Локальное окружение (нет /app) — создание тестовой БД пропущено")
        yield
        return

    # URL тестовой базы данных
    database_url = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://unit_test_user:unit_test_password@unit-test-db:5432/unit_test_db")

    print(f"\n🔧 Создание тестовой базы данных...")
    
    try:
        # Создаем тестовую базу данных через наш скрипт
        result = subprocess.run(
            ["python", "create_test_database.py"],
            capture_output=True,
            text=True,
            cwd="/app"
        )
        
        if result.returncode == 0:
            print("✅ Тестовая база данных успешно создана")
            print(f"Вывод скрипта: {result.stdout}")
        else:
            print(f"❌ Ошибка создания тестовой базы данных: {result.stderr}")
            raise Exception(f"Не удалось создать тестовую базу данных: {result.stderr}")
        
        # Проверяем, какие таблицы созданы
        async def check_tables():
            engine = create_async_engine(database_url, echo=False)
            async with engine.begin() as conn:
                result = await conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    ORDER BY table_name
                """))
                tables = [row[0] for row in result.fetchall()]
                
                print(f"📋 Созданные таблицы ({len(tables)}):")
                for table in tables:
                    print(f"  - {table}")
                
                # Проверяем ключевые таблицы
                required_tables = [
                    "users", "equipment", "packs", "brand_systems", 
                    "reservations", "rentals", "accessories", "associations",
                    "balance_history", "duration_discounts", "holidays", "payments",
                    "promo_codes", "settings"
                ]
                missing_tables = [table for table in required_tables if table not in tables]
                
                if missing_tables:
                    print(f"⚠️  Отсутствующие таблицы: {missing_tables}")
                    raise Exception(f"Отсутствуют ключевые таблицы: {missing_tables}")
                else:
                    print("✅ Все ключевые таблицы присутствуют")
            
            await engine.dispose()
        
        # Запускаем проверку таблиц
        asyncio.run(check_tables())

    except Exception as e:
        print(f"❌ Ошибка при создании тестовой базы данных: {e}")
        raise

    # Обязательный yield: без него pytest-asyncio падает на setup каждого теста
    # с "create_test_database did not yield a value" (в docker-ветке его не было)
    yield

@pytest.fixture(scope="function")
async def clean_database():
    """Очищает базу данных после каждого теста."""
    yield
    
    # Очистка базы данных после теста
    database_url = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://unit_test_user:unit_test_password@unit-test-db:5432/unit_test_db")
    
    try:
        engine = create_async_engine(database_url, echo=False)
        async with engine.begin() as conn:
            # Очищаем все таблицы в правильном порядке (с учетом внешних ключей)
            tables_to_clean = [
                "rentals", "reservations", "equipment_packs", "equipment", 
                "packs", "brand_systems", "users", "balance_history"
            ]
            
            for table in tables_to_clean:
                try:
                    await conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
                except Exception:
                    # Игнорируем ошибки, если таблица не существует
                    pass
        
        await engine.dispose()
        
    except Exception as e:
        print(f"⚠️  Ошибка при очистке базы данных: {e}")
