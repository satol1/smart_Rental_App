#! /usr/bin/env python3
# api/services/order/rental_notification_helper.py

import logging
from typing import Optional
from api.models.user import User
from api.models.rental import Rental
from api.models.reservation import Reservation

logger = logging.getLogger(__name__)


class RentalNotificationHelper:
    """Вспомогательный класс для уведомлений о событиях аренды."""
    
    @staticmethod
    def log_rental_created(rental: Rental, manager: User, user: User) -> None:
        """Логирует создание аренды."""
        logger.info(
            f"Manager {manager.id} created rental #{rental.id} for user {user.id} "
            f"(start: {rental.start_date}, end: {rental.end_date}, cost: {rental.total_cost})"
        )
    
    @staticmethod
    def log_rental_converted_from_reservation(rental: Rental, reservation: Reservation, manager: User) -> None:
        """Логирует конвертацию резерва в аренду."""
        logger.info(
            f"Manager {manager.id} converted reservation #{reservation.id} to rental #{rental.id} "
            f"(start: {rental.start_date}, end: {rental.end_date}, cost: {rental.total_cost})"
        )
    
    @staticmethod
    def log_rental_returned(rental: Rental, manager: User, actual_return_date: str) -> None:
        """Логирует возврат аренды."""
        logger.info(
            f"Manager {manager.id} processed return for rental #{rental.id} "
            f"(actual return: {actual_return_date}, status: {rental.status})"
        )
    
    @staticmethod
    def log_rental_updated(rental: Rental, manager: User, updated_fields: list) -> None:
        """Логирует обновление аренды."""
        logger.info(
            f"Manager {manager.id} updated rental #{rental.id} "
            f"(updated fields: {', '.join(updated_fields)})"
        )
    
    @staticmethod
    def log_rental_reverted(rental_id: int, reservation: Reservation, manager: User) -> None:
        """Логирует отмену аренды."""
        logger.info(
            f"Manager {manager.id} reverted rental #{rental_id} to reservation #{reservation.id}"
        )
    
    @staticmethod
    def log_rental_deleted(rental_id: int, manager: Optional[User] = None) -> None:
        """Логирует удаление аренды."""
        if manager:
            logger.warning(f"Manager {manager.id} deleted rental #{rental_id}")
        else:
            logger.warning(f"Admin deleted rental #{rental_id}")
    
    @staticmethod
    def log_rental_error(operation: str, rental_id: int, error: Exception, manager: Optional[User] = None) -> None:
        """Логирует ошибку при операции с арендой."""
        manager_info = f" by manager {manager.id}" if manager else ""
        logger.error(
            f"Ошибка при {operation} аренды #{rental_id}{manager_info}: {error}",
            exc_info=True,
        )
