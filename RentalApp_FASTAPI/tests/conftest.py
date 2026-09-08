# tests/conftest.py
"""
Конфигурация pytest для тестирования RentalApp_FASTAPI.
Содержит общие фикстуры и настройки для unit тестов.
"""

# Тестовое окружение по умолчанию — те же значения, что и в docker-конфигурациях
# тестов (env.test / docker-compose.unit-tests.yml). setdefault не перекрывает
# реальные переменные окружения, поэтому docker/e2e конфигурации не затрагиваются.
# DISABLE_CSRF сознательно НЕ задаём: CSRF-защита должна работать в тестах,
# кроме окружений, где она явно отключена (docker-compose.e2e.yml).
import os as _os

_os.environ.setdefault("SECRET_KEY", "abcdef0123456789abcdef0123456789")
_os.environ.setdefault("CSRF_SECRET_KEY", "0123456789abcdef0123456789abcdef")
_os.environ.setdefault("POSTGRES_PASSWORD", "unit_test_password")
_os.environ.setdefault("DEBUG", "false")

# Импортируем фикстуры для создания тестовой базы данных
from .conftest_migrations import create_test_database, clean_database

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from datetime import date, datetime, timezone
from typing import List, Dict, Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from dependency_injector import providers

# Импорты моделей для создания моков
from api.models.user import User
from api.models.equipment import Equipment
from api.models.accessory import Accessory
from api.models.promo_code import PromoCode
from api.models.holiday import Holiday
from api.models.rental import Rental
from api.models.reservation import Reservation
from api.models.balance_history import BalanceHistory


@pytest.fixture(scope="session")
def event_loop():
    """Создает event loop для всех тестов в сессии."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def _clean_aggregate_cache():
    """Кэш агрегатов (dashboard:summary) не должен протекать между тестами.

    Очищает и in-memory, и redis-часть хранилища (если redis доступен).
    """
    from api.services.cache_service import app_cache, DASHBOARD_SUMMARY_KEY

    app_cache.clear()
    app_cache.invalidate(DASHBOARD_SUMMARY_KEY)
    yield
    app_cache.clear()
    app_cache.invalidate(DASHBOARD_SUMMARY_KEY)


@pytest.fixture
def mock_db_session():
    """Создает мок AsyncSession для тестов."""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def mock_user():
    """Создает мок пользователя для тестов."""
    user = MagicMock(spec=User)
    user.id = 1
    user.email = "test@example.com"
    user.balance = 1000.0
    user.is_active = True
    return user


@pytest.fixture
def mock_equipment():
    """Создает мок оборудования для тестов."""
    equipment = MagicMock(spec=Equipment)
    equipment.id = 1
    equipment.name = "Test Camera"
    equipment.daily_rate = 100.0
    equipment.is_available = True
    return equipment


@pytest.fixture
def mock_accessory():
    """Создает мок аксессуара для тестов."""
    accessory = MagicMock(spec=Accessory)
    accessory.id = 1
    accessory.name = "Test Lens"
    accessory.price = 50.0
    return accessory


@pytest.fixture
def mock_promo_code():
    """Создает мок промокода для тестов."""
    promo_code = MagicMock(spec=PromoCode)
    promo_code.id = 1
    promo_code.code = "TEST10"
    promo_code.discount_percentage = 10.0
    promo_code.is_active = True
    promo_code.times_used = 0
    promo_code.max_uses = 100
    promo_code.valid_from = None
    promo_code.expires_at = None
    return promo_code


@pytest.fixture
def mock_holiday():
    """Создает мок выходного дня для тестов."""
    holiday = MagicMock(spec=Holiday)
    holiday.id = 1
    holiday.date = date(2025, 1, 1)
    holiday.name = "New Year"
    return holiday


@pytest.fixture
def mock_rental():
    """Создает мок аренды для тестов."""
    rental = MagicMock(spec=Rental)
    rental.id = 1
    rental.user_id = 1
    rental.start_date = date(2025, 1, 1)
    rental.end_date = date(2025, 1, 5)
    rental.total_cost = 400.0
    rental.prepayment_amount = 100.0
    rental.status = "active"
    rental.accessory_links = []
    return rental


@pytest.fixture
def mock_reservation():
    """Создает мок резерва для тестов."""
    reservation = MagicMock(spec=Reservation)
    reservation.id = 1
    reservation.user_id = 1
    reservation.start_date = date(2025, 1, 1)
    reservation.end_date = date(2025, 1, 5)
    reservation.total_cost = 400.0
    reservation.status = "active"
    reservation.equipment = []
    reservation.accessory_links = []
    reservation.promo_code_id = None
    return reservation


@pytest.fixture
def mock_balance_history():
    """Создает мок записи истории баланса для тестов."""
    balance_history = MagicMock(spec=BalanceHistory)
    balance_history.id = 1
    balance_history.user_id = 1
    balance_history.amount = -100.0
    balance_history.operation_type = "rental_debit"
    balance_history.description = "Test transaction"
    balance_history.rental_id = 1
    balance_history.created_at = datetime.now(timezone.utc)
    return balance_history


@pytest.fixture
def sample_dates():
    """Предоставляет набор тестовых дат."""
    return {
        'start_date': date(2025, 1, 1),
        'end_date': date(2025, 1, 5),
        'holiday_date': date(2025, 1, 1),
        'working_date': date(2025, 1, 2),
        'past_date': date(2024, 12, 1),
        'future_date': date(2025, 12, 31)
    }


@pytest.fixture
def sample_equipment_ids():
    """Предоставляет набор тестовых ID оборудования."""
    return [1, 2, 3]


@pytest.fixture
def sample_accessories_dict():
    """Предоставляет тестовый словарь аксессуаров."""
    return {
        1: [1, 2],  # Для оборудования ID=1 аксессуары ID=1,2
        2: [3]      # Для оборудования ID=2 аксессуар ID=3
    }


# Утилиты для создания моков результатов SQLAlchemy
def create_mock_scalar_result(value):
    """Создает мок результата scalar() для SQLAlchemy."""
    mock_result = MagicMock()
    mock_result.scalar.return_value = value
    return mock_result


def create_mock_scalars_result(values):
    """Создает мок результата scalars().all() для SQLAlchemy."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = values
    return mock_result


def create_mock_first_result(value):
    """Создает мок результата first() для SQLAlchemy."""
    mock_result = MagicMock()
    mock_result.first.return_value = value
    return mock_result


# Фикстуры для моков результатов SQLAlchemy
@pytest.fixture
def mock_scalar_result():
    """Фикстура для создания моков scalar результатов."""
    return create_mock_scalar_result


@pytest.fixture
def mock_scalars_result():
    """Фикстура для создания моков scalars результатов."""
    return create_mock_scalars_result


@pytest.fixture
def mock_first_result():
    """Фикстура для создания моков first результатов."""
    return create_mock_first_result


@pytest.fixture
def test_container():
    """Создает тестовый DI-контейнер с моками."""
    from containers import Container
    
    # Создаем мок сессии БД
    mock_db = AsyncMock(spec=AsyncSession)
    
    # Создаем моки репозиториев
    mock_user_repo = AsyncMock()
    mock_equipment_repo = AsyncMock()
    mock_accessory_repo = AsyncMock()
    mock_rental_repo = AsyncMock()
    mock_reservation_repo = AsyncMock()
    mock_balance_history_repo = AsyncMock()
    mock_holiday_repo = AsyncMock()
    mock_association_repo = AsyncMock()
    mock_discount_repo = AsyncMock()
    mock_brand_system_repo = AsyncMock()
    
    # Создаем моки сервисов
    mock_auth_service = AsyncMock()
    mock_user_service = AsyncMock()
    mock_equipment_crud_service = AsyncMock()
    mock_accessory_service = AsyncMock()
    mock_balance_service = AsyncMock()
    mock_promo_code_service = AsyncMock()
    mock_promo_code_manager = AsyncMock()
    mock_promo_code_business_logic = AsyncMock()
    mock_calendar_service = AsyncMock()
    mock_dashboard_service = AsyncMock()
    mock_rental_query_service = AsyncMock()
    mock_reservation_query_service = AsyncMock()
    mock_holiday_service = AsyncMock()
    mock_pack_service = AsyncMock()
    mock_equipment_filter_service = AsyncMock()
    mock_equipment_pack_service = AsyncMock()
    mock_brand_system_service = AsyncMock()
    mock_equipment_service_api = AsyncMock()
    mock_settings_service = AsyncMock()
    mock_reservation_lifecycle_service = AsyncMock()
    mock_rental_lifecycle_service = AsyncMock()
    
    # Создаем тестовый контейнер
    test_container = Container()
    
    # Переопределяем провайдеры на моки
    test_container.db_session.override(mock_db)
    test_container.user_repo.override(providers.Factory(lambda: mock_user_repo))
    test_container.equipment_repo.override(providers.Factory(lambda: mock_equipment_repo))
    test_container.accessory_repo.override(providers.Factory(lambda: mock_accessory_repo))
    test_container.rental_repo.override(providers.Factory(lambda: mock_rental_repo))
    test_container.reservation_repo.override(providers.Factory(lambda: mock_reservation_repo))
    test_container.balance_history_repo.override(providers.Factory(lambda: mock_balance_history_repo))
    test_container.holiday_repo.override(providers.Factory(lambda: mock_holiday_repo))
    test_container.association_repo.override(providers.Factory(lambda: mock_association_repo))
    test_container.discount_repo.override(providers.Factory(lambda: mock_discount_repo))
    test_container.brand_system_repo.override(providers.Factory(lambda: mock_brand_system_repo))
    
    test_container.auth_service.override(providers.Factory(lambda: mock_auth_service))
    test_container.user_service.override(providers.Factory(lambda: mock_user_service))
    test_container.equipment_crud_service.override(providers.Factory(lambda: mock_equipment_crud_service))
    test_container.accessory_service.override(providers.Factory(lambda: mock_accessory_service))
    test_container.balance_service.override(providers.Factory(lambda: mock_balance_service))
    test_container.promo_code_service.override(providers.Factory(lambda: mock_promo_code_service))
    test_container.promo_code_manager.override(providers.Factory(lambda: mock_promo_code_manager))
    test_container.promo_code_business_logic.override(providers.Factory(lambda: mock_promo_code_business_logic))
    test_container.calendar_service.override(providers.Factory(lambda: mock_calendar_service))
    test_container.dashboard_service.override(providers.Factory(lambda: mock_dashboard_service))
    test_container.rental_query_service.override(providers.Factory(lambda: mock_rental_query_service))
    test_container.reservation_query_service.override(providers.Factory(lambda: mock_reservation_query_service))
    test_container.holiday_service.override(providers.Factory(lambda: mock_holiday_service))
    test_container.holiday_service_with_repos.override(providers.Factory(lambda: mock_holiday_service))
    test_container.pack_service.override(providers.Factory(lambda: mock_pack_service))
    test_container.equipment_filter_service.override(providers.Factory(lambda: mock_equipment_filter_service))
    test_container.equipment_pack_service.override(providers.Factory(lambda: mock_equipment_pack_service))
    test_container.brand_system_service.override(providers.Factory(lambda: mock_brand_system_service))
    test_container.equipment_service_api.override(providers.Factory(lambda: mock_equipment_service_api))
    test_container.settings_service.override(providers.Factory(lambda: mock_settings_service))
    test_container.reservation_lifecycle_service.override(providers.Factory(lambda: mock_reservation_lifecycle_service))
    test_container.rental_lifecycle_service.override(providers.Factory(lambda: mock_rental_lifecycle_service))
    
    # Настраиваем wiring для тестов
    test_container.wire(modules=[
        "api.auth_api",
        "api.user_profile_api", 
        "api.equipment_api",
        "api.accessory_api",
        "api.reservation_api",
        "api.admin_user_api",
        "api.calendar_api",
        "api.promo_code_api",
        "api.deps",
        "api.dependencies"
    ])
    
    yield test_container

    # Очищаем после тестов
    test_container.unwire()


# --- Изоляция rate-limiter между тестами ---
# slowapi хранит счётчики в in-memory storage процесса pytest, поэтому без
# сброса лимиты (например 5/minute на /auth/token) "протекают" между тестами.
@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Сбрасывает счётчики rate-limiter перед и после каждого теста."""
    from api.rate_limiter import limiter

    limiter.reset()
    yield
    limiter.reset()


# --- Хелперы для работы с CSRF-защитой в тестах ---
def csrf_protection_enabled() -> bool:
    """CSRF-защита включена (DISABLE_CSRF не задан или не 'true')."""
    return _os.getenv("DISABLE_CSRF", "false").lower() != "true"


def get_csrf_headers(client) -> Dict[str, str]:
    """Получает CSRF-токен через GET /api/auth/csrf-token и возвращает заголовки.

    Cookie fastapi-csrf-token сохраняется в cookie-jar клиента автоматически
    (работает и с TestClient, и с httpx.Client/AsyncClient).
    При выключенной защите (DISABLE_CSRF=true) возвращает пустой словарь.
    """
    if not csrf_protection_enabled():
        return {}
    response = client.get("/api/auth/csrf-token")
    response.raise_for_status()
    return {"X-CSRF-Token": response.json()["csrf_token"]}


async def get_csrf_headers_async(client) -> Dict[str, str]:
    """Асинхронная версия get_csrf_headers для httpx.AsyncClient."""
    if not csrf_protection_enabled():
        return {}
    response = await client.get("/api/auth/csrf-token")
    response.raise_for_status()
    return {"X-CSRF-Token": response.json()["csrf_token"]}
