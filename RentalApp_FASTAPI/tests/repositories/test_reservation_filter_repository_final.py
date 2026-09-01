# tests/repositories/test_reservation_filter_repository_final.py
"""
Финальные рабочие тесты для ReservationFilterRepository.
Цель: повысить покрытие с 22% до 80%+
"""

import pytest
from unittest.mock import AsyncMock, Mock
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime

from api.repositories.reservation_filter_repository import ReservationFilterRepository
from api.models.reservation import Reservation
from api.models.equipment import Equipment
from api.models.user import User
from shared.constants.order_status import OrderStatus
from shared.services.period_service import PeriodService


class TestReservationFilterRepositoryFinal:
    """Финальные рабочие тесты для ReservationFilterRepository"""

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        session = AsyncMock(spec=AsyncSession)
        return session

    @pytest.fixture
    def period_service(self):
        """Экземпляр PeriodService"""
        return PeriodService()

    @pytest.fixture
    def reservation_filter_repository(self, mock_db_session, period_service):
        """Создает экземпляр ReservationFilterRepository с мок-сессией и period_service"""
        return ReservationFilterRepository(mock_db_session, period_service)

    @pytest.fixture
    def sample_reservation(self):
        """Образец резерва для тестирования"""
        return Reservation(
            id=1,
            user_id=1,
            start_date=date.today(),
            end_date=date.today(),
            status=OrderStatus.ACTIVE,
            created_at=datetime.now()
        )

    @pytest.fixture
    def sample_equipment(self):
        """Образец оборудования для тестирования"""
        return Equipment(
            id=1,
            name="Test Equipment",
            brand="Test Brand",
            equipment_type="Test Type"
        )

    @pytest.fixture
    def sample_user(self):
        """Образец пользователя для тестирования"""
        return User(
            id=1,
            full_name="Test User",
            email="test@example.com"
        )

    # Тесты инициализации
    @pytest.mark.asyncio
    async def test_repository_initialization(self, mock_db_session, period_service):
        """Тест инициализации репозитория"""
        repo = ReservationFilterRepository(mock_db_session, period_service)
        assert repo.db == mock_db_session
        assert repo.model == Reservation
        assert repo.period_service == period_service

    @pytest.mark.asyncio
    async def test_repository_with_none_db_session(self, period_service):
        """Тест инициализации репозитория с None сессией"""
        try:
            repo = ReservationFilterRepository(None, period_service)
            assert repo.db is None
            assert repo.period_service == period_service
        except (TypeError, AttributeError):
            # Это тоже валидное поведение
            pass

    # Тесты для get_paginated_for_user
    @pytest.mark.asyncio
    async def test_get_paginated_for_user_success(self, reservation_filter_repository, mock_db_session, sample_reservation):
        """Тест успешного получения пагинированного списка резервов пользователя"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = [sample_reservation]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_user(
            user_id=1, skip=0, limit=10
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 1
        assert result[0].id == 1
        assert result[0].user_id == 1

    @pytest.mark.asyncio
    async def test_get_paginated_for_user_with_status_filter(self, reservation_filter_repository, mock_db_session, sample_reservation):
        """Тест получения резервов пользователя с фильтром по статусу"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = [sample_reservation]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_user(
            user_id=1, skip=0, limit=10, status=OrderStatus.ACTIVE
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 1

    @pytest.mark.asyncio
    async def test_get_paginated_for_user_with_search(self, reservation_filter_repository, mock_db_session, sample_reservation):
        """Тест получения резервов пользователя с поиском"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = [sample_reservation]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_user(
            user_id=1, skip=0, limit=10, search="test"
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 1

    @pytest.mark.asyncio
    async def test_get_paginated_for_user_with_sort(self, reservation_filter_repository, mock_db_session, sample_reservation):
        """Тест получения резервов пользователя с сортировкой"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = [sample_reservation]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_user(
            user_id=1, skip=0, limit=10, sort="start_date_asc"
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 1

    @pytest.mark.asyncio
    async def test_get_paginated_for_user_empty(self, reservation_filter_repository, mock_db_session):
        """Тест получения пустого списка резервов пользователя"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 0
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = []
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_user(
            user_id=1, skip=0, limit=10
        )

        # Проверяем результат
        assert len(result) == 0
        assert total == 0

    # Тесты для get_paginated_for_admin
    @pytest.mark.asyncio
    async def test_get_paginated_for_admin_success(self, reservation_filter_repository, mock_db_session, sample_reservation):
        """Тест успешного получения пагинированного списка резервов для админа"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = [sample_reservation]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_admin(
            skip=0, limit=10
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 1
        assert result[0].id == 1

    @pytest.mark.asyncio
    async def test_get_paginated_for_admin_with_status_active(self, reservation_filter_repository, mock_db_session, sample_reservation):
        """Тест получения резервов для админа с фильтром ACTIVE"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = [sample_reservation]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_admin(
            skip=0, limit=10, status=OrderStatus.ACTIVE
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 1

    @pytest.mark.asyncio
    async def test_get_paginated_for_admin_with_status_completed(self, reservation_filter_repository, mock_db_session, sample_reservation):
        """Тест получения резервов для админа с фильтром COMPLETED"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = [sample_reservation]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_admin(
            skip=0, limit=10, status=OrderStatus.COMPLETED
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 1

    @pytest.mark.asyncio
    async def test_get_paginated_for_admin_with_status_overdue(self, reservation_filter_repository, mock_db_session, sample_reservation):
        """Тест получения резервов для админа с фильтром OVERDUE"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = [sample_reservation]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_admin(
            skip=0, limit=10, status=OrderStatus.OVERDUE
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 1

    @pytest.mark.asyncio
    async def test_get_paginated_for_admin_with_search_query(self, reservation_filter_repository, mock_db_session, sample_reservation):
        """Тест получения резервов для админа с поисковым запросом"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = [sample_reservation]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_admin(
            skip=0, limit=10, search_query="test user"
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 1

    @pytest.mark.asyncio
    async def test_get_paginated_for_admin_with_reservation_id(self, reservation_filter_repository, mock_db_session, sample_reservation):
        """Тест получения резервов для админа с фильтром по ID"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = [sample_reservation]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_admin(
            skip=0, limit=10, reservation_id=1
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 1

    @pytest.mark.asyncio
    async def test_get_paginated_for_admin_empty(self, reservation_filter_repository, mock_db_session):
        """Тест получения пустого списка резервов для админа"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 0
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = []
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_admin(
            skip=0, limit=10
        )

        # Проверяем результат
        assert len(result) == 0
        assert total == 0

    # Тесты для приватных методов
    @pytest.mark.asyncio
    async def test_apply_status_filter_none(self, reservation_filter_repository):
        """Тест применения фильтра по статусу (None)"""
        # Создаем мок-запрос
        mock_query = Mock()
        
        # Выполняем тест
        result = reservation_filter_repository._apply_status_filter(mock_query, None)
        
        # Проверяем результат
        assert result == mock_query

    @pytest.mark.asyncio
    async def test_apply_status_filter_active(self, reservation_filter_repository):
        """Тест применения фильтра по статусу (ACTIVE)"""
        # Создаем мок-запрос
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        
        # Выполняем тест
        result = reservation_filter_repository._apply_status_filter(mock_query, OrderStatus.ACTIVE)
        
        # Проверяем результат
        assert result == mock_query
        mock_query.filter.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_status_filter_completed(self, reservation_filter_repository):
        """Тест применения фильтра по статусу (COMPLETED)"""
        # Создаем мок-запрос
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        
        # Выполняем тест
        result = reservation_filter_repository._apply_status_filter(mock_query, OrderStatus.COMPLETED)
        
        # Проверяем результат
        assert result == mock_query
        mock_query.filter.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_status_filter_overdue(self, reservation_filter_repository):
        """Тест применения фильтра по статусу (OVERDUE)"""
        # Создаем мок-запрос
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        
        # Выполняем тест
        result = reservation_filter_repository._apply_status_filter(mock_query, OrderStatus.OVERDUE)
        
        # Проверяем результат
        assert result == mock_query
        mock_query.filter.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_status_filter_other(self, reservation_filter_repository):
        """Тест применения фильтра по статусу (другой статус)"""
        # Создаем мок-запрос
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        
        # Выполняем тест
        result = reservation_filter_repository._apply_status_filter(mock_query, "OTHER_STATUS")
        
        # Проверяем результат
        assert result == mock_query
        mock_query.filter.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_equipment_search(self, reservation_filter_repository):
        """Тест применения поиска по оборудованию"""
        # Создаем мок-запрос
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        
        # Выполняем тест
        result = reservation_filter_repository._apply_equipment_search(mock_query, "test equipment")
        
        # Проверяем результат
        assert result == mock_query
        mock_query.filter.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_user_search(self, reservation_filter_repository):
        """Тест применения поиска по пользователю"""
        # Создаем мок-запрос
        mock_query = Mock()
        mock_query.join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        
        # Выполняем тест
        result = reservation_filter_repository._apply_user_search(mock_query, "test user")
        
        # Проверяем результат
        assert result == mock_query
        mock_query.join.assert_called_once()
        mock_query.filter.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_sorting_none(self, reservation_filter_repository):
        """Тест применения сортировки (None)"""
        # Создаем мок-запрос
        mock_query = Mock()
        mock_query.order_by.return_value = mock_query
        
        # Выполняем тест
        result = reservation_filter_repository._apply_sorting(mock_query, None)
        
        # Проверяем результат
        assert result == mock_query
        mock_query.order_by.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_sorting_start_date_asc(self, reservation_filter_repository):
        """Тест применения сортировки (start_date_asc)"""
        # Создаем мок-запрос
        mock_query = Mock()
        mock_query.order_by.return_value = mock_query
        
        # Выполняем тест
        result = reservation_filter_repository._apply_sorting(mock_query, "start_date_asc")
        
        # Проверяем результат
        assert result == mock_query
        mock_query.order_by.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_sorting_start_date_desc(self, reservation_filter_repository):
        """Тест применения сортировки (start_date_desc)"""
        # Создаем мок-запрос
        mock_query = Mock()
        mock_query.order_by.return_value = mock_query
        
        # Выполняем тест
        result = reservation_filter_repository._apply_sorting(mock_query, "start_date_desc")
        
        # Проверяем результат
        assert result == mock_query
        mock_query.order_by.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_sorting_end_date_asc(self, reservation_filter_repository):
        """Тест применения сортировки (end_date_asc)"""
        # Создаем мок-запрос
        mock_query = Mock()
        mock_query.order_by.return_value = mock_query
        
        # Выполняем тест
        result = reservation_filter_repository._apply_sorting(mock_query, "end_date_asc")
        
        # Проверяем результат
        assert result == mock_query
        mock_query.order_by.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_sorting_end_date_desc(self, reservation_filter_repository):
        """Тест применения сортировки (end_date_desc)"""
        # Создаем мок-запрос
        mock_query = Mock()
        mock_query.order_by.return_value = mock_query
        
        # Выполняем тест
        result = reservation_filter_repository._apply_sorting(mock_query, "end_date_desc")
        
        # Проверяем результат
        assert result == mock_query
        mock_query.order_by.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_sorting_created_at_asc(self, reservation_filter_repository):
        """Тест применения сортировки (created_at_asc)"""
        # Создаем мок-запрос
        mock_query = Mock()
        mock_query.order_by.return_value = mock_query
        
        # Выполняем тест
        result = reservation_filter_repository._apply_sorting(mock_query, "created_at_asc")
        
        # Проверяем результат
        assert result == mock_query
        mock_query.order_by.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_sorting_created_at_desc(self, reservation_filter_repository):
        """Тест применения сортировки (created_at_desc)"""
        # Создаем мок-запрос
        mock_query = Mock()
        mock_query.order_by.return_value = mock_query
        
        # Выполняем тест
        result = reservation_filter_repository._apply_sorting(mock_query, "created_at_desc")
        
        # Проверяем результат
        assert result == mock_query
        mock_query.order_by.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_sorting_unknown(self, reservation_filter_repository):
        """Тест применения сортировки (неизвестный параметр)"""
        # Создаем мок-запрос
        mock_query = Mock()
        mock_query.order_by.return_value = mock_query
        
        # Выполняем тест
        result = reservation_filter_repository._apply_sorting(mock_query, "unknown_sort")
        
        # Проверяем результат
        assert result == mock_query
        mock_query.order_by.assert_called_once()

    # Тесты обработки ошибок
    @pytest.mark.asyncio
    async def test_database_error_handling_user(self, reservation_filter_repository, mock_db_session):
        """Тест обработки ошибок базы данных при получении резервов пользователя"""
        # Настраиваем мок для выброса исключения
        mock_db_session.execute.side_effect = Exception("Database connection error")

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database connection error"):
            await reservation_filter_repository.get_paginated_for_user(
                user_id=1, skip=0, limit=10
            )

    @pytest.mark.asyncio
    async def test_database_error_handling_admin(self, reservation_filter_repository, mock_db_session):
        """Тест обработки ошибок базы данных при получении резервов для админа"""
        # Настраиваем мок для выброса исключения
        mock_db_session.execute.side_effect = Exception("Database connection error")

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database connection error"):
            await reservation_filter_repository.get_paginated_for_admin(
                skip=0, limit=10
            )

    # Дополнительные тесты для покрытия edge cases
    @pytest.mark.asyncio
    async def test_pagination_parameters(self, reservation_filter_repository, mock_db_session, sample_reservation):
        """Тест с различными параметрами пагинации"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 5
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = [sample_reservation]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_user(
            user_id=1, skip=10, limit=5
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 5

    @pytest.mark.asyncio
    async def test_combined_filters_user(self, reservation_filter_repository, mock_db_session, sample_reservation):
        """Тест с комбинированными фильтрами для пользователя"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = [sample_reservation]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_user(
            user_id=1, skip=0, limit=10, 
            status=OrderStatus.ACTIVE, 
            search="test", 
            sort="start_date_asc"
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 1

    @pytest.mark.asyncio
    async def test_combined_filters_admin(self, reservation_filter_repository, mock_db_session, sample_reservation):
        """Тест с комбинированными фильтрами для админа"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для reservations
        mock_reservations_result = Mock()
        mock_reservations_result.unique.return_value.scalars.return_value.all.return_value = [sample_reservation]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_reservations_result]

        # Выполняем тест
        result, total = await reservation_filter_repository.get_paginated_for_admin(
            skip=0, limit=10, 
            status=OrderStatus.ACTIVE, 
            search_query="test user", 
            reservation_id=1
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 1
