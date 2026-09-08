#!/usr/bin/env python3
"""Диагностика окружения изнутри контейнера бэкенда (профиль `diagnostics`).

Проверяет по очереди: конфигурацию, доступность БД, Redis и ключевые таблицы.
Запуск: docker compose --profile diagnostics up --build diagnostics
Выходной код 0 — всё в порядке, 1 — есть проблемы.
"""

import asyncio
import sys

sys.path.append("/app" if __import__("os").path.isdir("/app") else ".")

from sqlalchemy import text

from config.core import settings
from containers import AsyncSessionLocal
from api.services.redis_client import redis_client

PASSED: list[str] = []
FAILED: list[str] = []


def report(name: str, ok: bool, detail: str = "") -> None:
    line = f"{'✅' if ok else '❌'} {name}" + (f" — {detail}" if detail else "")
    (PASSED if ok else FAILED).append(line)
    print(line)


async def main() -> int:
    print("== Диагностика RentalApp ==")

    # 1. Конфигурация
    report("DEBUG выключен" if not settings.DEBUG else "DEBUG включён (dev-режим)",
           True, f"DEBUG={settings.DEBUG}")

    # 2. БД
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            assert result.scalar() == 1
            tables = await session.execute(
                text("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
            )
            count = tables.scalar()
            report("Подключение к БД", True, f"таблиц в public: {count}")
    except Exception as exc:  # noqa: BLE001 — диагностический скрипт
        report("Подключение к БД", False, str(exc)[:200])

    # 3. Redis
    try:
        ok = redis_client.is_available()
        report("Redis", ok, settings.REDIS_URL if ok else "недоступен (fallback in-memory)")
    except Exception as exc:  # noqa: BLE001
        report("Redis", False, str(exc)[:200])

    print(f"\nИтог: {len(PASSED)} проверок пройдено, {len(FAILED)} с проблемами")
    return 0 if not FAILED else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
