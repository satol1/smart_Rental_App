#! /usr/bin/env python3
# api/services/order/rental_cancellation_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import logging

from api.models.user import User
from api.models.rental import Rental
from api.repositories.rental_repository import RentalRepository
from api.services.order.order_validator import OrderValidator
from api.services.order.rental_notification_helper import RentalNotificationHelper
from api.services.balance_service import BalanceService
from shared.constants.balance_operations import BalanceOperationType
from shared.schemas.rental_schema import RentalRevertRequest

logger = logging.getLogger(__name__)


class RentalCancellationService:
    """Сервис для отмены и удаления аренд."""

    def __init__(self, 
                 db: AsyncSession, 
                 rental_repo: RentalRepository,
                 validator: OrderValidator,
                 balance_service: BalanceService):
        self.db = db
        self.rental_repo = rental_repo
        self.validator = validator
        self.balance_service = balance_service
        self.notification_helper = RentalNotificationHelper()

    async def revert_rental_to_reservation(self, rental_id: int, manager: User, request: RentalRevertRequest):
        """Отменяет аренду и возвращает к резерву."""
        try:
            async with self.db.begin_nested():
                # Получаем и валидируем аренду
                rental = await self.rental_repo.get_rental_by_id_or_fail(rental_id)
                self.validator.validate_rental_for_revert(rental)
                
                # Отменяем аренду и получаем резерв
                reservation = self.rental_repo.revert_rental_status_to_active(rental)
                
                # Создаем транзакции отмены
                await self._create_revert_balance_transactions(rental, request)
                
                # Удаляем аренду
                await self.rental_repo.delete_rental(rental)

            # Логируем успешную отмену
            self.notification_helper.log_rental_reverted(rental_id, reservation, manager)
        except Exception as e:
            self.notification_helper.log_rental_error("отмене аренды", rental_id, e, manager)
            raise

    async def delete_rental_by_admin(self, rental_id: int):
        """Удаляет аренду администратором."""
        try:
            async with self.db.begin_nested():
                rental = await self.rental_repo.get_rental_by_id_or_fail(rental_id)
                
                # Обрабатываем удаление в зависимости от типа аренды
                if rental.reservation_id is None:
                    await self._handle_scratch_rental_deletion(rental)
                
                # Удаляем аренду
                await self.rental_repo.delete_rental(rental)

            # Логируем успешное удаление
            self.notification_helper.log_rental_deleted(rental_id)
        except Exception as e:
            self.notification_helper.log_rental_error("удалении аренды", rental_id, e)
            raise

    # Приватные методы для отмены и удаления аренды
    
    async def _create_revert_balance_transactions(self, rental: Rental, request: RentalRevertRequest) -> None:
        """Создает транзакции баланса при отмене аренды."""
        # Возврат основной суммы аренды
        await self.balance_service.add_transaction(
            user_id=rental.user_id,
            amount=rental.total_cost,
            operation_type=BalanceOperationType.RENTAL_REVERT_CREDIT,
            description=f"Возврат средств за отмену выдачи аренды #{rental.id}",
            rental_id=None,  # Аренда будет удалена
        )

        # Возврат аванса при необходимости
        if rental.prepayment_amount > 0 and request.refund_prepayment:
            await self.balance_service.add_transaction(
                user_id=rental.user_id,
                amount=-rental.prepayment_amount,  # Отрицательное значение для списания
                operation_type=BalanceOperationType.PREPAYMENT_REFUND_ON_REVERT,
                description=f"Возврат аванса при отмене выдачи аренды #{rental.id}",
                rental_id=None,  # Аренда будет удалена
            )
    
    async def _handle_scratch_rental_deletion(self, rental: Rental) -> None:
        """Обрабатывает удаление аренды, созданной с нуля."""
        from datetime import datetime, timezone
        from fastapi import HTTPException, status
        
        # Проверяем временные ограничения
        time_since_creation = datetime.now(timezone.utc) - rental.created_at
        if time_since_creation.total_seconds() > 24 * 3600:  # 24 часа
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Отмена возможна только в день создания аренды"
            )
        
        # Возврат основной суммы
        await self.balance_service.add_transaction(
            user_id=rental.user_id,
            amount=rental.total_cost,
            operation_type=BalanceOperationType.RENTAL_REVERT_CREDIT,
            description=f"Возврат средств за отмену аренды с нуля #{rental.id}",
            rental_id=None,  # Аренда будет удалена
        )
        
        # Возврат аванса при необходимости
        if rental.prepayment_amount > 0:
            await self.balance_service.add_transaction(
                user_id=rental.user_id,
                amount=-rental.prepayment_amount,
                operation_type=BalanceOperationType.PREPAYMENT_REFUND_ON_REVERT,
                description=f"Возврат аванса при отмене аренды с нуля #{rental.id}",
                rental_id=None,  # Аренда будет удалена
            )
