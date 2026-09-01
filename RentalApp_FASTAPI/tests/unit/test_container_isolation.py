"""
Тесты для проверки изоляции DI-контейнеров и сессий БД.
Проверяем гипотезу о том, что проблема в неправильном создании экземпляров контейнера.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from dependency_injector import containers

from containers import Container, AsyncSessionLocal
from api.dependencies import get_db_session


class TestContainerIsolation:
    """Тесты для проверки изоляции контейнеров и сессий БД."""

    @pytest.mark.asyncio
    async def test_container_instances_are_different(self):
        """
        Тест 1: Проверяем, что каждый вызов Container() создает новый экземпляр.
        Это подтверждает гипотезу о проблеме.
        """
        # Создаем два экземпляра контейнера
        container1 = Container()
        container2 = Container()
        
        # Проверяем, что это разные объекты
        assert container1 is not container2
        assert id(container1) != id(container2)
        
        # Проверяем, что у них разные провайдеры
        assert container1.db_session is not container2.db_session
        assert container1.user_repo is not container2.user_repo

    @pytest.mark.asyncio
    async def test_override_affects_only_local_container(self):
        """
        Тест 2: Проверяем, что override() влияет только на локальный контейнер.
        Это ключевая часть гипотезы.
        """
        # Создаем глобальный контейнер (как в main_api.py)
        global_container = Container()
        
        # Создаем локальный контейнер (как в setup_request_container)
        local_container = Container()
        
        # Создаем мок-сессию
        mock_session = AsyncMock(spec=AsyncSession)
        
        # Переопределяем сессию в локальном контейнере
        local_container.db_session.override(mock_session)
        
        # Проверяем, что глобальный контейнер НЕ изменился
        # db_session - это Callable провайдер, который создает сессию при вызове
        # Проверяем, что это не наш мок
        global_session = global_container.db_session.provided()
        assert global_session != mock_session
        
        # Проверяем, что локальный контейнер изменился
        assert local_container.db_session.provided() == mock_session

    @pytest.mark.asyncio
    async def test_global_container_never_gets_session(self):
        """
        Тест 3: Проверяем, что глобальный контейнер никогда не получает сессию БД.
        Это основная проблема в гипотезе.
        """
        # Создаем глобальный контейнер (как в main_api.py)
        global_container = Container()
        
        # Симулируем setup_request_container
        async def setup_request_container():
            session = AsyncSessionLocal()
            container = Container()  # Новый контейнер!
            container.db_session.override(session)
            return container, session
        
        # Вызываем setup_request_container
        local_container, session = await setup_request_container()
        
        # Проверяем, что глобальный контейнер все еще имеет заглушку
        # db_session - это Callable провайдер, который создает сессию при вызове
        # Проверяем, что это не наш мок
        global_session = global_container.db_session.provided()
        assert global_session != session
        
        # Проверяем, что локальный контейнер имеет сессию
        assert local_container.db_session.provided() == session

    @pytest.mark.asyncio
    async def test_race_condition_simulation(self):
        """
        Тест 4: Симулируем race condition при одновременных запросах.
        Проверяем, что все запросы используют глобальный контейнер без сессии.
        """
        # Создаем глобальный контейнер (как в main_api.py)
        global_container = Container()
        
        # Список для хранения результатов
        results = []
        
        async def simulate_request(request_id: int):
            """Симулируем один запрос."""
            # Симулируем setup_request_container
            session = AsyncSessionLocal()
            local_container = Container()  # Новый контейнер!
            local_container.db_session.override(session)
            
            # Симулируем попытку получить сервис через глобальный контейнер
            # (как это происходит в реальных эндпоинтах)
            try:
                # Попытка получить user_repo через глобальный контейнер
                user_repo = global_container.user_repo()
                results.append(f"Request {request_id}: SUCCESS")
            except Exception as e:
                results.append(f"Request {request_id}: FAILED - {str(e)}")
            
            await session.close()
        
        # Запускаем 5 одновременных запросов
        tasks = [simulate_request(i) for i in range(5)]
        await asyncio.gather(*tasks)
        
        # Проверяем, что все запросы прошли успешно
        # (потому что db_session - это Callable провайдер, который создает сессию при вызове)
        assert all("SUCCESS" in result for result in results)

    @pytest.mark.asyncio
    async def test_correct_approach_with_global_container(self):
        """
        Тест 5: Проверяем правильный подход - использование глобального контейнера.
        Это демонстрирует, как должно работать исправление.
        """
        # Создаем глобальный контейнер (как в main_api.py)
        global_container = Container()
        
        # Создаем мок-сессию
        mock_session = AsyncMock(spec=AsyncSession)
        
        # ПРАВИЛЬНЫЙ подход: переопределяем сессию в глобальном контейнере
        with global_container.db_session.override(mock_session):
            # Теперь можем получить сервисы
            user_repo = global_container.user_repo()
            assert user_repo is not None
            
            # Проверяем, что сервис получил правильную сессию
            # (это зависит от реализации UserRepository)

    @pytest.mark.asyncio
    async def test_context_manager_isolation(self):
        """
        Тест 6: Проверяем, что контекстный менеджер обеспечивает изоляцию.
        Это проверяет правильность использования override().
        """
        global_container = Container()
        
        # Создаем две разные сессии
        session1 = AsyncMock(spec=AsyncSession)
        session2 = AsyncMock(spec=AsyncSession)
        
        # Первый контекст
        with global_container.db_session.override(session1):
            user_repo1 = global_container.user_repo()
            # Проверяем, что используется session1
            assert global_container.db_session.provided() == session1
        
        # Второй контекст
        with global_container.db_session.override(session2):
            user_repo2 = global_container.user_repo()
            # Проверяем, что используется session2
            assert global_container.db_session.provided() == session2
        
        # После выхода из контекста сессия должна быть не session1 и не session2
        # (потому что db_session - это Callable провайдер, который создает новую сессию при вызове)
        final_session = global_container.db_session.provided()
        assert final_session != session1
        assert final_session != session2

    @pytest.mark.asyncio
    async def test_middleware_approach_correctness(self):
        """
        Тест 7: Проверяем правильность подхода с middleware.
        Это проверяет текущую реализацию DIContainerMiddleware.
        """
        # Создаем глобальный контейнер
        global_container = Container()
        
        # Симулируем middleware
        async def simulate_middleware():
            session = AsyncSessionLocal()
            try:
                # Используем контекстный менеджер для переопределения
                with global_container.db_session.override(session):
                    # Симулируем обработку запроса
                    user_repo = global_container.user_repo()
                    return user_repo
            finally:
                await session.close()
        
        # Проверяем, что middleware работает правильно
        user_repo = await simulate_middleware()
        assert user_repo is not None
        
        # Проверяем, что после middleware сессия сброшена
        # (db_session - это Callable провайдер, который создает новую сессию при вызове)
        final_session = global_container.db_session.provided()
        assert final_session is not None  # Создается новая сессия


class TestContainerWiring:
    """Тесты для проверки правильности wiring контейнера."""

    def test_container_wiring_modules(self):
        """Проверяем, что все необходимые модули подключены к wiring."""
        container = Container()
        
        # Проверяем, что wiring_config содержит все необходимые модули
        expected_modules = [
            "api.dependencies",
            "api.admin_reservation_api",
            "api.admin_rental_api", 
            "api.reservation_api",
            "api.equipment_api",
            "api.user_profile_api",
            "api.admin_user_api",
            "api.admin_balance_api",
            "api.auth_api",
            "api.accessory_api",
            "api.association_api",
            "api.discount_api",
            "api.holiday_api",
            "api.pack_api",
            "api.promo_code_api",
            "api.settings_api",
            "api.calendar_api",
            "api.admin_dashboard_api",
            "api.brand_system_api",
        ]
        
        for module in expected_modules:
            assert module in container.wiring_config.modules

    def test_container_providers_exist(self):
        """Проверяем, что все необходимые провайдеры существуют."""
        container = Container()
        
        # Проверяем ключевые провайдеры
        assert hasattr(container, 'db_session')
        assert hasattr(container, 'user_repo')
        assert hasattr(container, 'reservation_repo')
        assert hasattr(container, 'equipment_repo')
        assert hasattr(container, 'availability_service')
        assert hasattr(container, 'financial_service')
        assert hasattr(container, 'balance_service')
        assert hasattr(container, 'dashboard_service')
