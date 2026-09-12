# api/auth_api.py

import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
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
        secure=False,    # TLS терминируется на nginx, бэкенд видит http
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
    secure_cookie = not settings.DEBUG
    # Вычисляем домен безопасным образом (без domain для localhost/IP)
    cookie_domain = _resolve_cookie_domain(request)
    from fastapi.responses import JSONResponse
    resp = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    resp.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=int(timedelta(days=14).total_seconds()),
        path="/",
        domain=cookie_domain
    )
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
    """Обновляет access-токен по refresh-токену из httpOnly cookie."""
    # Валидируем CSRF-токен: при ошибке CsrfProtectError -> 403 (обработчик в main_api)
    await _validate_csrf(request, csrf_protect)

    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh токен отсутствует")

    # verify_refresh_token проверяет подпись, type="refresh" и denylist (logout)
    payload = await auth_service.verify_refresh_token(refresh_token)
    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный refresh токен")

    new_access = auth_service.create_access_token({"sub": subject})
    return {"access_token": new_access, "token_type": "bearer"}


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