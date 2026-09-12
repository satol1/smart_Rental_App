# api/services/background_runner.py

"""
Планировщик и раннер фоновых задач приложения.
Реализует автоматический периодический запуск OverdueCheckerService
и возможность запуска проверок по требованию (через API или CLI).
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from config.core import settings
from containers.constants import AsyncSessionLocal
from api.repositories.user_repository import UserRepository
from api.repositories.reservation_repository import ReservationRepository
from api.repositories.rental_repository import RentalRepository
from api.services.user.user_status_service import UserStatusService
from api.services.user.overdue_checker_service import OverdueCheckerService

logger = logging.getLogger(__name__)


def create_overdue_checker(session: AsyncSession) -> OverdueCheckerService:
    """Создает полностью инициализированный OverdueCheckerService с репозиториями из DI-контейнера."""
    from containers.constants import request_db_session
    from containers import Container

    token = request_db_session.set(session)
    try:
        container = Container()
        return container.overdue_checker_service()
    finally:
        request_db_session.reset(token)


async def run_overdue_check_once(db_session: Optional[AsyncSession] = None) -> Dict[str, Any]:
    """
    Выполняет однократную проверку просроченных резервов и блокировку нарушителей.
    
    Args:
        db_session: Опциональная активная сессия. Если не передана, создается новая.
        
    Returns:
        Словарь с результатами выполнения проверки.
    """
    start_time = datetime.now(timezone.utc)
    logger.info("Запуск задачи проверки просроченных резервов (OverdueChecker)")

    async def _execute(session: AsyncSession) -> List[int]:
        checker = create_overdue_checker(session)
        blocked_ids = await checker.check_and_block_users_with_overdue_reservations()
        await session.commit()
        return blocked_ids

    try:
        if db_session is not None:
            blocked = await _execute(db_session)
        else:
            async with AsyncSessionLocal() as session:
                blocked = await _execute(session)

        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.info(
            f"Проверка просроченных резервов завершена за {duration:.2f}с. "
            f"Заблокировано пользователей: {len(blocked)}"
        )
        return {
            "status": "success",
            "blocked_user_ids": blocked,
            "blocked_count": len(blocked),
            "executed_at": start_time.isoformat(),
            "duration_seconds": duration,
        }
    except Exception as e:
        logger.error(f"Ошибка при выполнении OverdueChecker: {e}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "blocked_user_ids": [],
            "blocked_count": 0,
            "executed_at": start_time.isoformat(),
        }


class BackgroundScheduler:
    """
    Асинхронный фоновый планировщик задач жизненного цикла приложения.
    """

    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._is_running: bool = False
        self.last_run_time: Optional[datetime] = None
        self.last_run_result: Optional[Dict[str, Any]] = None

    @property
    def is_running(self) -> bool:
        return self._is_running

    async def start(self) -> None:
        """Запускает фоновый цикл планировщика."""
        if not getattr(settings, "ENABLE_BACKGROUND_SCHEDULER", True):
            logger.info("Фоновый планировщик отключен в конфигурации (ENABLE_BACKGROUND_SCHEDULER=False)")
            return

        if self._is_running:
            logger.warning("Фоновый планировщик уже запущен")
            return

        self._is_running = True
        self._task = asyncio.create_task(self._loop(), name="background_overdue_checker_scheduler")
        logger.info("Фоновый планировщик успешно запущен")

    async def stop(self) -> None:
        """Останавливает фоновый цикл планировщика."""
        if not self._is_running or not self._task:
            return

        self._is_running = False
        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass
        finally:
            self._task = None
            logger.info("Фоновый планировщик успешно остановлен")

    async def _loop(self) -> None:
        """Основной цикл периодического выполнения задач."""
        interval = getattr(settings, "OVERDUE_CHECK_INTERVAL_SECONDS", 86400)
        logger.info(f"Фоновый цикл проверки просрочек запущен с интервалом {interval} сек.")

        # Небольшая пауза при старте приложения для завершения инициализации сервисов
        try:
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            return

        while self._is_running:
            try:
                result = await run_overdue_check_once()
                self.last_run_time = datetime.now(timezone.utc)
                self.last_run_result = result
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Непредвиденная ошибка в фоновом цикле планировщика: {e}", exc_info=True)

            try:
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break


# Глобальный синглтон планировщика
background_scheduler = BackgroundScheduler()
