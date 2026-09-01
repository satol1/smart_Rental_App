"""
Тесты для проверки работы wire() с контейнером.
Проверяем, почему контейнер не инициализируется правильно.
"""

import pytest
from containers import Container


class TestContainerWire:
    """Тесты для проверки работы wire() с контейнером."""

    def test_container_before_wire(self):
        """Проверяем состояние контейнера до вызова wire()."""
        container = Container()
        
        print(f"Container type before wire: {type(container)}")
        print(f"Container class before wire: {container.__class__}")
        
        # Проверяем, что провайдеры существуют
        assert hasattr(container, 'db_session')
        assert hasattr(container, 'user_repo')
        
        # Проверяем тип провайдеров
        print(f"db_session type before wire: {type(container.db_session)}")
        print(f"user_repo type before wire: {type(container.user_repo)}")
        
        # Проверяем, что это Callable (не Dependency)
        from dependency_injector.providers import Callable
        assert isinstance(container.db_session, Callable)

    def test_container_after_wire(self):
        """Проверяем состояние контейнера после вызова wire()."""
        container = Container()
        
        print(f"Container type before wire: {type(container)}")
        
        # Вызываем wire()
        container.wire()
        
        print(f"Container type after wire: {type(container)}")
        print(f"Container class after wire: {container.__class__}")
        
        # Проверяем, что провайдеры все еще существуют
        assert hasattr(container, 'db_session')
        assert hasattr(container, 'user_repo')
        
        # Проверяем тип провайдеров после wire()
        print(f"db_session type after wire: {type(container.db_session)}")
        print(f"user_repo type after wire: {type(container.user_repo)}")
        
        # Проверяем, что это все еще Callable (не Dependency)
        from dependency_injector.providers import Callable
        assert isinstance(container.db_session, Callable)

    def test_container_override_after_wire(self):
        """Проверяем, что override работает после wire()."""
        from unittest.mock import AsyncMock
        from sqlalchemy.ext.asyncio import AsyncSession
        
        container = Container()
        container.wire()
        
        # Создаем мок-сессию
        mock_session = AsyncMock(spec=AsyncSession)
        
        # Проверяем исходное состояние
        try:
            current_session = container.db_session.provided()
            print(f"Initial session after wire: {current_session}")
        except Exception as e:
            print(f"Initial session error after wire: {e}")
        
        # Используем override
        with container.db_session.override(mock_session):
            # Проверяем, что сессия установлена
            provided_session = container.db_session.provided()
            assert provided_session == mock_session
            print(f"Session overridden successfully: {provided_session}")
            
            # Проверяем, что можем получить сервис
            try:
                user_repo = container.user_repo()
                assert user_repo is not None
                print("User repo created successfully after wire")
            except Exception as e:
                print(f"User repo creation error after wire: {e}")
        
        # Проверяем, что после выхода из контекста сессия сброшена
        try:
            final_session = container.db_session.provided()
            print(f"Final session after wire: {final_session}")
        except Exception as e:
            print(f"Final session error after wire: {e}")

    def test_container_wiring_modules(self):
        """Проверяем, что модули правильно подключены к wiring."""
        container = Container()
        
        # Проверяем wiring_config до wire()
        print(f"Wiring config before wire: {container.wiring_config}")
        print(f"Wiring modules before wire: {container.wiring_config.modules}")
        
        # Вызываем wire()
        container.wire()
        
        # Проверяем wiring_config после wire()
        print(f"Wiring config after wire: {container.wiring_config}")
        print(f"Wiring modules after wire: {container.wiring_config.modules}")
        
        # Проверяем, что модули все еще там
        expected_modules = [
            "api.dependencies",
            "api.admin_reservation_api",
            "api.reservation_api",
            "api.equipment_api",
        ]
        
        for module in expected_modules:
            assert module in container.wiring_config.modules

    def test_container_providers_after_wire(self):
        """Проверяем провайдеры после wire()."""
        container = Container()
        container.wire()
        
        # Проверяем, что провайдеры инициализированы
        assert container.db_session is not None
        assert container.user_repo is not None
        assert container.reservation_repo is not None
        
        # Проверяем аргументы провайдеров
        print(f"user_repo args after wire: {container.user_repo.args}")
        print(f"user_repo kwargs after wire: {container.user_repo.kwargs}")
        
        # Проверяем, что user_repo зависит от db_session
        assert 'db' in container.user_repo.kwargs
        assert container.user_repo.kwargs['db'] == container.db_session
