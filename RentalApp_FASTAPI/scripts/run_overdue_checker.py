# scripts/run_overdue_checker.py

"""
Скрипт для ручного или cron-запуска проверки просроченных резервов.
Запуск: python -m scripts.run_overdue_checker
"""

import asyncio
import sys
import logging

from api.services.background_runner import run_overdue_check_once

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


async def main():
    logger.info("Запуск проверки просроченных резервов через CLI...")
    result = await run_overdue_check_once()
    if result.get("status") == "success":
        logger.info(f"Успешно: заблокировано {result.get('blocked_count')} пользователей.")
        sys.exit(0)
    else:
        logger.error(f"Ошибка при выполнении: {result.get('error')}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
