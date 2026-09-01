# tests/services/test_reservation_query_service.py
"""
Тесты для ReservationQueryService - сервиса для операций чтения данных о резервах.
Тестирует получение резервов пользователя, админские запросы и фильтрацию.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import date

from api.services.reservation_query_service import ReservationQueryService
from api.models.user import User
from shared.schemas.reservation_schema import ReservationItem, AdminReservationOut


class TestReservationQueryService:
    """Тесты для ReservationQueryService."""

    @pytest.fixture
    def mock_financial_service(self):
        """Создает мок FinancialService."""
        return AsyncMock()

    @pytest.fixture
    def mock_reservation_repo(self):
        """Создает мок ReservationRepository."""
        return AsyncMock()

    @pytest.fixture
    def reservation_query_service(self, mock_db_session, mock_financial_service, mock_reservation_repo):
        """Создает экземпляр ReservationQueryService с моками всех зависимостей."""
        return ReservationQueryService(
            db=mock_db_session,
            financial_service=mock_financial_service,
            reservation_repo=mock_reservation_repo
        )

    @pytest.fixture
    def mock_user(self):
        """Создает мок пользователя."""
        user = MagicMock(spec=User)
        user.id = 1
        user.email = "test@example.com"
        user.name = "Test User"
        return user

    @pytest.fixture
    def mock_reservation_item(self):
        """Создает мок элемента резерва."""
        reservation_item = MagicMock(spec=ReservationItem)
        reservation_item.id = 1
        reservation_item.user_name = "Test User"
        reservation_item.start_date = date(2025, 1, 1)
        reservation_item.end_date = date(2025, 1, 5)
        reservation_item.total_cost = 400.0
        reservation_item.status = "active"
        return reservation_item

    @pytest.fixture
    def mock_admin_reservation_out(self):
        """Создает мок админского вывода резерва."""
        admin_reservation = MagicMock(spec=AdminReservationOut)
        admin_reservation.id = 1
        admin_reservation.user_id = 1
        admin_reservation.user_name = "Test User"
        admin_reservation.start_date = date(2025, 1, 1)
        admin_reservation.end_date = date(2025, 1, 5)
        admin_reservation.total_cost = 400.0
        admin_reservation.status = "active"
        return admin_reservation

    # === ТЕСТЫ ДЛЯ get_my_reservations ===

    @pytest.mark.asyncio
    async def test_get_my_reservations_success(self, reservation_query_service, mock_user, mock_reservation_item):
        """
        Тест успешного получения резервов пользователя.
        """
        # Arrange
        expected_reservations = [mock_reservation_item]
        expected_total = 1
        
        reservation_query_service.reservation_repo.get_paginated_for_user = AsyncMock(
            return_value=(expected_reservations, expected_total)
        )
        reservation_query_service.financial_service.enrich_order_with_financials = AsyncMock(
            return_value=mock_reservation_item
        )

        # Act
        reservations, total = await reservation_query_service.get_my_reservations(mock_user)

        # Assert
        assert reservations == [mock_reservation_item]
        assert total == expected_total
        reservation_query_service.reservation_repo.get_paginated_for_user.assert_called_once_with(
            user_id=mock_user.id,
            skip=0,
            limit=100,
            status=None,
            search=None,
            sort=None
        )


    @pytest.mark.asyncio
    async def test_get_my_reservations_empty_result(self, reservation_query_service, mock_user):
        """
        Тест получения пустого результата резервов пользователя.
        """
        # Arrange
        expected_reservations = []
        expected_total = 0
        
        # Создаем мок для результата запроса
        mock_result = MagicMock()
        mock_result.unique.return_value.scalars.return_value.all.return_value = expected_reservations
        mock_result.count.return_value = expected_total
        
        reservation_query_service.reservation_repo.get_paginated_for_user = AsyncMock(
            return_value=(mock_result, expected_total)
        )

        # Act
        reservations, total = await reservation_query_service.get_my_reservations(mock_user)

        # Assert
        assert reservations == expected_reservations
        assert total == expected_total

    @pytest.mark.asyncio
    async def test_get_my_reservations_repository_error(self, reservation_query_service, mock_user):
        """
        Тест обработки ошибки репозитория при получении резервов пользователя.
        """
        # Arrange
        reservation_query_service.reservation_repo.get_paginated_for_user = AsyncMock(
            side_effect=Exception("Database error")
        )

        # Act & Assert
        with pytest.raises(Exception, match="Database error"):
            await reservation_query_service.get_my_reservations(mock_user)

    # === ТЕСТЫ ДЛЯ get_admin_reservations ===
    # Примечание: метод get_admin_reservations не существует в реальном сервисе

    # Примечание: остальные методы (get_admin_reservations, get_reservation_by_id, get_reservation_statistics) 
    # не существуют в реальном сервисе, поэтому их тесты удалены

    # === ТЕСТЫ ДЛЯ ИНИЦИАЛИЗАЦИИ ===

    def test_reservation_query_service_initialization(self, reservation_query_service, mock_db_session):
        """
        Тест правильной инициализации ReservationQueryService.
        """
        # Assert
        assert reservation_query_service.db == mock_db_session
        assert reservation_query_service.financial_service is not None
        assert reservation_query_service.reservation_repo is not None

    def test_reservation_query_service_dependencies_are_initialized(self, reservation_query_service):
        """
        Тест проверяет, что все зависимости правильно инициализированы.
        """
        # Assert
        assert reservation_query_service.financial_service is not None
        assert reservation_query_service.reservation_repo is not None

    # === ИНТЕГРАЦИОННЫЕ ТЕСТЫ ===

    @pytest.mark.asyncio
    async def test_multiple_query_operations_sequence(self, reservation_query_service, mock_user, 
                                                     mock_reservation_item):
        """
        Тест последовательности нескольких операций запросов.
        """
        # Arrange
        reservation_query_service.reservation_repo.get_paginated_for_user = AsyncMock(
            return_value=([mock_reservation_item], 1)
        )
        reservation_query_service.financial_service.enrich_order_with_financials = AsyncMock(
            return_value=mock_reservation_item
        )

        # Act
        user_reservations, user_total = await reservation_query_service.get_my_reservations(mock_user)

        # Assert
        assert user_reservations == [mock_reservation_item]
        assert user_total == 1

    @pytest.mark.asyncio
    async def test_large_dataset_handling(self, reservation_query_service, mock_user):
        """
        Тест обработки большого объема данных.
        """
        # Arrange
        large_reservations = [MagicMock(spec=ReservationItem) for _ in range(1000)]
        large_total = 1000
        
        reservation_query_service.reservation_repo.get_paginated_for_user = AsyncMock(
            return_value=(large_reservations, large_total)
        )
        reservation_query_service.financial_service.enrich_order_with_financials = AsyncMock(
            return_value=MagicMock(spec=ReservationItem)
        )

        # Act
        reservations, total = await reservation_query_service.get_my_reservations(mock_user)

        # Assert
        assert len(reservations) == 1000
        assert total == 1000
