# tests/services/test_notification_service.py
"""
Тесты для NotificationService.
"""

import pytest
from unittest.mock import AsyncMock, Mock
from datetime import date, timedelta
from typing import List

from api.services.notification_service import NotificationService
from api.models.user import User
from api.models.rental import Rental
from api.models.reservation import Reservation
from shared.constants.order_status import OrderStatus


class TestNotificationService:
    """Тесты для NotificationService"""

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        session = AsyncMock()
        return session

    @pytest.fixture
    def notification_service(self, mock_db_session):
        """Создает экземпляр NotificationService с мок-зависимостями"""
        return NotificationService(mock_db_session)

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
    async def test_notify_auto_extension_no_extensions(
        self, 
        notification_service, 
        mock_db_session
    ):
        """Тест отправки уведомлений без продлений"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        extended_rentals = []
        extended_reservations = []
        
        # Act
        await notification_service.notify_auto_extension(
            extended_rentals,
            extended_reservations,
            holiday_date,
            next_working_day
        )
        
        # Assert
        # Никаких запросов к БД не должно быть
        mock_db_session.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_notify_auto_extension_with_rentals(
        self, 
        notification_service, 
        mock_db_session,
        sample_rental
    ):
        """Тест отправки уведомлений с продленными арендами"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        extended_rentals = [
            {
                "id": 1,
                "old_end_date": holiday_date,
                "new_end_date": next_working_day
            }
        ]
        extended_reservations = []
        
        # Настраиваем моки батч-геттеров и пользователя
        notification_service.notification_repo.get_rentals_by_ids = AsyncMock(return_value=[sample_rental])
        notification_service.notification_repo.get_reservations_by_ids = AsyncMock(return_value=[])
        notification_service.notification_repo.get_user_by_id = AsyncMock(
            return_value=User(id=sample_rental.user_id, email="u@t.ru", full_name="U")
        )
        
        # Act
        await notification_service.notify_auto_extension(
            extended_rentals,
            extended_reservations,
            holiday_date,
            next_working_day
        )
        
        # Assert
        # Батч-геттер и пользователь запрошены
        notification_service.notification_repo.get_rentals_by_ids.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_notify_auto_extension_with_reservations(
        self, 
        notification_service, 
        mock_db_session,
        sample_reservation
    ):
        """Тест отправки уведомлений с продленными резервами"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        extended_rentals = []
        extended_reservations = [
            {
                "id": 1,
                "old_end_date": holiday_date,
                "new_end_date": next_working_day
            }
        ]
        
        # Настраиваем моки батч-геттеров и пользователя
        notification_service.notification_repo.get_rentals_by_ids = AsyncMock(return_value=[])
        notification_service.notification_repo.get_reservations_by_ids = AsyncMock(return_value=[sample_reservation])
        notification_service.notification_repo.get_user_by_id = AsyncMock(
            return_value=User(id=sample_reservation.user_id, email="u@t.ru", full_name="U")
        )
        
        # Act
        await notification_service.notify_auto_extension(
            extended_rentals,
            extended_reservations,
            holiday_date,
            next_working_day
        )
        
        # Assert
        # Батч-геттер и пользователь запрошены
        notification_service.notification_repo.get_reservations_by_ids.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_notify_auto_extension_mixed_extensions(
        self, 
        notification_service, 
        mock_db_session,
        sample_rental,
        sample_reservation
    ):
        """Тест отправки уведомлений со смешанными продлениями"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        extended_rentals = [
            {
                "id": 1,
                "old_end_date": holiday_date,
                "new_end_date": next_working_day
            }
        ]
        extended_reservations = [
            {
                "id": 2,
                "old_end_date": holiday_date,
                "new_end_date": next_working_day
            }
        ]
        
        # Настраиваем моки батч-геттеров и пользователя
        notification_service.notification_repo.get_rentals_by_ids = AsyncMock(return_value=[sample_rental])
        notification_service.notification_repo.get_reservations_by_ids = AsyncMock(return_value=[sample_reservation])
        notification_service.notification_repo.get_user_by_id = AsyncMock(
            return_value=User(id=sample_rental.user_id, email="u@t.ru", full_name="U")
        )
        
        # Act
        await notification_service.notify_auto_extension(
            extended_rentals,
            extended_reservations,
            holiday_date,
            next_working_day
        )
        
        # Assert
        # Проверяем, что были запросы для получения всех объектов
        notification_service.notification_repo.get_rentals_by_ids.assert_awaited_once()
        notification_service.notification_repo.get_reservations_by_ids.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_notify_auto_extension_rental_not_found(
        self, 
        notification_service, 
        mock_db_session
    ):
        """Тест обработки случая, когда аренда не найдена"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        extended_rentals = [
            {
                "id": 999,  # Несуществующий ID
                "old_end_date": holiday_date,
                "new_end_date": next_working_day
            }
        ]
        extended_reservations = []
        
        # Настраиваем моки: батч-геттер вернул пусто — аренда не найдена
        notification_service.notification_repo.get_rentals_by_ids = AsyncMock(return_value=[])
        notification_service.notification_repo.get_reservations_by_ids = AsyncMock(return_value=[])
        notification_service.notification_repo.get_user_by_id = AsyncMock()
        
        # Act
        await notification_service.notify_auto_extension(
            extended_rentals,
            extended_reservations,
            holiday_date,
            next_working_day
        )
        
        # Assert
        # Аренды нет → пользователей для уведомления нет
        notification_service.notification_repo.get_rentals_by_ids.assert_awaited_once()
        notification_service.notification_repo.get_user_by_id.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_notify_auto_extension_user_not_found(
        self, 
        notification_service, 
        mock_db_session,
        sample_rental
    ):
        """Тест обработки случая, когда пользователь не найден"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        extended_rentals = [
            {
                "id": 1,
                "old_end_date": holiday_date,
                "new_end_date": next_working_day
            }
        ]
        extended_reservations = []
        
        # Настраиваем моки: аренда найдена, пользователь не найден
        notification_service.notification_repo.get_rentals_by_ids = AsyncMock(return_value=[sample_rental])
        notification_service.notification_repo.get_reservations_by_ids = AsyncMock(return_value=[])
        notification_service.notification_repo.get_user_by_id = AsyncMock(return_value=None)
        
        # Act
        await notification_service.notify_auto_extension(
            extended_rentals,
            extended_reservations,
            holiday_date,
            next_working_day
        )
        
        # Assert
        # Батч-геттер и пользователь запрошены
        notification_service.notification_repo.get_rentals_by_ids.assert_awaited_once()

    def test_format_auto_extension_message_rentals_only(self, notification_service):
        """Тест форматирования сообщения только с арендами"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        user_rentals = [
            {
                "id": 1,
                "old_end_date": "2024-01-15",
                "new_end_date": "2024-01-16"
            }
        ]
        user_reservations = []
        
        # Act
        message = notification_service._format_auto_extension_message(
            holiday_date,
            next_working_day,
            user_rentals,
            user_reservations
        )
        
        # Assert
        assert "Уважаемый клиент!" in message
        assert "Продленные аренды:" in message
        assert "Аренда #1: 2024-01-15 → 2024-01-16" in message
        assert "Продленные резервы:" not in message
        assert "Стоимость аренды не изменилась" in message

    def test_format_auto_extension_message_reservations_only(self, notification_service):
        """Тест форматирования сообщения только с резервами"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        user_rentals = []
        user_reservations = [
            {
                "id": 2,
                "old_end_date": "2024-01-15",
                "new_end_date": "2024-01-16"
            }
        ]
        
        # Act
        message = notification_service._format_auto_extension_message(
            holiday_date,
            next_working_day,
            user_rentals,
            user_reservations
        )
        
        # Assert
        assert "Уважаемый клиент!" in message
        assert "Продленные резервы:" in message
        assert "Резерв #2: 2024-01-15 → 2024-01-16" in message
        assert "Продленные аренды:" not in message
        assert "Стоимость аренды не изменилась" in message

    def test_format_auto_extension_message_mixed(self, notification_service):
        """Тест форматирования сообщения со смешанными продлениями"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        user_rentals = [
            {
                "id": 1,
                "old_end_date": "2024-01-15",
                "new_end_date": "2024-01-16"
            }
        ]
        user_reservations = [
            {
                "id": 2,
                "old_end_date": "2024-01-15",
                "new_end_date": "2024-01-16"
            }
        ]
        
        # Act
        message = notification_service._format_auto_extension_message(
            holiday_date,
            next_working_day,
            user_rentals,
            user_reservations
        )
        
        # Assert
        assert "Уважаемый клиент!" in message
        assert "Продленные аренды:" in message
        assert "Продленные резервы:" in message
        assert "Аренда #1: 2024-01-15 → 2024-01-16" in message
        assert "Резерв #2: 2024-01-15 → 2024-01-16" in message
        assert "Стоимость аренды не изменилась" in message

    def test_format_auto_extension_message_empty(self, notification_service):
        """Тест форматирования сообщения без продлений"""
        # Arrange
        holiday_date = date.today() + timedelta(days=3)
        next_working_day = holiday_date + timedelta(days=1)
        user_rentals = []
        user_reservations = []
        
        # Act
        message = notification_service._format_auto_extension_message(
            holiday_date,
            next_working_day,
            user_rentals,
            user_reservations
        )
        
        # Assert
        assert "Уважаемый клиент!" in message
        assert "Продленные аренды:" not in message
        assert "Продленные резервы:" not in message
        assert "Стоимость аренды не изменилась" in message
