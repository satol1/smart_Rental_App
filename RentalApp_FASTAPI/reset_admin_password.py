#!/usr/bin/env python3
"""
Скрипт для сброса пароля администратора
"""

import asyncio
from api.dependencies import get_db_session
from api.repositories.user_repository import UserRepository
from api.models.user import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_admin_password():
    """Сбрасывает пароль администратора на 'admin123'"""
    
    print("🔐 Сброс пароля администратора...")
    
    async for db in get_db_session():
        try:
            user_repo = UserRepository(db)
            
            # Находим администратора
            admin_user = await user_repo.get_by_email("admin@rentalapp.com")
            
            if not admin_user:
                print("❌ Администратор не найден!")
                return False
                
            print(f"✅ Найден администратор: {admin_user.email}")
            
            # Хешируем новый пароль
            new_password = "admin123"
            hashed_password = pwd_context.hash(new_password)
            
            # Обновляем пароль
            admin_user.hashed_password = hashed_password
            await db.commit()
            
            print(f"✅ Пароль обновлен на: {new_password}")
            return True
            
        except Exception as e:
            print(f"❌ Ошибка при сбросе пароля: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            await db.close()

if __name__ == "__main__":
    asyncio.run(reset_admin_password())
