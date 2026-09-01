#!/usr/bin/env python3
"""
Скрипт для исправления хешей паролей в базе данных.
Исправляет поврежденные или неправильные хеши паролей.
"""

import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update
from api.models.user import User
from api.utils.password_utils import hash_password
from config.core import settings

async def fix_password_hashes():
    """Исправляет хеши паролей для всех пользователей."""
    print("🔧 Запуск исправления хешей паролей...")
    
    try:
        # Создаем подключение к базе данных
        engine = create_async_engine(settings.DATABASE_URL)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with async_session() as session:
            # Получаем всех пользователей
            result = await session.execute(select(User))
            users = result.scalars().all()
            
            print(f"📊 Найдено пользователей: {len(users)}")
            
            fixed_count = 0
            for user in users:
                try:
                    # Проверяем, можно ли верифицировать текущий хеш
                    from api.utils.password_utils import verify_password
                    
                    # Пробуем верифицировать с тестовым паролем
                    # Если хеш поврежден, это вызовет исключение
                    try:
                        verify_password("test", user.hashed_password)
                    except Exception:
                        # Хеш поврежден, нужно исправить
                        print(f"⚠️  Поврежденный хеш для пользователя {user.email}")
                        
                        # Устанавливаем новый хеш для пароля "admin123" (временный)
                        new_hash = hash_password("admin123")
                        
                        # Обновляем хеш в базе данных
                        await session.execute(
                            update(User)
                            .where(User.id == user.id)
                            .values(hashed_password=new_hash)
                        )
                        
                        fixed_count += 1
                        print(f"✅ Исправлен хеш для пользователя {user.email}")
                        
                except Exception as e:
                    print(f"❌ Ошибка при обработке пользователя {user.email}: {e}")
                    continue
            
            # Сохраняем изменения
            await session.commit()
            print(f"✅ Исправлено хешей: {fixed_count}")
            print("🎉 Исправление хешей завершено!")
            
            # Выводим информацию о пользователях
            print("\n📋 Информация о пользователях:")
            result = await session.execute(select(User))
            users = result.scalars().all()
            
            for user in users:
                print(f"  - {user.email} (ID: {user.id}, Роль: {user.role})")
            
            await engine.dispose()
            
    except Exception as e:
        print(f"❌ Ошибка при исправлении хешей: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(fix_password_hashes())
