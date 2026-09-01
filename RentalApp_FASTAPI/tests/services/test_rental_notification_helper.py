# tests/services/test_rental_notification_helper.py
"""
Тесты для RentalNotificationHelper - вспомогательного класса для уведомлений о событиях аренды.
"""

import pytest
from unittest.mock import MagicMock, patch
import logging

from api.services.order.rental_notification_helper import RentalNotificationHelper
from api.models.rental import Rental
from api.models.reservation import Reservation
from api.models.user import User


class TestRentalNotificationHelper:
    """Тесты для RentalNotificationHelper."""

    @pytest.fixture
    def sample_user(self):
        """Создает образец пользователя."""
        user = MagicMock(spec=User)
        user.id = 1
        user.email = "user@example.com"
        return user

    @pytest.fixture
    def sample_manager(self):
        """Создает образец менеджера."""
        manager = MagicMock(spec=User)
        manager.id = 2
        manager.email = "manager@example.com"
        return manager

    @pytest.fixture
    def sample_rental(self):
        """Создает образец аренды."""
        rental = MagicMock(spec=Rental)
        rental.id = 1
        rental.start_date = "2024-01-01"
        rental.end_date = "2024-01-05"
        rental.total_cost = 1000.0
        rental.status = "active"
        return rental

    @pytest.fixture
    def sample_reservation(self):
        """Создает образец резервации."""
        reservation = MagicMock(spec=Reservation)
        reservation.id = 1
        return reservation

    # === ТЕСТЫ ДЛЯ log_rental_created ===

    def test_log_rental_created(self, sample_rental, sample_manager, sample_user):
        """Тест логирования создания аренды."""
        with patch('api.services.order.rental_notification_helper.logger') as mock_logger:
            RentalNotificationHelper.log_rental_created(sample_rental, sample_manager, sample_user)
            
            mock_logger.info.assert_called_once()
            call_args = mock_logger.info.call_args[0][0]
            assert str(sample_manager.id) in call_args
            assert str(sample_rental.id) in call_args
            assert str(sample_user.id) in call_args
            assert str(sample_rental.start_date) in call_args
            assert str(sample_rental.end_date) in call_args
            assert str(sample_rental.total_cost) in call_args

    # === ТЕСТЫ ДЛЯ log_rental_converted_from_reservation ===

    def test_log_rental_converted_from_reservation(self, sample_rental, sample_reservation, sample_manager):
        """Тест логирования конвертации резерва в аренду."""
        with patch('api.services.order.rental_notification_helper.logger') as mock_logger:
            RentalNotificationHelper.log_rental_converted_from_reservation(
                sample_rental, sample_reservation, sample_manager
            )
            
            mock_logger.info.assert_called_once()
            call_args = mock_logger.info.call_args[0][0]
            assert str(sample_manager.id) in call_args
            assert str(sample_reservation.id) in call_args
            assert str(sample_rental.id) in call_args

    # === ТЕСТЫ ДЛЯ log_rental_returned ===

    def test_log_rental_returned(self, sample_rental, sample_manager):
        """Тест логирования возврата аренды."""
        actual_return_date = "2024-01-06"
        
        with patch('api.services.order.rental_notification_helper.logger') as mock_logger:
            RentalNotificationHelper.log_rental_returned(sample_rental, sample_manager, actual_return_date)
            
            mock_logger.info.assert_called_once()
            call_args = mock_logger.info.call_args[0][0]
            assert str(sample_manager.id) in call_args
            assert str(sample_rental.id) in call_args
            assert actual_return_date in call_args
            assert sample_rental.status in call_args

    # === ТЕСТЫ ДЛЯ log_rental_updated ===

    def test_log_rental_updated(self, sample_rental, sample_manager):
        """Тест логирования обновления аренды."""
        updated_fields = ["start_date", "end_date", "total_cost"]
        
        with patch('api.services.order.rental_notification_helper.logger') as mock_logger:
            RentalNotificationHelper.log_rental_updated(sample_rental, sample_manager, updated_fields)
            
            mock_logger.info.assert_called_once()
            call_args = mock_logger.info.call_args[0][0]
            assert str(sample_manager.id) in call_args
            assert str(sample_rental.id) in call_args
            assert "start_date" in call_args
            assert "end_date" in call_args
            assert "total_cost" in call_args

    # === ТЕСТЫ ДЛЯ log_rental_reverted ===

    def test_log_rental_reverted(self, sample_reservation, sample_manager):
        """Тест логирования отмены аренды."""
        rental_id = 1
        
        with patch('api.services.order.rental_notification_helper.logger') as mock_logger:
            RentalNotificationHelper.log_rental_reverted(rental_id, sample_reservation, sample_manager)
            
            mock_logger.info.assert_called_once()
            call_args = mock_logger.info.call_args[0][0]
            assert str(sample_manager.id) in call_args
            assert str(rental_id) in call_args
            assert str(sample_reservation.id) in call_args

    # === ТЕСТЫ ДЛЯ log_rental_deleted ===

    def test_log_rental_deleted_with_manager(self, sample_manager):
        """Тест логирования удаления аренды с менеджером."""
        rental_id = 1
        
        with patch('api.services.order.rental_notification_helper.logger') as mock_logger:
            RentalNotificationHelper.log_rental_deleted(rental_id, sample_manager)
            
            mock_logger.warning.assert_called_once()
            call_args = mock_logger.warning.call_args[0][0]
            assert str(sample_manager.id) in call_args
            assert str(rental_id) in call_args

    def test_log_rental_deleted_without_manager(self):
        """Тест логирования удаления аренды без менеджера."""
        rental_id = 1
        
        with patch('api.services.order.rental_notification_helper.logger') as mock_logger:
            RentalNotificationHelper.log_rental_deleted(rental_id, None)
            
            mock_logger.warning.assert_called_once()
            call_args = mock_logger.warning.call_args[0][0]
            assert "Admin" in call_args
            assert str(rental_id) in call_args

    # === ТЕСТЫ ДЛЯ log_rental_error ===

    def test_log_rental_error_with_manager(self, sample_manager):
        """Тест логирования ошибки при операции с арендой с менеджером."""
        rental_id = 1
        operation = "update"
        error = Exception("Test error")
        
        with patch('api.services.order.rental_notification_helper.logger') as mock_logger:
            RentalNotificationHelper.log_rental_error(operation, rental_id, error, sample_manager)
            
            mock_logger.error.assert_called_once()
            call_args = mock_logger.error.call_args[0][0]
            assert operation in call_args
            assert str(rental_id) in call_args
            assert str(sample_manager.id) in call_args
            # Проверяем, что exc_info=True передан
            assert mock_logger.error.call_args[1].get("exc_info") is True

    def test_log_rental_error_without_manager(self):
        """Тест логирования ошибки при операции с арендой без менеджера."""
        rental_id = 1
        operation = "delete"
        error = Exception("Test error")
        
        with patch('api.services.order.rental_notification_helper.logger') as mock_logger:
            RentalNotificationHelper.log_rental_error(operation, rental_id, error, None)
            
            mock_logger.error.assert_called_once()
            call_args = mock_logger.error.call_args[0][0]
            assert operation in call_args
            assert str(rental_id) in call_args



