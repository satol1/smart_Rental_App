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
    def mock_order_validator(self):
        """Мок валидатора занятости: по умолчанию оборудование свободно"""
        from api.services.order.order_validator import OrderValidator
        validator = Mock(spec=OrderValidator)
        validator.validate_equipment_availability = AsyncMock()
        return validator

    @pytest.fixture
    def holiday_service(self, mock_db_session, mock_holiday_repo, mock_rental_repo, mock_reservation_repo, mock_notification_service, mock_order_validator):
        """Создает экземпляр HolidayService с мок-зависимостями"""
        return HolidayService(
            mock_db_session, 
            mock_holiday_repo, 
            mock_rental_repo, 
            mock_reservation_repo,
            mock_notification_service,
            order_validator=mock_order_validator,
        )

    @pytest.fixture
    def rental_with_equipment(self, sample_rental):
        """Аренда с загруженным оборудованием (lazy=selectin эмуляция)"""
        equipment = Mock()
        equipment.id = 10
        sample_rental.equipment = [equipment]
        return sample_rental

    @pytest.fixture
    def reservation_with_equipment(self, sample_reservation):
        """Резерв с загруженным оборудованием"""
        equipment = Mock()
        equipment.id = 20
        sample_reservation.equipment = [equipment]
        return sample_reservation

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


    def _equipment(self, equipment_id):
        from api.models.equipment import Equipment
        return Equipment(
            id=equipment_id,
            name="Test Equipment",
            equipment_type="ski",
            brand="Test Brand",
            condition="Good",
            daily_rate=100.0,
        )

    def _rental_with_equipment(self, rental_id=1, equipment_id=10):
        rental = Rental(
            id=rental_id,
            user_id=1,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=5),
            status=OrderStatus.ACTIVE,
            total_cost=1000.0,
        )
        rental.equipment = [self._equipment(equipment_id)]
        return rental

    def _reservation_with_equipment(self, reservation_id=2, equipment_id=20):
        reservation = Reservation(
            id=reservation_id,
            user_id=1,
            start_date=date.today() + timedelta(days=1),
            end_date=date.today() + timedelta(days=6),
            status=OrderStatus.ACTIVE,
            total_cost=1200.0,
        )
        reservation.equipment = [self._equipment(equipment_id)]
        return reservation

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
        assert result["message"] == "Автоматически продлено 0 аренд и 0 резервов."
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
        mock_rental_repo.get_by_id_with_details = AsyncMock(
            side_effect=[self._rental_with_equipment(1), self._rental_with_equipment(2)]
        )
        
        # Act
        result = await holiday_service._auto_extend_orders_on_holiday_creation(holiday_date)
        
        # Assert
        assert result["message"] == "Автоматически продлено 2 аренд и 0 резервов."
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
        mock_reservation_repo.get_by_id = AsyncMock(
            side_effect=[
                self._reservation_with_equipment(3),
                self._reservation_with_equipment(4),
            ]
        )
        
        # Act
        result = await holiday_service._auto_extend_orders_on_holiday_creation(holiday_date)
        
        # Assert
        assert result["message"] == "Автоматически продлено 0 аренд и 2 резервов."
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
        mock_rental_repo.get_by_id_with_details = AsyncMock(
            return_value=self._rental_with_equipment(1)
        )
        mock_reservation_repo.get_by_id = AsyncMock(
            return_value=self._reservation_with_equipment(2)
        )
        
        # Act
        result = await holiday_service._auto_extend_orders_on_holiday_creation(holiday_date)
        
        # Assert
        assert result["message"] == "Автоматически продлено 1 аренд и 1 резервов."
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
        
        mock_rental_repo.get_by_id_with_details = AsyncMock(
            side_effect=[self._rental_with_equipment(1), self._rental_with_equipment(2)]
        )
        # Первое обновление успешно, второе - неудачно
        mock_rental_repo.update_rental_end_date.side_effect = [True, False]
        
        # Act
        result = await holiday_service._auto_extend_orders_on_holiday_creation(holiday_date)
        
        # Assert
        assert result["message"] == "Автоматически продлено 1 аренд и 0 резервов."
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
        mock_rental_repo.get_by_id_with_details = AsyncMock(
            return_value=self._rental_with_equipment(1)
        )
        
        # Ошибка при отправке уведомлений
        mock_notification_service.notify_auto_extension.side_effect = Exception("Notification error")
        
        # Act
        result = await holiday_service._auto_extend_orders_on_holiday_creation(holiday_date)
        
        # Assert
        # Основная функциональность должна работать, несмотря на ошибку уведомлений
        assert result["message"] == "Автоматически продлено 1 аренд и 0 резервов."
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
        assert result["auto_extension"]["message"] == "Автоматически продлено 1 аренд и 0 резервов."
        
        # Проверяем, что все необходимые методы были вызваны
        mock_holiday_repo.check_conflicting_reservations.assert_called_once()
        mock_holiday_repo.find_holiday_by_date.assert_called_once()
        mock_holiday_repo.save_holiday.assert_called_once()
        mock_notification_service.notify_auto_extension.assert_called_once()


class TestAutoExtensionAvailabilityGuard:
    """Продление только при свободном интервале (закрытие обхода анти-овербукинга)."""

    @pytest.fixture
    def service_with_mocks(self):
        from api.services.order.order_validator import OrderValidator
        db = AsyncMock()
        holiday_repo = Mock(spec=HolidayRepository)
        rental_repo = Mock(spec=RentalRepository)
        reservation_repo = Mock(spec=ReservationRepository)
        notification = Mock(spec=NotificationService)
        validator = Mock(spec=OrderValidator)
        validator.validate_equipment_availability = AsyncMock()
        service = HolidayService(
            db, holiday_repo, rental_repo, reservation_repo, notification,
            order_validator=validator,
        )
        return service, holiday_repo, rental_repo, reservation_repo, validator

    @pytest.mark.asyncio
    async def test_rental_skipped_when_interval_busy(self, service_with_mocks):
        """Оборудование занято на [start, next_working_day] — аренда НЕ продлевается."""
        from fastapi import HTTPException
        service, holiday_repo, rental_repo, _, validator = service_with_mocks

        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        holiday_repo.check_conflicting_rentals.return_value = [7]
        holiday_repo.check_conflicting_reservations_end_date.return_value = []
        holiday_repo.find_next_working_day.return_value = next_working_day

        rental = Rental(id=7, user_id=1, start_date=date.today(),
                        end_date=holiday_date, status=OrderStatus.ACTIVE)
        eq = Mock()
        eq.id = 10
        rental.equipment = [eq]
        rental_repo.get_by_id_with_details = AsyncMock(return_value=rental)

        validator.validate_equipment_availability = AsyncMock(
            side_effect=HTTPException(status_code=409, detail="Оборудование с ID [10] недоступно")
        )

        result = await service._auto_extend_orders_on_holiday_creation(holiday_date)

        rental_repo.update_rental_end_date.assert_not_called()
        assert result["extended_rentals"] == []
        assert result["skipped_rentals"] == [
            {"id": 7, "reason": "Оборудование с ID [10] недоступно"}
        ]

    @pytest.mark.asyncio
    async def test_rental_extended_when_interval_free(self, service_with_mocks):
        """Интервал свободен — аренда продлевается, валидатор вызван с exclude_rental_id."""
        service, holiday_repo, rental_repo, _, validator = service_with_mocks

        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        holiday_repo.check_conflicting_rentals.return_value = [7]
        holiday_repo.check_conflicting_reservations_end_date.return_value = []
        holiday_repo.find_next_working_day.return_value = next_working_day

        rental = Rental(id=7, user_id=1, start_date=date.today(),
                        end_date=holiday_date, status=OrderStatus.ACTIVE)
        eq = Mock()
        eq.id = 10
        rental.equipment = [eq]
        rental_repo.get_by_id_with_details = AsyncMock(return_value=rental)
        rental_repo.update_rental_end_date = AsyncMock(return_value=True)

        result = await service._auto_extend_orders_on_holiday_creation(holiday_date)

        validator.validate_equipment_availability.assert_awaited_once_with(
            [10], rental.start_date, next_working_day, exclude_rental_id=7
        )
        rental_repo.update_rental_end_date.assert_awaited_once_with(7, next_working_day)
        assert result["extended_rentals"][0]["id"] == 7

    @pytest.mark.asyncio
    async def test_reservation_skipped_without_validator(self, service_with_mocks):
        """Валидатор не настроен — продление запрещено вслепую (fail-closed)."""
        service, holiday_repo, rental_repo, reservation_repo, validator = service_with_mocks
        service._order_validator = None

        holiday_date = date.today() + timedelta(days=3)
        holiday_repo.check_conflicting_rentals.return_value = []
        holiday_repo.check_conflicting_reservations_end_date.return_value = [5]
        holiday_repo.find_next_working_day.return_value = holiday_date + timedelta(days=1)
        reservation_repo.update_reservation_end_date = AsyncMock(return_value=True)

        result = await service._auto_extend_orders_on_holiday_creation(holiday_date)

        reservation_repo.update_reservation_end_date.assert_not_called()
        assert result["skipped_reservations"][0]["id"] == 5
