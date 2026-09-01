#!/usr/bin/env python3
"""
Скрипт для применения миграций в тестовой базе данных.
"""

import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import subprocess

async def apply_migrations():
    """Применяет миграции к тестовой базе данных."""
    
    # URL тестовой базы данных
    database_url = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://unit_test_user:unit_test_password@unit-test-db:5432/unit_test_db")
    
    print(f"🔧 Применение миграций к базе данных: {database_url}")
    
    try:
        # Создаем подключение к базе данных
        engine = create_async_engine(database_url, echo=False)
        
        # Проверяем подключение
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✅ Подключение к PostgreSQL: {version}")
        
        # Применяем миграции через alembic
        print("📦 Применение миграций через alembic...")
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            cwd="/app"
        )
        
        if result.returncode == 0:
            print("✅ Миграции успешно применены")
            print(f"Вывод alembic: {result.stdout}")
        else:
            print(f"❌ Ошибка применения миграций: {result.stderr}")
            return False
        
        # Проверяем, какие таблицы созданы
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
            required_tables = ["users", "equipment", "packs", "brand_systems", "reservations", "rentals"]
            missing_tables = [table for table in required_tables if table not in tables]
            
            if missing_tables:
                print(f"⚠️  Отсутствующие таблицы: {missing_tables}")
                return False
            else:
                print("✅ Все ключевые таблицы присутствуют")
        
        await engine.dispose()
        return True
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(apply_migrations())
    sys.exit(0 if success else 1)
