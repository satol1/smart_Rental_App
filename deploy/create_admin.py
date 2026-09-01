#!/usr/bin/env python3
"""
Скрипт для создания главного администратора при разворачивании новой БД.
Используется для инициализации системы с административным пользователем.
"""

import asyncio
import sys
import os
from sqlalchemy import select

# Добавляем корневую директорию проекта в путь, чтобы работали импорты
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'RentalApp_FASTAPI'))

from containers import AsyncSessionLocal
from api.models.user import User
from api.utils.password_utils import hash_password

# --- Данные для входа администратора ---
ADMIN_EMAIL = "admin@rentalapp.com"
ADMIN_PASSWORD = "AdminRental2024!"  # Безопасный пароль
ADMIN_FULL_NAME = "Главный Администратор"
ADMIN_PHONE = "+7 (999) 000-00-00"
# ------------------------------------

async def create_admin_user():
    """
    Создает пользователя с правами администратора в базе данных.
    """
    print("🚀 Запуск скрипта создания администратора...")
    db_session = AsyncSessionLocal()
    try:
        # Проверяем, существует ли уже пользователь с таким email
        result = await db_session.execute(select(User).filter(User.email == ADMIN_EMAIL))
        existing_user = result.scalars().first()

        if existing_user:
            print(f"✅ Пользователь с email '{ADMIN_EMAIL}' уже существует. Пропускаем создание.")
            return

        # Создаем нового пользователя
        # Для админов и менеджеров устанавливается статус VIP
        new_admin = User(
            full_name=ADMIN_FULL_NAME,
            email=ADMIN_EMAIL,
            hashed_password=hash_password(ADMIN_PASSWORD),
            phone=ADMIN_PHONE,
            role="admin",
            is_active=True,
            status="VIP",
            balance=0.0,
            notes="Создан автоматически при инициализации",
            privacy_policy_accepted=True,
            terms_accepted=True,
            email_verified=True
        )
        db_session.add(new_admin)
        await db_session.commit()
        print("✅ Учетная запись администратора успешно создана!")
        print("---")
        print(f"  📧 Email: {ADMIN_EMAIL}")
        print(f"  🔑 Пароль: {ADMIN_PASSWORD}")
        print("---")

    except Exception as e:
        await db_session.rollback()
        print(f"❌ Произошла ошибка: {e}")
    finally:
        await db_session.close()
        print("🏁 Скрипт завершил работу.")

if __name__ == "__main__":
    asyncio.run(create_admin_user())
