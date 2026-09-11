# tests/services/test_brute_force_protection_service.py
"""
Тесты для BruteForceProtectionService - сервиса защиты от брутфорс атак.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timedelta
import time

from api.services.brute_force_protection_service import BruteForceProtectionService
from api.services.security_audit_service import SecurityAuditService


class TestBruteForceProtectionService:
    """Тесты для BruteForceProtectionService."""

    @pytest.fixture
    def mock_security_audit_service(self):
        """Создает мок сервиса аудита безопасности."""
        service = MagicMock(spec=SecurityAuditService)
        service.log_login_attempt = AsyncMock()
        service.log_brute_force_attempt = AsyncMock()
        return service

    @pytest.fixture
    def brute_force_service(self, mock_security_audit_service):
        """Создает экземпляр BruteForceProtectionService."""
        # In-memory счётчики живут на классе (общие на процесс) — сбрасываем
        BruteForceProtectionService.attempts.clear()
        BruteForceProtectionService.blocked_ips.clear()
        return BruteForceProtectionService(security_audit_service=mock_security_audit_service)

    # === ТЕСТЫ ДЛЯ whitelist ===

    def test_is_whitelisted_localhost(self, brute_force_service):
        """Тест проверки whitelist для localhost."""
        assert brute_force_service._is_whitelisted("127.0.0.1") is True
        assert brute_force_service._is_whitelisted("::1") is True
        assert brute_force_service._is_whitelisted("localhost") is True

    def test_is_whitelisted_regular_ip(self, brute_force_service):
        """Тест проверки whitelist для обычного IP."""
        assert brute_force_service._is_whitelisted("192.168.1.1") is False

    def test_add_to_whitelist(self, brute_force_service):
        """Тест добавления IP в whitelist."""
        brute_force_service.add_to_whitelist("192.168.1.100")
        assert brute_force_service._is_whitelisted("192.168.1.100") is True

    def test_remove_from_whitelist(self, brute_force_service):
        """Тест удаления IP из whitelist."""
        brute_force_service.add_to_whitelist("192.168.1.100")
        brute_force_service.remove_from_whitelist("192.168.1.100")
        assert brute_force_service._is_whitelisted("192.168.1.100") is False

    # === ТЕСТЫ ДЛЯ record_failed_attempt ===

    @pytest.mark.asyncio
    async def test_record_failed_attempt_whitelisted(self, brute_force_service, mock_security_audit_service):
        """Тест записи неудачной попытки для whitelisted IP."""
        result = await brute_force_service.record_failed_attempt("127.0.0.1", "user@example.com")
        
        assert result is False
        mock_security_audit_service.log_login_attempt.assert_not_called()

    @pytest.mark.asyncio
    async def test_record_failed_attempt_single(self, brute_force_service, mock_security_audit_service):
        """Тест записи одной неудачной попытки."""
        result = await brute_force_service.record_failed_attempt("192.168.1.1", "user@example.com")
        
        assert result is False
        mock_security_audit_service.log_login_attempt.assert_called_once()
        assert len(brute_force_service.attempts["192.168.1.1"]) == 1

    @pytest.mark.asyncio
    async def test_record_failed_attempt_max_attempts(self, brute_force_service, mock_security_audit_service):
        """Тест блокировки после максимального количества попыток."""
        ip_address = "192.168.1.2"
        
        # Делаем максимальное количество попыток
        for i in range(brute_force_service.max_attempts):
            result = await brute_force_service.record_failed_attempt(ip_address, f"user{i}@example.com")
        
        # Последняя попытка должна заблокировать IP
        assert result is True
        assert ip_address in brute_force_service.blocked_ips
        assert mock_security_audit_service.log_brute_force_attempt.called

    @pytest.mark.asyncio
    async def test_record_failed_attempt_already_blocked(self, brute_force_service, mock_security_audit_service):
        """Тест записи попытки для уже заблокированного IP."""
        ip_address = "192.168.1.3"

        # Блокируем IP
        await brute_force_service._block_ip(ip_address)

        # Попытка должна вернуть True (заблокирован)
        result = await brute_force_service.record_failed_attempt(ip_address, "user@example.com")

        assert result is True

    # === ТЕСТЫ ДЛЯ record_successful_login ===

    @pytest.mark.asyncio
    async def test_record_successful_login_clears_attempts(self, brute_force_service, mock_security_audit_service):
        """Тест очистки попыток при успешном входе."""
        ip_address = "192.168.1.4"
        
        # Делаем несколько неудачных попыток
        await brute_force_service.record_failed_attempt(ip_address, "user@example.com")
        await brute_force_service.record_failed_attempt(ip_address, "user@example.com")
        
        assert len(brute_force_service.attempts[ip_address]) == 2
        
        # Успешный вход должен очистить попытки
        await brute_force_service.record_successful_login(ip_address, "user@example.com")
        
        assert ip_address not in brute_force_service.attempts
        mock_security_audit_service.log_login_attempt.assert_called()

    # === ТЕСТЫ ДЛЯ can_attempt_login ===

    @pytest.mark.asyncio
    async def test_can_attempt_login_whitelisted(self, brute_force_service):
        """Тест проверки возможности входа для whitelisted IP."""
        can_attempt, reason = await brute_force_service.can_attempt_login("127.0.0.1")

        assert can_attempt is True
        assert reason is None

    @pytest.mark.asyncio
    async def test_can_attempt_login_blocked(self, brute_force_service):
        """Тест проверки возможности входа для заблокированного IP."""
        ip_address = "192.168.1.5"
        await brute_force_service._block_ip(ip_address)

        can_attempt, reason = await brute_force_service.can_attempt_login(ip_address)

        assert can_attempt is False
        assert "заблокирован" in reason.lower()

    @pytest.mark.asyncio
    async def test_can_attempt_login_remaining_attempts(self, brute_force_service):
        """Тест проверки оставшихся попыток."""
        ip_address = "192.168.1.6"

        # Добавляем попытки близко к лимиту
        for _ in range(brute_force_service.max_attempts - 1):
            brute_force_service.attempts[ip_address].append(time.time())

        can_attempt, reason = await brute_force_service.can_attempt_login(ip_address)

        assert can_attempt is True
        assert "осталось" in reason.lower() or "попыток" in reason.lower()

    # === ТЕСТЫ ДЛЯ get_attempt_stats ===

    @pytest.mark.asyncio
    async def test_get_attempt_stats(self, brute_force_service):
        """Тест получения статистики попыток."""
        ip_address = "192.168.1.7"

        # Добавляем несколько попыток
        brute_force_service.attempts[ip_address].append(time.time())
        brute_force_service.attempts[ip_address].append(time.time())

        stats = await brute_force_service.get_attempt_stats(ip_address)

        assert stats["ip_address"] == ip_address
        assert stats["attempt_count"] == 2
        assert stats["max_attempts"] == brute_force_service.max_attempts
        assert stats["is_blocked"] is False
        assert stats["remaining_attempts"] == brute_force_service.max_attempts - 2

    @pytest.mark.asyncio
    async def test_get_attempt_stats_blocked(self, brute_force_service):
        """Тест получения статистики для заблокированного IP."""
        ip_address = "192.168.1.8"
        await brute_force_service._block_ip(ip_address)

        stats = await brute_force_service.get_attempt_stats(ip_address)

        assert stats["is_blocked"] is True
        assert stats["blocked_until"] is not None

    # === ТЕСТЫ ДЛЯ unblock_ip ===

    @pytest.mark.asyncio
    async def test_unblock_ip_success(self, brute_force_service):
        """Тест успешной разблокировки IP."""
        ip_address = "192.168.1.9"
        await brute_force_service._block_ip(ip_address)

        result = await brute_force_service.unblock_ip(ip_address)

        assert result is True
        assert ip_address not in brute_force_service.blocked_ips

    @pytest.mark.asyncio
    async def test_unblock_ip_not_blocked(self, brute_force_service):
        """Тест разблокировки незаблокированного IP."""
        result = await brute_force_service.unblock_ip("192.168.1.10")

        assert result is False

    # === ТЕСТЫ ДЛЯ cleanup_expired_data ===

    @pytest.mark.asyncio
    async def test_cleanup_expired_data(self, brute_force_service):
        """Тест очистки истекших данных."""
        ip_address = "192.168.1.11"

        # Блокируем IP с истекшим временем
        brute_force_service.blocked_ips[ip_address] = datetime.utcnow() - timedelta(hours=1)

        # Добавляем старые попытки
        old_time = time.time() - (brute_force_service.window_minutes + 10) * 60
        brute_force_service.attempts[ip_address].append(old_time)

        await brute_force_service.cleanup_expired_data()

        # Истекшая блокировка должна быть удалена
        assert ip_address not in brute_force_service.blocked_ips
        # Старые попытки должны быть удалены
        assert len(brute_force_service.attempts.get(ip_address, [])) == 0

    @pytest.mark.asyncio
    async def test_get_all_blocked_ips(self, brute_force_service):
        """Тест получения всех заблокированных IP."""
        ip1 = "192.168.1.12"
        ip2 = "192.168.1.13"

        await brute_force_service._block_ip(ip1)
        await brute_force_service._block_ip(ip2)

        blocked = await brute_force_service.get_all_blocked_ips()

        assert ip1 in blocked
        assert ip2 in blocked
        assert len(blocked) == 2



