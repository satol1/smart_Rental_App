# tests/services/test_rental_query_service_simple.py
"""
Упрощенные тесты для RentalQueryService - только для существующих методов.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import date

from api.services.rental.rental_query_service import RentalQueryService
from api.models.user import User
from api.models.rental import Rental
from shared.schemas.rental_schema import RentalOut


class TestRentalQueryServiceSimple:
    """Упрощенные тесты для RentalQueryService."""

    @pytest.fixture
    def mock_financial_service(self):
        """Создает мок FinancialService."""
        return AsyncMock()

    @pytest.fixture
    def mock_rental_repo(self):
        """Создает мок RentalRepository."""
        return AsyncMock()

    @pytest.fixture
    def rental_query_service(self, mock_db_session, mock_financial_service, mock_rental_repo):
        """Создает экземпляр RentalQueryService с моками всех зависимостей."""
        return RentalQueryService(
            db=mock_db_session,
            financial_service=mock_financial_service,
            rental_repo=mock_rental_repo
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
    def mock_rental(self):
        """Создает мок аренды."""
        rental = MagicMock(spec=Rental)
        rental.id = 1
        rental.user_id = 1
        rental.start_date = date(2025, 1, 1)
        rental.end_date = date(2025, 1, 5)
        rental.total_cost = 400.0
        rental.prepayment_amount = 100.0
        rental.status = "active"
        rental.equipment = []
        rental.accessory_links = []
        rental.promo_code = None
        rental.notes_on_issue = "Test notes"
        rental.actual_return_date = None
        rental.notes_on_return = None
        rental.user = MagicMock()
        rental.user.full_name = "Test User"
        rental.user.email = "test@example.com"
        rental.user.telegram_username = "testuser"
        rental.user.role = "user"
        rental.user.phone = "+1234567890"
        rental.user.status = "active"
        rental.user.notes = "Test notes"
        rental.created_by = MagicMock()
        rental.created_by.full_name = "Admin User"
        rental.created_by.email = "admin@example.com"
        rental.created_by.telegram_username = "admin"
        rental.created_by.role = "admin"
        rental.created_by.phone = "+0987654321"
        rental.created_by.status = "active"
        rental.created_by.notes = "Admin notes"
        return rental

    # === ТЕСТЫ ДЛЯ get_rentals_for_user ===

    @pytest.mark.asyncio
    async def test_get_rentals_for_user_success(self, rental_query_service, mock_user, mock_rental):
        """
        Тест успешного получения аренд пользователя.
        """
        # Arrange
        expected_rentals = [mock_rental]
        expected_total = 1
        
        rental_query_service.rental_repo.get_paginated_for_user = AsyncMock(
            return_value=(expected_rentals, expected_total)
        )

        # Act
        rentals, total = await rental_query_service.get_rentals_for_user(mock_user, 0, 100)

        # Assert
        assert len(rentals) == 1
        assert total == expected_total
        rental_query_service.rental_repo.get_paginated_for_user.assert_called_once_with(
            user_id=mock_user.id,
            skip=0,
            limit=100,
            status=None,
            search=None,
            sort=None
        )

    @pytest.mark.asyncio
    async def test_get_rentals_for_user_empty_result(self, rental_query_service, mock_user):
        """
        Тест получения пустого результата аренд пользователя.
        """
        # Arrange
        expected_rentals = []
        expected_total = 0
        
        rental_query_service.rental_repo.get_paginated_for_user = AsyncMock(
            return_value=(expected_rentals, expected_total)
        )

        # Act
        rentals, total = await rental_query_service.get_rentals_for_user(mock_user, 0, 100)

        # Assert
        assert rentals == expected_rentals
        assert total == expected_total

    # === ТЕСТЫ ДЛЯ get_paginated_rentals ===

    @pytest.mark.asyncio
    async def test_get_paginated_rentals_success(self, rental_query_service, mock_rental):
        """
        Тест успешного получения всех аренд для админа.
        """
        # Arrange
        expected_rentals = [mock_rental]
        expected_total = 1
        
        rental_query_service.rental_repo.get_paginated_for_admin = AsyncMock(
            return_value=(expected_rentals, expected_total)
        )

        # Act
        rentals, total = await rental_query_service.get_paginated_rentals(0, 100, None, None)

        # Assert
        assert len(rentals) == 1
        assert total == expected_total
        rental_query_service.rental_repo.get_paginated_for_admin.assert_called_once_with(
            skip=0,
            limit=100,
            status=None,
            search=None,
            period_type=None,
            period_offset=0
        )

    @pytest.mark.asyncio
    async def test_get_paginated_rentals_with_filters(self, rental_query_service, mock_rental):
        """
        Тест получения аренд для админа с фильтрами.
        """
        # Arrange
        expected_rentals = [mock_rental]
        expected_total = 1
        status = "active"
        search = "camera"
        
        rental_query_service.rental_repo.get_paginated_for_admin = AsyncMock(
            return_value=(expected_rentals, expected_total)
        )

        # Act
        rentals, total = await rental_query_service.get_paginated_rentals(0, 100, status, search)

        # Assert
        assert len(rentals) == 1
        assert total == expected_total
        rental_query_service.rental_repo.get_paginated_for_admin.assert_called_once_with(
            skip=0,
            limit=100,
            status=status,
            search=search,
            period_type=None,
            period_offset=0
        )

    # === ТЕСТЫ ДЛЯ ИНИЦИАЛИЗАЦИИ ===

    def test_rental_query_service_initialization(self, rental_query_service, mock_db_session):
        """
        Тест правильной инициализации RentalQueryService.
        """
        # Assert
        assert rental_query_service.db == mock_db_session
        assert rental_query_service.financial_service is not None
        assert rental_query_service.rental_repo is not None

    def test_rental_query_service_dependencies_are_initialized(self, rental_query_service):
        """
        Тест проверяет, что все зависимости правильно инициализированы.
        """
        # Assert
        assert rental_query_service.financial_service is not None
        assert rental_query_service.rental_repo is not None
