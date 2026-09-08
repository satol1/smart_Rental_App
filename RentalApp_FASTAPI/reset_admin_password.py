#!/usr/bin/env python3
"""
Скрипт для сброса пароля администратора.

Пароль берётся (в порядке приоритета):
1. Аргумент командной строки:  python reset_admin_password.py <new_password>
2. Переменная окружения NEW_ADMIN_PASSWORD
3. Если ничего не задано — генерируется случайный и выводится в консоль.
"""

import asyncio
import os
import secrets
import string
import sys

# Добавляем корневую директорию проекта в путь, чтобы работали импорты
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.dependencies import get_db_session
from api.repositories.user_repository import UserRepository
from api.utils.password_utils import hash_password

ADMIN_EMAIL = "admin@rentalapp.com"


def resolve_new_password() -> str:
    """Новый пароль: argv[1] -> env NEW_ADMIN_PASSWORD -> случайный."""
    if len(sys.argv) > 1:
        return sys.argv[1]
    env_password = os.getenv("NEW_ADMIN_PASSWORD")
    if env_password:
        return env_password

    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    generated = "".join(secrets.choice(alphabet) for _ in range(16))
    print("ℹ️  Пароль не задан (argv/NEW_ADMIN_PASSWORD) — сгенерирован случайный.")
    return generated


async def reset_admin_password():
    """Сбрасывает пароль администратора на заданный/случайный"""

    print("🔐 Сброс пароля администратора...")
    new_password = resolve_new_password()

    async for db in get_db_session():
        try:
            user_repo = UserRepository(db)

            # Находим администратора
            admin_user = await user_repo.get_by_email(ADMIN_EMAIL)

            if not admin_user:
                print("❌ Администратор не найден!")
                return False

            print(f"✅ Найден администратор: {admin_user.email}")

            # Хешируем новый пароль
            admin_user.hashed_password = hash_password(new_password)
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
