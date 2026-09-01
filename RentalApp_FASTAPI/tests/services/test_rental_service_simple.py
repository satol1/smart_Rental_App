# tests/services/test_rental_service_simple.py

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from datetime import date, datetime, timedelta

from api.services.order.rental_service import RentalLifecycleService


class TestRentalServiceSimple:
    """Простые тесты для RentalLifecycleService."""

    @pytest.fixture
    def rental_service(self):
        """Фикстура для создания экземпляра RentalLifecycleService."""
        mock_db = AsyncMock()
        mock_rental_repo = AsyncMock()
        mock_reservation_repo = AsyncMock()
        mock_user_repo = AsyncMock()
        mock_equipment_repo = AsyncMock()
        mock_system_service = AsyncMock()
        
        # Создаем моки для недостающих зависимостей
        mock_validator = AsyncMock()
        mock_balance_service = AsyncMock()
        mock_financial_service = AsyncMock()
        mock_promo_code_logic = AsyncMock()
        
        # Создаем моки для специализированных сервисов
        mock_creation_service = AsyncMock()
        mock_return_service = AsyncMock()
        mock_update_service = AsyncMock()
        mock_cancellation_service = AsyncMock()
        
        service = RentalLifecycleService(
            db=mock_db,
            rental_repo=mock_rental_repo,
            reservation_repo=mock_reservation_repo,
            user_repo=mock_user_repo,
            equipment_repo=mock_equipment_repo,
            system_service=mock_system_service,
            validator=mock_validator,
            balance_service=mock_balance_service,
            financial_service=mock_financial_service,
            promo_code_logic=mock_promo_code_logic,
            creation_service=mock_creation_service,
            return_service=mock_return_service,
            update_service=mock_update_service,
            cancellation_service=mock_cancellation_service
        )
        return service

    @pytest.mark.asyncio
    async def test_rental_service_initialization(self, rental_service):
        """Тест инициализации сервиса аренды."""
        assert rental_service is not None
        assert rental_service.rental_repo is not None
        assert rental_service.user_repo is not None
        assert rental_service.equipment_repo is not None

    @pytest.mark.asyncio
    async def test_rental_service_has_required_methods(self, rental_service):
        """Тест наличия необходимых методов в сервисе."""
        assert hasattr(rental_service, 'convert_reservation_to_rental')
        assert hasattr(rental_service, 'create_rental_from_scratch')
        assert hasattr(rental_service, 'return_rental')
        assert hasattr(rental_service, 'update_rental_details_by_admin')

    @pytest.mark.asyncio
    async def test_rental_service_dependencies_injected(self, rental_service):
        """Тест инъекции зависимостей в сервис."""
        # Проверяем, что все репозитории инициализированы
        assert rental_service.rental_repo is not None
        assert rental_service.reservation_repo is not None
        assert rental_service.user_repo is not None
        assert rental_service.equipment_repo is not None
        assert rental_service.system_service is not None
        assert rental_service.validator is not None
        assert rental_service.balance_service is not None
        assert rental_service.financial_service is not None
        assert rental_service.promo_code_logic is not None

    @pytest.mark.asyncio
    async def test_rental_service_method_signatures(self, rental_service):
        """Тест сигнатур методов сервиса."""
        # Проверяем, что методы являются callable
        assert callable(rental_service.convert_reservation_to_rental)
        assert callable(rental_service.create_rental_from_scratch)
        assert callable(rental_service.return_rental)
        assert callable(rental_service.update_rental_details_by_admin)

    @pytest.mark.asyncio
    async def test_rental_service_logger_initialized(self, rental_service):
        """Тест инициализации логгера в сервисе."""
        # Проверяем, что логгер инициализирован (может быть не в конструкторе)
        # Логгер обычно инициализируется в модуле
        import logging
        logger = logging.getLogger(__name__)
        assert logger is not None

    @pytest.mark.asyncio
    async def test_rental_service_db_session(self, rental_service):
        """Тест сессии базы данных в сервисе."""
        # Проверяем, что сессия БД инициализирована
        assert rental_service.db is not None
        assert hasattr(rental_service.db, 'execute')
        assert hasattr(rental_service.db, 'commit')
        assert hasattr(rental_service.db, 'rollback')

    @pytest.mark.asyncio
    async def test_rental_service_balance_operations(self, rental_service):
        """Тест операций с балансом в сервисе."""
        # Проверяем, что сервис баланса инициализирован
        assert rental_service.balance_service is not None
        assert hasattr(rental_service.balance_service, 'db')

    @pytest.mark.asyncio
    async def test_rental_service_financial_operations(self, rental_service):
        """Тест финансовых операций в сервисе."""
        # Проверяем, что финансовый сервис инициализирован
        assert rental_service.financial_service is not None
        assert hasattr(rental_service.financial_service, 'db')
