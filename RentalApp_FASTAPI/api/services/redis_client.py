# api/services/redis_client.py
"""
Ленивый синхронный Redis-клиент с деградацией.

Redis опционален для приложения: при недоступности (не поднялся, упал,
ошибка сети) все операции возвращают безопасные значения по умолчанию,
а вызывающий код (denylist, brute-force, кэш, rate limiter) уходит
в in-memory fallback. Ошибки редиса НИКОГДА не роняют приложение.

Синхронный клиент выбран сознательно: используемые операции
(get/setex/incr/expire/delete) тривиальны и не требуют asyncio-обвязки;
slowapi/limits также работает с sync redis:// URI.
"""

import logging
import threading
import time
from typing import Any, Callable, Optional

from config.core import settings

logger = logging.getLogger(__name__)

# Как часто перепроверять упавший Redis (чтобы не добавлять latency
# на каждый запрос, но и не требовать рестарта при восстановлении).
_RETRY_INTERVAL_SECONDS = 30.0
_CONNECT_TIMEOUT_SECONDS = 1.0


class RedisClient:
    """Потокобезопасная обертка над redis-py: ленивое подключение, ping, fallback."""

    def __init__(self, url: Optional[str] = None) -> None:
        self._url = url or settings.REDIS_URL
        self._client: Any = None
        self._available: bool = False
        self._next_check_at: Optional[float] = None
        self._lock = threading.Lock()

    # ───────────────────────────── Доступность ─────────────────────────────

    def is_available(self) -> bool:
        """True, если Redis отвечает на ping. Кеширует результат,
        перепроверяя не чаще раза в _RETRY_INTERVAL_SECONDS."""
        with self._lock:
            if self._available and self._client is not None:
                return True
            now = time.monotonic()
            if self._next_check_at is not None and now < self._next_check_at:
                return False
            try:
                if self._client is None:
                    import redis as redis_py

                    self._client = redis_py.Redis.from_url(
                        self._url,
                        socket_connect_timeout=_CONNECT_TIMEOUT_SECONDS,
                        socket_timeout=_CONNECT_TIMEOUT_SECONDS,
                    )
                if not self._client.ping():
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
        with self._lock:
            self._available = False
            self._next_check_at = time.monotonic() + _RETRY_INTERVAL_SECONDS
        logger.warning("Ошибка операции Redis (%s): %s — временно in-memory fallback", self._url, exc)

    def _call(self, op: Callable[[], Any], default: Any = None) -> Any:
        """Выполняет операцию, никогда не бросая исключений наружу."""
        if not self.is_available():
            return default
        try:
            return op()
        except Exception as exc:
            self._mark_broken(exc)
            return default

    # ───────────────────────────── Операции ─────────────────────────────

    def get(self, key: str) -> Any:
        """GET; None при недоступности/отсутствии ключа."""
        return self._call(lambda: self._client.get(key))

    def setex(self, key: str, ttl_seconds: int, value: Any) -> bool:
        """SETEX (значение + TTL); False при недоступности."""
        return bool(
            self._call(lambda: self._client.setex(key, int(ttl_seconds), value), default=False)
        )

    def incr(self, key: str) -> Optional[int]:
        """INCR; None при недоступности (вызывающий код уходит в fallback)."""
        return self._call(lambda: self._client.incr(key))

    def expire(self, key: str, ttl_seconds: int) -> bool:
        """EXPIRE; False при недоступности."""
        return bool(self._call(lambda: self._client.expire(key, int(ttl_seconds)), default=False))

    def ttl(self, key: str) -> Optional[int]:
        """TTL ключа в секундах; None при недоступности (-2 нет ключа, -1 без TTL)."""
        return self._call(lambda: self._client.ttl(key))

    def delete(self, *keys: str) -> int:
        """DEL; 0 при недоступности."""
        return int(self._call(lambda: self._client.delete(*keys), default=0) or 0)

    def keys(self, pattern: str) -> list:
        """SCAN по маске (для админ-функций); пустой список при недоступности."""
        if not self.is_available():
            return []
        try:
            return [k.decode() if isinstance(k, bytes) else k for k in self._client.scan_iter(match=pattern)]
        except Exception as exc:
            self._mark_broken(exc)
            return []

    # ───────────────────────────── Служебное ─────────────────────────────

    def reset(self) -> None:
        """Полный сброс состояния (используется в тестах)."""
        with self._lock:
            client, self._client = self._client, None
            self._available = False
            self._next_check_at = None
        if client is not None:
            try:
                client.close()
            except Exception:
                pass


# Единственный экземпляр на процесс
redis_client = RedisClient()


def storage_uri_for_limiter() -> str:
    """URI хранилища для slowapi Limiter (redis при доступности, иначе memory://).

    БОЛЬШЕ НЕ ИСПОЛЬЗУЕТСЯ прод-кодом: api/rate_limiter.py намеренно держит
    limiter на memory:// — см. комментарий там (отказ Redis в рантайме не должен
    ронять авторизацию 500-ми). Функция оставлена для диагностики и тестов.
    """
    return settings.REDIS_URL if redis_client.is_available() else "memory://"
