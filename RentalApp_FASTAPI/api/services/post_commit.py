# api/services/post_commit.py
"""
Отложенные побочные эффекты: выполняются только после успешного commit
транзакции запроса.

Раньше telegram-уведомление/инвалидация кэша, запущенные в сервисе,
срабатывали ещё ДО коммита: при падении коммита менеджер получал уведомление
о несуществующем заказе, а кэш дашборда инвалидировался зря.

Механизм: сервис регистрирует callback в session.info, а
DIContainerMiddleware после успешного commit вызывает
run_post_commit_callbacks(session). SQLAlchemy event API не используется
осознанно: слушатели на AsyncSession не поддерживаются (NotImplementedError),
а middleware-вызов даёт тот же результат без магии.
"""

import asyncio
import logging
from typing import Callable, List

logger = logging.getLogger(__name__)


def schedule_after_commit(session, callback: Callable) -> None:
    """Регистрирует callback на выполнение после commit сессии.

    callback — безаргументная функция; если она вернёт coroutine — та
    выполняется как фоновая задача. При rollback/закрытии без коммита
    callback отбрасывается. Для объектов без dict .info (моки в тестах)
    callback выполняется немедленно.
    """
    info = getattr(session, "info", None)
    if not isinstance(info, dict):
        _run_eager(callback)
        return
    info.setdefault("post_commit_callbacks", []).append(callback)


def run_post_commit_callbacks(session) -> None:
    """Запускает отложенные callbacks. Вызывается middleware ПОСЛЕ commit.

    Обязана вызываться из async-контекста (запускает задачи в текущем loop).
    Повторный вызов безопасен: список callbacks извлекается атомарно.
    """
    info = getattr(session, "info", None)
    if not isinstance(info, dict):
        return
    callbacks: List[Callable] = info.pop("post_commit_callbacks", [])
    if not callbacks:
        return

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        logger.error(
            "post_commit: нет running loop — %d побочных эффектов потеряно",
            len(callbacks),
        )
        return

    async def _runner():
        for cb in callbacks:
            try:
                result = cb()
                if asyncio.iscoroutine(result):
                    await result
            except Exception:
                logger.exception("post_commit: ошибка побочного эффекта")

    loop.create_task(_runner())


def _run_eager(callback: Callable) -> None:
    """Немедленный запуск (для не-Session объектов, напр. моков в юнит-тестах)."""
    try:
        result = callback()
        if asyncio.iscoroutine(result):
            try:
                asyncio.get_running_loop().create_task(result)
            except RuntimeError:
                result.close()
    except Exception:
        logger.exception("post_commit: ошибка побочного эффекта (eager)")
