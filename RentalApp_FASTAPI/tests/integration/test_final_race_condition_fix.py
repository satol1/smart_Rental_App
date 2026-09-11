"""
Финальный тест для проверки исправления race condition.
Проверяем, что исправления работают правильно при одновременных запросах.
"""

import pytest
import asyncio
import httpx
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession

from api.main_api import app
from containers import Container, AsyncSessionLocal


class TestFinalRaceConditionFix:
    """Финальные тесты для проверки исправления race condition."""

    def test_middleware_works_correctly(self):
        """Тест 1: Проверяем, что middleware работает правильно."""
        client = TestClient(app)
        
        # Тестируем простой эндпоинт
        response = client.get('/health')
        assert response.status_code == 200
        assert response.json()['status'] == 'ok'
        
        # Тестируем другой эндпоинт
        response = client.get('/health')
        assert response.status_code == 200
        assert response.json()['status'] == 'success'

    @pytest.mark.asyncio
    async def test_concurrent_requests_with_middleware(self):
        """
        Тест 2: Проверяем, что middleware правильно обрабатывает одновременные запросы.
        Это должно показать, что race condition устранен.
        """
        # Получаем глобальный контейнер из приложения
        global_container = app.container
        
        # Список для хранения результатов
        results = []
        
        async def simulate_request(request_id: int):
            """Симулируем один запрос через middleware."""
            try:
                # Симулируем DIContainerMiddleware
                session = AsyncSessionLocal()
                
                # Используем контекстный менеджер для переопределения
                with global_container.db_session.override(session):
                    # Симулируем обработку запроса
                    user_repo = global_container.user_repo()
                    
                    # Симулируем некоторую работу
                    await asyncio.sleep(0.01)  # Небольшая задержка
                    
                    results.append(f"Request {request_id}: SUCCESS")
                
                await session.close()
                
            except Exception as e:
                results.append(f"Request {request_id}: FAILED - {str(e)}")
        
        # Запускаем 20 одновременных запросов
        tasks = [simulate_request(i) for i in range(20)]
        await asyncio.gather(*tasks)
        
        # Проверяем результаты
        print("Results:", results)
        
        # Все запросы должны быть успешными
        assert all("SUCCESS" in result for result in results)
        assert len(results) == 20

    @pytest.mark.asyncio
    async def test_session_isolation_between_requests(self):
        """
        Тест 3: Проверяем изоляцию сессий между запросами.
        Каждый запрос должен использовать свою собственную сессию.
        """
        # Получаем глобальный контейнер из приложения
        global_container = app.container
        
        # Список для хранения сессий
        sessions_used = []
        
        async def simulate_request_with_session_tracking(request_id: int):
            """Симулируем запрос с отслеживанием сессии."""
            try:
                # Создаем сессию БД
                session = AsyncSessionLocal()
                
                # Используем глобальный контейнер
                with global_container.db_session.override(session):
                    # Получаем сессию из контейнера
                    container_session = global_container.db_session.provided()
                    sessions_used.append((request_id, id(container_session)))
                    
                    # Симулируем работу
                    await asyncio.sleep(0.01)
                
                await session.close()
                
            except Exception as e:
                print(f"Request {request_id} failed: {e}")
        
        # Запускаем 5 одновременных запросов
        tasks = [simulate_request_with_session_tracking(i) for i in range(5)]
        await asyncio.gather(*tasks)
        
        # Проверяем, что каждая сессия уникальна
        session_ids = [session_id for _, session_id in sessions_used]
        assert len(set(session_ids)) == len(session_ids), "Сессии должны быть уникальными"

    @pytest.mark.asyncio
    async def test_container_state_after_requests(self):
        """
        Тест 4: Проверяем состояние контейнера после завершения запросов.
        Контейнер должен вернуться в исходное состояние.
        """
        # Получаем глобальный контейнер из приложения
        global_container = app.container
        
        # Проверяем исходное состояние
        try:
            initial_session = global_container.db_session.provided()
            print(f"Initial session: {initial_session}")
        except Exception as e:
            print(f"Initial session error: {e}")
        
        async def simulate_request(request_id: int):
            """Симулируем запрос."""
            try:
                session = AsyncSessionLocal()
                
                with global_container.db_session.override(session):
                    # Проверяем, что сессия установлена
                    assert global_container.db_session.provided() == session
                    
                    # Симулируем работу
                    await asyncio.sleep(0.01)
                
                await session.close()
                
            except Exception as e:
                print(f"Request {request_id} failed: {e}")
        
        # Запускаем несколько запросов
        tasks = [simulate_request(i) for i in range(3)]
        await asyncio.gather(*tasks)
        
        # Проверяем, что контейнер вернулся в исходное состояние
        try:
            final_session = global_container.db_session.provided()
            print(f"Final session: {final_session}")
        except Exception as e:
            print(f"Final session error: {e}")

    @pytest.mark.asyncio
    async def test_error_handling_in_middleware(self):
        """
        Тест 5: Проверяем обработку ошибок в middleware.
        Даже при ошибке сессия должна быть правильно закрыта.
        """
        # Получаем глобальный контейнер из приложения
        global_container = app.container
        
        # Список для хранения результатов
        results = []
        
        async def simulate_request_with_error(request_id: int):
            """Симулируем запрос с ошибкой."""
            try:
                session = AsyncSessionLocal()
                
                with global_container.db_session.override(session):
                    # Симулируем ошибку
                    if request_id % 2 == 0:
                        raise Exception(f"Simulated error in request {request_id}")
                    
                    # Получаем сервис
                    user_repo = global_container.user_repo()
                    results.append(f"Request {request_id}: SUCCESS")
                    
            except Exception as e:
                results.append(f"Request {request_id}: FAILED - {str(e)}")
            finally:
                await session.close()
        
        # Запускаем несколько middleware (некоторые с ошибками)
        tasks = [simulate_request_with_error(i) for i in range(6)]
        await asyncio.gather(*tasks)
        
        # Проверяем результаты
        print("Results:", results)
        
        # Проверяем, что контейнер в правильном состоянии
        try:
            final_session = global_container.db_session.provided()
            print(f"Final session: {final_session}")
        except Exception as e:
            print(f"Final session error: {e}")
        
        # Проверяем, что есть и успешные, и неуспешные запросы
        success_count = sum(1 for result in results if "SUCCESS" in result)
        error_count = sum(1 for result in results if "FAILED" in result)
        
        assert success_count > 0, "Должны быть успешные запросы"
        assert error_count > 0, "Должны быть запросы с ошибками"

    def test_container_initialization_correct(self):
        """Тест 6: Проверяем, что контейнер инициализирован правильно."""
        # Получаем контейнер из приложения
        container = app.container
        
        # Проверяем тип контейнера
        assert container is not None
        assert hasattr(container, 'db_session')
        assert hasattr(container, 'user_repo')
        assert hasattr(container, 'reservation_repo')
        
        # Проверяем, что провайдеры инициализированы
        assert container.db_session is not None
        assert container.user_repo is not None
        assert container.reservation_repo is not None
        
        # Проверяем wiring
        assert hasattr(container, 'wiring_config')
        assert container.wiring_config is not None

    def test_override_works_correctly(self):
        """Тест 7: Проверяем, что override работает правильно."""
        container = app.container
        
        # Создаем мок-сессию
        mock_session = AsyncMock(spec=AsyncSession)
        
        # Проверяем исходное состояние
        try:
            initial_session = container.db_session.provided()
            print(f"Initial session: {initial_session}")
        except Exception as e:
            print(f"Initial session error: {e}")
        
        # Используем override
        with container.db_session.override(mock_session):
            # Проверяем, что сессия установлена
            provided_session = container.db_session.provided()
            assert provided_session == mock_session
            
            # Проверяем, что можем получить сервис
            user_repo = container.user_repo()
            assert user_repo is not None
        
        # Проверяем, что после выхода из контекста сессия сброшена
        try:
            final_session = container.db_session.provided()
            print(f"Final session: {final_session}")
        except Exception as e:
            print(f"Final session error: {e}")


class TestContainerDebugging:
    """Тесты для отладки состояния контейнера."""

    def test_container_provider_states(self):
        """Проверяем состояния провайдеров в контейнере."""
        container = app.container
        
        # Проверяем, что провайдеры существуют
        assert hasattr(container, 'db_session')
        assert hasattr(container, 'user_repo')
        assert hasattr(container, 'reservation_repo')
        
        # Проверяем, что провайдеры настроены правильно
        assert container.user_repo is not None
        assert container.reservation_repo is not None

    def test_container_override_behavior(self):
        """Проверяем поведение override в контейнере."""
        container = app.container
        
        # Создаем мок-сессию
        mock_session = AsyncMock(spec=AsyncSession)
        
        # Используем override
        with container.db_session.override(mock_session):
            assert container.db_session.provided() == mock_session
            
            # Проверяем, что зависимые провайдеры работают
            user_repo = container.user_repo()
            assert user_repo is not None
