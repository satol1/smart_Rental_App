# api/services/redis_client.py
"""
Ленивый асинхронный Redis-клиент (redis.asyncio) с деградацией.

Redis опционален для приложения: при недоступности (не поднялся, упал,
ошибка сети) все операции возвращают безопасные значения по умолчанию,
а вызывающий код (denylist, brute-force, кэш) уходит в in-memory fallback.
Ошибки редиса НИКОГДА не роняют приложение.

Асинхронный клиент выбран сознательно: redis_client зовётся из async-кода
(auth/denylist, brute-force, кэш дашборда), и синхронные socket-операции
блокировали event loop на время каждого запроса. Клиент создаётся лениво
и переиспользуется: redis.asyncio безопасен для await из event loop, где
он создан, поэтому отдельная блокировка не нужна (прод-процесс использует
один loop). slowapi/limits работает независимо и остаётся на memory://.
"""

import asyncio
import logging
import time
from typing import Any, Awaitable, Callable, Optional

from config.core import settings

logger = logging.getLogger(__name__)

# Как часто перепроверять упавший Redis (чтобы не добавлять latency
# на каждый запрос, но и не требовать рестарта при восстановлении).
_RETRY_INTERVAL_SECONDS = 30.0
_CONNECT_TIMEOUT_SECONDS = 1.0


class RedisClient:
    """Обертка над redis.asyncio: ленивое подключение, ping, fallback."""

    def __init__(self, url: Optional[str] = None) -> None:
        self._url = url or settings.REDIS_URL
        self._client: Any = None
        self._available: bool = False
        self._next_check_at: Optional[float] = None

    # ───────────────────────────── Доступность ─────────────────────────────

    async def is_available(self) -> bool:
        """True, если Redis отвечает на ping. Кеширует результат,
        перепроверяя не чаще раза в _RETRY_INTERVAL_SECONDS."""
        if self._available and self._client is not None:
            return True
        now = time.monotonic()
        if self._next_check_at is not None and now < self._next_check_at:
            return False
        try:
            if self._client is None:
                from redis.asyncio import Redis as AsyncRedis

                self._client = AsyncRedis.from_url(
                    self._url,
                    socket_connect_timeout=_CONNECT_TIMEOUT_SECONDS,
                    socket_timeout=_CONNECT_TIMEOUT_SECONDS,
                )
            if not await self._client.ping():
                raise RuntimeError("redis ping вернул False")
            self._available = True
            self._next_check_at = None
            logger.info("Redis доступен (%s): хранилища используют redis", self._url)
            return True
        except Exception as exc:
            self._available = False
            self._next_check_at = now + _RETRY_INTERVAL_SECONDS
            logger.warning(
                "Redis недоступен (%s): %s — используется in-memory fallback",
                self._url,
                exc,
            )
            return False

    def _mark_broken(self, exc: Exception) -> None:
        """Redis упал после успешного ping — помечаем недоступным."""
        self._available = False
        self._next_check_at = time.monotonic() + _RETRY_INTERVAL_SECONDS
        logger.warning("Ошибка операции Redis (%s): %s — временно in-memory fallback", self._url, exc)

    async def _call(self, op: Callable[[], Awaitable[Any]], default: Any = None) -> Any:
        """Выполняет операцию, никогда не бросая исключений наружу."""
        if not await self.is_available():
            return default
        try:
            return await op()
        except Exception as exc:
            self._mark_broken(exc)
            return default

    # ───────────────────────────── Операции ─────────────────────────────

    async def get(self, key: str) -> Any:
        """GET; None при недоступности/отсутствии ключа."""
        return await self._call(lambda: self._client.get(key))

    async def setex(self, key: str, ttl_seconds: int, value: Any) -> bool:
        """SETEX (значение + TTL); False при недоступности."""
        return bool(
            await self._call(lambda: self._client.setex(key, int(ttl_seconds), value), default=False)
        )

    async def incr(self, key: str) -> Optional[int]:
        """INCR; None при недоступности (вызывающий код уходит в fallback)."""
        return await self._call(lambda: self._client.incr(key))

    async def expire(self, key: str, ttl_seconds: int) -> bool:
        """EXPIRE; False при недоступности."""
        return bool(await self._call(lambda: self._client.expire(key, int(ttl_seconds)), default=False))

    async def ttl(self, key: str) -> Optional[int]:
        """TTL ключа в секундах; None при недоступности (-2 нет ключа, -1 без TTL)."""
        return await self._call(lambda: self._client.ttl(key))

    async def delete(self, *keys: str) -> int:
        """DEL; 0 при недоступности."""
        return int(await self._call(lambda: self._client.delete(*keys), default=0) or 0)

    async def keys(self, pattern: str) -> list:
        """SCAN по маске (для админ-функций); пустой список при недоступности."""
        if not await self.is_available():
            return []
        try:
            found = []
            async for key in self._client.scan_iter(match=pattern):
                found.append(key.decode() if isinstance(key, bytes) else key)
            return found
        except Exception as exc:
            self._mark_broken(exc)
            return []

    # ───────────────────────────── Служебное ─────────────────────────────

    @staticmethod
    async def _aclose_quietly(client: Any) -> None:
        """Закрывает соединения клиента, глуша любые ошибки."""
        try:
            await client.aclose()
        except Exception:
            pass

    def reset(self) -> None:
        """Полный сброс состояния (используется в тестах).

        Закрытие async-клиента требует loop: если loop запущен — планируем
        aclose фоновой задачей, иначе просто отбрасываем ссылку.
        """
        client, self._client = self._client, None
        self._available = False
        self._next_check_at = None
        if client is None:
            return
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        # Сильная ссылка на задачу: loop держит лишь weakref (docs: asyncio.create_task)
        task = loop.create_task(self._aclose_quietly(client))
        _close_tasks.add(task)
        task.add_done_callback(_close_tasks.discard)
        task.add_done_callback(lambda t: t.exception() if not t.cancelled() else None)


# Ссылки на фоновые close-задачи (защита от сбора GC до завершения)
_close_tasks: set = set()


# Единственный экземпляр на процесс
redis_client = RedisClient()


async def storage_uri_for_limiter() -> str:
    """URI хранилища для slowapi Limiter (redis при доступности, иначе memory://).

    БОЛЬШЕ НЕ ИСПОЛЬЗУЕТСЯ прод-кодом: api/rate_limiter.py намеренно держит
    limiter на memory:// — см. комментарий там (отказ Redis в рантайме не должен
    ронять авторизацию 500-ми). Функция оставлена для диагностики и тестов.
    """
    return settings.REDIS_URL if await redis_client.is_available() else "memory://"
