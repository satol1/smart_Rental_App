# api/services/brute_force_protection_service.py
"""
Сервис защиты от брутфорс атак.

Стратегия хранения — простой if без лишних абстракций:
- если Redis доступен — счётчики попыток INCR + EXPIRE (окно 15 мин),
  ключ блокировки SETEX (60 мин); состояние разделяется между воркерами;
- иначе — прежнее in-memory хранилище (dict/deque), которое используется
  в деве без редиса и как fallback при его отказе.
"""

import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from collections import defaultdict, deque

from api.services.redis_client import redis_client
from api.services.security_audit_service import SecurityAuditService

logger = logging.getLogger(__name__)

# Префиксы ключей в Redis
_ATTEMPTS_KEY_PREFIX = "bf:attempts:"
_BLOCK_KEY_PREFIX = "bf:block:"


class BruteForceProtectionService:
    """Сервис защиты от брутфорс атак."""

    # In-memory fallback-счётчики — АТРИБУТЫ КЛАССА: сервис создаётся Factory
    # на каждый запрос, а состояние должно накапливаться в рамках процесса
    # (иначе in-memory защита без Redis никогда не срабатывала)
    attempts: Dict[str, deque] = defaultdict(lambda: deque())
    blocked_ips: Dict[str, datetime] = {}

    def __init__(self, security_audit_service: SecurityAuditService):
        self.security_audit_service = security_audit_service

        # Настройки защиты
        self.max_attempts = 5  # Максимум попыток
        self.window_minutes = 15  # Окно времени в минутах
        self.block_duration_minutes = 60  # Длительность блокировки в минутах

        # In-memory хранилище живёт на КЛАССЕ (см. объявление ниже) —
        # инстансов у сервиса много (Factory), состояние одно на процесс

        # Whitelist доверенных IP
        self.whitelist = {
            "127.0.0.1",
            "::1",
            "localhost"
        }

    def _redis_is_used(self) -> bool:
        """Счётчики хранятся в Redis (иначе in-memory fallback)."""
        return redis_client.is_available()

    def _is_whitelisted(self, ip_address: str) -> bool:
        """Проверка, находится ли IP в whitelist."""
        return ip_address in self.whitelist

    def _clean_old_attempts(self, ip_address: str):
        """Очистка старых попыток для IP (in-memory путь)."""
        now = time.time()
        window_start = now - (self.window_minutes * 60)

        attempts = self.attempts[ip_address]
        while attempts and attempts[0] < window_start:
            attempts.popleft()

    def _get_attempts_count(self, ip_address: str) -> int:
        """Количество неудачных попыток в активном окне (redis или in-memory)."""
        if self._redis_is_used():
            raw = redis_client.get(_ATTEMPTS_KEY_PREFIX + ip_address)
            return int(raw) if raw is not None else 0
        self._clean_old_attempts(ip_address)
        return len(self.attempts[ip_address])

    def _get_block_until(self, ip_address: str) -> Optional[datetime]:
        """Момент окончания блокировки либо None (redis или in-memory)."""
        if self._redis_is_used():
            if not self._is_ip_blocked(ip_address):
                return None
            ttl = redis_client.ttl(_BLOCK_KEY_PREFIX + ip_address)
            if ttl is None or ttl <= 0:
                return None
            return datetime.utcnow() + timedelta(seconds=ttl)
        return self.blocked_ips.get(ip_address)

    def _is_ip_blocked(self, ip_address: str) -> bool:
        """Проверка, заблокирован ли IP."""
        if self._redis_is_used():
            return redis_client.get(_BLOCK_KEY_PREFIX + ip_address) is not None
        if ip_address in self.blocked_ips:
            block_until = self.blocked_ips[ip_address]
            if datetime.utcnow() < block_until:
                return True
            else:
                # Блокировка истекла
                del self.blocked_ips[ip_address]
        return False

    def _block_ip(self, ip_address: str):
        """Блокировка IP адреса."""
        if self._redis_is_used():
            redis_client.setex(
                _BLOCK_KEY_PREFIX + ip_address,
                self.block_duration_minutes * 60,
                datetime.utcnow().timestamp(),
            )
            logger.warning(f"IP {ip_address} blocked in redis for {self.block_duration_minutes} minutes")
            return

        block_until = datetime.utcnow() + timedelta(minutes=self.block_duration_minutes)
        self.blocked_ips[ip_address] = block_until

        logger.warning(f"IP {ip_address} blocked until {block_until}")

    async def record_failed_attempt(self, ip_address: str, user_email: str) -> bool:
        """
        Запись неудачной попытки входа.

        Returns:
            bool: True если IP заблокирован, False если можно продолжать
        """
        if self._is_whitelisted(ip_address):
            return False

        if self._is_ip_blocked(ip_address):
            return True

        # Увеличиваем счётчик попыток
        if self._redis_is_used():
            attempts_key = _ATTEMPTS_KEY_PREFIX + ip_address
            attempt_count = redis_client.incr(attempts_key)
            if attempt_count is None:
                # Redis сломался посреди операции — фиксируем попытку in-memory
                self.attempts[ip_address].append(time.time())
                attempt_count = len(self.attempts[ip_address])
            else:
                # TTL ставим на каждую попытку: если expire однажды молча
                # не сработал, ключ не должен остаться жить без TTL
                redis_client.expire(attempts_key, self.window_minutes * 60)
        else:
            # Очищаем старые попытки
            self._clean_old_attempts(ip_address)

            # Добавляем новую попытку
            now = time.time()
            self.attempts[ip_address].append(now)
            attempt_count = len(self.attempts[ip_address])

        # Логируем попытку
        await self.security_audit_service.log_login_attempt(
            email=user_email,
            success=False,
            ip_address=ip_address,
            failure_reason="Invalid credentials"
        )

        if attempt_count >= self.max_attempts:
            # Блокируем IP
            self._block_ip(ip_address)

            # Логируем блокировку
            await self.security_audit_service.log_brute_force_attempt(
                ip_address=ip_address,
                attempt_count=attempt_count,
                blocked=True
            )

            return True

        return False

    async def record_successful_login(self, ip_address: str, user_email: str):
        """Запись успешного входа (очищает счетчик попыток)."""
        if self._redis_is_used():
            redis_client.delete(_ATTEMPTS_KEY_PREFIX + ip_address)
        elif ip_address in self.attempts:
            del self.attempts[ip_address]

        # Логируем успешный вход
        await self.security_audit_service.log_login_attempt(
            email=user_email,
            success=True,
            ip_address=ip_address
        )

    def can_attempt_login(self, ip_address: str) -> Tuple[bool, Optional[str]]:
        """
        Проверка, можно ли пытаться войти с данного IP.

        Returns:
            Tuple[bool, Optional[str]]: (можно_ли, причина_блокировки)
        """
        if self._is_whitelisted(ip_address):
            return True, None

        if self._is_ip_blocked(ip_address):
            block_until = self._get_block_until(ip_address)
            until_str = block_until.strftime('%H:%M:%S') if block_until else "истечение TTL"
            return False, f"IP заблокирован до {until_str}"

        attempt_count = self._get_attempts_count(ip_address)
        if attempt_count >= self.max_attempts:
            return False, f"Превышено максимальное количество попыток ({self.max_attempts})"

        remaining = self.max_attempts - attempt_count
        if remaining <= 2:  # Предупреждение при приближении к лимиту
            return True, f"Осталось попыток: {remaining}"

        return True, None

    def get_attempt_stats(self, ip_address: str) -> Dict[str, any]:
        """Получение статистики попыток для IP."""
        attempt_count = self._get_attempts_count(ip_address)
        is_blocked = self._is_ip_blocked(ip_address)

        return {
            "ip_address": ip_address,
            "attempt_count": attempt_count,
            "max_attempts": self.max_attempts,
            "is_blocked": is_blocked,
            "blocked_until": self._get_block_until(ip_address) if is_blocked else None,
            "remaining_attempts": max(0, self.max_attempts - attempt_count),
            "is_whitelisted": self._is_whitelisted(ip_address)
        }

    def unblock_ip(self, ip_address: str) -> bool:
        """Разблокировка IP адреса (для админов)."""
        if self._redis_is_used():
            was_blocked = redis_client.get(_BLOCK_KEY_PREFIX + ip_address) is not None
            # Снимаем и блок-ключ, и счётчик попыток: иначе can_attempt_login
            # продолжит видеть counter >= max и вход останется невозможным
            redis_client.delete(_BLOCK_KEY_PREFIX + ip_address)
            redis_client.delete(_ATTEMPTS_KEY_PREFIX + ip_address)
            if was_blocked:
                logger.info(f"IP {ip_address} unblocked by admin")
            return was_blocked

        if ip_address in self.blocked_ips:
            del self.blocked_ips[ip_address]
            logger.info(f"IP {ip_address} unblocked by admin")
            return True
        return False

    def add_to_whitelist(self, ip_address: str):
        """Добавление IP в whitelist."""
        self.whitelist.add(ip_address)
        logger.info(f"IP {ip_address} added to whitelist")

    def remove_from_whitelist(self, ip_address: str):
        """Удаление IP из whitelist."""
        self.whitelist.discard(ip_address)
        logger.info(f"IP {ip_address} removed from whitelist")

    def get_all_blocked_ips(self) -> Dict[str, datetime]:
        """Получение списка всех заблокированных IP."""
        if self._redis_is_used():
            blocked: Dict[str, datetime] = {}
            for key in redis_client.keys(_BLOCK_KEY_PREFIX + "*"):
                ip_address = key[len(_BLOCK_KEY_PREFIX):]
                block_until = self._get_block_until(ip_address)
                if block_until is not None:
                    blocked[ip_address] = block_until
            return blocked

        # Очищаем истекшие блокировки
        now = datetime.utcnow()
        expired_ips = [
            ip for ip, block_until in self.blocked_ips.items()
            if now >= block_until
        ]

        for ip in expired_ips:
            del self.blocked_ips[ip]

        return self.blocked_ips.copy()

    def cleanup_expired_data(self):
        """Очистка истекших данных (вызывать периодически).

        В redis-пути истечение обрабатывают TTL ключей — чистить нечего.
        """
        if self._redis_is_used():
            logger.debug("Brute force data handled by redis TTL")
            return

        # Очистка истекших блокировок
        now = datetime.utcnow()
        expired_ips = [
            ip for ip, block_until in self.blocked_ips.items()
            if now >= block_until
        ]

        for ip in expired_ips:
            del self.blocked_ips[ip]

        # Очистка старых попыток для всех IP
        for ip_address in list(self.attempts.keys()):
            self._clean_old_attempts(ip_address)
            if not self.attempts[ip_address]:  # Если список пуст
                del self.attempts[ip_address]

        logger.debug("Brute force protection data cleaned up")
