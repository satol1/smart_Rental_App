# api/auth_api.py

import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from shared.schemas.user_schema import UserCreate, Token, RegisterResponse
from datetime import timedelta
from api.services.auth_service import AuthService
from dependency_injector.wiring import inject, Provide
from config.core import settings
from containers import Container
# from api.deps import get_user_by_token  # Импортируем локально в функциях
from api.models.user import User
from api.repositories.user_repository import UserRepository
from fastapi_csrf_protect import CsrfProtect
from fastapi_csrf_protect.exceptions import CsrfProtectError
from api.rate_limiter import limiter

router = APIRouter(prefix="/auth", tags=["Аутентификация"])

# CSRF-логика вынесена в api/csrf.py (общая для всех роутеров)
from api.csrf import (  # noqa: E402
    CSRF_COOKIE_KEY,
    _validate_csrf,
)


# OAuth2PasswordBearer определяет, что для получения токена нужно обратиться к /auth/token
# Фронтенд должен будет также отправить CSRF токен на этот эндпоинт.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


# Вспомогательная функция: вычисляет корректный домен для cookie.
# Важно: для localhost/127.0.0.1 и IP-адресов домен лучше НЕ указывать,
# иначе браузер может проигнорировать как установку, так и удаление cookie.
def _resolve_cookie_domain(request: Request) -> str | None:
    host = request.headers.get("host", "").split(":")[0] or None
    if not host:
        return None
    # Если это localhost или IPv4/IPv6 адрес — возвращаем None
    if host == "localhost":
        return None
    # Простейшая проверка на IPv4 и наличие двоеточия для IPv6
    import re
    ipv4_re = re.compile(r"^\d+\.\d+\.\d+\.\d+$")
    if ipv4_re.match(host) or ":" in host:
        return None
    # Для обычных доменов возвращаем сам хост
    return host


@router.get("/csrf-token")
@inject
async def get_csrf_token(
        request: Request,
        response: Response,
        csrf_protect: CsrfProtect = Depends()
):
    """Получить CSRF токен для защиты от CSRF атак.

    Токен подписывается секретным ключом сервера. Одно и то же подписанное
    значение уходит и в cookie fastapi-csrf-token (читается фронтендом), и в
    JSON-ответе — фронтенд шлёт его обратно в заголовке X-CSRF-Token,
    где проверяется совпадение с cookie и подпись (double-submit).
    """
    if settings.DISABLE_CSRF:
        # Защита выключена (тестовые окружения) — выдаём простой токен
        token = secrets.token_urlsafe(32)
        response.set_cookie(
            key=CSRF_COOKIE_KEY,
            value=token,
            httponly=False,
            secure=False,
            samesite="lax",
        )
        return {"csrf_token": token}

    _, signed_token = csrf_protect.generate_csrf_tokens()
    response.set_cookie(
        key=CSRF_COOKIE_KEY,
        value=signed_token,
        httponly=False,  # фронтенд читает cookie и шлёт значение в заголовке
        # TLS терминируется на nginx, но браузер работает по https: флаг Secure
        # обязателен в проде (DEBUG=false) — как у refresh-cookie (этап 6.5 аудита)
        secure=not settings.DEBUG,
        samesite="lax",
    )
    return {"csrf_token": signed_token}

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
@inject
async def register_user(
        user_data: UserCreate,
        request: Request,
        auth_service: AuthService = Depends(Provide[Container.auth_service]),
        csrf_protect: CsrfProtect = Depends()
):
    # Валидируем CSRF-токен: при ошибке CsrfProtectError -> 403 (обработчик в main_api)
    await _validate_csrf(request, csrf_protect)

    user = await auth_service.create_user(user_data)

    return {
        "message": "Пользователь успешно зарегистрирован",
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }


def _set_refresh_cookie(resp, token: str, request: Request) -> None:
    """Выставляет httpOnly refresh-cookie (единые параметры для login и ротации)."""
    from api.services.auth_service import REFRESH_TOKEN_EXPIRE_DAYS

    resp.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=int(timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS).total_seconds()),
        path="/",
        domain=_resolve_cookie_domain(request),
    )


@router.post("/token", response_model=Token)
@limiter.limit("5/minute")
@inject
async def login(
        request: Request,
        form_data: OAuth2PasswordRequestForm = Depends(),
        auth_service: AuthService = Depends(Provide[Container.auth_service]),
        csrf_protect: CsrfProtect = Depends()
):
    # Валидируем CSRF-токен: при ошибке CsrfProtectError -> 403 (обработчик в main_api)
    await _validate_csrf(request, csrf_protect)

    user = await auth_service.authenticate_user(form_data.username, form_data.password, request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, # Используем корректный статус
            detail="Неверные учетные данные",
            headers={"WWW-Authenticate": "Bearer"}, # Стандартный заголовок для 401
        )
    access_token = auth_service.create_access_token({"sub": user.email})
    refresh_token = auth_service.create_refresh_token({"sub": user.email})

    # Устанавливаем httpOnly refresh cookie и возвращаем JSON корректным способом
    resp = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    _set_refresh_cookie(resp, refresh_token, request)
    return resp


@router.post("/refresh")
@limiter.limit("5/minute")
@inject
async def refresh_token_endpoint(
        request: Request,
        response: Response,
        auth_service: AuthService = Depends(Provide[Container.auth_service]),
        csrf_protect: CsrfProtect = Depends()
):
    """Ротирует refresh-токен и обновляет access-токен (этап 6.1 аудита).

    Каждый вызов выдаёт НОВЫЙ refresh (новый jti) в httpOnly cookie, старый
    отправляется в denylist. Повторное использование старого токена (кража
    cookie) отзывает все сессии пользователя.
    """
    # Валидируем CSRF-токен: при ошибке CsrfProtectError -> 403 (обработчик в main_api)
    await _validate_csrf(request, csrf_protect)

    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh токен отсутствует")

    new_refresh, subject = await auth_service.rotate_refresh_token(refresh_token)
    new_access = auth_service.create_access_token({"sub": subject})
    resp = JSONResponse(content={"access_token": new_access, "token_type": "bearer"})
    _set_refresh_cookie(resp, new_refresh, request)
    return resp


@router.post("/logout", status_code=200)
@inject
async def logout(
        request: Request,
        response: Response,
        auth_service: AuthService = Depends(Provide[Container.auth_service]),
        csrf_protect: CsrfProtect = Depends()
):
    """Очищает refresh-cookie и отзывает refresh-токен (denylist), деаутентифицируя клиента.

    Logout не требует валидного access-токена: refresh декодируется напрямую
    из cookie, чтобы отзыв сработал даже при истёкшем access.
    """
    await _validate_csrf(request, csrf_protect)

    # Отзываем refresh-токен по jti (с TTL до момента его истечения)
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        await auth_service.revoke_refresh_token(refresh_token)

    secure_cookie = not settings.DEBUG
    cookie_domain = _resolve_cookie_domain(request)
    from fastapi.responses import JSONResponse
    resp = JSONResponse({"detail": "logged_out"})
    # Удаляем куку максимально совместимо
    resp.delete_cookie(
        key="refresh_token",
        path="/",
        secure=secure_cookie,
        httponly=True,
        samesite="lax",
        domain=cookie_domain,
    )
    # Для localhost и IP-адресов cookie может быть установлена без domain
    if cookie_domain is None:
        resp.delete_cookie(
            key="refresh_token",
            path="/",
            secure=secure_cookie,
            httponly=True,
            samesite="lax",
        )
    return resp


@inject
async def get_current_user(
        token: str = Depends(oauth2_scheme),
        user_repo: UserRepository = Depends(Provide[Container.user_repo])
) -> User:
    from api.dependencies import get_user_by_token
    user = await get_user_by_token(token, user_repo)
    if not user:
        # Исправляем код статуса и добавляем заголовок для ошибок аутентификации
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или просроченный токен аутентификации",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


@router.get("/me")
@inject
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    user_service: 'UserService' = Depends(Provide[Container.user_service])
):
    """Получить информацию о текущем пользователе."""
    # Используем сервис для получения полной информации о пользователе, включая status
    return user_service.get_current_user_info(current_user)