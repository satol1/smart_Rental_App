# api/main_api.py

import secrets
import logging
import time
import contextvars
import asyncio

from fastapi import FastAPI, Request, Response, HTTPException, status, APIRouter, Depends
from fastapi.responses import JSONResponse

# Импортируем конфигурацию логирования
import config.logging_config
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.datastructures import State

from api.router import router as all_routes
from api.permissions import require_admin
from api.models.user import User

# Import schemas to rebuild models with forward references
import shared.schemas

# --- CORS Configuration ---
from shared.cors_utils import get_cors_config

# --- Dependency Injection Setup ---
from containers import Container, AsyncSessionLocal

# --- CSRF Protection Imports and Setup ---
from fastapi_csrf_protect import CsrfProtect
from fastapi_csrf_protect.exceptions import CsrfProtectError
from fastapi.responses import JSONResponse
from config.core import settings

# --- Rate Limiting Imports ---
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

# Единый limiter (объявлен в отдельном модуле, чтобы роутеры не импортировали main_api)
from api.rate_limiter import limiter

# --- НАСТРОЙКА ЛОГГИРОВАНИЯ ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- КОНТЕКСТНАЯ ПЕРЕМЕННАЯ ДЛЯ ИЗОЛЯЦИИ СЕССИЙ ---
# УДАЛЕНО: Теперь используем request_db_session из containers.py

# --- CSRF Configuration ---
# Конфигурация берётся из централизованных настроек (config.core.Settings);
# переключатель DISABLE_CSRF сохранён для тестовых окружений (docker-compose.e2e.yml).
if not settings.DISABLE_CSRF:
    @CsrfProtect.load_config
    def get_csrf_config():
        return [
            ("secret_key", settings.CSRF_SECRET_KEY.get_secret_value()),
        ]
else:
    logger.info("CSRF защита отключена для тестов (DISABLE_CSRF=true)")

# --- Rate Limiter Configuration ---
# Limiter создан в api/rate_limiter.py: default 200/minute глобально,
# точечные лимиты (5/minute) — декораторами на auth-эндпоинтах.

# --- FastAPI App Initialization ---
# В production (DEBUG=False) интерактивная документация отключена
app = FastAPI(
    title="Rental System API",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# Обработчик ошибок валидации Pydantic
from pydantic import ValidationError

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    """Обработчик ошибок валидации Pydantic.

    Полные детали — только в режиме отладки (DEBUG=True); в production
    возвращается общий формат 422 без внутренних подробностей.
    """
    import logging
    logger = logging.getLogger(__name__)

    logger.error(f"❌ VALIDATION ERROR: {exc}")
    logger.error(f"❌ VALIDATION ERROR: Request URL: {request.url}")
    logger.error(f"❌ VALIDATION ERROR: Request method: {request.method}")

    # Логируем детали ошибок валидации
    for error in exc.errors():
        logger.error(f"❌ VALIDATION ERROR: {error}")

    if getattr(settings, "DEBUG", False):
        return JSONResponse(
            status_code=422,
            content={
                "detail": exc.errors(),
                "error_type": "ValidationError",
                "error_message": "Ошибка валидации данных"
            }
        )

    # Production: общий формат без internals
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Ошибка валидации данных",
            "error_type": "ValidationError"
        }
    )

# Глобальный обработчик ошибок с уважением к DEBUG
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Глобальный обработчик всех необработанных исключений.

    В продакшне (DEBUG=False) скрывает подробности и traceback из ответа,
    но логирует их; в DEBUG=True возвращает подробную информацию.
    """
    import traceback

    # Логируем всегда максимально подробно
    logger.error(f"🚨 GLOBAL ERROR: {type(exc).__name__}: {str(exc)}")
    logger.error(f"🚨 GLOBAL ERROR: Request URL: {request.url}")
    logger.error(f"🚨 GLOBAL ERROR: Request method: {request.method}")
    logger.error(f"🚨 GLOBAL ERROR: Traceback: {traceback.format_exc()}")

    # КРИТИЧНО: По умолчанию False для безопасности (не раскрываем детали ошибок)
    if getattr(settings, "DEBUG", False):
        # Режим отладки — возвращаем подробности
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "error_type": type(exc).__name__,
                "error_message": str(exc),
                "traceback": traceback.format_exc()
            }
        )

    # Продакшн — общий ответ без утечки деталей
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error"
        }
    )

# --- Dependency Injection Setup ---
container = Container()
# КРИТИЧЕСКИ ВАЖНО: Инициализируем контейнер для правильной работы провайдеров
container.wire()
app.container = container

# Глобальный контейнер больше не нужен - управление сессиями через Middleware

# --- Rate Limiter State, Exception Handler and Middleware ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- HEALTH CHECK ENDPOINT ---
# Простой health check: без аутентификации и без rate limit (exempt)
@app.get("/health")
@limiter.exempt
async def health_check():
    """Health check endpoint для мониторинга состояния системы."""
    return {"status": "ok"}

@app.get("/monitoring/stats")
async def get_middleware_stats(admin: "User" = Depends(require_admin)):
    """Эндпоинт для мониторинга статистики middleware (только для администраторов)"""
    # Получаем middleware из состояния приложения
    middleware = getattr(app.state, 'di_middleware', None)

    if middleware and hasattr(middleware, 'get_stats'):
        stats = middleware.get_stats()
        return {
            "status": "success",
            "middleware_stats": stats,
            "timestamp": time.time()
        }
    else:
        return {
            "status": "error",
            "message": "Middleware stats not available",
            "available_middleware": [mw.cls.__name__ for mw in app.user_middleware],
            "middleware_state": str(middleware)
        }


# --- CSRF Exception Handler ---
@app.exception_handler(CsrfProtectError)
def csrf_protect_exception_handler(request: Request, exc: CsrfProtectError):
    """CSRF-ошибки единообразно возвращают 403 (независимо от internals библиотеки)."""
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": "CSRF validation failed: " + (exc.message or "недействительный CSRF-токен")}
    )

# --- НОВАЯ MIDDLEWARE ДЛЯ ЛОГГИРОВАНИЯ ЗАПРОСОВ ---
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        logger.info(f"Incoming request: {request.method} {request.url.path}")
        response = await call_next(request)
        return response


# --- Secure Headers Middleware ---
class SecureHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Генерируем nonce на каждый запрос
        csp_nonce = secrets.token_urlsafe(16)

        # Делаем nonce доступным другим слоям при необходимости
        try:
            # state может отсутствовать в тестах — поэтому через try
            request.state.csp_nonce = csp_nonce
        except Exception:
            pass

        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        # Заголовок X-XSS-Protection устарел, но оставим для обратной совместимости
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Формируем CSP с реальным nonce
        csp_value = (
            "default-src 'self'; "
            f"script-src 'self' 'strict-dynamic' 'nonce-{csp_nonce}'; "
            # По возможности избегаем inline стилей; при необходимости можно применять 'nonce-<...>' к стилям
            # временно допускаем safe-inline для совместимости, позже переведём на nonce
            "style-src 'self' 'unsafe-inline'; "
            "object-src 'none'; "
            "frame-ancestors 'none'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "form-action 'self'; "
            "base-uri 'self';"
        )
        response.headers["Content-Security-Policy"] = csp_value
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=(), payment=()"
        
        # HSTS только для HTTPS
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response

# +++ АТОМАРНЫЙ DIContainerMiddleware с управлением транзакциями +++
class DIContainerMiddleware(BaseHTTPMiddleware):
    """
    Middleware для атомарного и отказоустойчивого управления сессиями SQLAlchemy.
    
    КРИТИЧЕСКИ ВАЖНЫЕ ОСОБЕННОСТИ:
    - Атомарные транзакции: begin/commit/rollback для каждого запроса
    - Гарантированное закрытие сессии в блоке finally
    - Task-safe внедрение сессии через контекстный менеджер override
    - Отказоустойчивость: rollback при любых ошибках
    - Детальное логирование и мониторинг производительности
    
    РЕШАЕТ ПРОБЛЕМУ: Утечки соединений из пула при ошибках под нагрузкой
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.request_count = 0
        self.error_count = 0
        self.session_count = 0
        self.start_time = time.time()
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        self.request_count += 1
        request_id = self.request_count
        
        # Пропускаем простые эндпоинты, которые не требуют DI
        if request.url.path in ["/health", "/docs", "/openapi.json", "/redoc"]:
            response = await call_next(request)
            duration = time.time() - start_time
            response.headers["X-Request-ID"] = str(request_id)
            response.headers["X-Processing-Time"] = f"{duration:.3f}s"
            response.headers["X-Middleware-Version"] = "3.0-ATOMIC"
            return response
        
        # Получаем контейнер из состояния приложения
        container = request.app.container
        if not container:
            raise RuntimeError("DI container not found in app state.")

        # Создаем новую сессию БД для этого запроса с полной изоляцией
        session = AsyncSessionLocal()
        self.session_count += 1
        
        # Убеждаемся, что сессия чистая
        try:
            if hasattr(session, '_connection') and session._connection:
                await session._connection.close()
                session._connection = None
        
            if session.in_transaction():
                await session.rollback()
        except Exception:
            pass  # Игнорируем ошибки очистки
        
        # Атомарное управление транзакцией с полной изоляцией
        try:
            # Начинаем транзакцию
            await session.begin()
            
            # Устанавливаем сессию в контекстную переменную для изоляции
            from containers import request_db_session
            token = request_db_session.set(session)
            
            try:
                # Выполняем запрос
                response = await call_next(request)
                
                # Коммитим транзакцию
                await session.commit()
                
                # Добавляем метрики в заголовки ответа
                duration = time.time() - start_time
                response.headers["X-Request-ID"] = str(request_id)
                response.headers["X-Processing-Time"] = f"{duration:.3f}s"
                response.headers["X-Session-ID"] = str(id(session))
                response.headers["X-Middleware-Version"] = "6.0-CONTEXTVAR-ISOLATED"
                response.headers["X-Transaction-Status"] = "COMMITTED"
                
                return response
            
            finally:
                # Очищаем контекстную переменную
                try:
                    request_db_session.reset(token)
                except Exception:
                    pass
                
        except Exception as e:
            # При любой ошибке - откатываем транзакцию
            try:
                await session.rollback()
            except Exception:
                pass
            
            self.error_count += 1
            raise
        finally:
            # Гарантированно закрываем сессию и соединение
            try:
                if hasattr(session, '_connection') and session._connection:
                    await session._connection.close()
                    session._connection = None
                
                await session.close()
            except Exception:
                pass
    
    def get_stats(self):
        """Возвращает статистику middleware для мониторинга"""
        uptime = time.time() - self.start_time
        return {
            "total_requests": self.request_count,
            "total_errors": self.error_count,
            "total_sessions": self.session_count,
            "error_rate": self.error_count / max(self.request_count, 1) * 100,
            "uptime_seconds": uptime,
            "requests_per_second": self.request_count / max(uptime, 1),
            "middleware_version": "2.0"
        }
# +++ КОНЕЦ БЛОКА +++

# --- Add Middlewares ---
# +++ ДОБАВИТЬ РЕГИСТРАЦИЮ MIDDLEWARE (ВАЖНО: ДО CORS) +++
app.add_middleware(DIContainerMiddleware)
app.state.di_middleware = None  # Будет установлен после создания middleware

# Rate limiting: глобальный default 200/minute; точечные лимиты заданы
# декораторами @limiter.limit на auth-эндпоинтах
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(LoggingMiddleware)

# --- CORS Middleware Configuration ---
# Логирование настроек CORS при старте (без раскрытия всех источников в prod)
cors_config = get_cors_config(settings)
cors_origins_count = len(cors_config.get("allow_origins", [])) if isinstance(cors_config.get("allow_origins"), list) else 0
if cors_config.get("allow_origins") == ["*"]:
    logger.info("🔒 CORS: Wildcard режим (разрешены все источники)")
else:
    logger.info(f"🔒 CORS: Разрешено источников: {cors_origins_count}")
logger.info(f"🔒 CORS: Credentials: {cors_config.get('allow_credentials', False)}")
logger.info(f"🔒 CORS: Max-Age: {cors_config.get('max_age', 0)}s")
logger.info(f"🔒 CORS: Методы: {len(cors_config.get('allow_methods', []))} разрешено")

app.add_middleware(CORSMiddleware, **cors_config)
app.add_middleware(SecureHeadersMiddleware)

app.include_router(all_routes, prefix="/api")

# Статическая раздача загруженных изображений.
# Монтируется ПОСЛЕ include_router: иначе mount перехватит POST/DELETE
# /api/uploads/images до роутера и вернёт 405.
from fastapi.staticfiles import StaticFiles
app.mount(
    "/api/uploads/images",
    StaticFiles(directory=str(settings.UPLOAD_DIR)),
    name="uploads",
)

# Инициализируем middleware в состоянии приложения для статистики
@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске приложения"""
    # Находим экземпляр DIContainerMiddleware в зарегистрированных middleware
    for middleware in app.user_middleware:
        if middleware.cls == DIContainerMiddleware:
            app.state.di_middleware = middleware.kwargs.get('app')
            break

# КРИТИЧЕСКИ ВАЖНО: wire() уже вызван выше при инициализации контейнера
# Дублирующий вызов не нужен