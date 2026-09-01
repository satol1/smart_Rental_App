#!/usr/bin/env python3
"""
Простой скрипт для тестирования подключения к тестовой базе данных.
"""

import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test_connection():
    """Тестирует подключение к базе данных."""
    try:
        # URL тестовой базы данных
        database_url = "postgresql+asyncpg://unit_test_user:unit_test_password@unit-test-db:5432/unit_test_db"
        
        print(f"Тестирование подключения к: {database_url}")
        
        # Создаем движок
        engine = create_async_engine(database_url, echo=False)
        
        # Тестируем подключение
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1 as test"))
            row = result.fetchone()
            print(f"✅ Подключение успешно! Результат: {row[0]}")
            
            # Проверяем версию PostgreSQL
            result = await conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"📊 Версия PostgreSQL: {version}")
            
        await engine.dispose()
        return True
        
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_connection())
