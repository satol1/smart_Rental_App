# tests/services/test_user_status_service.py

"""
Unit тесты для UserStatusService.
Тестирует логику управления статусами пользователей и связанными правами.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date, timedelta

from api.services.user.user_status_service import UserStatusService
from api.models.user import User
from shared.constants.user_status import (
    UserStatus,
    COMPLETED_RENTALS_FOR_REGULAR,
    COMPLETED_RENTALS_FOR_VIP,
    OVERDUE_RESERVATIONS_FOR_BLOCK,
    MAX_RESERVATIONS_BY_STATUS,
    EDIT_RESTRICTION_DAYS
)


class TestUserStatusService:
    """Тесты для UserStatusService."""

    @pytest.fixture
    def mock_db(self):
        """Создает мок базы данных."""
        return AsyncMock()

    @pytest.fixture
    def mock_user_repo(self):
        """Создает мок UserRepository."""
        return AsyncMock()

    @pytest.fixture
    def mock_reservation_repo(self):
        """Создает мок ReservationRepository."""
        return AsyncMock()

    @pytest.fixture
    def mock_rental_repo(self):
        """Создает мок RentalRepository."""
        repo = AsyncMock()
        # Мокаем метод get_user_completed_rentals_count как AsyncMock
        repo.get_user_completed_rentals_count = AsyncMock(return_value={})
        return repo

    @pytest.fixture
    def user_status_service(self, mock_db, mock_user_repo, mock_reservation_repo, mock_rental_repo):
        """Создает экземпляр UserStatusService с моками."""
        # Очищаем кэш перед каждым тестом
        UserStatusService.clear_cache()
        return UserStatusService(
            db=mock_db,
            user_repo=mock_user_repo,
            reservation_repo=mock_reservation_repo,
            rental_repo=mock_rental_repo
        )

    @pytest.fixture
    def sample_user(self):
        """Создает тестового пользователя."""
        user = User()
        user.id = 1
        user.status = UserStatus.NEW.value
        user.role = "user"
        return user

    @pytest.fixture
    def admin_user(self):
        """Создает тестового администратора."""
        user = MagicMock(spec=User)
        user.id = 2
        user.status = UserStatus.NEW.value
        user.role = "admin"
        return user

    @pytest.fixture
    def manager_user(self):
        """Создает тестового менеджера."""
        user = MagicMock(spec=User)
        user.id = 3
        user.status = UserStatus.NEW.value
        user.role = "manager"
        return user

    # Тесты для update_user_status_by_rentals

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_update_user_status_by_rentals_new_to_regular(self, user_status_service, sample_user, mock_user_repo, mock_rental_repo):
        """Тест обновления статуса с 'Новый' на 'Постоянный' при 3 завершенных арендах."""
        # Очищаем кэш для этого теста
        UserStatusService.clear_cache()
        
        # Настройка моков
        sample_user.status = UserStatus.NEW.value  # Убеждаемся что статус NEW
        mock_user_repo.get_by_id.return_value = sample_user
        
        # Мок для update_user_status должен обновлять статус пользователя
        async def mock_update_user_status(user, new_status, manually=False):
            user.status = new_status.value if hasattr(new_status, 'value') else str(new_status)
            return user
        
        mock_user_repo.update_user_status = AsyncMock(side_effect=mock_update_user_status)
        mock_rental_repo.get_user_completed_rentals_count = AsyncMock(return_value={sample_user.id: COMPLETED_RENTALS_FOR_REGULAR})
        
        # Выполнение
        result = await user_status_service.update_user_status_by_rentals(sample_user.id)
        
        # Проверки
        assert result == UserStatus.REGULAR
        mock_user_repo.update_user_status.assert_called_once()
        updated_user, new_status = mock_user_repo.update_user_status.call_args[0]
        assert new_status == UserStatus.REGULAR

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_update_user_status_by_rentals_new_to_vip(self, user_status_service, sample_user, mock_user_repo, mock_rental_repo):
        """Тест обновления статуса с 'Новый' на 'VIP' при 7 завершенных арендах."""
        # Очищаем кэш для этого теста
        UserStatusService.clear_cache()
        
        # Настройка моков
        sample_user.status = UserStatus.NEW.value  # Убеждаемся что статус NEW
        mock_user_repo.get_by_id.return_value = sample_user
        
        # Мок для update_user_status должен обновлять статус пользователя
        async def mock_update_user_status(user, new_status, manually=False):
            user.status = new_status.value if hasattr(new_status, 'value') else str(new_status)
            return user
        
        mock_user_repo.update_user_status = AsyncMock(side_effect=mock_update_user_status)
        mock_rental_repo.get_user_completed_rentals_count = AsyncMock(return_value={sample_user.id: COMPLETED_RENTALS_FOR_VIP})
        
        # Выполнение
        result = await user_status_service.update_user_status_by_rentals(sample_user.id)
        
        # Проверки
        assert result == UserStatus.VIP
        mock_user_repo.update_user_status.assert_called_once()
        updated_user, new_status = mock_user_repo.update_user_status.call_args[0]
        assert new_status == UserStatus.VIP

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_update_user_status_by_rentals_stays_new(self, user_status_service, sample_user, mock_user_repo, mock_rental_repo):
        """Тест, что статус остается 'Новый' при менее 3 завершенных арендах."""
        # Очищаем кэш для этого теста
        UserStatusService.clear_cache()
        
        # Настройка моков
        sample_user.status = UserStatus.NEW.value  # Уже статус NEW
        mock_user_repo.get_by_id.return_value = sample_user
        mock_rental_repo.get_user_completed_rentals_count = AsyncMock(return_value={1: 2})  # Меньше порога
        
        # Выполнение
        result = await user_status_service.update_user_status_by_rentals(sample_user.id)
        
        # Проверки
        assert result == UserStatus.NEW
        # Статус не должен обновляться, если он уже NEW и остается NEW
        # (логика сервиса обновляет статус только если он изменился)
        mock_user_repo.update_user_status.assert_not_called()

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_update_user_status_by_rentals_blocked_not_changed(self, user_status_service, mock_user_repo, mock_rental_repo):
        """Тест, что статус 'Заблокирован' не изменяется автоматически."""
        # Настройка моков
        blocked_user = MagicMock(spec=User)
        blocked_user.id = 1
        blocked_user.status = UserStatus.BLOCKED.value
        
        mock_user_repo.get_by_id.return_value = blocked_user
        mock_rental_repo.get_user_completed_rentals_count.return_value = {1: 10}  # Много аренд
        
        # Выполнение
        result = await user_status_service.update_user_status_by_rentals(blocked_user.id)
        
        # Проверки
        assert result == UserStatus.BLOCKED
        mock_user_repo.update_user_status.assert_not_called()

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_update_user_status_by_rentals_persona_non_grata_not_changed(self, user_status_service, mock_user_repo, mock_rental_repo):
        """Тест, что статус 'Персона НонГрата' не изменяется автоматически."""
        # Настройка моков
        png_user = MagicMock(spec=User)
        png_user.id = 1
        png_user.status = UserStatus.PERSONA_NON_GRATA.value
        
        mock_user_repo.get_by_id.return_value = png_user
        mock_rental_repo.get_user_completed_rentals_count.return_value = {1: 10}
        
        # Выполнение
        result = await user_status_service.update_user_status_by_rentals(png_user.id)
        
        # Проверки
        assert result == UserStatus.PERSONA_NON_GRATA
        mock_user_repo.update_user_status.assert_not_called()

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_update_user_status_by_rentals_user_not_found(self, user_status_service, mock_user_repo):
        """Тест обработки случая, когда пользователь не найден."""
        # Настройка моков
        mock_user_repo.get_by_id.return_value = None
        
        # Выполнение
        result = await user_status_service.update_user_status_by_rentals(999)
        
        # Проверки
        assert result == UserStatus.NEW
        mock_user_repo.update_user_status.assert_not_called()

    # Тесты для check_and_block_on_overdue

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_check_and_block_on_overdue_blocks_user(self, user_status_service, sample_user, mock_user_repo, mock_reservation_repo):
        """Тест блокировки пользователя при 3+ просроченных резервах."""
        # Настройка моков
        mock_user_repo.get_by_id.return_value = sample_user
        mock_reservation_repo.count_overdue_reservations_by_user.return_value = OVERDUE_RESERVATIONS_FOR_BLOCK
        mock_user_repo.update_user_status.return_value = sample_user
        
        # Выполнение
        result = await user_status_service.check_and_block_on_overdue(sample_user.id)
        
        # Проверки
        assert result is True
        mock_user_repo.update_user_status.assert_called_once()
        updated_user, new_status = mock_user_repo.update_user_status.call_args[0]
        assert new_status == UserStatus.BLOCKED

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_check_and_block_on_overdue_does_not_block(self, user_status_service, sample_user, mock_user_repo, mock_reservation_repo):
        """Тест, что пользователь не блокируется при менее 3 просроченных резервах."""
        # Настройка моков
        mock_user_repo.get_by_id.return_value = sample_user
        mock_reservation_repo.count_overdue_reservations_by_user.return_value = 2  # Меньше порога
        
        # Выполнение
        result = await user_status_service.check_and_block_on_overdue(sample_user.id)
        
        # Проверки
        assert result is False
        mock_user_repo.update_user_status.assert_not_called()

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_check_and_block_on_overdue_persona_non_grata_not_blocked(self, user_status_service, mock_user_repo, mock_reservation_repo):
        """Тест, что 'Персона НонГрата' не блокируется автоматически."""
        # Настройка моков
        png_user = MagicMock(spec=User)
        png_user.id = 1
        png_user.status = UserStatus.PERSONA_NON_GRATA.value
        
        mock_user_repo.get_by_id.return_value = png_user
        mock_reservation_repo.count_overdue_reservations_by_user.return_value = 10  # Много просрочек
        
        # Выполнение
        result = await user_status_service.check_and_block_on_overdue(png_user.id)
        
        # Проверки
        assert result is False
        mock_user_repo.update_user_status.assert_not_called()

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_check_and_block_on_overdue_vip_not_blocked(self, user_status_service, mock_user_repo, mock_reservation_repo):
        """Тест, что VIP статус не блокируется автоматически (имеет приоритет над автоматической блокировкой)."""
        # Настройка моков
        vip_user = MagicMock(spec=User)
        vip_user.id = 1
        vip_user.status = UserStatus.VIP.value
        
        mock_user_repo.get_by_id.return_value = vip_user
        mock_reservation_repo.count_overdue_reservations_by_user.return_value = 10  # Много просрочек
        
        # Выполнение
        result = await user_status_service.check_and_block_on_overdue(vip_user.id)
        
        # Проверки
        assert result is False
        mock_user_repo.update_user_status.assert_not_called()

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_check_and_block_on_overdue_user_not_found(self, user_status_service, mock_user_repo):
        """Тест обработки случая, когда пользователь не найден."""
        # Настройка моков
        mock_user_repo.get_by_id.return_value = None
        
        # Выполнение
        result = await user_status_service.check_and_block_on_overdue(999)
        
        # Проверки
        assert result is False
        mock_user_repo.update_user_status.assert_not_called()

    # Тесты для can_manager_change_status

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_manager_change_status_admin_can_change_any(self, user_status_service, admin_user):
        """Тест, что администратор может изменять любой статус."""
        # Выполнение для всех статусов
        for status in UserStatus:
            result = await user_status_service.can_manager_change_status(admin_user, status)
            assert result is True, f"Админ должен иметь право изменять статус {status.value}"

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_manager_change_status_manager_cannot_change_persona_non_grata(self, user_status_service, manager_user):
        """Тест, что менеджер не может устанавливать статус 'Персона НонГрата'."""
        # Выполнение
        result = await user_status_service.can_manager_change_status(manager_user, UserStatus.PERSONA_NON_GRATA)
        
        # Проверки
        assert result is False

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_manager_change_status_manager_can_change_other_statuses(self, user_status_service, manager_user):
        """Тест, что менеджер может изменять другие статусы."""
        # Выполнение для всех статусов кроме PERSONA_NON_GRATA
        for status in UserStatus:
            if status != UserStatus.PERSONA_NON_GRATA:
                result = await user_status_service.can_manager_change_status(manager_user, status)
                assert result is True, f"Менеджер должен иметь право изменять статус {status.value}"

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_manager_change_status_user_cannot_change(self, user_status_service, sample_user):
        """Тест, что обычный пользователь не может изменять статусы."""
        # Выполнение
        result = await user_status_service.can_manager_change_status(sample_user, UserStatus.VIP)
        
        # Проверки
        assert result is False

    # Тесты для get_user_max_reservations

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_get_user_max_reservations_by_status(self, user_status_service, sample_user):
        """Тест получения максимального количества резервов по статусам."""
        # Проверяем для каждого статуса
        for status in UserStatus:
            sample_user.status = status.value
            result = await user_status_service.get_user_max_reservations(sample_user)
            expected = MAX_RESERVATIONS_BY_STATUS[status]
            assert result == expected, f"Для статуса {status.value} ожидается {expected}, получено {result}"

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_get_user_max_reservations_unknown_status(self, user_status_service, sample_user):
        """Тест получения лимита для неизвестного статуса."""
        # Настройка
        sample_user.status = "Неизвестный статус"
        
        # Выполнение
        result = await user_status_service.get_user_max_reservations(sample_user)
        
        # Проверки (неизвестный статус обрабатывается как NEW, поэтому лимит = 2)
        assert result == MAX_RESERVATIONS_BY_STATUS[UserStatus.NEW]

    # Тесты для can_user_create_reservation

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_user_create_reservation_allowed_statuses(self, user_status_service, sample_user):
        """Тест, что пользователи с разрешенными статусами могут создавать резервы."""
        allowed_statuses = [UserStatus.NEW, UserStatus.REGULAR, UserStatus.VIP]
        
        for status in allowed_statuses:
            sample_user.status = status.value
            result = await user_status_service.can_user_create_reservation(sample_user)
            assert result is True, f"Пользователь со статусом {status.value} должен иметь право создавать резервы"

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_user_create_reservation_blocked_cannot(self, user_status_service, sample_user):
        """Тест, что заблокированный пользователь не может создавать резервы."""
        sample_user.status = UserStatus.BLOCKED.value
        
        result = await user_status_service.can_user_create_reservation(sample_user)
        
        assert result is False

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_user_create_reservation_persona_non_grata_cannot(self, user_status_service, sample_user):
        """Тест, что 'Персона НонГрата' не может создавать резервы."""
        sample_user.status = UserStatus.PERSONA_NON_GRATA.value
        
        result = await user_status_service.can_user_create_reservation(sample_user)
        
        assert result is False

    # Тесты для can_user_edit_reservation

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_user_edit_reservation_vip_no_restrictions(self, user_status_service, sample_user):
        """Тест, что VIP пользователи могут редактировать резервы без ограничений."""
        sample_user.status = UserStatus.VIP.value
        reservation_start = date.today() + timedelta(days=1)  # Завтра
        
        result = await user_status_service.can_user_edit_reservation(sample_user, reservation_start)
        
        assert result is True

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_user_edit_reservation_new_within_restriction(self, user_status_service, sample_user):
        """Тест ограничения редактирования для 'Новый' статуса."""
        sample_user.status = UserStatus.NEW.value
        restriction_days = EDIT_RESTRICTION_DAYS[UserStatus.NEW]
        
        # За restriction_days + 1 дней до начала - можно редактировать (нужно строго больше)
        reservation_start = date.today() + timedelta(days=restriction_days + 1)
        result = await user_status_service.can_user_edit_reservation(sample_user, reservation_start)
        assert result is True
        
        # Меньше restriction_days дней до начала - нельзя редактировать
        reservation_start = date.today() + timedelta(days=restriction_days - 1)
        result = await user_status_service.can_user_edit_reservation(sample_user, reservation_start)
        assert result is False

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_user_edit_reservation_regular_within_restriction(self, user_status_service, sample_user):
        """Тест ограничения редактирования для 'Постоянный' статуса."""
        sample_user.status = UserStatus.REGULAR.value
        restriction_days = EDIT_RESTRICTION_DAYS[UserStatus.REGULAR]
        
        # За restriction_days + 1 дней до начала - можно редактировать (нужно строго больше)
        reservation_start = date.today() + timedelta(days=restriction_days + 1)
        result = await user_status_service.can_user_edit_reservation(sample_user, reservation_start)
        assert result is True
        
        # Меньше restriction_days дней до начала - нельзя редактировать
        reservation_start = date.today() + timedelta(days=restriction_days - 1)
        result = await user_status_service.can_user_edit_reservation(sample_user, reservation_start)
        assert result is False

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_user_edit_reservation_persona_non_grata_cannot(self, user_status_service, sample_user):
        """Тест, что 'Персона НонГрата' не может редактировать резервы."""
        sample_user.status = UserStatus.PERSONA_NON_GRATA.value
        reservation_start = date.today() + timedelta(days=100)  # Далеко в будущем
        
        result = await user_status_service.can_user_edit_reservation(sample_user, reservation_start)
        
        assert result is False

    # Тесты для can_user_cancel_reservation

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_user_cancel_reservation_vip_no_restrictions(self, user_status_service, sample_user):
        """Тест, что VIP пользователи могут отменять резервы без ограничений."""
        sample_user.status = UserStatus.VIP.value
        reservation_start = date.today() + timedelta(days=1)  # Завтра
        
        result = await user_status_service.can_user_cancel_reservation(sample_user, reservation_start)
        
        assert result is True

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_user_cancel_reservation_new_within_restriction(self, user_status_service, sample_user):
        """Тест ограничения отмены для 'Новый' статуса."""
        sample_user.status = UserStatus.NEW.value
        restriction_days = EDIT_RESTRICTION_DAYS[UserStatus.NEW]
        
        # За restriction_days + 1 дней до начала - можно отменять (нужно строго больше)
        reservation_start = date.today() + timedelta(days=restriction_days + 1)
        result = await user_status_service.can_user_cancel_reservation(sample_user, reservation_start)
        assert result is True
        
        # Меньше restriction_days дней до начала - нельзя отменять
        reservation_start = date.today() + timedelta(days=restriction_days - 1)
        result = await user_status_service.can_user_cancel_reservation(sample_user, reservation_start)
        assert result is False

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_user_cancel_reservation_persona_non_grata_cannot(self, user_status_service, sample_user):
        """Тест, что 'Персона НонГрата' не может отменять резервы."""
        sample_user.status = UserStatus.PERSONA_NON_GRATA.value
        reservation_start = date.today() + timedelta(days=100)  # Далеко в будущем
        
        result = await user_status_service.can_user_cancel_reservation(sample_user, reservation_start)
        
        assert result is False

    # Тесты для can_user_receive_rental

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_user_receive_rental_allowed_statuses(self, user_status_service, sample_user):
        """Тест, что пользователи с разрешенными статусами могут получать аренду."""
        allowed_statuses = [UserStatus.NEW, UserStatus.REGULAR, UserStatus.VIP, UserStatus.BLOCKED]
        
        for status in allowed_statuses:
            sample_user.status = status.value
            result = await user_status_service.can_user_receive_rental(sample_user)
            assert result is True, f"Пользователь со статусом {status.value} должен иметь право получать аренду"

    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_can_user_receive_rental_persona_non_grata_cannot(self, user_status_service, sample_user):
        """Тест, что 'Персона НонГрата' не может получать аренду."""
        sample_user.status = UserStatus.PERSONA_NON_GRATA.value
        
        result = await user_status_service.can_user_receive_rental(sample_user)
        
        assert result is False

