# shared/schemas/user_schema.py

from pydantic import BaseModel, EmailStr, ConfigDict, field_validator, Field
from typing import Optional, List, Annotated
import re
from datetime import datetime
from config.core import settings

# Вспомогательная функция валидации, остается без изменений
def validate_phone_number(v: Optional[str]) -> Optional[str]:
    """Валидация номера телефона"""
    if v is None:
        return v
    if not isinstance(v, str):
        raise ValueError('Телефон должен быть строкой')

    phone_clean = re.sub(r'[^\d]', '', v)
    if len(phone_clean) < 10 or len(phone_clean) > 15:
        raise ValueError('Некорректный формат телефона')

    return v

def validate_telegram_username(v: Optional[str]) -> Optional[str]:
    """Валидация Telegram username"""
    if v is None or v == "":
        return None
    if not isinstance(v, str):
        raise ValueError('Telegram username должен быть строкой')
    
    # Убираем @ если есть в начале
    clean_username = v.lstrip('@')
    
    # Если после удаления @ строка пустая, возвращаем None
    if not clean_username:
        return None
    
    # Проверяем формат: 5-32 символа, только буквы, цифры и подчеркивания
    if not re.match(r'^[a-zA-Z0-9_]{5,32}$', clean_username):
        raise ValueError('Формат: @username, 5-32 символа, только a-z, 0-9, _')
    
    return f"@{clean_username}"

def validate_password_strength(password: str) -> str:
    """Валидация силы пароля согласно настройкам безопасности."""
    if len(password) < settings.PASSWORD_MIN_LENGTH:
        raise ValueError(f'Пароль должен содержать минимум {settings.PASSWORD_MIN_LENGTH} символов')
    
    # Проверяем требования к сложности
    has_upper = bool(re.search(r'[A-Z]', password)) if settings.PASSWORD_REQUIRE_UPPERCASE else True
    has_lower = bool(re.search(r'[a-z]', password)) if settings.PASSWORD_REQUIRE_LOWERCASE else True
    has_digit = bool(re.search(r'\d', password)) if settings.PASSWORD_REQUIRE_DIGITS else True
    
    errors = []
    if not has_upper and settings.PASSWORD_REQUIRE_UPPERCASE:
        errors.append('заглавные буквы')
    if not has_lower and settings.PASSWORD_REQUIRE_LOWERCASE:
        errors.append('строчные буквы')
    if not has_digit and settings.PASSWORD_REQUIRE_DIGITS:
        errors.append('цифры')
    
    if errors:
        raise ValueError(f'Пароль должен содержать: {", ".join(errors)}')
    
    # Проверяем на распространенные пароли
    common_passwords = [
        'password', '123456', '123456789', 'qwerty', 'abc123',
        'password123', 'admin', 'letmein', 'welcome', 'monkey',
        '1234567890', 'password1', 'qwerty123', 'dragon', 'master'
    ]
    
    if password.lower() in common_passwords:
        raise ValueError('Пароль слишком простой. Выберите более сложный пароль.')
    
    # Проверяем на повторяющиеся символы
    if len(set(password)) < len(password) * 0.5:  # Менее 50% уникальных символов
        raise ValueError('Пароль содержит слишком много повторяющихся символов')
    
    return password

# --- Существующие схемы ---

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(..., min_length=8, description="Пароль (минимум 8 символов)")
    phone: Optional[str] = None
    telegram_username: Optional[str] = None
    privacy_policy_accepted: bool = False
    terms_accepted: bool = False

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"🔍 [VALIDATION] Валидация пароля: длина={len(v) if v else 'None'}")
        try:
            result = validate_password_strength(v)
            logger.info(f"✅ [VALIDATION] Пароль прошел валидацию")
            return result
        except Exception as e:
            logger.error(f"❌ [VALIDATION] Ошибка валидации пароля: {e}")
            raise

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"🔍 [VALIDATION] Валидация телефона: {v}")
        try:
            result = validate_phone_number(v)
            logger.info(f"✅ [VALIDATION] Телефон прошел валидацию: {result}")
            return result
        except Exception as e:
            logger.error(f"❌ [VALIDATION] Ошибка валидации телефона: {e}")
            raise

    @field_validator('telegram_username')
    @classmethod
    def validate_telegram(cls, v):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"🔍 [VALIDATION] Валидация Telegram: {v}")
        try:
            result = validate_telegram_username(v)
            logger.info(f"✅ [VALIDATION] Telegram прошел валидацию: {result}")
            return result
        except Exception as e:
            logger.error(f"❌ [VALIDATION] Ошибка валидации Telegram: {e}")
            raise

    @field_validator('privacy_policy_accepted')
    @classmethod
    def validate_privacy_policy(cls, v):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"🔍 [VALIDATION] Валидация privacy_policy_accepted: {v}")
        if not v:
            logger.error(f"❌ [VALIDATION] Не принята политика конфиденциальности")
            raise ValueError('Необходимо согласие с политикой обработки персональных данных')
        logger.info(f"✅ [VALIDATION] Политика конфиденциальности принята")
        return v

    @field_validator('terms_accepted')
    @classmethod
    def validate_terms(cls, v):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"🔍 [VALIDATION] Валидация terms_accepted: {v}")
        if not v:
            logger.error(f"❌ [VALIDATION] Не приняты условия использования")
            raise ValueError('Необходимо согласие с условиями использования')
        logger.info(f"✅ [VALIDATION] Условия использования приняты")
        return v

class AdminUserCreate(UserCreate):
    role: str = "user"

class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    telegram_username: Optional[str] = None
    status: Optional[str] = None
    balance: Optional[float] = None
    notes: Optional[str] = None
    role: Optional[str] = None
    privacy_policy_accepted: Optional[bool] = None
    terms_accepted: Optional[bool] = None
    email_verified: Optional[bool] = None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        return validate_phone_number(v)

    @field_validator('telegram_username')
    @classmethod
    def validate_telegram(cls, v):
        return validate_telegram_username(v)
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Валидация статуса пользователя."""
        if v is None:
            return v
        
        # Используем Enum для валидации новых статусов
        from shared.constants.user_status import UserStatus
        
        # Проверяем, является ли значение одним из допустимых статусов
        try:
            # Пытаемся найти статус в Enum
            user_status = UserStatus(v)
            return user_status.value
        except ValueError:
            # Для обратной совместимости разрешаем старые статусы
            legacy_statuses = ["Активный", "Требует подтверждения"]
            if v in legacy_statuses:
                # При миграции старые статусы будут преобразованы в "Новый"
                return v
            
            # Если статус не найден, возвращаем ошибку
            allowed_statuses = [status.value for status in UserStatus]
            raise ValueError(
                f"Недопустимый статус. Разрешенные значения: {', '.join(allowed_statuses)}"
            )

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    telegram_username: Optional[str] = None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        return validate_phone_number(v)

    @field_validator('telegram_username')
    @classmethod
    def validate_telegram(cls, v):
        return validate_telegram_username(v)


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    telegram_username: Optional[str] = None
    role: str
    is_active: bool
    phone: Optional[str] = None
    status: Optional[str] = None
    status_changed_manually: Optional[bool] = False  # Флаг ручного изменения статуса
    balance: float
    notes: Optional[str] = None
    privacy_policy_accepted: bool
    terms_accepted: bool
    email_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class RegisterResponse(BaseModel):
    """Ответ POST /auth/register — фактическая форма ответа auth_api.register."""
    message: str
    email: EmailStr
    full_name: str
    role: str


class UserListResponse(BaseModel):
    items: List[UserOut]
    total: int

# +++ НАЧАЛО: НОВАЯ СХЕМА ДЛЯ ПРИЕМА ПЛАТЕЖА +++
class UserPaymentRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Сумма платежа")
    payment_method: str = Field(..., description="Метод оплаты (наличные, карта и т.д.)")
    description: Optional[str] = None
# +++ КОНЕЦ: НОВАЯ СХЕМА ДЛЯ ПРИЕМА ПЛАТЕЖА +++

# +++ НАЧАЛО: НОВАЯ СХЕМА ДЛЯ РУЧНОЙ КОРРЕКТИРОВКИ БАЛАНСА +++
class AdminBalanceAdjustmentRequest(BaseModel):
    amount: float = Field(..., description="Сумма корректировки (положительная для начисления, отрицательная для списания)")
    description: str = Field(..., min_length=1, max_length=500, description="Обязательное описание операции")
# +++ КОНЕЦ: НОВАЯ СХЕМА ДЛЯ РУЧНОЙ КОРРЕКТИРОВКИ БАЛАНСА +++