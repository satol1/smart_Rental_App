# tests/services/test_overdue_checker_service.py
"""
Тесты для OverdueCheckerService - критически важного сервиса для проверки просроченных резервов.
Тестирует автоматическую блокировку пользователей с просроченными резервами.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date, timedelta

from api.services.user.overdue_checker_service import OverdueCheckerService
from api.models.user import User
from shared.constants.user_status import UserStatus


class TestOverdueCheckerService:
    """Тесты для OverdueCheckerService."""

    @pytest.fixture
    def overdue_checker_service(self, mock_db_session):
        """Создает экземпляр OverdueCheckerService с моками."""
        from api.repositories.user_repository import UserRepository
        from api.repositories.reservation_repository import ReservationRepository
        from api.services.user.user_status_service import UserStatusService
        
        mock_user_repo = MagicMock(spec=UserRepository)
        mock_reservation_repo = MagicMock(spec=ReservationRepository)
        mock_user_status_service = MagicMock(spec=UserStatusService)
        
        return OverdueCheckerService(
            db=mock_db_session,
            user_repo=mock_user_repo,
            reservation_repo=mock_reservation_repo,
            user_status_service=mock_user_status_service
        )

    @pytest.fixture
    def sample_user(self):
        """Создает тестового пользователя."""
        user = User()
        user.id = 1
        user.email = "user@example.com"
        user.status = UserStatus.NEW.value
        return user

    @pytest.fixture
    def sample_user_2(self):
        """Создает второго тестового пользователя."""
        user = User()
        user.id = 2
        user.email = "user2@example.com"
        user.status = UserStatus.REGULAR.value
        return user

    @pytest.fixture
    def blocked_user(self):
        """Создает заблокированного пользователя."""
        user = User()
        user.id = 3
        user.email = "blocked@example.com"
        user.status = UserStatus.BLOCKED.value
        return user

    @pytest.fixture
    def vip_user(self):
        """Создает VIP пользователя."""
        user = User()
        user.id = 4
        user.email = "vip@example.com"
        user.status = UserStatus.VIP.value
        return user

    # === ТЕСТЫ ДЛЯ check_and_block_users_with_overdue_reservations ===

    @pytest.mark.asyncio
    async def test_check_and_block_users_success(self, overdue_checker_service, sample_user, sample_user_2):
        """Тест успешной блокировки пользователей с просроченными резервами."""
        # Arrange
        active_users = [sample_user, sample_user_2]
        
        overdue_checker_service.user_repo.get_active_users = AsyncMock(return_value=active_users)
        overdue_checker_service.user_status_service.check_and_block_on_overdue = AsyncMock(
            side_effect=[True, False]  # Первый пользователь заблокирован, второй - нет
        )

        # Act
        result = await overdue_checker_service.check_and_block_users_with_overdue_reservations()

        # Assert
        assert result == [1]  # Только первый пользователь заблокирован
        overdue_checker_service.user_repo.get_active_users.assert_called_once()
        assert overdue_checker_service.user_status_service.check_and_block_on_overdue.call_count == 2

    @pytest.mark.asyncio
    async def test_check_and_block_users_multiple_blocked(self, overdue_checker_service, sample_user, sample_user_2):
        """Тест блокировки нескольких пользователей."""
        # Arrange
        active_users = [sample_user, sample_user_2]
        
        overdue_checker_service.user_repo.get_active_users = AsyncMock(return_value=active_users)
        overdue_checker_service.user_status_service.check_and_block_on_overdue = AsyncMock(
            side_effect=[True, True]  # Оба пользователя заблокированы
        )

        # Act
        result = await overdue_checker_service.check_and_block_users_with_overdue_reservations()

        # Assert
        assert result == [1, 2]  # Оба пользователя заблокированы
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_check_and_block_users_no_users_to_block(self, overdue_checker_service, sample_user, sample_user_2):
        """Тест случая, когда нет пользователей для блокировки."""
        # Arrange
        active_users = [sample_user, sample_user_2]
        
        overdue_checker_service.user_repo.get_active_users = AsyncMock(return_value=active_users)
        overdue_checker_service.user_status_service.check_and_block_on_overdue = AsyncMock(
            return_value=False  # Никто не заблокирован
        )

        # Act
        result = await overdue_checker_service.check_and_block_users_with_overdue_reservations()

        # Assert
        assert result == []  # Пустой список
        overdue_checker_service.user_repo.get_active_users.assert_called_once()
        assert overdue_checker_service.user_status_service.check_and_block_on_overdue.call_count == 2

    @pytest.mark.asyncio
    async def test_check_and_block_users_empty_active_users(self, overdue_checker_service):
        """Тест случая, когда нет активных пользователей."""
        # Arrange
        overdue_checker_service.user_repo.get_active_users = AsyncMock(return_value=[])

        # Act
        result = await overdue_checker_service.check_and_block_users_with_overdue_reservations()

        # Assert
        assert result == []
        overdue_checker_service.user_repo.get_active_users.assert_called_once()
        overdue_checker_service.user_status_service.check_and_block_on_overdue.assert_not_called()

    @pytest.mark.asyncio
    async def test_check_and_block_users_excludes_blocked_and_persona_non_grata(self, overdue_checker_service, sample_user, blocked_user):
        """Тест исключения заблокированных и Persona Non Grata из проверки."""
        # Arrange
        # get_active_users должен исключать BLOCKED и PERSONA_NON_GRATA
        active_users = [sample_user]  # Только активный пользователь
        
        overdue_checker_service.user_repo.get_active_users = AsyncMock(return_value=active_users)
        overdue_checker_service.user_status_service.check_and_block_on_overdue = AsyncMock(return_value=False)

        # Act
        result = await overdue_checker_service.check_and_block_users_with_overdue_reservations()

        # Assert
        # Проверяем, что get_active_users вызван с правильными параметрами исключения
        overdue_checker_service.user_repo.get_active_users.assert_called_once_with(
            exclude_statuses=[UserStatus.BLOCKED.value, UserStatus.PERSONA_NON_GRATA.value]
        )
        assert result == []

    @pytest.mark.asyncio
    async def test_check_and_block_users_handles_individual_user_error(self, overdue_checker_service, sample_user, sample_user_2):
        """Тест обработки ошибки при проверке отдельного пользователя."""
        # Arrange
        active_users = [sample_user, sample_user_2]
        
        overdue_checker_service.user_repo.get_active_users = AsyncMock(return_value=active_users)
        overdue_checker_service.user_status_service.check_and_block_on_overdue = AsyncMock(
            side_effect=[Exception("Database error"), True]  # Ошибка для первого, успех для второго
        )

        # Act
        result = await overdue_checker_service.check_and_block_users_with_overdue_reservations()

        # Assert
        # Второй пользователь должен быть заблокирован, несмотря на ошибку с первым
        assert result == [2]
        assert overdue_checker_service.user_status_service.check_and_block_on_overdue.call_count == 2

    @pytest.mark.asyncio
    async def test_check_and_block_users_handles_all_users_error(self, overdue_checker_service, sample_user, sample_user_2):
        """Тест обработки ошибок для всех пользователей."""
        # Arrange
        active_users = [sample_user, sample_user_2]
        
        overdue_checker_service.user_repo.get_active_users = AsyncMock(return_value=active_users)
        overdue_checker_service.user_status_service.check_and_block_on_overdue = AsyncMock(
            side_effect=Exception("Database error")
        )

        # Act
        result = await overdue_checker_service.check_and_block_users_with_overdue_reservations()

        # Assert
        # Должен вернуть пустой список, но не упасть
        assert result == []
        assert overdue_checker_service.user_status_service.check_and_block_on_overdue.call_count == 2

    @pytest.mark.asyncio
    async def test_check_and_block_users_handles_get_active_users_error(self, overdue_checker_service):
        """Тест обработки ошибки при получении активных пользователей."""
        # Arrange
        overdue_checker_service.user_repo.get_active_users = AsyncMock(
            side_effect=Exception("Database connection error")
        )

        # Act
        result = await overdue_checker_service.check_and_block_users_with_overdue_reservations()

        # Assert
        # Должен вернуть пустой список и не упасть
        assert result == []
        overdue_checker_service.user_repo.get_active_users.assert_called_once()
        overdue_checker_service.user_status_service.check_and_block_on_overdue.assert_not_called()

    @pytest.mark.asyncio
    async def test_check_and_block_users_large_user_list(self, overdue_checker_service):
        """Тест обработки большого списка пользователей."""
        # Arrange
        # Создаем список из 100 пользователей
        active_users = [User() for _ in range(100)]
        for i, user in enumerate(active_users):
            user.id = i + 1
            user.email = f"user{i+1}@example.com"
            user.status = UserStatus.NEW.value
        
        # Каждый 10-й пользователь будет заблокирован
        def side_effect(user_id):
            return (user_id % 10 == 0)
        
        overdue_checker_service.user_repo.get_active_users = AsyncMock(return_value=active_users)
        overdue_checker_service.user_status_service.check_and_block_on_overdue = AsyncMock(
            side_effect=[side_effect(user.id) for user in active_users]
        )

        # Act
        result = await overdue_checker_service.check_and_block_users_with_overdue_reservations()

        # Assert
        # Должно быть заблокировано 10 пользователей (10, 20, 30, ..., 100)
        assert len(result) == 10
        assert all(user_id % 10 == 0 for user_id in result)
        assert overdue_checker_service.user_status_service.check_and_block_on_overdue.call_count == 100

    @pytest.mark.asyncio
    async def test_check_and_block_users_mixed_results(self, overdue_checker_service, sample_user, sample_user_2):
        """Тест смешанных результатов (блокировка, ошибка, нет блокировки)."""
        # Arrange
        active_users = [sample_user, sample_user_2]
        
        overdue_checker_service.user_repo.get_active_users = AsyncMock(return_value=active_users)
        overdue_checker_service.user_status_service.check_and_block_on_overdue = AsyncMock(
            side_effect=[True, Exception("Error for user 2")]
        )

        # Act
        result = await overdue_checker_service.check_and_block_users_with_overdue_reservations()

        # Assert
        # Первый пользователь заблокирован, второй пропущен из-за ошибки
        assert result == [1]
        assert overdue_checker_service.user_status_service.check_and_block_on_overdue.call_count == 2

