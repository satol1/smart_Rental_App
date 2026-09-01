# tests/services/test_rental_lifecycle_service_fixed.py
"""
Исправленные тесты для RentalLifecycleService.
Исправляет проблемы с доступом к атрибутам сервиса.
"""

import pytest
from unittest.mock import Mock, AsyncMock
from datetime import date, datetime
from fastapi import HTTPException

from api.services.order.rental_service import RentalLifecycleService
from api.models.rental import Rental
from api.models.reservation import Reservation
from api.models.user import User
from api.models.equipment import Equipment
from shared.constants.order_status import OrderStatus
from shared.schemas.rental_schema import (
    RentalCreateFromReservationRequest,
    RentalReturnRequest,
    RentalCreateFromScratchRequest,
)


class TestRentalLifecycleServiceFixed:
    """Исправленные тесты для RentalLifecycleService"""

    @pytest.fixture
    def sample_user(self):
        """Образец пользователя для тестирования"""
        return User(
            id=1,
            email="test@example.com",
            full_name="Test User",
            phone="+1234567890"
        )

    @pytest.fixture
    def sample_equipment(self):
        """Образец оборудования для тестирования"""
        return Equipment(
            id=1,
            name="Test Equipment",
            equipment_type="Test Type",
            brand="Test Brand",
            condition="Good",
            daily_rate=100.0
        )

    @pytest.fixture
    def sample_reservation(self):
        """Образец резервации для тестирования"""
        reservation = Reservation(
            id=1,
            user_id=1,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 7),
            status=OrderStatus.ACTIVE,
            total_cost=700.0
        )
        reservation.created_at = datetime.now()
        reservation.updated_at = datetime.now()
        return reservation

    @pytest.fixture
    def sample_rental(self):
        """Образец аренды для тестирования"""
        rental = Rental(
            id=1,
            user_id=1,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 7),
            status=OrderStatus.ACTIVE,
            total_cost=700.0
        )
        rental.created_at = datetime.now()
        rental.updated_at = datetime.now()
        return rental

    @pytest.fixture
    def sample_manager(self):
        """Образец менеджера для тестирования"""
        manager = User()
        manager.id = 99
        manager.email = "manager@example.com"
        manager.full_name = "Manager User"
        manager.role = "admin"
        return manager

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        return AsyncMock()

    @pytest.fixture
    def mock_rental_repo(self):
        """Мок репозитория аренд"""
        return AsyncMock()

    @pytest.fixture
    def mock_reservation_repo(self):
        """Мок репозитория резерваций"""
        return AsyncMock()

    @pytest.fixture
    def mock_user_repo(self):
        """Мок репозитория пользователей"""
        return AsyncMock()

    @pytest.fixture
    def mock_equipment_repo(self):
        """Мок репозитория оборудования"""
        return AsyncMock()

    @pytest.fixture
    def mock_system_service(self):
        """Мок системного сервиса"""
        return AsyncMock()

    @pytest.fixture
    def mock_validator(self):
        """Мок валидатора заказов"""
        return AsyncMock()

    @pytest.fixture
    def mock_balance_service(self):
        """Мок сервиса баланса"""
        return AsyncMock()

    @pytest.fixture
    def mock_financial_service(self):
        """Мок финансового сервиса"""
        return AsyncMock()

    @pytest.fixture
    def mock_promo_code_logic(self):
        """Мок логики промокодов"""
        return AsyncMock()

    @pytest.fixture
    def mock_creation_service(self):
        """Мок сервиса создания аренд"""
        return AsyncMock()
    
    @pytest.fixture
    def mock_return_service(self):
        """Мок сервиса возврата аренд"""
        return AsyncMock()
    
    @pytest.fixture
    def mock_update_service(self):
        """Мок сервиса обновления аренд"""
        return AsyncMock()
    
    @pytest.fixture
    def mock_cancellation_service(self):
        """Мок сервиса отмены аренд"""
        return AsyncMock()

    @pytest.fixture
    def rental_service(self, 
                      mock_db_session, 
                      mock_rental_repo, 
                      mock_reservation_repo, 
                      mock_user_repo, 
                      mock_equipment_repo, 
                      mock_system_service, 
                      mock_validator, 
                      mock_balance_service, 
                      mock_financial_service, 
                      mock_promo_code_logic,
                      mock_creation_service,
                      mock_return_service,
                      mock_update_service,
                      mock_cancellation_service):
        """Создает экземпляр RentalLifecycleService с мок-зависимостями"""
        return RentalLifecycleService(
            db=mock_db_session,
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

    def test_service_initialization(self, rental_service, mock_db_session, mock_rental_repo, mock_balance_service, mock_financial_service):
        """Тест инициализации сервиса"""
        # Проверяем, что сервис инициализирован
        assert rental_service.db == mock_db_session
        
        # Проверяем, что специализированные сервисы созданы
        assert hasattr(rental_service, 'creation_service')
        assert hasattr(rental_service, 'return_service')
        assert hasattr(rental_service, 'update_service')
        assert hasattr(rental_service, 'cancellation_service')
        
        # Проверяем, что основные зависимости переданы
        assert rental_service.balance_service == mock_balance_service
        assert rental_service.financial_service == mock_financial_service

    def test_rental_service_dependencies_injected(self, rental_service, mock_balance_service, mock_financial_service):
        """Тест инъекции зависимостей в сервис аренды"""
        # Проверяем, что зависимости правильно инъектированы
        assert rental_service.balance_service is not None
        assert rental_service.financial_service is not None
        
        # Проверяем, что это именно наши моки
        assert rental_service.balance_service == mock_balance_service
        assert rental_service.financial_service == mock_financial_service

    def test_rental_service_balance_operations(self, rental_service, mock_balance_service):
        """Тест операций с балансом в сервисе аренды"""
        # Проверяем, что сервис баланса доступен
        assert rental_service.balance_service is not None
        assert rental_service.balance_service == mock_balance_service

    def test_rental_service_financial_operations(self, rental_service, mock_financial_service):
        """Тест финансовых операций в сервисе аренды"""
        # Проверяем, что финансовый сервис доступен
        assert rental_service.financial_service is not None
        assert rental_service.financial_service == mock_financial_service

    @pytest.mark.asyncio
    async def test_convert_reservation_to_rental_success(self, rental_service, mock_reservation_repo, sample_reservation, sample_rental, sample_manager):
        """Тест успешного преобразования резервации в аренду"""
        from shared.schemas.rental_schema import RentalCreateFromReservationRequest
        
        # Создаем данные для преобразования
        request = RentalCreateFromReservationRequest(
            return_date=None,
            condition=None,
            notes=None
        )
        
        # Настраиваем мок для получения резервации
        mock_reservation_repo.get_by_id.return_value = sample_reservation
        
        # Настраиваем мок для создания аренды
        rental_service.creation_service.convert_reservation_to_rental = AsyncMock(return_value=sample_rental)
        
        # Выполняем тест
        result = await rental_service.convert_reservation_to_rental(1, request, sample_manager)
        
        # Проверяем результат
        assert result == sample_rental
        rental_service.creation_service.convert_reservation_to_rental.assert_called_once_with(1, request, sample_manager)

    @pytest.mark.asyncio
    async def test_return_rental_success(self, rental_service, sample_rental, sample_manager):
        """Тест успешного возврата аренды"""
        # Создаем данные для возврата
        return_data = RentalReturnRequest(
            actual_return_date=date(2024, 1, 5),
            notes_on_return="Returned in good condition",
            accessories_returned_confirmation=True
        )
        
        # Настраиваем мок для возврата аренды
        rental_service.return_service.return_rental = AsyncMock(return_value=sample_rental)
        
        # Выполняем тест
        result = await rental_service.return_rental(1, return_data, sample_manager)
        
        # Проверяем результат
        assert result == sample_rental
        rental_service.return_service.return_rental.assert_called_once_with(1, return_data, sample_manager)

    @pytest.mark.asyncio
    async def test_create_rental_from_scratch_success(self, rental_service, sample_rental, sample_manager):
        """Тест успешного создания аренды с нуля"""
        # Создаем данные для создания аренды
        rental_data = RentalCreateFromScratchRequest(
            user_id=1,
            equipment_ids=[1, 2],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 7),
            promo_code=None
        )
        
        # Настраиваем мок для создания аренды
        rental_service.creation_service.create_rental_from_scratch = AsyncMock(return_value=sample_rental)
        
        # Выполняем тест
        result = await rental_service.create_rental_from_scratch(rental_data, sample_manager)
        
        # Проверяем результат
        assert result == sample_rental
        rental_service.creation_service.create_rental_from_scratch.assert_called_once_with(rental_data, sample_manager)

    @pytest.mark.asyncio
    async def test_update_rental_success(self, rental_service, sample_rental):
        """Тест успешного обновления аренды"""
        from shared.schemas.rental_schema import AdminRentalUpdate
        
        # Создаем данные для обновления
        update_data = AdminRentalUpdate(
            start_date=date(2024, 1, 2),
            end_date=date(2024, 1, 8),
            status=OrderStatus.ACTIVE
        )
        
        # Настраиваем мок для обновления аренды
        rental_service.update_service.update_rental = AsyncMock(return_value=sample_rental)
        
        # Выполняем тест
        result = await rental_service.update_rental(1, update_data)
        
        # Проверяем результат
        assert result == sample_rental
        rental_service.update_service.update_rental.assert_called_once_with(1, update_data)

    @pytest.mark.asyncio
    async def test_cancel_rental_success(self, rental_service):
        """Тест успешной отмены аренды"""
        # Настраиваем мок для отмены аренды
        rental_service.cancellation_service.cancel_rental = AsyncMock(return_value=True)
        
        # Выполняем тест
        result = await rental_service.cancel_rental(1)
        
        # Проверяем результат
        assert result is True
        rental_service.cancellation_service.cancel_rental.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_delete_rental_success(self, rental_service):
        """Тест успешного удаления аренды"""
        # Настраиваем мок для удаления аренды
        rental_service.cancellation_service.delete_rental = AsyncMock(return_value=True)
        
        # Выполняем тест
        result = await rental_service.delete_rental(1)
        
        # Проверяем результат
        assert result is True
        rental_service.cancellation_service.delete_rental.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_revert_rental_success(self, rental_service, sample_rental, sample_manager):
        """Тест успешного отката аренды"""
        from shared.schemas.rental_schema import RentalRevertRequest
        
        # Создаем данные для отката
        revert_data = RentalRevertRequest(
            reason="Test revert reason"
        )
        
        # Настраиваем мок для отката аренды
        rental_service.cancellation_service.revert_rental_to_reservation = AsyncMock(return_value=sample_rental)
        
        # Выполняем тест
        result = await rental_service.revert_rental(1, sample_manager, revert_data)
        
        # Проверяем результат
        assert result == sample_rental
        rental_service.cancellation_service.revert_rental_to_reservation.assert_called_once_with(1, sample_manager, revert_data)

    def test_service_has_required_methods(self, rental_service):
        """Тест наличия необходимых методов в сервисе"""
        # Проверяем, что все основные методы доступны
        assert hasattr(rental_service, 'convert_reservation_to_rental')
        assert hasattr(rental_service, 'return_rental')
        assert hasattr(rental_service, 'create_rental_from_scratch')
        assert hasattr(rental_service, 'update_rental')
        assert hasattr(rental_service, 'cancel_rental')
        assert hasattr(rental_service, 'delete_rental')
        assert hasattr(rental_service, 'revert_rental')
        
        # Проверяем, что методы являются callable
        assert callable(rental_service.convert_reservation_to_rental)
        assert callable(rental_service.return_rental)
        assert callable(rental_service.create_rental_from_scratch)
        assert callable(rental_service.update_rental)
        assert callable(rental_service.cancel_rental)
        assert callable(rental_service.delete_rental)
        assert callable(rental_service.revert_rental)

    def test_service_has_specialized_services(self, rental_service):
        """Тест наличия специализированных сервисов"""
        # Проверяем, что специализированные сервисы созданы
        assert hasattr(rental_service, 'creation_service')
        assert hasattr(rental_service, 'return_service')
        assert hasattr(rental_service, 'update_service')
        assert hasattr(rental_service, 'cancellation_service')
        
        # Проверяем, что это объекты (не None)
        assert rental_service.creation_service is not None
        assert rental_service.return_service is not None
        assert rental_service.update_service is not None
        assert rental_service.cancellation_service is not None
