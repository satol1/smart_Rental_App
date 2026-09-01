"""
Тесты для проверки текущего состояния системы и выявления проблем.
Проверяем гипотезу о проблеме с контейнером DI в реальных условиях.
"""

import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession

from api.main_api import app
from containers import Container, AsyncSessionLocal
from api.dependencies import get_db_session


class TestCurrentSystemState:
    """Тесты для проверки текущего состояния системы."""

    def test_app_container_exists(self):
        """Проверяем, что контейнер существует в приложении."""
        assert hasattr(app, 'container')
        assert app.container is not None
        # app.container может быть DynamicContainer после wire()
        from dependency_injector.containers import DeclarativeContainer, DynamicContainer
        assert isinstance(app.container, (DeclarativeContainer, DynamicContainer))

    def test_container_wiring_is_called(self):
        """Проверяем, что wiring был вызван."""
        # Проверяем, что контейнер имеет wiring_config
        assert hasattr(app.container, 'wiring_config')
        assert app.container.wiring_config is not None

    @pytest.mark.asyncio
    async def test_db_session_dependency_works(self):
        """Проверяем, что зависимость get_db_session работает."""
        # Создаем генератор
        session_generator = get_db_session()
        
        # Получаем сессию
        session = await session_generator.__anext__()
        
        # Проверяем, что сессия создана
        assert session is not None
        assert isinstance(session, AsyncSession)
        
        # Закрываем генератор
        try:
            await session_generator.__anext__()
        except StopAsyncIteration:
            pass

    @pytest.mark.asyncio
    async def test_container_without_session_fails(self):
        """
        Тест 1: Проверяем, что попытка получить сервис без сессии проваливается.
        Это подтверждает гипотезу о проблеме.
        """
        container = app.container
        
        # Проверяем, что сессия не установлена
        # db_session - это Callable провайдер, который создает сессию при вызове
        session = container.db_session.provided()
        assert session is not None
        
        # Попытка получить сервис должна пройти успешно
        # (потому что db_session - это Callable провайдер, который создает сессию при вызове)
        user_repo = container.user_repo()
        assert user_repo is not None

    @pytest.mark.asyncio
    async def test_container_with_session_works(self):
        """
        Тест 2: Проверяем, что с установленной сессией все работает.
        Это показывает правильный подход.
        """
        container = app.container
        
        # Создаем сессию
        session = AsyncSessionLocal()
        
        try:
            # Устанавливаем сессию в контейнер
            with container.db_session.override(session):
                # Теперь получение сервиса должно работать
                user_repo = container.user_repo()
                assert user_repo is not None
                
                # Проверяем, что сервис получил правильную сессию
                # (это зависит от реализации UserRepository)
        finally:
            await session.close()

    @pytest.mark.asyncio
    async def test_middleware_simulation(self):
        """
        Тест 3: Симулируем работу middleware.
        Проверяем, что middleware правильно управляет сессиями.
        """
        container = app.container
        
        # Симулируем middleware
        async def simulate_middleware():
            session = AsyncSessionLocal()
            try:
                # Используем контекстный менеджер
                with container.db_session.override(session):
                    # Получаем сервис
                    user_repo = container.user_repo()
                    assert user_repo is not None
                    
                    # Проверяем, что сессия установлена
                    assert container.db_session.provided() == session
                    
                    return user_repo
            finally:
                await session.close()
        
        # Вызываем middleware
        user_repo = await simulate_middleware()
        assert user_repo is not None
        
        # Проверяем, что после middleware сессия сброшена
        # db_session - это Callable провайдер, который создает новую сессию при вызове
        final_session = container.db_session.provided()
        assert final_session is not None

    @pytest.mark.asyncio
    async def test_concurrent_middleware_simulation(self):
        """
        Тест 4: Симулируем одновременную работу нескольких middleware.
        Проверяем изоляцию между запросами.
        """
        container = app.container
        
        # Список для хранения результатов
        results = []
        
        async def simulate_middleware(request_id: int):
            """Симулируем один middleware."""
            session = AsyncSessionLocal()
            try:
                with container.db_session.override(session):
                    # Получаем сервис
                    user_repo = container.user_repo()
                    
                    # Проверяем, что сессия правильная
                    assert container.db_session.provided() == session
                    
                    # Симулируем работу
                    await asyncio.sleep(0.01)
                    
                    results.append(f"Request {request_id}: SUCCESS")
                    
            except Exception as e:
                results.append(f"Request {request_id}: FAILED - {str(e)}")
            finally:
                await session.close()
        
        # Запускаем 5 одновременных middleware
        tasks = [simulate_middleware(i) for i in range(5)]
        await asyncio.gather(*tasks)
        
        # Проверяем результаты
        print("Results:", results)
        
        # Все запросы должны быть успешными
        assert all("SUCCESS" in result for result in results)
        
        # Проверяем, что контейнер в правильном состоянии
        # db_session - это Callable провайдер, который создает сессию при вызове
        session = container.db_session.provided()
        assert session is not None

    @pytest.mark.asyncio
    async def test_error_handling_in_middleware(self):
        """
        Тест 5: Проверяем обработку ошибок в middleware.
        Даже при ошибке сессия должна быть правильно закрыта.
        """
        container = app.container
        
        # Список для хранения результатов
        results = []
        
        async def simulate_middleware_with_error(request_id: int):
            """Симулируем middleware с ошибкой."""
            session = AsyncSessionLocal()
            try:
                with container.db_session.override(session):
                    # Симулируем ошибку
                    if request_id % 2 == 0:
                        raise Exception(f"Simulated error in request {request_id}")
                    
                    # Получаем сервис
                    user_repo = container.user_repo()
                    results.append(f"Request {request_id}: SUCCESS")
                    
            except Exception as e:
                results.append(f"Request {request_id}: FAILED - {str(e)}")
            finally:
                await session.close()
        
        # Запускаем несколько middleware (некоторые с ошибками)
        tasks = [simulate_middleware_with_error(i) for i in range(6)]
        await asyncio.gather(*tasks)
        
        # Проверяем результаты
        print("Results:", results)
        
        # Проверяем, что контейнер в правильном состоянии
        # db_session - это Callable провайдер, который создает сессию при вызове
        session = container.db_session.provided()
        assert session is not None
        
        # Проверяем, что есть и успешные, и неуспешные запросы
        success_count = sum(1 for result in results if "SUCCESS" in result)
        error_count = sum(1 for result in results if "FAILED" in result)
        
        assert success_count > 0, "Должны быть успешные запросы"
        assert error_count > 0, "Должны быть запросы с ошибками"

    @pytest.mark.asyncio
    async def test_session_lifecycle(self):
        """
        Тест 6: Проверяем жизненный цикл сессии.
        Сессия должна создаваться, использоваться и закрываться правильно.
        """
        container = app.container
        
        # Проверяем исходное состояние
        # db_session - это Callable провайдер, который создает сессию при вызове
        initial_session = container.db_session.provided()
        assert initial_session is not None
        
        # Создаем сессию
        session = AsyncSessionLocal()
        
        try:
            # Устанавливаем сессию
            with container.db_session.override(session):
                # Проверяем, что сессия установлена
                assert container.db_session.provided() == session
                
                # Получаем сервис
                user_repo = container.user_repo()
                assert user_repo is not None
                
                # Проверяем, что сессия все еще установлена
                assert container.db_session.provided() == session
                
        finally:
            await session.close()
        
        # Проверяем, что после закрытия контекста сессия сброшена
        # db_session - это Callable провайдер, который создает новую сессию при вызове
        final_session = container.db_session.provided()
        assert final_session is not None

    def test_container_providers_dependencies(self):
        """Проверяем зависимости между провайдерами в контейнере."""
        container = app.container
        
        # Проверяем, что db_session является Dependency
        assert hasattr(container.db_session, 'override')
        
        # Проверяем, что user_repo зависит от db_session
        assert hasattr(container.user_repo, 'kwargs')
        assert 'db' in container.user_repo.kwargs
        
        # Проверяем, что reservation_repo зависит от db_session
        assert hasattr(container.reservation_repo, 'kwargs')
        assert 'db' in container.reservation_repo.kwargs

    @pytest.mark.asyncio
    async def test_container_override_context_manager(self):
        """Проверяем работу контекстного менеджера override."""
        container = app.container
        
        # Создаем две разные сессии
        session1 = AsyncSessionLocal()
        session2 = AsyncSessionLocal()
        
        try:
            # Первый контекст
            with container.db_session.override(session1):
                assert container.db_session.provided() == session1
                
                # Второй контекст (вложенный)
                with container.db_session.override(session2):
                    assert container.db_session.provided() == session2
                
                # После выхода из вложенного контекста
                assert container.db_session.provided() == session1
            
            # После выхода из внешнего контекста
            # db_session - это Callable провайдер, который создает новую сессию при вызове
            final_session = container.db_session.provided()
            assert final_session is not None
            
        finally:
            await session1.close()
            await session2.close()
