# api/services/security_audit_service.py

import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from sqlalchemy.orm import selectinload

from api.models.security_audit import SecurityAuditLog
from shared.schemas.user_schema import UserOut

logger = logging.getLogger(__name__)

class SecurityAuditService:
    """Сервис для аудита событий безопасности."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def log_event(
        self,
        event_type: str,
        event_category: str,
        severity: str,
        description: str,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
        user_role: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        request_id: Optional[str] = None,
        success: bool = False,
        failure_reason: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None,
        country: Optional[str] = None,
        city: Optional[str] = None
    ) -> SecurityAuditLog:
        """Логирование события безопасности."""
        
        try:
            audit_log = SecurityAuditLog(
                event_type=event_type,
                event_category=event_category,
                severity=severity,
                description=description,
                user_id=user_id,
                user_email=user_email,
                user_role=user_role,
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=request_method,
                request_path=request_path,
                request_id=request_id,
                success=success,
                failure_reason=failure_reason,
                details=details,
                session_id=session_id,
                country=country,
                city=city
            )
            
            self.db.add(audit_log)
            await self.db.commit()
            await self.db.refresh(audit_log)
            
            logger.info(f"Security audit logged: {event_type} - {description}")
            return audit_log
            
        except Exception as e:
            logger.error(f"Failed to log security event: {e}")
            await self.db.rollback()
            raise
    
    async def log_login_attempt(
        self,
        email: str,
        success: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None,
        user_id: Optional[int] = None,
        user_role: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> SecurityAuditLog:
        """Логирование попытки входа."""
        
        event_type = "login_success" if success else "login_failed"
        severity = "low" if success else "medium"
        description = f"Login attempt {'successful' if success else 'failed'} for {email}"
        
        return await self.log_event(
            event_type=event_type,
            event_category="authentication",
            severity=severity,
            description=description,
            user_id=user_id,
            user_email=email,
            user_role=user_role,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            success=success,
            failure_reason=failure_reason
        )
    
    async def log_suspicious_activity(
        self,
        activity_type: str,
        description: str,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: str = "high"
    ) -> SecurityAuditLog:
        """Логирование подозрительной активности."""
        
        return await self.log_event(
            event_type=f"suspicious_{activity_type}",
            event_category="security",
            severity=severity,
            description=description,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            details=details
        )
    
    async def log_brute_force_attempt(
        self,
        ip_address: str,
        attempt_count: int,
        user_agent: Optional[str] = None,
        blocked: bool = True
    ) -> SecurityAuditLog:
        """Логирование попытки брутфорса."""
        
        return await self.log_event(
            event_type="brute_force_attempt",
            event_category="security",
            severity="critical",
            description=f"Brute force attempt detected from {ip_address} ({attempt_count} attempts)",
            ip_address=ip_address,
            user_agent=user_agent,
            success=not blocked,
            details={
                "attempt_count": attempt_count,
                "blocked": blocked,
                "action_taken": "ip_blocked" if blocked else "monitoring"
            }
        )
    
    async def log_data_access(
        self,
        user_id: int,
        user_email: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        action: str = "read",
        ip_address: Optional[str] = None,
        success: bool = True
    ) -> SecurityAuditLog:
        """Логирование доступа к данным."""
        
        description = f"Data access: {action} {resource_type}"
        if resource_id:
            description += f" (ID: {resource_id})"
        
        return await self.log_event(
            event_type="data_access",
            event_category="authorization",
            severity="low",
            description=description,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            success=success,
            details={
                "resource_type": resource_type,
                "resource_id": resource_id,
                "action": action
            }
        )
    
    async def get_recent_failed_logins(
        self,
        ip_address: str,
        minutes: int = 15
    ) -> List[SecurityAuditLog]:
        """Получение недавних неудачных попыток входа с IP."""
        
        since = datetime.utcnow() - timedelta(minutes=minutes)
        
        result = await self.db.execute(
            select(SecurityAuditLog)
            .where(
                and_(
                    SecurityAuditLog.event_type == "login_failed",
                    SecurityAuditLog.ip_address == ip_address,
                    SecurityAuditLog.created_at >= since
                )
            )
            .order_by(desc(SecurityAuditLog.created_at))
        )
        
        return result.scalars().all()
    
    async def get_suspicious_activities(
        self,
        hours: int = 24,
        severity: Optional[str] = None
    ) -> List[SecurityAuditLog]:
        """Получение подозрительной активности за период."""
        
        since = datetime.utcnow() - timedelta(hours=hours)
        
        query = select(SecurityAuditLog).where(
            and_(
                SecurityAuditLog.event_category == "security",
                SecurityAuditLog.created_at >= since
            )
        )
        
        if severity:
            query = query.where(SecurityAuditLog.severity == severity)
        
        result = await self.db.execute(query.order_by(desc(SecurityAuditLog.created_at)))
        return result.scalars().all()
    
    async def get_audit_stats(
        self,
        days: int = 7
    ) -> Dict[str, Any]:
        """Получение статистики аудита за период."""
        
        since = datetime.utcnow() - timedelta(days=days)
        
        # Общая статистика
        total_events = await self.db.scalar(
            select(func.count(SecurityAuditLog.id))
            .where(SecurityAuditLog.created_at >= since)
        )
        
        # События по типам
        events_by_type = await self.db.execute(
            select(
                SecurityAuditLog.event_type,
                func.count(SecurityAuditLog.id).label('count')
            )
            .where(SecurityAuditLog.created_at >= since)
            .group_by(SecurityAuditLog.event_type)
        )
        
        # События по серьезности
        events_by_severity = await self.db.execute(
            select(
                SecurityAuditLog.severity,
                func.count(SecurityAuditLog.id).label('count')
            )
            .where(SecurityAuditLog.created_at >= since)
            .group_by(SecurityAuditLog.severity)
        )
        
        # Неудачные попытки входа
        failed_logins = await self.db.scalar(
            select(func.count(SecurityAuditLog.id))
            .where(
                and_(
                    SecurityAuditLog.event_type == "login_failed",
                    SecurityAuditLog.created_at >= since
                )
            )
        )
        
        return {
            "total_events": total_events or 0,
            "failed_logins": failed_logins or 0,
            "events_by_type": dict(events_by_type.fetchall()),
            "events_by_severity": dict(events_by_severity.fetchall()),
            "period_days": days
        }
