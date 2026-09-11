# api/csrf.py
"""
Общая CSRF-защита для всех мутирующих эндпоинтов.

Раньше реальные проверки были только в /auth/* (login/refresh/logout/register),
а в остальных роутерах `csrf_protect: CsrfProtect = Depends()` был декоративным.
Теперь любой мутирующий эндпоинт подключает `Depends(validate_csrf_dependency)`.

Механика та же (double-submit + подпись):
1) заголовок X-CSRF-Token совпадает с cookie fastapi-csrf-token;
2) токен подписан серверным секретом и не истёк.

При выключенной защите (DISABLE_CSRF=true, только тестовые окружения)
проверка пропускается. Ошибки -> CsrfProtectError -> 403 (обработчик в main_api).
"""

import hmac

from fastapi import Depends, Request
from fastapi_csrf_protect import CsrfProtect
from fastapi_csrf_protect.exceptions import CsrfProtectError
from itsdangerous import BadData, SignatureExpired, URLSafeTimedSerializer

from config import settings

# Параметры CSRF-защиты (совместимы с fastapi-csrf-protect и фронтендом)
CSRF_COOKIE_KEY = "fastapi-csrf-token"
CSRF_HEADER_KEY = "X-CSRF-Token"
CSRF_TOKEN_MAX_AGE = 3600  # секунд


def _csrf_serializer() -> URLSafeTimedSerializer:
    """Сериализатор CSRF-токенов с тем же секретом/salt, что у fastapi-csrf-protect."""
    return URLSafeTimedSerializer(
        settings.CSRF_SECRET_KEY.get_secret_value(), salt="fastapi-csrf-token"
    )


async def _validate_csrf(request: Request, csrf_protect: CsrfProtect) -> None:
    """Реальная валидация CSRF-токена запроса (double-submit + подпись)."""
    if settings.DISABLE_CSRF:
        return

    cookie_token = request.cookies.get(CSRF_COOKIE_KEY)
    header_token = request.headers.get(CSRF_HEADER_KEY)

    if (
        not cookie_token
        or not header_token
        or not hmac.compare_digest(header_token, cookie_token)
    ):
        raise CsrfProtectError(403, "CSRF-токен отсутствует или не совпадает")

    try:
        _csrf_serializer().loads(cookie_token, max_age=CSRF_TOKEN_MAX_AGE)
    except SignatureExpired:
        raise CsrfProtectError(403, "CSRF-токен истёк")
    except BadData:
        raise CsrfProtectError(403, "CSRF-токен недействителен")


async def validate_csrf_dependency(
    request: Request,
    csrf_protect: CsrfProtect = Depends(),
) -> None:
    """FastAPI-зависимость для мутирующих эндпоинтов вне /auth.

    Подключается как `_: None = Depends(validate_csrf_dependency)`
    вместо декоративного `csrf_protect: CsrfProtect = Depends()`.
    """
    await _validate_csrf(request, csrf_protect)
