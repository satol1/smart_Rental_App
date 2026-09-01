# api/services/auth_service.py

from api.models.user import User
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shared.schemas.user_schema import UserCreate
from datetime import datetime, timedelta
from config.core import settings
from fastapi import HTTPException, Depends, Request
from api.repositories.user_repository import UserRepository
from api.utils.password_utils import hash_password, verify_password
from api.services.security_audit_service import SecurityAuditService
from api.services.brute_force_protection_service import BruteForceProtectionService
import logging

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 14


class AuthService:
    """
    Сервис для аутентификации и авторизации пользователей.
    Инкапсулирует всю бизнес-логику работы с аутентификацией.
    """
    
    def __init__(self, user_repo: UserRepository, security_audit_service: SecurityAuditService, brute_force_protection: BruteForceProtectionService):
        self.user_repo = user_repo
        self.security_audit_service = security_audit_service
        self.brute_force_protection = brute_force_protection

    async def create_user(self, user_data: UserCreate) -> User:
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            logger.info(f"🔍 [AUTH_SERVICE] Начинаем создание пользователя: {user_data.email}")
            
            # Проверяем существование пользователя через UserRepository
            logger.info(f"🔍 [AUTH_SERVICE] Проверяем существование пользователя...")
            existing = await self.user_repo.get_by_email(user_data.email)
            if existing:
                logger.warning(f"⚠️ [AUTH_SERVICE] Пользователь уже существует: {user_data.email}")
                raise HTTPException(
                    status_code=400, 
                    detail=f"Пользователь с email {user_data.email} уже существует"
                )

            # Подготавливаем данные для создания пользователя
            logger.info(f"🔍 [AUTH_SERVICE] Подготавливаем данные для создания...")
            # Определяем статус: для админов и менеджеров - VIP, для обычных пользователей - Новый
            # Примечание: при регистрации через этот метод создаются только обычные пользователи (role="user")
            user_create_data = UserCreate(
                full_name=user_data.full_name,
                email=user_data.email,
                password=user_data.password,  # Пароль будет хеширован в репозитории
                phone=user_data.phone,
                telegram_username=user_data.telegram_username,
                privacy_policy_accepted=user_data.privacy_policy_accepted,
                terms_accepted=user_data.terms_accepted,
                role="user",
                is_active=True,
                status="Новый",
                balance=0.0,
                notes="Создан автоматически при регистрации",
                email_verified=True  # При регистрации email считается подтвержденным
            )
            logger.info(f"🔍 [AUTH_SERVICE] Данные подготовлены успешно")

            # Создаем пользователя через репозиторий
            logger.info(f"🔍 [AUTH_SERVICE] Вызываем user_repo.create...")
            user = await self.user_repo.create(user_create_data)
            logger.info(f"🔍 [AUTH_SERVICE] Пользователь создан в репозитории")
            
            # Коммитим транзакцию
            logger.info(f"🔍 [AUTH_SERVICE] Коммитим транзакцию...")
            await self.user_repo.db.commit()
            logger.info(f"✅ [AUTH_SERVICE] Пользователь успешно создан: {user.email}")
            
            return user
        except HTTPException as http_exc:
            logger.error(f"❌ [AUTH_SERVICE] HTTPException: {http_exc.status_code} - {http_exc.detail}")
            await self.user_repo.db.rollback()
            raise http_exc
        except Exception as e:
            logger.error(f"❌ [AUTH_SERVICE] Неожиданная ошибка: {type(e).__name__}: {str(e)}")
            logger.error(f"❌ [AUTH_SERVICE] Traceback: {e.__traceback__}")
            await self.user_repo.db.rollback()
            logging.exception(f"[❌ create_user] Ошибка при регистрации: {e}")
            raise HTTPException(status_code=500, detail="Ошибка сервера при регистрации")


    async def authenticate_user(self, email: str, password: str, request: Request = None) -> User | None:
        """Аутентификация пользователя по email и паролю с защитой от брутфорса."""
        # Получаем IP адрес для проверки брутфорса
        ip_address = None
        user_agent = None
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
            # Отладочная информация
            logging.info(f"[DEBUG] IP адрес: {ip_address}, User-Agent: {user_agent}")
        
        # Проверяем защиту от брутфорса
        if ip_address:
            can_attempt, reason = self.brute_force_protection.can_attempt_login(ip_address)
            if not can_attempt:
                # Логируем попытку обхода защиты
                await self.security_audit_service.log_suspicious_activity(
                    activity_type="brute_force_bypass",
                    description=f"Attempted login from blocked IP: {ip_address}",
                    ip_address=ip_address,
                    details={"reason": reason}
                )
                raise HTTPException(
                    status_code=429,
                    detail=f"Слишком много попыток входа. {reason}"
                )
        
        # Получаем пользователя
        user = await self.user_repo.get_by_email(email)
        
        # Проверяем пароль
        if user and verify_password(password, user.hashed_password):
            # Успешный вход
            if ip_address:
                await self.brute_force_protection.record_successful_login(ip_address, email)
                await self.security_audit_service.log_login_attempt(
                    email=email,
                    success=True,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    user_id=user.id,
                    user_role=user.role
                )
            return user
        else:
            # Неудачный вход
            if ip_address:
                is_blocked = await self.brute_force_protection.record_failed_attempt(ip_address, email)
                if is_blocked:
                    raise HTTPException(
                        status_code=429,
                        detail="IP адрес заблокирован из-за множественных неудачных попыток входа"
                    )
            
            # Логируем неудачную попытку
            await self.security_audit_service.log_login_attempt(
                email=email,
                success=False,
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason="Invalid credentials"
            )
            
            return None

    def create_access_token(self, data: dict, expires_delta: timedelta = None) -> str:
        """Создание JWT токена доступа."""
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, settings.SECRET_KEY.get_secret_value(), algorithm=ALGORITHM)

    def create_refresh_token(self, data: dict, expires_delta: timedelta = None) -> str:
        """Создание JWT refresh-токена с более длительным сроком жизни."""
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, settings.SECRET_KEY.get_secret_value(), algorithm=ALGORITHM)

    def verify_refresh_token(self, token: str) -> dict:
        """Проверка и декодирование refresh-токена. Бросает HTTPException при ошибке."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY.get_secret_value(), algorithms=[ALGORITHM])
            if payload.get("type") != "refresh":
                raise HTTPException(status_code=401, detail="Недействительный тип токена")
            return payload
        except JWTError:
            raise HTTPException(status_code=401, detail="Недействительный или просроченный refresh токен")

