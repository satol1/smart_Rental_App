# api/services/cache_service.py
"""
Простой кэш агрегатов: Redis при доступности, иначе in-memory с TTL.

Используется для тяжёлых агрегатов (например, сводка админ-дашборда),
чтобы не дёргать репозитории на каждый запрос. Инвалидация — явная,
из command-сервисов при мутациях (см. invalidate_dashboard_summary).

Хранилище асинхронное (redis.asyncio): get_json/set_json/invalidate —
async-методы. Для sync-вызывающих (command-сервисы order/*) предназначена
обёртка invalidate_in_background — fire-and-forget без блокировки.
"""

import asyncio
import json
import logging
import threading
import time
from typing import Any, Optional

from api.services.redis_client import redis_client

logger = logging.getLogger(__name__)

DASHBOARD_SUMMARY_KEY = "dashboard:summary"
DASHBOARD_SUMMARY_TTL_SECONDS = 60


def _swallow_task_exception(task: "asyncio.Task[None]") -> None:
    """Гасит исключения фоновой задачи инвалидации (кэш не критичен)."""
    if not task.cancelled() and task.exception() is not None:
        logger.warning("Фоновая инвалидация кэша упала: %s", task.exception())


# Ссылки на фоновые задачи инвалидации (asyncio держит лишь weakref —
# без сильной ссылки задача может быть собрана GC до завершения)
_background_tasks: "set[asyncio.Task[None]]" = set()


class AppCache:
    """JSON-кэш с TTL: redis-или-in-memory (тот же redis-клиент с fallback)."""

    def __init__(self, redis: Any = None) -> None:
        self._redis = redis if redis is not None else redis_client
        self._memory: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    async def get_json(self, key: str) -> Optional[Any]:
        """Возвращает распарсенное значение либо None (нет/истёк/redis упал)."""
        try:
            if await self._redis.is_available():
                raw = await self._redis.get(key)
                if raw is None:
                    return None
                if isinstance(raw, bytes):
                    raw = raw.decode("utf-8", errors="replace")
                return json.loads(raw)

            with self._lock:
                entry = self._memory.get(key)
                if entry is None:
                    return None
                expires_at, payload = entry
                if expires_at <= time.time():
                    del self._memory[key]
                    return None
                return payload
        except Exception as exc:
            # Кэш никогда не должен ломать запрос: считаем промахом
            logger.warning("Cache get(%s) failed: %s — считаем промахом", key, exc)
            return None

    async def set_json(self, key: str, value: Any, ttl_seconds: int) -> None:
        """Кладёт значение с TTL. Ошибки подавляются (кэш не критичен)."""
        try:
            if await self._redis.is_available():
                await self._redis.setex(key, ttl_seconds, json.dumps(value, default=str))
                return
            with self._lock:
                self._memory[key] = (time.time() + ttl_seconds, value)
        except Exception as exc:
            logger.warning("Cache set(%s) failed: %s — пропускаем", key, exc)

    async def invalidate(self, *keys: str) -> None:
        """Удаляет ключи из обоих хранилищ. Никогда не бросает."""
        try:
            self.invalidate_memory(*keys)
            if keys and await self._redis.is_available():
                await self._redis.delete(*keys)
        except Exception as exc:
            logger.warning("Cache invalidate(%s) failed: %s", keys, exc)

    def invalidate_memory(self, *keys: str) -> None:
        """Синхронно чистит только in-memory часть (без обращения к redis)."""
        with self._lock:
            for key in keys:
                self._memory.pop(key, None)

    def invalidate_in_background(self, *keys: str) -> None:
        """Sync-обёртка над инвалидацией для вызывающих без await (fire-and-forget).

        In-memory часть чистится сразу; redis-часть планируется фоновой
        задачей текущего event loop. Без запущенного loop (sync-контекст,
        например тесты) чистится только in-memory — эквивалент текущего
        поведения при недоступном redis.
        """
        self.invalidate_memory(*keys)
        if not keys:
            return
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        # asyncio держит лишь weakref на задачи — удерживаем сильную ссылку,
        # иначе задача может быть собрана GC до завершения (docs: asyncio.create_task)
        task = loop.create_task(self._delete_redis_quietly(*keys))
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)
        task.add_done_callback(_swallow_task_exception)

    async def _delete_redis_quietly(self, *keys: str) -> None:
        if not keys or not await self._redis.is_available():
            return
        try:
            await self._redis.delete(*keys)
        except Exception as exc:
            logger.warning("Cache invalidate(%s) failed: %s", keys, exc)

    def clear(self) -> None:
        """Полная очистка in-memory части (используется в тестах)."""
        with self._lock:
            self._memory.clear()


# Единственный экземпляр на процесс
app_cache = AppCache()


def invalidate_dashboard_summary() -> None:
    """Инвалидация кэша сводки дашборда.

    Вызывается из command-сервисов при мутациях резервов/аренд.
    Лучший-effort: никогда не бросает и не влияет на бизнес-транзакцию.

    Осталась sync (без await у вызывающих): command-сервисы order/* не
    должны зависеть от асинхронности хранилища. In-memory часть чистится
    сразу, redis-часть выполняется фоновой задачей текущего event loop.
    """
    app_cache.invalidate_in_background(DASHBOARD_SUMMARY_KEY)
