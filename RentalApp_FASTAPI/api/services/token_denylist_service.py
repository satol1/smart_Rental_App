# api/services/token_denylist_service.py
"""
Denylist отозванных refresh-токенов (по claim "jti").

Стратегия хранения — простой if без лишних абстракций:
- если Redis доступен — ключ denylist:<jti> с TTL до истечения токена
  (разделяется между процессами/воркерами, переживает рестарт);
- иначе — потокобезопасный in-memory dict с ленивой TTL-очисткой
  (дев без редиса, отказ редиса на лету).

Интерфейс (deny/is_denied) не зависит от выбранного хранилища.
"""

import logging
import threading
import time
from typing import Dict

from api.services.redis_client import redis_client

logger = logging.getLogger(__name__)

_REDIS_KEY_PREFIX = "denylist:"


class TokenDenylistService:
    """Denylist refresh-токенов: Redis при доступности, иначе in-memory с TTL."""

    def __init__(self) -> None:
        self._denied: Dict[str, float] = {}
        self._lock = threading.Lock()

    async def deny(self, jti: str, expires_at: float) -> None:
        """Отзывает токен: jti вносится в denylist до момента его истечения.

        :param jti: уникальный идентификатор токена (claim "jti")
        :param expires_at: unix timestamp истечения токена (claim "exp")
        """
        if not jti:
            return
        # Нет смысла денонсировать уже истёкший токен
        ttl_until = max(float(expires_at), time.time())

        if await redis_client.is_available():
            ttl_seconds = max(1, int(ttl_until - time.time()))
            await redis_client.setex(_REDIS_KEY_PREFIX + jti, ttl_seconds, ttl_until)
            logger.debug("Refresh-токен отозван в redis (jti=%s, ttl=%ss)", jti, ttl_seconds)
            return

        with self._lock:
            self._denied[jti] = ttl_until
            # Заодно чистим протухшие записи, чтобы dict не рос бесконечно
            self._cleanup_locked()
        logger.debug("Refresh-токен отозван in-memory (jti=%s, до %s)", jti, ttl_until)

    async def is_denied(self, jti: str) -> bool:
        """Проверяет, отозван ли токен с данным jti."""
        if not jti:
            return False

        if await redis_client.is_available():
            return await redis_client.get(_REDIS_KEY_PREFIX + jti) is not None

        with self._lock:
            expires_at = self._denied.get(jti)
            if expires_at is None:
                return False
            if expires_at <= time.time():
                del self._denied[jti]
                return False
            return True

    def cleanup(self) -> int:
        """Явная очистка истёкших записей (in-memory путь). Возвращает число удалённых."""
        with self._lock:
            return self._cleanup_locked()

    def clear(self) -> None:
        """Полная очистка (используется в тестах)."""
        with self._lock:
            self._denied.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._denied)

    def _cleanup_locked(self) -> int:
        now = time.time()
        expired = [jti for jti, expires_at in self._denied.items() if expires_at <= now]
        for jti in expired:
            del self._denied[jti]
        return len(expired)


# Единственный экземпляр на процесс (redis при доступности, иначе in-memory)
_token_denylist = TokenDenylistService()


def get_token_denylist() -> TokenDenylistService:
    """Возвращает process-wide экземпляр denylist-сервиса."""
    return _token_denylist
