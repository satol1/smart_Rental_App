"""
Централизованная конфигурация приложения на основе pydantic-settings.
Все переменные окружения и настройки определены в одном месте.
"""

from pathlib import Path
from pydantic import SecretStr, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Централизованный класс настроек приложения."""
    
    # ───────────────────────────── База данных ─────────────────────────────
    POSTGRES_USER: str = Field(default="myuser", description="Пользователь PostgreSQL")
    POSTGRES_PASSWORD: SecretStr = Field(default="supersecretpassword", description="Пароль PostgreSQL")
    POSTGRES_DB: str = Field(default="rental_db", description="Имя базы данных PostgreSQL")
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://myuser:supersecretpassword@db:5432/rental_db",
        description="URL подключения к базе данных"
    )
    
    # ───────────────────────────── Секреты приложения ─────────────────────────────
    SECRET_KEY: SecretStr = Field(
        default="super-secret-key-dev-32-chars-minimum", 
        description="Секретный ключ для JWT (минимум 32 символа)",
        min_length=32
    )
    CSRF_SECRET_KEY: SecretStr = Field(
        default="csrf-secret-key-dev-32-chars-minimum", 
        description="Секретный ключ для CSRF защиты (минимум 32 символа)",
        min_length=32
    )
    DISABLE_CSRF: bool = Field(default=False, description="Отключить CSRF защиту (для тестов)")
    
    # ───────────────────────────── Настройки окружения ─────────────────────────────
    DEBUG: bool = Field(default=True, description="Режим отладки")
    
    # ───────────────────────────── Уведомления ─────────────────────────────
    TELEGRAM_TOKEN: SecretStr = Field(default="default_token_for_dev", description="Токен Telegram бота")
    DEFAULT_TELEGRAM_CHAT_ID: str = Field(default="", description="ID чата Telegram по умолчанию")
    
    # ───────────────────────────── Email настройки ─────────────────────────────
    YANDEX_EMAIL_SENDER: str = Field(default="", description="Email отправителя Yandex")
    YANDEX_SMTP_PASSWORD: SecretStr = Field(default="", description="Пароль SMTP Yandex")
    
    # ───────────────────────────── Настройки приложения ─────────────────────────────
    APP_NAME: str = Field(default="Аренда фототехники", description="Название приложения")
    
    # ───────────────────────────── Настройки паролей ─────────────────────────────
    PASSWORD_MIN_LENGTH: int = Field(default=8, description="Минимальная длина пароля")
    PASSWORD_REQUIRE_UPPERCASE: bool = Field(default=True, description="Требовать заглавные буквы в пароле")
    PASSWORD_REQUIRE_LOWERCASE: bool = Field(default=True, description="Требовать строчные буквы в пароле")
    PASSWORD_REQUIRE_DIGITS: bool = Field(default=True, description="Требовать цифры в пароле")
    
    # ───────────────────────────── Настройки интерфейса ─────────────────────────────
    DEFAULT_WINDOW_WIDTH: int = Field(default=1400, description="Ширина окна по умолчанию")
    DEFAULT_WINDOW_HEIGHT: int = Field(default=900, description="Высота окна по умолчанию")
    
    # ───────────────────────────── CORS настройки ─────────────────────────────
    CORS_ORIGINS: str = Field(
        default="http://localhost:5173,http://localhost:3000",
        description="Разрешенные источники через запятую (без пробелов после запятой)"
    )
    CORS_ALLOW_CREDENTIALS: bool = Field(
        default=True,
        description="Разрешить отправку credentials (cookies, auth headers)"
    )
    CORS_ALLOW_METHODS: str = Field(
        default="GET,POST,PUT,PATCH,DELETE,OPTIONS",
        description="Разрешенные HTTP методы через запятую"
    )
    CORS_ALLOW_HEADERS: str = Field(
        default="Content-Type,Authorization,X-CSRF-Token,Accept",
        description="Разрешенные заголовки через запятую"
    )
    CORS_EXPOSE_HEADERS: str = Field(
        default="X-Total-Count,X-Request-ID",
        description="Заголовки ответа, доступные клиенту через запятую"
    )
    CORS_MAX_AGE: int = Field(
        default=3600,
        description="Время кэширования preflight запросов (секунды)",
        ge=0,
        le=86400  # Максимум 24 часа
    )
    CORS_ALLOW_WILDCARD: bool = Field(
        default=False,
        description="Разрешить все источники (ТОЛЬКО для dev, НЕ использовать в production!)"
    )
    
    # ───────────────────────────── Валидация секретных ключей ─────────────────────────────
    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v: SecretStr) -> SecretStr:
        """Валидация силы SECRET_KEY."""
        key_value = v.get_secret_value()
        if len(key_value) < 32:
            raise ValueError("SECRET_KEY должен содержать минимум 32 символа")
        
        # Проверяем разнообразие символов
        unique_chars = len(set(key_value))
        if unique_chars < 16:
            raise ValueError("SECRET_KEY должен содержать минимум 16 уникальных символов")
        
        # Предупреждение о дефолтных значениях
        if key_value in ["super-secret-key-dev", "your-super-secret-key-here"]:
            raise ValueError("⚠️ КРИТИЧЕСКАЯ ОШИБКА БЕЗОПАСНОСТИ: Используется дефолтный SECRET_KEY! Замените на криптографически стойкий ключ.")
        
        return v
    
    @field_validator('CSRF_SECRET_KEY')
    @classmethod
    def validate_csrf_key(cls, v: SecretStr) -> SecretStr:
        """Валидация силы CSRF_SECRET_KEY."""
        key_value = v.get_secret_value()
        if len(key_value) < 32:
            raise ValueError("CSRF_SECRET_KEY должен содержать минимум 32 символа")
        
        # Проверяем разнообразие символов
        unique_chars = len(set(key_value))
        if unique_chars < 16:
            raise ValueError("CSRF_SECRET_KEY должен содержать минимум 16 уникальных символов")
        
        # Предупреждение о дефолтных значениях
        if key_value in ["csrf-secret-key-dev", "your-csrf-secret-key-here"]:
            raise ValueError("⚠️ КРИТИЧЕСКАЯ ОШИБКА БЕЗОПАСНОСТИ: Используется дефолтный CSRF_SECRET_KEY! Замените на криптографически стойкий ключ.")
        
        return v
    
    @field_validator('CORS_ORIGINS')
    @classmethod
    def validate_cors_origins(cls, v: str) -> str:
        """Валидация CORS источников."""
        if not v or not v.strip():
            raise ValueError("CORS_ORIGINS не может быть пустым")
        
        # Проверяем базовый формат
        origins = [origin.strip() for origin in v.split(",")]
        origins = [origin for origin in origins if origin]
        
        if not origins:
            raise ValueError("CORS_ORIGINS должен содержать хотя бы один источник")
        
        # Проверяем, что нет wildcard в списке (wildcard должен быть через CORS_ALLOW_WILDCARD)
        if "*" in origins:
            raise ValueError(
                "Wildcard '*' в CORS_ORIGINS не разрешен. "
                "Используйте CORS_ALLOW_WILDCARD=True для dev окружения"
            )
        
        return v
    
    @field_validator('CORS_ALLOW_WILDCARD')
    @classmethod
    def validate_cors_wildcard(cls, v: bool) -> bool:
        """Валидация флага wildcard для CORS."""
        # Дополнительная проверка будет в get_cors_config при инициализации
        # Здесь только базовая валидация типа
        return v

    # ───────────────────────────── Пути ─────────────────────────────
    @property
    def BASE_DIR(self) -> Path:
        """Корневая директория проекта."""
        return Path(__file__).resolve().parent.parent
    
    @property
    def LOG_FILE(self) -> Path:
        """Путь к файлу логов."""
        return self.BASE_DIR / "app.log"
    
    @property
    def EXPORT_FOLDER(self) -> Path:
        """Папка для экспорта файлов."""
        folder = self.BASE_DIR / "exports"
        folder.mkdir(exist_ok=True)
        return folder
    
    @property
    def CONTRACT_TEMPLATE(self) -> Path:
        """Путь к шаблону договора."""
        return self.BASE_DIR / "ui" / "pdf" / "contract_template.html"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )


# Единственный глобальный экземпляр настроек
settings = Settings()
