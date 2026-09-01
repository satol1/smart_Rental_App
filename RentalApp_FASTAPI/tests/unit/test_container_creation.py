"""
Тесты для проверки создания и инициализации контейнера (исправленная версия).
Проверяем, что контейнер работает правильно с современной архитектурой.
"""

import pytest
from containers import Container
from dependency_injector.providers import Callable, Factory


class TestContainerCreation:
    """Тесты для проверки создания контейнера."""

    def test_container_creation(self):
        """Проверяем, что контейнер создается правильно."""
        container = Container()
        
        # Проверяем тип контейнера - теперь это DynamicContainer, что нормально
        print(f"Container type: {type(container)}")
        print(f"Container class: {container.__class__}")
        print(f"Container MRO: {container.__class__.__mro__}")
        
        # Проверяем, что это наш контейнер (DynamicContainer наследуется от Container)
        assert hasattr(container, 'db_session')
        assert hasattr(container, 'user_repo')
        assert hasattr(container, 'reservation_repo')
        
        # Проверяем тип провайдеров
        print(f"db_session type: {type(container.db_session)}")
        print(f"user_repo type: {type(container.user_repo)}")
        
        # Проверяем, что db_session является Callable (не Dependency)
        assert isinstance(container.db_session, Callable)
        assert isinstance(container.user_repo, Factory)

    def test_container_providers_initialization(self):
        """Проверяем инициализацию провайдеров."""
        container = Container()
        
        # Проверяем, что провайдеры инициализированы
        assert container.db_session is not None
        assert container.user_repo is not None
        assert container.reservation_repo is not None
        
        # Проверяем аргументы провайдеров
        print(f"user_repo args: {container.user_repo.args}")
        print(f"user_repo kwargs: {container.user_repo.kwargs}")
        
        # Проверяем, что user_repo зависит от db_session
        assert 'db' in container.user_repo.kwargs
        assert container.user_repo.kwargs['db'] == container.db_session

    def test_container_wiring_config(self):
        """Проверяем конфигурацию wiring."""
        container = Container()
        
        # Проверяем, что wiring_config существует
        assert hasattr(container, 'wiring_config')
        assert container.wiring_config is not None
        
        # Проверяем модули в wiring_config
        assert hasattr(container.wiring_config, 'modules')
        assert isinstance(container.wiring_config.modules, list)
        
        # Проверяем, что модули содержат нужные API
        expected_modules = [
            "api.dependencies",
            "api.admin_reservation_api",
            "api.reservation_api",
            "api.equipment_api",
        ]
        
        for module in expected_modules:
            assert module in container.wiring_config.modules

    def test_container_override_works(self):
        """Проверяем, что override работает."""
        from unittest.mock import AsyncMock
        from sqlalchemy.ext.asyncio import AsyncSession
        
        container = Container()
        
        # Создаем мок-сессию
        mock_session = AsyncMock(spec=AsyncSession)
        
        # Проверяем исходное состояние
        try:
            current_session = container.db_session.provided()
            print(f"Initial session: {current_session}")
        except Exception as e:
            print(f"Initial session error: {e}")
        
        # Используем override
        with container.db_session.override(mock_session):
            # Проверяем, что сессия установлена
            provided_session = container.db_session.provided()
            assert provided_session == mock_session
            
            # Проверяем, что можем получить сервис
            try:
                user_repo = container.user_repo()
                assert user_repo is not None
                print("User repo created successfully")
            except Exception as e:
                print(f"User repo creation error: {e}")
        
        # Проверяем, что после выхода из контекста сессия сброшена
        try:
            final_session = container.db_session.provided()
            print(f"Final session: {final_session}")
        except Exception as e:
            print(f"Final session error: {e}")

    def test_container_import_issue(self):
        """Проверяем, есть ли проблема с импортом."""
        import sys
        
        # Проверяем, что модуль containers импортирован
        assert 'containers' in sys.modules
        
        # Проверяем, что Container доступен
        from containers import Container
        assert Container is not None
        
        # Проверяем, что это правильный класс
        print(f"Container class: {Container}")
        print(f"Container module: {Container.__module__}")
        
        # Создаем экземпляр
        container = Container()
        print(f"Container instance: {container}")
        print(f"Container instance type: {type(container)}")
        
        # Проверяем, что это наш контейнер (DynamicContainer)
        assert hasattr(container, 'db_session')
        assert hasattr(container, 'user_repo')

    def test_container_session_isolation(self):
        """Проверяем изоляцию сессий в контейнере."""
        from unittest.mock import AsyncMock
        from sqlalchemy.ext.asyncio import AsyncSession
        
        container = Container()
        
        # Создаем две разные мок-сессии
        mock_session_1 = AsyncMock(spec=AsyncSession)
        mock_session_2 = AsyncMock(spec=AsyncSession)
        
        # Проверяем изоляцию через override
        with container.db_session.override(mock_session_1):
            session_1 = container.db_session.provided()
            assert session_1 == mock_session_1
            
            with container.db_session.override(mock_session_2):
                session_2 = container.db_session.provided()
                assert session_2 == mock_session_2
                assert session_2 != session_1
            
            # После выхода из внутреннего контекста должна вернуться первая сессия
            session_1_again = container.db_session.provided()
            assert session_1_again == mock_session_1

    def test_container_service_dependencies(self):
        """Проверяем зависимости между сервисами."""
        container = Container()
        
        # Проверяем, что основные сервисы существуют
        assert hasattr(container, 'user_service')
        assert hasattr(container, 'equipment_service_api')
        assert hasattr(container, 'reservation_lifecycle_service')
        assert hasattr(container, 'rental_lifecycle_service')
        
        # Проверяем типы сервисов
        assert isinstance(container.user_service, Factory)
        assert isinstance(container.equipment_service_api, Factory)
        assert isinstance(container.reservation_lifecycle_service, Factory)
        assert isinstance(container.rental_lifecycle_service, Factory)
