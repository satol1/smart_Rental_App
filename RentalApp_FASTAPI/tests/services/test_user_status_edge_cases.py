# tests/services/test_user_status_edge_cases.py

"""
Тесты для граничных случаев системы градации статусов пользователей.
Проверяет граничные значения лимитов, статусов, дат.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date, timedelta

from api.services.user.user_status_service import UserStatusService
from api.models.user import User
from api.models.reservation import Reservation
from shared.constants.user_status import (
    UserStatus,
    COMPLETED_RENTALS_FOR_REGULAR,
    COMPLETED_RENTALS_FOR_VIP,
    OVERDUE_RESERVATIONS_FOR_BLOCK,
    MAX_RESERVATIONS_BY_STATUS,
    EDIT_RESTRICTION_DAYS
)
from shared.constants.order_status import OrderStatus


class TestUserStatusEdgeCases:
    """Тесты для граничных случаев системы статусов."""

    @pytest.fixture
    def mock_db(self):
        return AsyncMock()

    @pytest.fixture
    def mock_user_repo(self):
        return AsyncMock()

    @pytest.fixture
    def mock_reservation_repo(self):
        return AsyncMock()

    @pytest.fixture
    def mock_rental_repo(self):
        repo = AsyncMock()
        # Мокаем метод get_user_completed_rentals_count, который возвращает словарь {user_id: count}
        repo.get_user_completed_rentals_count = AsyncMock(return_value={})
        return repo

    @pytest.fixture
    def user_status_service(self, mock_db, mock_user_repo, mock_reservation_repo, mock_rental_repo):
        # Очищаем кэш перед каждым тестом
        UserStatusService.clear_cache()
        return UserStatusService(
            db=mock_db,
            user_repo=mock_user_repo,
            reservation_repo=mock_reservation_repo,
            rental_repo=mock_rental_repo
        )

    # Граничные значения для количества аренд

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_status_exactly_2_rentals_stays_new(self, user_status_service, mock_user_repo, mock_rental_repo):
        """Тест: Ровно 2 аренды - статус остается "Новый" (граничное значение перед "Постоянный")."""
        user = MagicMock(spec=User)
        user.id = 1
        user.status = UserStatus.NEW.value
        
        mock_user_repo.get_by_id.return_value = user
        mock_rental_repo.get_user_completed_rentals_count.return_value = {1: COMPLETED_RENTALS_FOR_REGULAR - 1}
        mock_user_repo.update_user_status.return_value = user
        
        result = await user_status_service.update_user_status_by_rentals(user.id)
        
        assert result == UserStatus.NEW
        mock_user_repo.update_user_status.assert_not_called()

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_status_exactly_3_rentals_becomes_regular(self, user_status_service, mock_user_repo, mock_rental_repo):
        """Тест: Ровно 3 аренды - статус меняется на "Постоянный" (граничное значение)."""
        user = User()
        user.id = 1
        user.status = UserStatus.NEW.value
        
        # Обновленный пользователь после изменения статуса
        updated_user = MagicMock(spec=User)
        updated_user.id = 1
        updated_user.status = UserStatus.REGULAR.value
        
        # Очищаем кэш для этого теста
        UserStatusService.clear_cache()
        
        mock_user_repo.get_by_id.return_value = user
        
        # Мок для update_user_status должен обновлять статус пользователя
        async def mock_update_user_status(user, new_status, manually=False):
            user.status = new_status.value if hasattr(new_status, 'value') else str(new_status)
            return user
        
        mock_user_repo.update_user_status = AsyncMock(side_effect=mock_update_user_status)
        mock_rental_repo.get_user_completed_rentals_count = AsyncMock(return_value={user.id: COMPLETED_RENTALS_FOR_REGULAR})
        
        result = await user_status_service.update_user_status_by_rentals(user.id)
        
        assert result == UserStatus.REGULAR
        mock_user_repo.update_user_status.assert_called_once()

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_status_exactly_6_rentals_stays_regular(self, user_status_service, mock_user_repo, mock_rental_repo):
        """Тест: Ровно 6 аренд - статус остается "Постоянный" (граничное значение перед "VIP")."""
        user = MagicMock(spec=User)
        user.id = 1
        user.status = UserStatus.REGULAR.value
        
        # Очищаем кэш для этого теста
        UserStatusService.clear_cache()
        
        mock_user_repo.get_by_id.return_value = user
        mock_rental_repo.get_user_completed_rentals_count = AsyncMock(return_value={1: COMPLETED_RENTALS_FOR_VIP - 1})
        mock_user_repo.update_user_status.return_value = user
        
        result = await user_status_service.update_user_status_by_rentals(user.id)
        
        assert result == UserStatus.REGULAR
        # Статус не должен изменяться, так как он уже "Постоянный" и количество аренд не достигло VIP
        mock_user_repo.update_user_status.assert_not_called()

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_status_exactly_7_rentals_becomes_vip(self, user_status_service, mock_user_repo, mock_rental_repo):
        """Тест: Ровно 7 аренд - статус меняется на "VIP" (граничное значение)."""
        user = User()
        user.id = 1
        user.status = UserStatus.REGULAR.value
        
        # Очищаем кэш для этого теста
        UserStatusService.clear_cache()
        
        mock_user_repo.get_by_id.return_value = user
        
        # Мок для update_user_status должен обновлять статус пользователя
        async def mock_update_user_status(user, new_status, manually=False):
            user.status = new_status.value if hasattr(new_status, 'value') else str(new_status)
            return user
        
        mock_user_repo.update_user_status = AsyncMock(side_effect=mock_update_user_status)
        mock_rental_repo.get_user_completed_rentals_count = AsyncMock(return_value={user.id: COMPLETED_RENTALS_FOR_VIP})
        
        result = await user_status_service.update_user_status_by_rentals(user.id)
        
        assert result == UserStatus.VIP
        mock_user_repo.update_user_status.assert_called_once()

    # Граничные значения для просроченных резервов

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_exactly_2_overdue_not_blocked(self, user_status_service, mock_user_repo, mock_reservation_repo):
        """Тест: Ровно 2 просроченных резерва - пользователь не блокируется (граничное значение)."""
        user = MagicMock(spec=User)
        user.id = 1
        user.status = UserStatus.NEW.value
        
        mock_user_repo.get_by_id.return_value = user
        mock_reservation_repo.count_overdue_reservations_by_user.return_value = OVERDUE_RESERVATIONS_FOR_BLOCK - 1
        mock_user_repo.update_user_status.return_value = user
        
        result = await user_status_service.check_and_block_on_overdue(user.id)
        
        assert result is False
        mock_user_repo.update_user_status.assert_not_called()

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_exactly_3_overdue_blocks_user(self, user_status_service, mock_user_repo, mock_reservation_repo):
        """Тест: Ровно 3 просроченных резерва - пользователь блокируется (граничное значение)."""
        user = MagicMock(spec=User)
        user.id = 1
        user.status = UserStatus.NEW.value
        
        mock_user_repo.get_by_id.return_value = user
        mock_reservation_repo.count_overdue_reservations_by_user.return_value = OVERDUE_RESERVATIONS_FOR_BLOCK
        mock_user_repo.update_user_status.return_value = user
        
        result = await user_status_service.check_and_block_on_overdue(user.id)
        
        assert result is True
        mock_user_repo.update_user_status.assert_called_once()

    # Граничные значения для лимитов резервов

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_new_user_exactly_max_reservations(self, user_status_service):
        """Тест: Пользователь "Новый" с максимальным количеством резервов (2)."""
        user = MagicMock(spec=User)
        user.status = UserStatus.NEW.value
        
        max_reservations = await user_status_service.get_user_max_reservations(user)
        assert max_reservations == MAX_RESERVATIONS_BY_STATUS[UserStatus.NEW]

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_regular_user_exactly_max_reservations(self, user_status_service):
        """Тест: Пользователь "Постоянный" с максимальным количеством резервов (5)."""
        user = MagicMock(spec=User)
        user.status = UserStatus.REGULAR.value
        
        max_reservations = await user_status_service.get_user_max_reservations(user)
        assert max_reservations == MAX_RESERVATIONS_BY_STATUS[UserStatus.REGULAR]

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_vip_user_exactly_max_reservations(self, user_status_service):
        """Тест: Пользователь "VIP" с максимальным количеством резервов (10)."""
        user = MagicMock(spec=User)
        user.status = UserStatus.VIP.value
        
        max_reservations = await user_status_service.get_user_max_reservations(user)
        assert max_reservations == MAX_RESERVATIONS_BY_STATUS[UserStatus.VIP]

    # Граничные значения для дней до начала резерва

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_new_user_edit_exactly_2_days_before(self, user_status_service):
        """Тест: Пользователь "Новый" НЕ может редактировать ровно за 2 дня до начала (нужно строго больше)."""
        user = MagicMock(spec=User)
        user.status = UserStatus.NEW.value
        
        reservation_date = date.today() + timedelta(days=EDIT_RESTRICTION_DAYS[UserStatus.NEW])
        
        can_edit = await user_status_service.can_user_edit_reservation(user, reservation_date)
        assert can_edit is False  # Логика: days_until_start > restriction_days, а не >=

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_new_user_edit_1_day_before_fails(self, user_status_service):
        """Тест: Пользователь "Новый" не может редактировать за 1 день до начала (граничное значение)."""
        user = MagicMock(spec=User)
        user.status = UserStatus.NEW.value
        
        reservation_date = date.today() + timedelta(days=EDIT_RESTRICTION_DAYS[UserStatus.NEW] - 1)
        
        can_edit = await user_status_service.can_user_edit_reservation(user, reservation_date)
        assert can_edit is False

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_regular_user_edit_exactly_1_day_before(self, user_status_service):
        """Тест: Пользователь "Постоянный" НЕ может редактировать ровно за 1 день до начала (нужно строго больше)."""
        user = MagicMock(spec=User)
        user.status = UserStatus.REGULAR.value
        
        reservation_date = date.today() + timedelta(days=EDIT_RESTRICTION_DAYS[UserStatus.REGULAR])
        
        can_edit = await user_status_service.can_user_edit_reservation(user, reservation_date)
        assert can_edit is False  # Логика: days_until_start > restriction_days, а не >=

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_regular_user_edit_0_days_before_fails(self, user_status_service):
        """Тест: Пользователь "Постоянный" не может редактировать в день начала (граничное значение)."""
        user = MagicMock(spec=User)
        user.status = UserStatus.REGULAR.value
        
        reservation_date = date.today() + timedelta(days=EDIT_RESTRICTION_DAYS[UserStatus.REGULAR] - 1)
        
        can_edit = await user_status_service.can_user_edit_reservation(user, reservation_date)
        assert can_edit is False

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_vip_user_edit_today_allowed(self, user_status_service):
        """Тест: Пользователь "VIP" может редактировать в день начала (нет ограничений)."""
        user = MagicMock(spec=User)
        user.status = UserStatus.VIP.value
        
        reservation_date = date.today()
        
        can_edit = await user_status_service.can_user_edit_reservation(user, reservation_date)
        assert can_edit is True

    # Граничные случаи для статусов

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_blocked_user_status_not_changed_by_rentals(self, user_status_service, mock_user_repo, mock_rental_repo):
        """Тест: Статус "Заблокирован" не изменяется автоматически при арендах."""
        user = MagicMock(spec=User)
        user.id = 1
        user.status = UserStatus.BLOCKED.value
        
        mock_user_repo.get_by_id.return_value = user
        mock_rental_repo.get_user_completed_rentals_count = AsyncMock(return_value={user.id: 10})  # Много аренд
        
        result = await user_status_service.update_user_status_by_rentals(user.id)
        
        assert result == UserStatus.BLOCKED
        mock_user_repo.update_user_status.assert_not_called()

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_persona_non_grata_status_not_changed_by_rentals(self, user_status_service, mock_user_repo, mock_rental_repo):
        """Тест: Статус "Персона НонГрата" не изменяется автоматически при арендах."""
        user = MagicMock(spec=User)
        user.id = 1
        user.status = UserStatus.PERSONA_NON_GRATA.value
        
        mock_user_repo.get_by_id.return_value = user
        mock_rental_repo.get_user_completed_rentals_count = AsyncMock(return_value={user.id: 10})  # Много аренд
        
        result = await user_status_service.update_user_status_by_rentals(user.id)
        
        assert result == UserStatus.PERSONA_NON_GRATA
        mock_user_repo.update_user_status.assert_not_called()

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_persona_non_grata_not_blocked_by_overdue(self, user_status_service, mock_user_repo, mock_reservation_repo):
        """Тест: Пользователь "Персона НонГрата" не блокируется при просроченных резервах."""
        user = MagicMock(spec=User)
        user.id = 1
        user.status = UserStatus.PERSONA_NON_GRATA.value
        
        mock_user_repo.get_by_id.return_value = user
        mock_reservation_repo.count_overdue_reservations_by_user.return_value = 10  # Много просроченных
        
        result = await user_status_service.check_and_block_on_overdue(user.id)
        
        assert result is False
        mock_user_repo.update_user_status.assert_not_called()

    # Граничные случаи для неизвестных статусов

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_unknown_status_defaults_to_new(self, user_status_service):
        """Тест: Неизвестный статус обрабатывается как "Новый"."""
        user = MagicMock(spec=User)
        user.status = "Неизвестный статус"
        
        max_reservations = await user_status_service.get_user_max_reservations(user)
        assert max_reservations == MAX_RESERVATIONS_BY_STATUS[UserStatus.NEW]

    # Граничные случаи для дат

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_edit_reservation_past_date(self, user_status_service):
        """Тест: Редактирование резерва с датой в прошлом - не разрешено (даже для VIP)."""
        user = MagicMock(spec=User)
        user.status = UserStatus.VIP.value
        
        reservation_date = date.today() - timedelta(days=1)
        
        can_edit = await user_status_service.can_user_edit_reservation(user, reservation_date)
        # Даже VIP не может редактировать прошедшие резервы
        assert can_edit is False

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_edit_reservation_far_future(self, user_status_service):
        """Тест: Редактирование резерва с датой далеко в будущем - разрешено."""
        user = MagicMock(spec=User)
        user.status = UserStatus.NEW.value
        
        reservation_date = date.today() + timedelta(days=365)
        
        can_edit = await user_status_service.can_user_edit_reservation(user, reservation_date)
        assert can_edit is True

