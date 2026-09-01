# api/models/security_audit.py

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON
from sqlalchemy.sql import func
from api.database_models import Base

class SecurityAuditLog(Base):
    """Модель для логирования событий безопасности."""
    
    __tablename__ = "security_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Основная информация о событии
    event_type = Column(String(100), nullable=False, index=True)  # login_attempt, failed_login, suspicious_activity, etc.
    event_category = Column(String(50), nullable=False, index=True)  # authentication, authorization, data_access, etc.
    severity = Column(String(20), nullable=False, index=True)  # low, medium, high, critical
    
    # Информация о пользователе
    user_id = Column(Integer, nullable=True, index=True)  # null для анонимных событий
    user_email = Column(String(255), nullable=True, index=True)
    user_role = Column(String(50), nullable=True)
    
    # Информация о запросе
    ip_address = Column(String(45), nullable=True, index=True)  # IPv4/IPv6
    user_agent = Column(Text, nullable=True)
    request_method = Column(String(10), nullable=True)
    request_path = Column(String(500), nullable=True)
    request_id = Column(String(100), nullable=True, index=True)
    
    # Детали события
    description = Column(Text, nullable=False)
    details = Column(JSON, nullable=True)  # Дополнительные данные в JSON формате
    
    # Результат события
    success = Column(Boolean, nullable=False, default=False)
    failure_reason = Column(String(500), nullable=True)
    
    # Метаданные
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    session_id = Column(String(100), nullable=True, index=True)
    
    # Геолокация (опционально)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    
    def __repr__(self):
        return f"<SecurityAuditLog(id={self.id}, event_type='{self.event_type}', user_id={self.user_id}, created_at='{self.created_at}')>"
