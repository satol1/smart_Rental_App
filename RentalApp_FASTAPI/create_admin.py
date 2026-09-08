#!/usr/bin/env python3
"""
Скрипт для создания главного администратора при разворачивании новой БД.
Используется для инициализации системы с административным пользователем.

Пароль берётся (в порядке приоритета):
1. Аргумент командной строки:  python create_admin.py <password>
2. Переменная окружения ADMIN_INITIAL_PASSWORD
3. Если ничего не задано — генерируется случайный и выводится в консоль.
"""

import asyncio
import secrets
import string
import sys
import os
from sqlalchemy import select

# Добавляем корневую директорию проекта в путь, чтобы работали импорты
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from containers import AsyncSessionLocal
from api.models.user import User
from api.utils.password_utils import hash_password

# --- Данные для входа администратора ---
ADMIN_EMAIL = "admin@rentalapp.com"
ADMIN_FULL_NAME = "Главный Администратор"
ADMIN_PHONE = "+7 (999) 000-00-00"
# ------------------------------------


def resolve_admin_password() -> str:
    """Пароль администратора: argv[1] -> env ADMIN_INITIAL_PASSWORD -> случайный."""
    if len(sys.argv) > 1:
        return sys.argv[1]
    env_password = os.getenv("ADMIN_INITIAL_PASSWORD")
    if env_password:
        return env_password

    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    generated = "".join(secrets.choice(alphabet) for _ in range(16))
    print("ℹ️  Пароль не задан (argv/ADMIN_INITIAL_PASSWORD) — сгенерирован случайный.")
    return generated


async def create_admin_user():
    """
    Создает пользователя с правами администратора в базе данных.
    """
    print("🚀 Запуск скрипта создания администратора...")
    admin_password = resolve_admin_password()
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
            hashed_password=hash_password(admin_password),
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
        print(f"  🔑 Пароль: {admin_password}")
        print("---")

    except Exception as e:
        await db_session.rollback()
        print(f"❌ Произошла ошибка: {e}")
    finally:
        await db_session.close()
        print("🏁 Скрипт завершил работу.")


if __name__ == "__main__":
    asyncio.run(create_admin_user())

