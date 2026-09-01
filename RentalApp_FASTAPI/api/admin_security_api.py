# api/admin_security_api.py

from fastapi import APIRouter, Depends, HTTPException, Query
from dependency_injector.wiring import inject, Provide
from containers import Container
from api.services.security_audit_service import SecurityAuditService
from api.services.brute_force_protection_service import BruteForceProtectionService
from api.dependencies import get_current_admin_user
from api.models.user import User as ApiUser
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin/security", tags=["Admin Security"])

@router.get("/audit/logs")
@inject
async def get_security_logs(
    hours: int = Query(24, ge=1, le=168, description="Количество часов для выборки"),
    severity: Optional[str] = Query(None, description="Фильтр по серьезности"),
    event_type: Optional[str] = Query(None, description="Фильтр по типу события"),
    limit: int = Query(100, ge=1, le=1000, description="Максимальное количество записей"),
    current_user: ApiUser = Depends(get_current_admin_user),
    security_audit_service: SecurityAuditService = Depends(Provide[Container.security_audit_service])
):
    """Получение логов безопасности для админов."""
    try:
        logs = await security_audit_service.get_suspicious_activities(
            hours=hours,
            severity=severity
        )
        
        # Фильтрация по типу события если указан
        if event_type:
            logs = [log for log in logs if log.event_type == event_type]
        
        # Ограничение количества записей
        logs = logs[:limit]
        
        return {
            "status": "success",
            "logs": [
                {
                    "id": log.id,
                    "event_type": log.event_type,
                    "event_category": log.event_category,
                    "severity": log.severity,
                    "description": log.description,
                    "user_email": log.user_email,
                    "ip_address": log.ip_address,
                    "success": log.success,
                    "failure_reason": log.failure_reason,
                    "created_at": log.created_at,
                    "details": log.details
                }
                for log in logs
            ],
            "total": len(logs),
            "filters": {
                "hours": hours,
                "severity": severity,
                "event_type": event_type
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения логов: {str(e)}")

@router.get("/audit/stats")
@inject
async def get_security_stats(
    days: int = Query(7, ge=1, le=30, description="Количество дней для статистики"),
    current_user: ApiUser = Depends(get_current_admin_user),
    security_audit_service: SecurityAuditService = Depends(Provide[Container.security_audit_service])
):
    """Получение статистики безопасности."""
    try:
        stats = await security_audit_service.get_audit_stats(days=days)
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения статистики: {str(e)}")

@router.get("/brute-force/blocked-ips")
@inject
async def get_blocked_ips(
    current_user: ApiUser = Depends(get_current_admin_user),
    brute_force_service: BruteForceProtectionService = Depends(Provide[Container.brute_force_protection_service])
):
    """Получение списка заблокированных IP адресов."""
    try:
        blocked_ips = brute_force_service.get_all_blocked_ips()
        return {
            "status": "success",
            "blocked_ips": [
                {
                    "ip_address": ip,
                    "blocked_until": blocked_until.isoformat()
                }
                for ip, blocked_until in blocked_ips.items()
            ],
            "total": len(blocked_ips)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения заблокированных IP: {str(e)}")

@router.post("/brute-force/unblock/{ip_address}")
@inject
async def unblock_ip(
    ip_address: str,
    current_user: ApiUser = Depends(get_current_admin_user),
    brute_force_service: BruteForceProtectionService = Depends(Provide[Container.brute_force_protection_service])
):
    """Разблокировка IP адреса."""
    try:
        success = brute_force_service.unblock_ip(ip_address)
        if success:
            return {
                "status": "success",
                "message": f"IP адрес {ip_address} разблокирован"
            }
        else:
            return {
                "status": "error",
                "message": f"IP адрес {ip_address} не был заблокирован"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка разблокировки IP: {str(e)}")

@router.get("/brute-force/stats/{ip_address}")
@inject
async def get_ip_stats(
    ip_address: str,
    current_user: ApiUser = Depends(get_current_admin_user),
    brute_force_service: BruteForceProtectionService = Depends(Provide[Container.brute_force_protection_service])
):
    """Получение статистики попыток для IP адреса."""
    try:
        stats = brute_force_service.get_attempt_stats(ip_address)
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения статистики IP: {str(e)}")

@router.post("/brute-force/whitelist/{ip_address}")
@inject
async def add_to_whitelist(
    ip_address: str,
    current_user: ApiUser = Depends(get_current_admin_user),
    brute_force_service: BruteForceProtectionService = Depends(Provide[Container.brute_force_protection_service])
):
    """Добавление IP адреса в whitelist."""
    try:
        brute_force_service.add_to_whitelist(ip_address)
        return {
            "status": "success",
            "message": f"IP адрес {ip_address} добавлен в whitelist"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка добавления в whitelist: {str(e)}")

@router.delete("/brute-force/whitelist/{ip_address}")
@inject
async def remove_from_whitelist(
    ip_address: str,
    current_user: ApiUser = Depends(get_current_admin_user),
    brute_force_service: BruteForceProtectionService = Depends(Provide[Container.brute_force_protection_service])
):
    """Удаление IP адреса из whitelist."""
    try:
        brute_force_service.remove_from_whitelist(ip_address)
        return {
            "status": "success",
            "message": f"IP адрес {ip_address} удален из whitelist"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка удаления из whitelist: {str(e)}")

@router.post("/brute-force/cleanup")
@inject
async def cleanup_brute_force_data(
    current_user: ApiUser = Depends(get_current_admin_user),
    brute_force_service: BruteForceProtectionService = Depends(Provide[Container.brute_force_protection_service])
):
    """Очистка истекших данных защиты от брутфорса."""
    try:
        brute_force_service.cleanup_expired_data()
        return {
            "status": "success",
            "message": "Данные защиты от брутфорса очищены"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка очистки данных: {str(e)}")

@router.get("/health")
@inject
async def security_health_check(
    current_user: ApiUser = Depends(get_current_admin_user),
    security_audit_service: SecurityAuditService = Depends(Provide[Container.security_audit_service]),
    brute_force_service: BruteForceProtectionService = Depends(Provide[Container.brute_force_protection_service])
):
    """Проверка состояния системы безопасности."""
    try:
        # Получаем статистику за последний час
        stats = await security_audit_service.get_audit_stats(days=1)
        blocked_ips = brute_force_service.get_all_blocked_ips()
        
        return {
            "status": "success",
            "security_status": {
                "audit_service": "healthy",
                "brute_force_protection": "healthy",
                "recent_events": stats.get("total_events", 0),
                "failed_logins_24h": stats.get("failed_logins", 0),
                "blocked_ips_count": len(blocked_ips),
                "last_check": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Ошибка проверки состояния безопасности: {str(e)}"
        }
