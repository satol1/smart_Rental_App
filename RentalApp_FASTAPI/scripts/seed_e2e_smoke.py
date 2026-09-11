#!/usr/bin/env python3
# scripts/seed_e2e_smoke.py
"""
Идемпотентный сид данных для Playwright smoke-тестов фронтенда
(rental-app-main/e2e/smoke.spec.ts, задача 5.5 аудита).

Создаёт (при повторном запуске — пропускает):
  - пользователя smoke@rentalapp-test.com / SmokeUser2026!
    (пароль проходит validate_password_strength: длина >= 8, верхний +
     нижний регистр, цифра, не из common-списка);
  - 3 единицы оборудования «Smoke Тест Оборудование N».

Дополнительно (для детерминированных перезапусков) удаляет незакрытые
резервы smoke-пользователя, оставшиеся от упавших прогонов: статусу
«Новый» разрешено максимум 2 активных резерва.

БД берётся из DATABASE_URL окружения (как в create_admin.py):
  для локальной проверки: postgresql+asyncpg://smoke:smoke@localhost:5433/smoke
  для CI:                 адрес сервисной postgres job'а

Запуск:
  cd RentalApp_FASTAPI
  DATABASE_URL=... SECRET_KEY=... CSRF_SECRET_KEY=... \
    ./.venv/Scripts/python.exe scripts/seed_e2e_smoke.py
"""

import asyncio
import os
import sys
from datetime import date

from sqlalchemy import delete, select

# Корневая директория проекта — для импортов api.* / containers
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from containers import AsyncSessionLocal  # noqa: E402
from api.models.user import User  # noqa: E402
from api.models.equipment import Equipment  # noqa: E402
from api.models.reservation import (  # noqa: E402
    Reservation,
    ReservationAccessory,
    reservation_equipment_association,
)
from api.utils.password_utils import hash_password  # noqa: E402

# --- Данные smoke-пользователя (значения продиктованы e2e/smoke.spec.ts) ---
# ВАЖНО: домен .local запрещён pydantic EmailStr (special-use domain) —
# /api/auth/me на такого пользователя отвечает 422. Используем обычный домен.
SMOKE_EMAIL = "smoke@rentalapp-test.com"
SMOKE_PASSWORD = "SmokeUser2026!"
SMOKE_FULL_NAME = "Smoke Тестовый Пользователь"
SMOKE_PHONE = "+7 (999) 111-22-33"

# --- Оборудование: минимально валидные обязательные поля модели Equipment ---
SMOKE_EQUIPMENT = [
    {
        "equipment_type": "Камера",
        "brand": "SmokeBrand",
        "name": "Smoke Тест Оборудование 1",
        "serial_number": "SMOKE-E2E-001",
        "daily_rate": 1000.0,
        "short_description": "Единица оборудования для smoke-тестов №1",
        "description": "Автоматически создано scripts/seed_e2e_smoke.py для Playwright smoke-тестов.",
        "last_maintenance": date(2026, 1, 10),
    },
    {
        "equipment_type": "Объектив",
        "brand": "SmokeBrand",
        "name": "Smoke Тест Оборудование 2",
        "serial_number": "SMOKE-E2E-002",
        "daily_rate": 500.0,
        "short_description": "Единица оборудования для smoke-тестов №2",
        "description": "Автоматически создано scripts/seed_e2e_smoke.py для Playwright smoke-тестов.",
        "last_maintenance": date(2026, 2, 15),
    },
    {
        "equipment_type": "Штатив",
        "brand": "SmokeBrand",
        "name": "Smoke Тест Оборудование 3",
        "serial_number": "SMOKE-E2E-003",
        "daily_rate": 300.0,
        "short_description": "Единица оборудования для smoke-тестов №3",
        "description": "Автоматически создано scripts/seed_e2e_smoke.py для Playwright smoke-тестов.",
        "last_maintenance": date(2026, 3, 20),
    },
]


async def cleanup_smoke_reservations(db_session, user: User) -> int:
    """Удаляет резервы smoke-пользователя, оставшиеся от прошлых прогонов."""
    reservation_ids = (
        (
            await db_session.execute(
                select(Reservation.id).where(Reservation.user_id == user.id)
            )
        )
        .scalars()
        .all()
    )
    if not reservation_ids:
        return 0

    # Сначала дочерние/связующие строки, затем сами резервы (нет FK-cascade)
    await db_session.execute(
        delete(ReservationAccessory).where(
            ReservationAccessory.reservation_id.in_(reservation_ids)
        )
    )
    await db_session.execute(
        reservation_equipment_association.delete().where(
            reservation_equipment_association.c.reservation_id.in_(
                reservation_ids
            )
        )
    )
    await db_session.execute(
        delete(Reservation).where(Reservation.id.in_(reservation_ids))
    )
    return len(reservation_ids)


async def seed_smoke_data():
    print("🚀 Запуск сида smoke-данных для e2e...")
    db_session = AsyncSessionLocal()
    try:
        # 1. Пользователь
        result = await db_session.execute(select(User).filter(User.email == SMOKE_EMAIL))
        smoke_user = result.scalars().first()

        if smoke_user:
            print(f"✅ Пользователь '{SMOKE_EMAIL}' уже существует. Пропускаем создание.")
        else:
            smoke_user = User(
                full_name=SMOKE_FULL_NAME,
                email=SMOKE_EMAIL,
                hashed_password=hash_password(SMOKE_PASSWORD),
                phone=SMOKE_PHONE,
                role="user",
                is_active=True,
                status="Новый",
                balance=0.0,
                notes="Создан автоматически для Playwright smoke-тестов",
                privacy_policy_accepted=True,
                terms_accepted=True,
                email_verified=True,
            )
            db_session.add(smoke_user)
            await db_session.flush()
            print(f"✅ Создан smoke-пользователь: {SMOKE_EMAIL} / {SMOKE_PASSWORD}")

        # 2. Оборудование (пропуск по serial_number)
        for item in SMOKE_EQUIPMENT:
            existing = (
                await db_session.execute(
                    select(Equipment).filter(
                        Equipment.serial_number == item["serial_number"]
                    )
                )
            ).scalars().first()
            if existing:
                print(
                    f"✅ Оборудование '{item['name']}' ({item['serial_number']}) "
                    "уже существует. Пропускаем."
                )
                continue
            db_session.add(Equipment(condition="Великолепно", **item))
            print(f"✅ Создано оборудование: '{item['name']}'")

        # 3. Чистим незакрытые резервы smoke-пользователя
        removed = await cleanup_smoke_reservations(db_session, smoke_user)
        if removed:
            print(f"🧹 Удалено резервов прошлого прогона: {removed}")

        await db_session.commit()
        print("🏁 Сид smoke-данных завершён.")

    except Exception as e:
        await db_session.rollback()
        print(f"❌ Произошла ошибка: {e}")
        raise
    finally:
        await db_session.close()


if __name__ == "__main__":
    asyncio.run(seed_smoke_data())
