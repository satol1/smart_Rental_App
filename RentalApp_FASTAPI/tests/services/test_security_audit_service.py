# tests/services/test_security_audit_service.py
"""
Тесты для SecurityAuditService - сервиса аудита событий безопасности.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timedelta

from api.services.security_audit_service import SecurityAuditService
from api.models.security_audit import SecurityAuditLog


class TestSecurityAuditService:
    """Тесты для SecurityAuditService."""

    @pytest.fixture
    def mock_db_session(self):
        """Создает мок сессии базы данных."""
        db = AsyncMock()
        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()
        db.rollback = AsyncMock()
        return db

    @pytest.fixture
    def security_audit_service(self, mock_db_session):
        """Создает экземпляр SecurityAuditService."""
        return SecurityAuditService(db=mock_db_session)

    @pytest.fixture
    def sample_audit_log(self):
        """Создает образец записи аудита."""
        log = MagicMock(spec=SecurityAuditLog)
        log.id = 1
        log.event_type = "login_failed"  # Исправлено для теста get_recent_failed_logins
        log.event_category = "authentication"
        log.severity = "low"
        log.description = "Login failed"
        log.user_id = 1
        log.user_email = "user@example.com"
        log.ip_address = "192.168.1.1"
        return log

    # === ТЕСТЫ ДЛЯ log_event ===

    @pytest.mark.asyncio
    async def test_log_event_success(self, security_audit_service, mock_db_session, sample_audit_log):
        """Тест успешного логирования события."""
        mock_db_session.refresh = AsyncMock(return_value=None)
        
        result = await security_audit_service.log_event(
            event_type="test_event",
            event_category="test",
            severity="low",
            description="Test description",
            user_id=1,
            user_email="user@example.com",
            ip_address="192.168.1.1"
        )
        
        assert isinstance(result, SecurityAuditLog)
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_log_event_with_all_fields(self, security_audit_service, mock_db_session):
        """Тест логирования события со всеми полями."""
        result = await security_audit_service.log_event(
            event_type="test_event",
            event_category="test",
            severity="high",
            description="Test description",
            user_id=1,
            user_email="user@example.com",
            user_role="admin",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            request_method="POST",
            request_path="/api/test",
            request_id="req-123",
            success=True,
            failure_reason=None,
            details={"key": "value"},
            session_id="session-123",
            country="RU",
            city="Moscow"
        )
        
        assert isinstance(result, SecurityAuditLog)
        mock_db_session.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_log_event_error_handling(self, security_audit_service, mock_db_session):
        """Тест обработки ошибки при логировании."""
        mock_db_session.commit.side_effect = Exception("Database error")
        
        with pytest.raises(Exception):
            await security_audit_service.log_event(
                event_type="test_event",
                event_category="test",
                severity="low",
                description="Test"
            )
        
        mock_db_session.rollback.assert_called_once()

    # === ТЕСТЫ ДЛЯ log_login_attempt ===

    @pytest.mark.asyncio
    async def test_log_login_attempt_success(self, security_audit_service, mock_db_session):
        """Тест логирования успешной попытки входа."""
        result = await security_audit_service.log_login_attempt(
            email="user@example.com",
            success=True,
            ip_address="192.168.1.1"
        )
        
        assert isinstance(result, SecurityAuditLog)
        mock_db_session.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_log_login_attempt_failed(self, security_audit_service, mock_db_session):
        """Тест логирования неудачной попытки входа."""
        result = await security_audit_service.log_login_attempt(
            email="user@example.com",
            success=False,
            ip_address="192.168.1.1",
            failure_reason="Invalid password"
        )
        
        assert isinstance(result, SecurityAuditLog)

    # === ТЕСТЫ ДЛЯ log_suspicious_activity ===

    @pytest.mark.asyncio
    async def test_log_suspicious_activity(self, security_audit_service, mock_db_session):
        """Тест логирования подозрительной активности."""
        result = await security_audit_service.log_suspicious_activity(
            activity_type="multiple_failed_logins",
            description="Multiple failed login attempts",
            user_id=1,
            user_email="user@example.com",
            ip_address="192.168.1.1",
            severity="high"
        )
        
        assert isinstance(result, SecurityAuditLog)
        mock_db_session.add.assert_called_once()

    # === ТЕСТЫ ДЛЯ log_brute_force_attempt ===

    @pytest.mark.asyncio
    async def test_log_brute_force_attempt(self, security_audit_service, mock_db_session):
        """Тест логирования попытки брутфорса."""
        result = await security_audit_service.log_brute_force_attempt(
            ip_address="192.168.1.1",
            attempt_count=5,
            user_agent="Mozilla/5.0",
            blocked=True
        )
        
        assert isinstance(result, SecurityAuditLog)
        mock_db_session.add.assert_called_once()

    # === ТЕСТЫ ДЛЯ log_data_access ===

    @pytest.mark.asyncio
    async def test_log_data_access_success(self, security_audit_service, mock_db_session):
        """Тест логирования успешного доступа к данным."""
        result = await security_audit_service.log_data_access(
            user_id=1,
            user_email="user@example.com",
            resource_type="equipment",
            resource_id="123",
            action="read",
            ip_address="192.168.1.1",
            success=True
        )
        
        assert isinstance(result, SecurityAuditLog)

    @pytest.mark.asyncio
    async def test_log_data_access_failed(self, security_audit_service, mock_db_session):
        """Тест логирования неудачного доступа к данным."""
        result = await security_audit_service.log_data_access(
            user_id=1,
            user_email="user@example.com",
            resource_type="equipment",
            resource_id="123",
            action="read",
            ip_address="192.168.1.1",
            success=False
        )
        
        assert isinstance(result, SecurityAuditLog)

    # === ТЕСТЫ ДЛЯ get_recent_failed_logins ===

    @pytest.mark.asyncio
    async def test_get_recent_failed_logins(self, security_audit_service, mock_db_session, sample_audit_log):
        """Тест получения недавних неудачных попыток входа."""
        from sqlalchemy import select
        
        # Мокируем результат запроса
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [sample_audit_log]
        mock_db_session.execute = AsyncMock(return_value=mock_result)
        
        result = await security_audit_service.get_recent_failed_logins(
            ip_address="192.168.1.1",
            minutes=15
        )
        
        assert len(result) == 1
        assert result[0].event_type == "login_failed"
        mock_db_session.execute.assert_called_once()

    # === ТЕСТЫ ДЛЯ get_suspicious_activities ===

    @pytest.mark.asyncio
    async def test_get_suspicious_activities(self, security_audit_service, mock_db_session, sample_audit_log):
        """Тест получения подозрительной активности."""
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [sample_audit_log]
        mock_db_session.execute = AsyncMock(return_value=mock_result)
        
        result = await security_audit_service.get_suspicious_activities(
            hours=24,
            severity="high"
        )
        
        assert len(result) == 1
        mock_db_session.execute.assert_called_once()

    # === ТЕСТЫ ДЛЯ get_audit_stats ===

    @pytest.mark.asyncio
    async def test_get_audit_stats(self, security_audit_service, mock_db_session):
        """Тест получения статистики аудита."""
        from sqlalchemy import func
        
        # Мокируем scalar для total_events
        mock_db_session.scalar = AsyncMock(return_value=10)
        
        # Мокируем execute для events_by_type и events_by_severity
        mock_result = MagicMock()
        mock_result.fetchall.return_value = [("login_success", 5), ("login_failed", 5)]
        mock_db_session.execute = AsyncMock(return_value=mock_result)
        
        stats = await security_audit_service.get_audit_stats(days=7)
        
        assert stats["total_events"] == 10
        assert stats["failed_logins"] == 10
        assert "events_by_type" in stats
        assert "events_by_severity" in stats
        assert stats["period_days"] == 7

