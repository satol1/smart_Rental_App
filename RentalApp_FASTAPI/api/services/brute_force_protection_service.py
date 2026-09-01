# api/services/brute_force_protection_service.py

import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from collections import defaultdict, deque

from api.services.security_audit_service import SecurityAuditService

logger = logging.getLogger(__name__)

class BruteForceProtectionService:
    """Сервис защиты от брутфорс атак."""
    
    def __init__(self, security_audit_service: SecurityAuditService):
        self.security_audit_service = security_audit_service
        
        # Настройки защиты
        self.max_attempts = 5  # Максимум попыток
        self.window_minutes = 15  # Окно времени в минутах
        self.block_duration_minutes = 60  # Длительность блокировки в минутах
        
        # Хранилище попыток по IP
        self.attempts: Dict[str, deque] = defaultdict(lambda: deque())
        self.blocked_ips: Dict[str, datetime] = {}
        
        # Whitelist доверенных IP
        self.whitelist = {
            "127.0.0.1",
            "::1",
            "localhost"
        }
    
    def _is_whitelisted(self, ip_address: str) -> bool:
        """Проверка, находится ли IP в whitelist."""
        return ip_address in self.whitelist
    
    def _clean_old_attempts(self, ip_address: str):
        """Очистка старых попыток для IP."""
        now = time.time()
        window_start = now - (self.window_minutes * 60)
        
        attempts = self.attempts[ip_address]
        while attempts and attempts[0] < window_start:
            attempts.popleft()
    
    def _is_ip_blocked(self, ip_address: str) -> bool:
        """Проверка, заблокирован ли IP."""
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
        
        # Очищаем старые попытки
        self._clean_old_attempts(ip_address)
        
        # Добавляем новую попытку
        now = time.time()
        self.attempts[ip_address].append(now)
        
        # Проверяем количество попыток
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
        if ip_address in self.attempts:
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
            block_until = self.blocked_ips[ip_address]
            return False, f"IP заблокирован до {block_until.strftime('%H:%M:%S')}"
        
        # Очищаем старые попытки
        self._clean_old_attempts(ip_address)
        
        attempt_count = len(self.attempts[ip_address])
        if attempt_count >= self.max_attempts:
            return False, f"Превышено максимальное количество попыток ({self.max_attempts})"
        
        remaining = self.max_attempts - attempt_count
        if remaining <= 2:  # Предупреждение при приближении к лимиту
            return True, f"Осталось попыток: {remaining}"
        
        return True, None
    
    def get_attempt_stats(self, ip_address: str) -> Dict[str, any]:
        """Получение статистики попыток для IP."""
        self._clean_old_attempts(ip_address)
        
        attempts = self.attempts[ip_address]
        is_blocked = self._is_ip_blocked(ip_address)
        
        return {
            "ip_address": ip_address,
            "attempt_count": len(attempts),
            "max_attempts": self.max_attempts,
            "is_blocked": is_blocked,
            "blocked_until": self.blocked_ips.get(ip_address),
            "remaining_attempts": max(0, self.max_attempts - len(attempts)),
            "is_whitelisted": self._is_whitelisted(ip_address)
        }
    
    def unblock_ip(self, ip_address: str) -> bool:
        """Разблокировка IP адреса (для админов)."""
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
        """Очистка истекших данных (вызывать периодически)."""
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













