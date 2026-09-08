#!/usr/bin/env python3
"""
Скрипт для создания тестовой базы данных с идентичной структурой реальной БД.
Используется в Docker контейнерах для тестов.
"""

import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from config.core import settings

async def create_test_database():
    """Создает тестовую базу данных с идентичной структурой реальной БД."""
    try:
        # Получаем URL тестовой базы данных
        test_database_url = os.getenv('TEST_DATABASE_URL', settings.database_url)
        
        print(f"=== Создание тестовой базы данных ===")
        print(f"URL: {test_database_url}")
        
        # Создаем движок
        engine = create_async_engine(test_database_url, echo=False)
        
        # Создаем сессию
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with async_session() as session:
            print("Создание таблиц через SQLAlchemy...")
            
            # Импортируем все модели для создания таблиц
            from api.database_models import Base
            from api.models.user import User
            from api.models.equipment import Equipment
            from api.models.reservation import Reservation
            from api.models.rental import Rental
            from api.models.accessory import Accessory
            from api.models.pack import Pack
            from api.models.promo_code import PromoCode
            from api.models.discount import DurationDiscount
            from api.models.holiday import Holiday, HolidayRule
            from api.models.brand_system import BrandSystem
            from api.models.association import Association
            from api.models.balance_history import BalanceHistory
            from api.models.payment import Payment
            from api.models.setting import Setting
            
            # Создаем все таблицы
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            
            print("✅ Таблицы созданы через SQLAlchemy")
            
            # Проверяем, что все таблицы созданы
            print("Проверка создания таблиц...")
            
            # Список основных таблиц, которые должны существовать
            required_tables = [
                'users',
                'equipment', 
                'reservations',
                'rentals',
                'accessories',
                'packs',
                'promo_codes',
                'duration_discounts',
                'holidays',
                'brand_systems',
                'associations',
                'balance_history',
                'payments',
                'holiday_rules'
            ]
            
            missing_tables = []
            for table in required_tables:
                try:
                    await session.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))
                    print(f"✓ Таблица '{table}' создана")
                except Exception as e:
                    print(f"✗ Таблица '{table}' не найдена: {e}")
                    missing_tables.append(table)
            
            if missing_tables:
                print(f"\n❌ Отсутствуют таблицы: {', '.join(missing_tables)}")
                return False
            else:
                print("\n✅ Все необходимые таблицы созданы в тестовой БД!")
                
                # Создаем тестового админа
                print("Создание тестового админа...")
                await create_test_admin(session)
                
                return True
                
    except Exception as e:
        print(f"❌ Ошибка при создании тестовой БД: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if 'engine' in locals():
            await engine.dispose()

async def create_test_admin(session):
    """Создает тестового администратора."""
    try:
        from api.models.user import User
        from api.utils.password_utils import hash_password
        
        # Проверяем, есть ли уже тестовый админ
        existing_admin = await session.execute(
            text("SELECT id FROM users WHERE email = 'admin@test.com'")
        )
        
        if existing_admin.fetchone():
            print("✓ Тестовый админ уже существует")
            return
        
        # Создаем тестового админа
        admin_password = hash_password("admin123")
        
        await session.execute(text("""
            INSERT INTO users (email, hashed_password, full_name, is_active, is_superuser, is_manager, created_at, updated_at)
            VALUES ('admin@test.com', :password, 'Test Admin', true, true, true, NOW(), NOW())
        """), {"password": admin_password})
        
        await session.commit()
        print("✅ Тестовый админ создан (email: admin@test.com, password: admin123)")
        
    except Exception as e:
        print(f"❌ Ошибка при создании тестового админа: {e}")
        await session.rollback()

async def main():
    """Основная функция."""
    print("=== Создание тестовой базы данных ===")
    
    success = await create_test_database()
    
    if success:
        print("\n🎉 Тестовая база данных готова к работе!")
        sys.exit(0)
    else:
        print("\n💥 Ошибка при создании тестовой базы данных!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
