# api/rate_limiter.py
"""
Единая точка создания rate limiter (slowapi).

Вынесен в отдельный модуль, чтобы и api/main_api.py (регистрация middleware),
и роутеры (декораторы @limiter.limit) импортировали один и тот же экземпляр
без циклических импортов.

Хранилище счётчиков — всегда memory:// (per-process). Причина: slowapi выбирает
storage один раз на старте, а limits при отказе уже выбранного Redis в рантайме
бросает ConnectionError → slowapi отвечает 500 на каждый запрос вместо
graceful degradation (см. slowapi/middleware.py). Риск недоступности Redis
не должен ронять авторизацию; пограничное ограничение на edge (nginx
limit_req на /api/auth/) и per-worker лимиты покрывают нагрузку.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Глобальный лимит по умолчанию для всех эндпоинтов + точечные лимиты
# на auth-эндпоинтах через @limiter.limit("5/minute")
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],
    storage_uri="memory://",
)
