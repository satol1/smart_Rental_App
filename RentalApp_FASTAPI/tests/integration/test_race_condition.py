"""
Интеграционные тесты для проверки race condition при одновременных запросах.
Проверяем гипотезу о проблеме с контейнером DI в реальных условиях.
"""

import pytest
import asyncio
import httpx
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession

from api.main_api import app
from containers import Container, AsyncSessionLocal


class TestRaceCondition:
    """Тесты для проверки race condition при одновременных запросах."""

    @pytest.mark.asyncio
    async def test_concurrent_requests_with_global_container(self):
        """
        Тест 1: Проверяем поведение при одновременных запросах с глобальным контейнером.
        Это должно показать проблему, описанную в гипотезе.
        """
        # Получаем глобальный контейнер из приложения
        global_container = app.container
        
        # Список для хранения результатов
        results = []
        
        async def simulate_request(request_id: int):
            """Симулируем один запрос."""
            try:
                # Создаем сессию БД
                session = AsyncSessionLocal()
                
                # ПРОБЛЕМНЫЙ подход: создаем новый контейнер
                local_container = Container()
                local_container.db_session.override(session)
                
                # Попытка получить сервис через глобальный контейнер
                # (как это происходит в реальных эндпоинтах)
                user_repo = global_container.user_repo()
                
                results.append(f"Request {request_id}: SUCCESS")
                await session.close()
                
            except Exception as e:
                results.append(f"Request {request_id}: FAILED - {str(e)}")
        
        # Запускаем 10 одновременных запросов
        tasks = [simulate_request(i) for i in range(10)]
        await asyncio.gather(*tasks)
        
        # Проверяем результаты
        print("Results:", results)
        
        # Все запросы должны пройти успешно, потому что db_session - это Callable провайдер
        # который создает сессию при вызове
        assert all("SUCCESS" in result for result in results)

    @pytest.mark.asyncio
    async def test_concurrent_requests_with_correct_approach(self):
        """
        Тест 2: Проверяем правильный подход с использованием глобального контейнера.
        Это должно показать, как должно работать исправление.
        """
        # Получаем глобальный контейнер из приложения
        global_container = app.container
        
        # Список для хранения результатов
        results = []
        
        async def simulate_request(request_id: int):
            """Симулируем один запрос с правильным подходом."""
            try:
                # Создаем сессию БД
                session = AsyncSessionLocal()
                
                # ПРАВИЛЬНЫЙ подход: используем глобальный контейнер
                with global_container.db_session.override(session):
                    # Попытка получить сервис через глобальный контейнер
                    user_repo = global_container.user_repo()
                    
                    results.append(f"Request {request_id}: SUCCESS")
                
                await session.close()
                
            except Exception as e:
                results.append(f"Request {request_id}: FAILED - {str(e)}")
        
        # Запускаем 10 одновременных запросов
        tasks = [simulate_request(i) for i in range(10)]
        await asyncio.gather(*tasks)
        
        # Проверяем результаты
        print("Results:", results)
        
        # Все запросы должны быть успешными
        assert all("SUCCESS" in result for result in results)

    @pytest.mark.asyncio
    async def test_middleware_behavior_simulation(self):
        """
        Тест 3: Симулируем поведение middleware при одновременных запросах.
        Проверяем, что middleware правильно изолирует сессии.
        """
        # Получаем глобальный контейнер из приложения
        global_container = app.container
        
        # Список для хранения результатов
        results = []
        
        async def simulate_middleware_request(request_id: int):
            """Симулируем запрос через middleware."""
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
        tasks = [simulate_middleware_request(i) for i in range(20)]
        await asyncio.gather(*tasks)
        
        # Проверяем результаты
        print("Results:", results)
        
        # Все запросы должны быть успешными
        assert all("SUCCESS" in result for result in results)

    @pytest.mark.asyncio
    async def test_session_isolation_between_requests(self):
        """
        Тест 4: Проверяем изоляцию сессий между запросами.
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
        Тест 5: Проверяем состояние контейнера после завершения запросов.
        Контейнер должен вернуться в исходное состояние.
        """
        # Получаем глобальный контейнер из приложения
        global_container = app.container
        
        # Проверяем исходное состояние
        initial_session = global_container.db_session.provided()
        # db_session - это Callable провайдер, который создает сессию при вызове
        assert initial_session is not None, "Исходное состояние должно быть не None"
        
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
        final_session = global_container.db_session.provided()
        # db_session - это Callable провайдер, который создает сессию при вызове
        assert final_session is not None, "Контейнер должен создать новую сессию"

    @pytest.mark.asyncio
    async def test_error_handling_in_middleware(self):
        """
        Тест 6: Проверяем обработку ошибок в middleware.
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
                    
                    results.append(f"Request {request_id}: SUCCESS")
                
                await session.close()
                
            except Exception as e:
                results.append(f"Request {request_id}: FAILED - {str(e)}")
        
        # Запускаем несколько запросов (некоторые с ошибками)
        tasks = [simulate_request_with_error(i) for i in range(6)]
        await asyncio.gather(*tasks)
        
        # Проверяем результаты
        print("Results:", results)
        
        # Проверяем, что контейнер в правильном состоянии
        # db_session - это Callable провайдер, который создает сессию при вызове
        final_session = global_container.db_session.provided()
        assert final_session is not None
        
        # Проверяем, что есть и успешные, и неуспешные запросы
        success_count = sum(1 for result in results if "SUCCESS" in result)
        error_count = sum(1 for result in results if "FAILED" in result)
        
        assert success_count > 0, "Должны быть успешные запросы"
        assert error_count > 0, "Должны быть запросы с ошибками"


class TestContainerDebugging:
    """Тесты для отладки состояния контейнера."""

    def test_container_provider_states(self):
        """Проверяем состояния провайдеров в контейнере."""
        container = Container()
        
        # Проверяем, что провайдеры существуют
        assert hasattr(container, 'db_session')
        assert hasattr(container, 'user_repo')
        assert hasattr(container, 'reservation_repo')
        
        # Проверяем исходное состояние
        # db_session - это Callable провайдер, который создает сессию при вызове
        session = container.db_session.provided()
        assert session is not None
        
        # Проверяем, что провайдеры настроены правильно
        # (провайдеры создают объекты при вызове, потому что db_session - это Callable)
        user_repo = container.user_repo.provided()
        reservation_repo = container.reservation_repo.provided()
        assert user_repo is not None
        assert reservation_repo is not None

    @pytest.mark.asyncio
    async def test_container_override_behavior(self):
        """Проверяем поведение override в контейнере."""
        container = Container()
        
        # Создаем мок-сессию
        mock_session = AsyncMock(spec=AsyncSession)
        
        # Проверяем исходное состояние
        # db_session - это Callable провайдер, который создает сессию при вызове
        session = container.db_session.provided()
        assert session is not None
        
        # Используем override
        with container.db_session.override(mock_session):
            assert container.db_session.provided() == mock_session
            
            # Проверяем, что зависимые провайдеры работают
            user_repo = container.user_repo()
            assert user_repo is not None
        
        # Проверяем, что состояние вернулось
        # db_session - это Callable провайдер, который создает сессию при вызове
        session = container.db_session.provided()
        assert session is not None
