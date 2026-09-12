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
from typing import Dict, Optional, Tuple

from api.services.redis_client import redis_client

logger = logging.getLogger(__name__)

_REDIS_KEY_PREFIX = "denylist:"
_USER_FENCE_PREFIX = "user_fence:"


class TokenDenylistService:
    """Denylist refresh-токенов: Redis при доступности, иначе in-memory с TTL."""

    def __init__(self) -> None:
        # jti -> (denied_at, expires_at): момент отзыва нужен grace-периоду
        # reuse-детекта ротации (гонка мульти-вкладок ≠ кража)
        self._denied: Dict[str, Tuple[float, float]] = {}
        # «Забор» отзыва всех сессий пользователя: user_id -> (fence_ts, expires_at).
        # Refresh-токены с iat < fence_ts считаются отозванными (reuse-детект ротации).
        self._user_fences: Dict[str, Tuple[float, float]] = {}
        self._lock = threading.Lock()

    async def deny(self, jti: str, expires_at: float) -> None:
        """Отзывает токен: jti вносится в denylist до момента его истечения.

        :param jti: уникальный идентификатор токена (claim "jti")
        :param expires_at: unix timestamp истечения токена (claim "exp")
        """
        if not jti:
            return
        # Нет смысла денонсировать уже истёкший токен
        now = time.time()
        ttl_until = max(float(expires_at), now)

        if await redis_client.is_available():
            ttl_seconds = max(1, int(ttl_until - now))
            # Значение — момент отзыва (нужен grace-периоду reuse-детекта)
            await redis_client.setex(_REDIS_KEY_PREFIX + jti, ttl_seconds, now)
            logger.debug("Refresh-токен отозван в redis (jti=%s, ttl=%ss)", jti, ttl_seconds)
            return

        with self._lock:
            self._denied[jti] = (now, ttl_until)
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
            record = self._denied.get(jti)
            if record is None:
                return False
            _, expires_at = record
            if expires_at <= time.time():
                del self._denied[jti]
                return False
            return True

    async def get_denied_at(self, jti: str) -> Optional[float]:
        """Момент отзыва токена (unix ts) либо None.

        Нужен grace-периоду reuse-детекта ротации: повторное использование
        сразу после ротации — почти наверняка гонка мульти-вкладок, а не кража.
        Легаси-записи (значение = expires_at) дают «будущий» момент и попадают
        в grace — безопаснее для доступности.
        """
        if not jti:
            return None
        if await redis_client.is_available():
            value = await redis_client.get(_REDIS_KEY_PREFIX + jti)
            try:
                return float(value) if value is not None else None
            except (TypeError, ValueError):
                return None
        with self._lock:
            record = self._denied.get(jti)
            if record is None:
                return None
            denied_at, expires_at = record
            if expires_at <= time.time():
                del self._denied[jti]
                return None
            return denied_at

    async def set_user_fence(self, user_id: str, fence_at: float, expires_at: float) -> None:
        """Отзывает ВСЕ сессии пользователя: refresh-токены, выданные до fence_at
        (claim iat), далее отклоняются. Ставится при повторном использовании
        уже ротированного/отозванного токена (признак кражи cookie).

        :param fence_at: unix timestamp момента отзыва
        :param expires_at: unix timestamp, до которого забор актуален
                           (достаточно TTL самого длинного refresh-токена)
        """
        if not user_id:
            return
        if await redis_client.is_available():
            ttl_seconds = max(1, int(max(expires_at, time.time()) - time.time()))
            await redis_client.setex(_USER_FENCE_PREFIX + user_id, ttl_seconds, fence_at)
            logger.warning("Отзыв всех сессий пользователя (user=%s, fence=%s)", user_id, fence_at)
            return
        with self._lock:
            self._user_fences[user_id] = (fence_at, max(expires_at, time.time()))

    async def get_user_fence(self, user_id: str) -> Optional[float]:
        """Возвращает timestamp отзыва всех сессий пользователя либо None."""
        if not user_id:
            return None
        if await redis_client.is_available():
            value = await redis_client.get(_USER_FENCE_PREFIX + user_id)
            try:
                return float(value) if value is not None else None
            except (TypeError, ValueError):
                return None
        with self._lock:
            record = self._user_fences.get(user_id)
            if record is None:
                return None
            fence_at, expires_at = record
            if expires_at <= time.time():
                del self._user_fences[user_id]
                return None
            return fence_at

    def cleanup(self) -> int:
        """Явная очистка истёкших записей (in-memory путь). Возвращает число удалённых."""
        with self._lock:
            return self._cleanup_locked()

    def clear(self) -> None:
        """Полная очистка (используется в тестах)."""
        with self._lock:
            self._denied.clear()
            self._user_fences.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._denied)

    def _cleanup_locked(self) -> int:
        now = time.time()
        expired = [jti for jti, (_, expires_at) in self._denied.items() if expires_at <= now]
        for jti in expired:
            del self._denied[jti]
        return len(expired)


# Единственный экземпляр на процесс (redis при доступности, иначе in-memory)
_token_denylist = TokenDenylistService()


def get_token_denylist() -> TokenDenylistService:
    """Возвращает process-wide экземпляр denylist-сервиса."""
    return _token_denylist
