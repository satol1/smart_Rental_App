# tests/services/test_holiday_auto_extension.py
"""
Тесты для автоматического продления при добавлении выходных дней.
"""

import pytest
from unittest.mock import AsyncMock, Mock
from datetime import date, timedelta
from typing import List

from api.services.holiday_service import HolidayService
from api.services.notification_service import NotificationService
from api.models.holiday import Holiday
from api.models.user import User
from api.models.rental import Rental
from api.models.reservation import Reservation
from api.repositories.holiday_repository import HolidayRepository
from api.repositories.rental_repository import RentalRepository
from api.repositories.reservation_repository import ReservationRepository
from shared.schemas.holiday_schema import HolidayCreate
from shared.constants.order_status import OrderStatus


class TestHolidayAutoExtension:
    """Тесты для автоматического продления при добавлении выходных дней"""

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        session = AsyncMock()
        return session

    @pytest.fixture
    def mock_holiday_repo(self):
        """Мок репозитория выходных дней"""
        repo = Mock(spec=HolidayRepository)
        return repo

    @pytest.fixture
    def mock_rental_repo(self):
        """Мок репозитория аренд"""
        repo = Mock(spec=RentalRepository)
        return repo

    @pytest.fixture
    def mock_reservation_repo(self):
        """Мок репозитория резервов"""
        repo = Mock(spec=ReservationRepository)
        return repo

    @pytest.fixture
    def mock_notification_service(self):
        """Мок сервиса уведомлений"""
        service = Mock(spec=NotificationService)
        return service

    @pytest.fixture
    def holiday_service(self, mock_db_session, mock_holiday_repo, mock_rental_repo, mock_reservation_repo, mock_notification_service):
        """Создает экземпляр HolidayService с мок-зависимостями"""
        return HolidayService(
            mock_db_session, 
            mock_holiday_repo, 
            mock_rental_repo, 
            mock_reservation_repo,
            mock_notification_service
        )

    @pytest.fixture
    def sample_user(self):
        """Образец пользователя для тестирования"""
        return User(
            id=1,
            email="test@example.com",
            full_name="Test User",
            is_active=True
        )

    @pytest.fixture
    def sample_rental(self):
        """Образец аренды для тестирования"""
        return Rental(
            id=1,
            user_id=1,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=5),
            status=OrderStatus.ACTIVE,
            total_cost=1000.0,
            deposit_amount=500.0,
            prepayment_amount=0.0
        )

    @pytest.fixture
    def sample_reservation(self):
        """Образец резерва для тестирования"""
        return Reservation(
            id=1,
            user_id=1,
            start_date=date.today() + timedelta(days=1),
            end_date=date.today() + timedelta(days=6),
            status=OrderStatus.ACTIVE,
            total_cost=1200.0
        )

    @pytest.mark.asyncio
    async def test_auto_extend_orders_on_holiday_creation_no_conflicts(
        self, 
        holiday_service, 
        mock_holiday_repo, 
        mock_rental_repo, 
        mock_reservation_repo,
        mock_notification_service
    ):
        """Тест автоматического продления без конфликтов"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        
        mock_holiday_repo.check_conflicting_rentals.return_value = []
        mock_holiday_repo.check_conflicting_reservations_end_date.return_value = []
        mock_holiday_repo.find_next_working_day.return_value = next_working_day
        
        # Act
        result = await holiday_service._auto_extend_orders_on_holiday_creation(holiday_date)
        
        # Assert
        assert result["message"] == "Автоматически продлено 0 аренд и 0 резервов"
        assert result["next_working_day"] == next_working_day
        assert result["extended_rentals"] == []
        assert result["extended_reservations"] == []
        
        # Проверяем, что методы были вызваны
        mock_holiday_repo.check_conflicting_rentals.assert_called_once_with(holiday_date)
        mock_holiday_repo.check_conflicting_reservations_end_date.assert_called_once_with(holiday_date)
        mock_holiday_repo.find_next_working_day.assert_called_once_with(holiday_date + timedelta(days=1))
        
        # Проверяем, что уведомления не отправлялись
        mock_notification_service.notify_auto_extension.assert_not_called()

    @pytest.mark.asyncio
    async def test_auto_extend_orders_on_holiday_creation_with_rental_conflicts(
        self, 
        holiday_service, 
        mock_holiday_repo, 
        mock_rental_repo, 
        mock_reservation_repo,
        mock_notification_service
    ):
        """Тест автоматического продления с конфликтами аренд"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        conflicting_rental_ids = [1, 2]
        
        mock_holiday_repo.check_conflicting_rentals.return_value = conflicting_rental_ids
        mock_holiday_repo.check_conflicting_reservations_end_date.return_value = []
        mock_holiday_repo.find_next_working_day.return_value = next_working_day
        mock_rental_repo.update_rental_end_date.return_value = True
        
        # Act
        result = await holiday_service._auto_extend_orders_on_holiday_creation(holiday_date)
        
        # Assert
        assert result["message"] == "Автоматически продлено 2 аренд и 0 резервов"
        assert result["next_working_day"] == next_working_day
        assert len(result["extended_rentals"]) == 2
        assert len(result["extended_reservations"]) == 0
        
        # Проверяем, что аренды были обновлены
        assert mock_rental_repo.update_rental_end_date.call_count == 2
        mock_rental_repo.update_rental_end_date.assert_any_call(1, next_working_day)
        mock_rental_repo.update_rental_end_date.assert_any_call(2, next_working_day)
        
        # Проверяем, что уведомления были отправлены
        mock_notification_service.notify_auto_extension.assert_called_once()

    @pytest.mark.asyncio
    async def test_auto_extend_orders_on_holiday_creation_with_reservation_conflicts(
        self, 
        holiday_service, 
        mock_holiday_repo, 
        mock_rental_repo, 
        mock_reservation_repo,
        mock_notification_service
    ):
        """Тест автоматического продления с конфликтами резервов"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        conflicting_reservation_ids = [3, 4]
        
        mock_holiday_repo.check_conflicting_rentals.return_value = []
        mock_holiday_repo.check_conflicting_reservations_end_date.return_value = conflicting_reservation_ids
        mock_holiday_repo.find_next_working_day.return_value = next_working_day
        mock_reservation_repo.update_reservation_end_date.return_value = True
        
        # Act
        result = await holiday_service._auto_extend_orders_on_holiday_creation(holiday_date)
        
        # Assert
        assert result["message"] == "Автоматически продлено 0 аренд и 2 резервов"
        assert result["next_working_day"] == next_working_day
        assert len(result["extended_rentals"]) == 0
        assert len(result["extended_reservations"]) == 2
        
        # Проверяем, что резервы были обновлены
        assert mock_reservation_repo.update_reservation_end_date.call_count == 2
        mock_reservation_repo.update_reservation_end_date.assert_any_call(3, next_working_day)
        mock_reservation_repo.update_reservation_end_date.assert_any_call(4, next_working_day)
        
        # Проверяем, что уведомления были отправлены
        mock_notification_service.notify_auto_extension.assert_called_once()

    @pytest.mark.asyncio
    async def test_auto_extend_orders_on_holiday_creation_mixed_conflicts(
        self, 
        holiday_service, 
        mock_holiday_repo, 
        mock_rental_repo, 
        mock_reservation_repo,
        mock_notification_service
    ):
        """Тест автоматического продления со смешанными конфликтами"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        conflicting_rental_ids = [1]
        conflicting_reservation_ids = [2]
        
        mock_holiday_repo.check_conflicting_rentals.return_value = conflicting_rental_ids
        mock_holiday_repo.check_conflicting_reservations_end_date.return_value = conflicting_reservation_ids
        mock_holiday_repo.find_next_working_day.return_value = next_working_day
        mock_rental_repo.update_rental_end_date.return_value = True
        mock_reservation_repo.update_reservation_end_date.return_value = True
        
        # Act
        result = await holiday_service._auto_extend_orders_on_holiday_creation(holiday_date)
        
        # Assert
        assert result["message"] == "Автоматически продлено 1 аренд и 1 резервов"
        assert result["next_working_day"] == next_working_day
        assert len(result["extended_rentals"]) == 1
        assert len(result["extended_reservations"]) == 1
        
        # Проверяем, что оба типа заказов были обновлены
        mock_rental_repo.update_rental_end_date.assert_called_once_with(1, next_working_day)
        mock_reservation_repo.update_reservation_end_date.assert_called_once_with(2, next_working_day)
        
        # Проверяем, что уведомления были отправлены
        mock_notification_service.notify_auto_extension.assert_called_once()

    @pytest.mark.asyncio
    async def test_auto_extend_orders_on_holiday_creation_update_failure(
        self, 
        holiday_service, 
        mock_holiday_repo, 
        mock_rental_repo, 
        mock_reservation_repo,
        mock_notification_service
    ):
        """Тест обработки ошибок при обновлении заказов"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        conflicting_rental_ids = [1, 2]
        
        mock_holiday_repo.check_conflicting_rentals.return_value = conflicting_rental_ids
        mock_holiday_repo.check_conflicting_reservations_end_date.return_value = []
        mock_holiday_repo.find_next_working_day.return_value = next_working_day
        
        # Первое обновление успешно, второе - неудачно
        mock_rental_repo.update_rental_end_date.side_effect = [True, False]
        
        # Act
        result = await holiday_service._auto_extend_orders_on_holiday_creation(holiday_date)
        
        # Assert
        assert result["message"] == "Автоматически продлено 1 аренд и 0 резервов"
        assert len(result["extended_rentals"]) == 1  # Только успешное обновление
        assert len(result["extended_reservations"]) == 0
        
        # Проверяем, что уведомления были отправлены только для успешных обновлений
        mock_notification_service.notify_auto_extension.assert_called_once()

    @pytest.mark.asyncio
    async def test_auto_extend_orders_on_holiday_creation_no_repositories(
        self, 
        mock_db_session, 
        mock_holiday_repo
    ):
        """Тест автоматического продления без инициализированных репозиториев"""
        # Arrange
        holiday_service = HolidayService(mock_db_session, mock_holiday_repo)
        holiday_date = date.today() + timedelta(days=3)
        
        # Act
        result = await holiday_service._auto_extend_orders_on_holiday_creation(holiday_date)
        
        # Assert
        assert result["message"] == "Репозитории не инициализированы"
        assert result["extended_rentals"] == []
        assert result["extended_reservations"] == []

    @pytest.mark.asyncio
    async def test_auto_extend_orders_on_holiday_creation_notification_error(
        self, 
        holiday_service, 
        mock_holiday_repo, 
        mock_rental_repo, 
        mock_reservation_repo,
        mock_notification_service
    ):
        """Тест обработки ошибок при отправке уведомлений"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        conflicting_rental_ids = [1]
        
        mock_holiday_repo.check_conflicting_rentals.return_value = conflicting_rental_ids
        mock_holiday_repo.check_conflicting_reservations_end_date.return_value = []
        mock_holiday_repo.find_next_working_day.return_value = next_working_day
        mock_rental_repo.update_rental_end_date.return_value = True
        
        # Ошибка при отправке уведомлений
        mock_notification_service.notify_auto_extension.side_effect = Exception("Notification error")
        
        # Act
        result = await holiday_service._auto_extend_orders_on_holiday_creation(holiday_date)
        
        # Assert
        # Основная функциональность должна работать, несмотря на ошибку уведомлений
        assert result["message"] == "Автоматически продлено 1 аренд и 0 резервов"
        assert len(result["extended_rentals"]) == 1
        assert len(result["extended_reservations"]) == 0
        
        # Проверяем, что попытка отправки уведомлений была сделана
        mock_notification_service.notify_auto_extension.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_single_holiday_with_auto_extension(
        self, 
        holiday_service, 
        mock_holiday_repo, 
        mock_rental_repo, 
        mock_reservation_repo,
        mock_notification_service,
        sample_user
    ):
        """Тест создания выходного дня с автоматическим продлением"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        holiday_create = HolidayCreate(
            date=holiday_date,
            description="Test holiday"
        )
        
        # Настраиваем моки
        mock_holiday_repo.check_conflicting_reservations.return_value = []
        mock_holiday_repo.find_holiday_by_date.return_value = None
        mock_holiday_repo.save_holiday.return_value = None
        mock_holiday_repo.check_conflicting_rentals.return_value = [1]
        mock_holiday_repo.check_conflicting_reservations_end_date.return_value = []
        mock_holiday_repo.find_next_working_day.return_value = next_working_day
        mock_rental_repo.update_rental_end_date.return_value = True
        
        # Act
        result = await holiday_service.create_single_holiday(holiday_create, sample_user)
        
        # Assert
        assert "message" in result
        assert "date" in result
        assert "auto_extension" in result
        assert result["auto_extension"]["message"] == "Автоматически продлено 1 аренд и 0 резервов"
        
        # Проверяем, что все необходимые методы были вызваны
        mock_holiday_repo.check_conflicting_reservations.assert_called_once()
        mock_holiday_repo.find_holiday_by_date.assert_called_once()
        mock_holiday_repo.save_holiday.assert_called_once()
        mock_notification_service.notify_auto_extension.assert_called_once()
