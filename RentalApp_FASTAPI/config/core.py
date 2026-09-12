"""
Централизованная конфигурация приложения на основе pydantic-settings.
Все переменные окружения и настройки определены в одном месте.
"""

import logging
from pathlib import Path
from urllib.parse import quote_plus

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Dev-значения по умолчанию: допустимы ТОЛЬКО при DEBUG=True (с предупреждением).
# При DEBUG=False отсутствие или dev-значение любого секрета — ошибка запуска (fail-fast).
_DEV_DEFAULTS = {
    "SECRET_KEY": "super-secret-key-dev-32-chars-minimum",
    "CSRF_SECRET_KEY": "csrf-secret-key-dev-32-chars-minimum",
    "POSTGRES_PASSWORD": "supersecretpassword",
}


class Settings(BaseSettings):
    """Централизованный класс настроек приложения."""

    # ───────────────────────────── База данных ─────────────────────────────
    # Пароль и URL без дефолтных значений: задаются через окружение,
    # либо URL собирается из компонентов (см. database_url).
    POSTGRES_USER: str = Field(default="myuser", description="Пользователь PostgreSQL")
    POSTGRES_PASSWORD: SecretStr | None = Field(default=None, description="Пароль PostgreSQL")
    POSTGRES_DB: str = Field(default="rental_db", description="Имя базы данных PostgreSQL")
    POSTGRES_HOST: str = Field(default="db", description="Хост PostgreSQL")
    POSTGRES_PORT: int = Field(default=5432, description="Порт PostgreSQL")
    DATABASE_URL: str | None = Field(
        default=None,
        description="URL подключения к базе данных (если не задан — собирается из POSTGRES_*)"
    )
    POSTGRES_POOL_SIZE: int = Field(default=5, ge=1, description="Размер пула соединений SQLAlchemy")
    POSTGRES_MAX_OVERFLOW: int = Field(default=10, ge=0, description="Overflow пула соединений SQLAlchemy")

    # ───────────────────────────── Redis (опционален) ─────────────────────────────
    # Redis не обязателен для запуска: при недоступности приложение
    # деградирует на in-memory хранилища (denylist, brute-force, кэш).
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="URL Redis (в контейнере перекрывается compose: redis://redis:6379/0)"
    )

    # ───────────────────────────── Секреты приложения ─────────────────────────────
    # Дефолтных значений нет: см. модельный валидатор _validate_secrets ниже.
    SECRET_KEY: SecretStr | None = Field(
        default=None,
        description="Секретный ключ для JWT (минимум 32 символа)"
    )
    CSRF_SECRET_KEY: SecretStr | None = Field(
        default=None,
        description="Секретный ключ для CSRF защиты (минимум 32 символа)"
    )
    DISABLE_CSRF: bool = Field(default=False, description="Отключить CSRF защиту (для тестов)")

    # ───────────────────────────── Фоновые задачи ─────────────────────────────
    ENABLE_BACKGROUND_SCHEDULER: bool = Field(default=True, description="Включить фоновый планировщик задач")
    OVERDUE_CHECK_INTERVAL_SECONDS: int = Field(default=86400, ge=10, description="Интервал проверки просроченных резервов (сек, по умолчанию 24ч)")

    # ───────────────────────────── Настройки окружения ─────────────────────────────
    DEBUG: bool = Field(default=False, description="Режим отладки")
    
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
    
    # ───────────────────────────── Валидация секретов (fail-fast) ─────────────────────────────
    @model_validator(mode="after")
    def _validate_secrets(self) -> "Settings":
        """Секреты без дефолтов в production.

        - DEBUG=False: отсутствие значения, dev-значение или слабый ключ -> ValueError
          при старте (fail-fast с понятным сообщением).
        - DEBUG=True: допускаем dev-значения для локальной разработки,
          но логируем warning.
        """
        problems: list[str] = []

        for name, dev_value in _DEV_DEFAULTS.items():
            # CSRF выключен целиком (DISABLE_CSRF, только тестовые окружения) —
            # его секрет не проверяем
            if name == "CSRF_SECRET_KEY" and self.DISABLE_CSRF:
                continue
            value = getattr(self, name)
            raw = value.get_secret_value() if isinstance(value, SecretStr) else value

            is_missing = raw is None or (isinstance(raw, str) and raw.strip() == "")
            is_default = isinstance(raw, str) and raw in (
                dev_value,
                # Исторические дефолты/плейсхолдеры из старых версий конфига
                "super-secret-key-dev",
                "your-super-secret-key-here",
                "csrf-secret-key-dev",
                "your-csrf-secret-key-here",
            )

            if self.DEBUG:
                if is_missing or is_default:
                    logger.warning(
                        "⚠️ %s не задан (или содержит dev-значение) — подставлено dev-значение. "
                        "Допустимо ТОЛЬКО для локальной разработки!", name
                    )
                    setattr(self, name, SecretStr(dev_value))
                elif name in ("SECRET_KEY", "CSRF_SECRET_KEY"):
                    if len(raw) < 32 or len(set(raw)) < 16:
                        logger.warning(
                            "⚠️ %s слабый (%d симв.): в production запуск упадёт (fail-fast)", name, len(raw)
                        )
                continue

            # DEBUG=False — строгие требования
            if is_missing:
                problems.append(
                    f"{name}: значение обязательно (задайте переменную окружения {name})"
                )
            elif is_default:
                problems.append(
                    f"{name}: используется дефолтное dev-значение — задайте собственный секрет"
                )
            elif name in ("SECRET_KEY", "CSRF_SECRET_KEY"):
                if len(raw) < 32:
                    problems.append(f"{name}: должен содержать минимум 32 символа")
                elif len(set(raw)) < 16:
                    problems.append(f"{name}: должен содержать минимум 16 уникальных символов")

        if not self.DEBUG and self.CORS_ALLOW_WILDCARD:
            problems.append("CORS_ALLOW_WILDCARD: значение True недопустимо при DEBUG=False (production)")

        if problems:
            raise ValueError(
                "Проверка секретов не пройдена (DEBUG=False): " + "; ".join(problems)
            )
        return self

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
    def database_url(self) -> str:
        """Эффективный URL подключения к БД.

        Если DATABASE_URL задан явно — используется он, иначе URL собирается
        из компонентов POSTGRES_* (без зашитого пароля в дефолтах).
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL
        password = (
            self.POSTGRES_PASSWORD.get_secret_value()
            if isinstance(self.POSTGRES_PASSWORD, SecretStr)
            else ""
        )
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{quote_plus(password)}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

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
    def UPLOAD_DIR(self) -> Path:
        """Папка для загруженных изображений."""
        folder = self.BASE_DIR / "uploads"
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
