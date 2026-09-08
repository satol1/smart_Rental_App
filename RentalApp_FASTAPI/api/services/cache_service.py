# api/services/cache_service.py
"""
Простой кэш агрегатов: Redis при доступности, иначе in-memory с TTL.

Используется для тяжёлых агрегатов (например, сводка админ-дашборда),
чтобы не дёргать репозитории на каждый запрос. Инвалидация — явная,
из command-сервисов при мутациях (см. invalidate_dashboard_summary).
"""

import json
import logging
import threading
import time
from typing import Any, Optional

from api.services.redis_client import redis_client

logger = logging.getLogger(__name__)

DASHBOARD_SUMMARY_KEY = "dashboard:summary"
DASHBOARD_SUMMARY_TTL_SECONDS = 60


class AppCache:
    """JSON-кэш с TTL: redis-или-in-memory (тот же redis-клиент с fallback)."""

    def __init__(self, redis: Any = None) -> None:
        self._redis = redis if redis is not None else redis_client
        self._memory: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get_json(self, key: str) -> Optional[Any]:
        """Возвращает распарсенное значение либо None (нет/истёк/redis упал)."""
        try:
            if self._redis.is_available():
                raw = self._redis.get(key)
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

    def set_json(self, key: str, value: Any, ttl_seconds: int) -> None:
        """Кладёт значение с TTL. Ошибки подавляются (кэш не критичен)."""
        try:
            if self._redis.is_available():
                self._redis.setex(key, ttl_seconds, json.dumps(value, default=str))
                return
            with self._lock:
                self._memory[key] = (time.time() + ttl_seconds, value)
        except Exception as exc:
            logger.warning("Cache set(%s) failed: %s — пропускаем", key, exc)

    def invalidate(self, *keys: str) -> None:
        """Удаляет ключи из обоих хранилищ. Никогда не бросает."""
        try:
            with self._lock:
                for key in keys:
                    self._memory.pop(key, None)
            if keys and self._redis.is_available():
                self._redis.delete(*keys)
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
    """
    app_cache.invalidate(DASHBOARD_SUMMARY_KEY)
