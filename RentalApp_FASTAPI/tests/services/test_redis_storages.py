# tests/services/test_redis_storages.py
"""
T044: Redis-пути хранилищ (denylist, brute-force, rate limiter) с моком redis-клиента.

Существующие тесты (test_token_type_safety.py, test_brute_force_protection_service.py,
test_rate_limiting.py) гоняют in-memory fallback без редиса; эти тесты проверяют
redis-ветку каждого хранилища через fake-объект с get/setex/incr/expire.
"""

import time

import pytest
from unittest.mock import AsyncMock, MagicMock

from api.services import redis_client as redis_module
from api.services.brute_force_protection_service import BruteForceProtectionService
from api.services.redis_client import storage_uri_for_limiter
from api.services.security_audit_service import SecurityAuditService
from api.services.token_denylist_service import TokenDenylistService
from config.core import settings


class FakeRedis:
    """Минимальный fake async redis-клиента: get/setex/incr/expire/delete/ttl/keys."""

    def __init__(self):
        self.data: dict = {}       # key -> value
        self.expires: dict = {}    # key -> unix ts
        self.now = time.time()

    # ── служебное ──
    def _alive(self, key) -> bool:
        expires_at = self.expires.get(key)
        return expires_at is None or expires_at > self.now

    def fast_forward(self, seconds: float):
        self.now += seconds

    # ── API redis (async, как у redis.asyncio) ──
    async def get(self, key):
        if key in self.data and self._alive(key):
            return self.data[key]
        return None

    async def setex(self, key, ttl_seconds, value):
        self.data[key] = value
        self.expires[key] = self.now + int(ttl_seconds)
        return True

    async def incr(self, key):
        value = int(self.data[key]) if self._alive(key) and key in self.data else 0
        value += 1
        self.data[key] = value
        # incr не сбрасывает TTL; если ключа ещё не было — TTL нет, как в redis
        if key in self.expires and not self._alive(key):
            self.expires.pop(key, None)
        return value

    async def expire(self, key, ttl_seconds):
        if key in self.data:
            self.expires[key] = self.now + int(ttl_seconds)
            return True
        return False

    async def ttl(self, key):
        if key not in self.data or not self._alive(key):
            return -2
        expires_at = self.expires.get(key)
        return int(expires_at - self.now) if expires_at else -1

    async def delete(self, *keys):
        deleted = 0
        for key in keys:
            if key in self.data:
                del self.data[key]
                self.expires.pop(key, None)
                deleted += 1
        return deleted

    async def keys(self, pattern):
        prefix = pattern.rstrip("*")
        return [k for k in self.data if k.startswith(prefix) and self._alive(k)]


@pytest.fixture
def fake_redis(monkeypatch):
    """Подменяет singleton redis-клиента на fake: хранилища идут по redis-пути."""
    fake = FakeRedis()
    monkeypatch.setattr(redis_module.redis_client, "is_available", AsyncMock(return_value=True))
    monkeypatch.setattr(redis_module.redis_client, "get", fake.get)
    monkeypatch.setattr(redis_module.redis_client, "setex", fake.setex)
    monkeypatch.setattr(redis_module.redis_client, "incr", fake.incr)
    monkeypatch.setattr(redis_module.redis_client, "expire", fake.expire)
    monkeypatch.setattr(redis_module.redis_client, "ttl", fake.ttl)
    monkeypatch.setattr(redis_module.redis_client, "delete", fake.delete)
    monkeypatch.setattr(redis_module.redis_client, "keys", fake.keys)
    return fake


# ═══════════════════════════ TokenDenylistService ═══════════════════════════

class TestTokenDenylistRedisPath:

    async def test_deny_writes_key_with_ttl(self, fake_redis):
        denylist = TokenDenylistService()

        await denylist.deny("jti-redis-1", expires_at=time.time() + 3600)

        assert "denylist:jti-redis-1" in fake_redis.data
        assert fake_redis.expires["denylist:jti-redis-1"] > time.time() + 3500

    async def test_deny_of_expired_token_writes_min_ttl(self, fake_redis):
        """Уже истёкший токен всё равно денонсируется минимум на 1 секунду."""
        denylist = TokenDenylistService()

        await denylist.deny("jti-late", expires_at=time.time() - 10)

        assert "denylist:jti-late" in fake_redis.data

    async def test_is_denied_reads_redis(self, fake_redis):
        denylist = TokenDenylistService()
        await denylist.deny("jti-redis-2", expires_at=time.time() + 3600)

        assert await denylist.is_denied("jti-redis-2") is True
        assert await denylist.is_denied("jti-unknown") is False

    async def test_is_denied_false_after_ttl_expiry(self, fake_redis):
        denylist = TokenDenylistService()
        await denylist.deny("jti-ttl", expires_at=time.time() + 60)

        fake_redis.fast_forward(61)

        assert await denylist.is_denied("jti-ttl") is False


# ═══════════════════════ BruteForceProtectionService ═══════════════════════

@pytest.fixture
def brute_force_service(fake_redis):
    # In-memory счётчики живут на классе (общие на процесс) — сбрасываем
    # для изоляции тестов между собой
    BruteForceProtectionService.attempts.clear()
    BruteForceProtectionService.blocked_ips.clear()
    audit = MagicMock(spec=SecurityAuditService)
    audit.log_login_attempt = AsyncMock()
    audit.log_brute_force_attempt = AsyncMock()
    return BruteForceProtectionService(security_audit_service=audit)


class TestBruteForceRedisPath:

    async def test_failed_attempt_incr_and_window_expire(self, brute_force_service, fake_redis):
        result = await brute_force_service.record_failed_attempt("10.0.0.1", "user@example.com")

        assert result is False
        assert fake_redis.data["bf:attempts:10.0.0.1"] == 1
        # Первая попытка запускает TTL окна (15 минут)
        assert fake_redis.expires["bf:attempts:10.0.0.1"] > time.time() + 14 * 60

    async def test_max_attempts_blocks_via_setex(self, brute_force_service, fake_redis):
        ip = "10.0.0.2"
        for _ in range(brute_force_service.max_attempts):
            result = await brute_force_service.record_failed_attempt(ip, "user@example.com")

        assert result is True
        # Ключ блокировки с TTL 60 минут
        assert "bf:block:" + ip in fake_redis.data
        assert fake_redis.expires["bf:block:" + ip] > time.time() + 59 * 60
        brute_force_service.security_audit_service.log_brute_force_attempt.assert_awaited()

    async def test_blocked_ip_rejected_by_can_attempt_login(self, brute_force_service, fake_redis):
        ip = "10.0.0.3"
        await fake_redis.setex("bf:block:" + ip, 3600, "1")

        can_attempt, reason = await brute_force_service.can_attempt_login(ip)

        assert can_attempt is False
        assert "заблокирован" in reason.lower()

    async def test_successful_login_deletes_counter(self, brute_force_service, fake_redis):
        ip = "10.0.0.4"
        await brute_force_service.record_failed_attempt(ip, "user@example.com")
        assert "bf:attempts:" + ip in fake_redis.data

        await brute_force_service.record_successful_login(ip, "user@example.com")

        assert "bf:attempts:" + ip not in fake_redis.data

    async def test_unblock_and_list_blocked(self, brute_force_service, fake_redis):
        ip = "10.0.0.5"
        await brute_force_service._block_ip(ip)

        blocked = await brute_force_service.get_all_blocked_ips()
        assert ip in blocked
        assert blocked[ip] is not None

        assert await brute_force_service.unblock_ip(ip) is True
        assert await brute_force_service.unblock_ip(ip) is False
        assert ip not in await brute_force_service.get_all_blocked_ips()


# ═══════════════════════════ Rate limiter storage ═══════════════════════════

class TestRateLimiterStorageSelection:

    async def test_storage_uri_redis_when_available(self, monkeypatch):
        monkeypatch.setattr(redis_module.redis_client, "is_available", AsyncMock(return_value=True))

        assert await storage_uri_for_limiter() == settings.REDIS_URL

    async def test_storage_uri_memory_when_unavailable(self, monkeypatch):
        monkeypatch.setattr(redis_module.redis_client, "is_available", AsyncMock(return_value=False))

        assert await storage_uri_for_limiter() == "memory://"

    def test_module_limiter_uses_memory_in_test_env(self):
        """В тестовом окружении (без редиса) limiter создан с memory-хранилищем."""
        from api.rate_limiter import limiter

        assert limiter._storage_uri == "memory://"
