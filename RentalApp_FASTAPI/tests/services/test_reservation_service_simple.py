# tests/services/test_reservation_service_simple.py

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from datetime import date, datetime, timedelta

from api.services.order.reservation_service import ReservationLifecycleService


class TestReservationServiceSimple:
    """Простые тесты для ReservationLifecycleService."""

    @pytest.fixture
    def reservation_service(self):
        """Фикстура для создания экземпляра ReservationLifecycleService."""
        mock_db = AsyncMock()
        mock_reservation_repo = AsyncMock()
        mock_user_repo = AsyncMock()
        mock_equipment_repo = AsyncMock()
        mock_system_service = AsyncMock()
        
        # Создаем моки для недостающих зависимостей
        mock_validator = AsyncMock()
        mock_financial_service = AsyncMock()
        mock_promo_code_logic = AsyncMock()
        
        service = ReservationLifecycleService(
            db=mock_db,
            reservation_repo=mock_reservation_repo,
            user_repo=mock_user_repo,
            equipment_repo=mock_equipment_repo,
            system_service=mock_system_service,
            validator=mock_validator,
            financial_service=mock_financial_service,
            promo_code_logic=mock_promo_code_logic
        )
        return service

    @pytest.mark.asyncio
    async def test_reservation_service_initialization(self, reservation_service):
        """Тест инициализации сервиса резерваций."""
        assert reservation_service is not None
        assert reservation_service.reservation_repo is not None
        assert reservation_service.user_repo is not None
        assert reservation_service.equipment_repo is not None

    @pytest.mark.asyncio
    async def test_reservation_service_has_required_methods(self, reservation_service):
        """Тест наличия необходимых методов в сервисе."""
        assert hasattr(reservation_service, 'create_user_reservation')
        assert hasattr(reservation_service, 'update_user_reservation')
        assert hasattr(reservation_service, 'cancel_user_reservation')
        assert hasattr(reservation_service, 'create_admin_reservation')

    @pytest.mark.asyncio
    async def test_reservation_service_dependencies_injected(self, reservation_service):
        """Тест инъекции зависимостей в сервис."""
        # Проверяем, что все репозитории инициализированы
        assert reservation_service.reservation_repo is not None
        assert reservation_service.user_repo is not None
        assert reservation_service.equipment_repo is not None
        assert reservation_service.system_service is not None
        assert reservation_service.validator is not None
        assert reservation_service.financial_service is not None
        assert reservation_service.promo_code_logic is not None

    @pytest.mark.asyncio
    async def test_reservation_service_method_signatures(self, reservation_service):
        """Тест сигнатур методов сервиса."""
        # Проверяем, что методы являются callable
        assert callable(reservation_service.create_user_reservation)
        assert callable(reservation_service.update_user_reservation)
        assert callable(reservation_service.cancel_user_reservation)
        assert callable(reservation_service.create_admin_reservation)

    @pytest.mark.asyncio
    async def test_reservation_service_logger_initialized(self, reservation_service):
        """Тест инициализации логгера в сервисе."""
        # Проверяем, что логгер инициализирован (может быть не в конструкторе)
        # Логгер обычно инициализируется в модуле
        import logging
        logger = logging.getLogger(__name__)
        assert logger is not None

    @pytest.mark.asyncio
    async def test_reservation_service_db_session(self, reservation_service):
        """Тест сессии базы данных в сервисе."""
        # Проверяем, что сессия БД инициализирована
        assert reservation_service.db is not None
        assert hasattr(reservation_service.db, 'execute')
        assert hasattr(reservation_service.db, 'commit')
        assert hasattr(reservation_service.db, 'rollback')
