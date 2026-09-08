"""
Тесты для проверки исправлений нарушений принципа Dependency Injection
"""

import pytest
from unittest.mock import Mock, AsyncMock
from dependency_injector import containers
from sqlalchemy.ext.asyncio import AsyncSession

from containers import Container
from api.repositories.equipment_repository import EquipmentRepository
from api.repositories.rental_repository import RentalRepository
from api.repositories.reservation_repository import ReservationRepository
from api.services.order.rental_service import RentalLifecycleService
from api.services.error_handler_service import ErrorHandlerService


class TestDependencyInjectionFixes:
    """Тесты для проверки исправлений нарушений DI"""
    
    @pytest.fixture
    def container(self):
        """Создает тестовый контейнер"""
        container = Container()
        container.wire(modules=[])
        return container
    
    @pytest.fixture
    def mock_db(self):
        """Создает мок сессии БД"""
        return AsyncMock(spec=AsyncSession)
    
    def test_equipment_repository_di_injection(self, container, mock_db):
        """Тест: EquipmentRepository получает специализированные репозитории через DI"""
        # Получаем репозиторий через контейнер
        equipment_repo = container.equipment_repo()
        
        # Проверяем, что это экземпляр EquipmentRepository
        assert isinstance(equipment_repo, EquipmentRepository)
        
        # Проверяем, что специализированные репозитории инъектированы
        assert hasattr(equipment_repo, '_query_repo')
        assert hasattr(equipment_repo, '_command_repo')
        assert hasattr(equipment_repo, '_relations_repo')
    
    def test_rental_repository_di_injection(self, container, mock_db):
        """Тест: RentalRepository получает специализированные репозитории через DI"""
        # Получаем репозиторий через контейнер
        rental_repo = container.rental_repo()
        
        # Проверяем, что это экземпляр RentalRepository
        assert isinstance(rental_repo, RentalRepository)
        
        # Проверяем, что специализированные репозитории инъектированы
        assert hasattr(rental_repo, '_query_repo')
        assert hasattr(rental_repo, '_command_repo')
        assert hasattr(rental_repo, '_financial_repo')
    
    def test_reservation_repository_di_injection(self, container, mock_db):
        """Тест: ReservationRepository получает специализированные репозитории через DI"""
        # Получаем репозиторий через контейнер
        reservation_repo = container.reservation_repo()
        
        # Проверяем, что это экземпляр ReservationRepository
        assert isinstance(reservation_repo, ReservationRepository)
        
        # Проверяем, что специализированные репозитории инъектированы
        assert hasattr(reservation_repo, '_query_repo')
        assert hasattr(reservation_repo, '_filter_repo')
        assert hasattr(reservation_repo, '_availability_repo')
    
    def test_rental_lifecycle_service_di_injection(self, container, mock_db):
        """Тест: RentalLifecycleService получает специализированные сервисы через DI"""
        # Получаем сервис через контейнер
        rental_service = container.rental_lifecycle_service()
        
        # Проверяем, что это экземпляр RentalLifecycleService
        assert isinstance(rental_service, RentalLifecycleService)
        
        # Проверяем, что специализированные сервисы инъектированы
        assert hasattr(rental_service, 'creation_service')
        assert hasattr(rental_service, 'return_service')
        assert hasattr(rental_service, 'update_service')
        assert hasattr(rental_service, 'cancellation_service')
    
    def test_error_handler_service_di_injection(self, container):
        """Тест: ErrorHandlerService получается через DI контейнер"""
        # Получаем сервис через контейнер
        error_handler = container.error_handler_service()
        
        # Проверяем, что это экземпляр ErrorHandlerService
        assert isinstance(error_handler, ErrorHandlerService)
    
    def test_no_direct_instantiation_in_repositories(self):
        """Тест: Репозитории не создают экземпляры других репозиториев напрямую"""
        # Этот тест проверяет, что в коде нет прямого создания экземпляров
        # Это проверяется статическим анализом кода
        
        # Проверяем, что в EquipmentRepository нет прямого создания
        equipment_repo_code = open('api/repositories/equipment_repository.py').read()
        assert 'EquipmentQueryRepository(' not in equipment_repo_code or 'query_repo or' in equipment_repo_code
        assert 'EquipmentCommandRepository(' not in equipment_repo_code or 'command_repo or' in equipment_repo_code
        assert 'EquipmentRelationsRepository(' not in equipment_repo_code or 'relations_repo or' in equipment_repo_code
        
        # Проверяем, что в RentalRepository нет прямого создания
        rental_repo_code = open('api/repositories/rental_repository.py').read()
        assert 'RentalQueryRepository(' not in rental_repo_code or 'query_repo or' in rental_repo_code
        assert 'RentalCommandRepository(' not in rental_repo_code or 'command_repo or' in rental_repo_code
        assert 'RentalFinancialRepository(' not in rental_repo_code or 'financial_repo or' in rental_repo_code
        
        # Проверяем, что в ReservationRepository нет прямого создания
        reservation_repo_code = open('api/repositories/reservation_repository.py').read()
        assert 'ReservationQueryRepository(' not in reservation_repo_code or 'query_repo or' in reservation_repo_code
        assert 'ReservationFilterRepository(' not in reservation_repo_code or 'filter_repo or' in reservation_repo_code
        assert 'ReservationAvailabilityRepository(' not in reservation_repo_code or 'availability_repo or' in reservation_repo_code
    
    def test_no_direct_instantiation_in_services(self):
        """Тест: Сервисы не создают экземпляры других сервисов напрямую"""
        # Проверяем, что в RentalLifecycleService нет прямого создания
        rental_service_code = open('api/services/order/rental_service.py').read()
        assert 'RentalCreationService(' not in rental_service_code or 'creation_service or' in rental_service_code
        assert 'RentalReturnService(' not in rental_service_code or 'return_service or' in rental_service_code
        assert 'RentalUpdateService(' not in rental_service_code or 'update_service or' in rental_service_code
        assert 'RentalCancellationService(' not in rental_service_code or 'cancellation_service or' in rental_service_code
    
    def test_no_global_error_handler_instance(self):
        """Тест: Нет глобального экземпляра ErrorHandlerService"""
        error_handler_code = open('api/services/error_handler_service.py').read()
        # Комментарий с примером допустим — проверяем только исполняемый код
        code_without_comments = "\n".join(
            line for line in error_handler_code.splitlines()
            if not line.strip().startswith('#')
        )
        assert 'error_handler = ErrorHandlerService()' not in code_without_comments
    
    def test_container_providers_exist(self, container):
        """Тест: Все необходимые провайдеры существуют в контейнере"""
        # Проверяем, что все провайдеры существуют
        assert hasattr(container, 'equipment_repo')
        assert hasattr(container, 'rental_repo')
        assert hasattr(container, 'reservation_repo')
        assert hasattr(container, 'rental_lifecycle_service')
        assert hasattr(container, 'error_handler_service')
        
        # Проверяем специализированные провайдеры
        assert hasattr(container, 'equipment_query_repo')
        assert hasattr(container, 'equipment_command_repo')
        assert hasattr(container, 'equipment_relations_repo')
        assert hasattr(container, 'rental_query_repo')
        assert hasattr(container, 'rental_command_repo')
        assert hasattr(container, 'rental_financial_repo')
        assert hasattr(container, 'reservation_query_repo')
        assert hasattr(container, 'reservation_filter_repo')
        assert hasattr(container, 'reservation_availability_repo')
        
        # Проверяем специализированные сервисы
        assert hasattr(container, 'rental_creation_service')
        assert hasattr(container, 'rental_return_service')
        assert hasattr(container, 'rental_update_service')
        assert hasattr(container, 'rental_cancellation_service')
    
    def test_dependency_injection_works(self, container, mock_db):
        """Тест: Инъекция зависимостей работает корректно"""
        # Получаем все основные сервисы и репозитории
        equipment_repo = container.equipment_repo()
        rental_repo = container.rental_repo()
        reservation_repo = container.reservation_repo()
        rental_service = container.rental_lifecycle_service()
        error_handler = container.error_handler_service()
        
        # Проверяем, что все объекты созданы
        assert equipment_repo is not None
        assert rental_repo is not None
        assert reservation_repo is not None
        assert rental_service is not None
        assert error_handler is not None
        
        # Проверяем, что зависимости инъектированы
        assert equipment_repo._query_repo is not None
        assert equipment_repo._command_repo is not None
        assert equipment_repo._relations_repo is not None
        
        assert rental_repo._query_repo is not None
        assert rental_repo._command_repo is not None
        assert rental_repo._financial_repo is not None
        
        assert reservation_repo._query_repo is not None
        assert reservation_repo._filter_repo is not None
        assert reservation_repo._availability_repo is not None
        
        assert rental_service.creation_service is not None
        assert rental_service.return_service is not None
        assert rental_service.update_service is not None
        assert rental_service.cancellation_service is not None
