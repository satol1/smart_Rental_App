#! /usr/bin/env python3
# api/services/order/rental_return_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from datetime import date
from decimal import Decimal
import logging

from api.models.user import User
from api.models.rental import Rental
from api.repositories.rental_repository import RentalRepository
from api.services.order.order_validator import OrderValidator
from api.services.order.rental_notification_helper import RentalNotificationHelper
from api.services.balance_service import BalanceService
from api.services.financial_service import FinancialService
from api.services.cache_service import invalidate_dashboard_summary
from api.services.post_commit import schedule_after_commit
from shared.constants.balance_operations import BalanceOperationType
from shared.schemas.rental_schema import RentalReturnRequest

logger = logging.getLogger(__name__)


class RentalReturnService:
    """Сервис для возврата аренд."""

    def __init__(self, 
                 db: AsyncSession, 
                 rental_repo: RentalRepository,
                 validator: OrderValidator,
                 balance_service: BalanceService,
                 financial_service: FinancialService,
                 user_status_service: Optional['UserStatusService'] = None):
        self.db = db
        self.rental_repo = rental_repo
        self.validator = validator
        self.balance_service = balance_service
        self.financial_service = financial_service
        self.user_status_service = user_status_service
        self.notification_helper = RentalNotificationHelper()

    async def return_rental(
        self, rental_id: int, request: RentalReturnRequest, manager: User
    ) -> Rental:
        """Возвращает аренду."""
        try:
            async with self.db.begin_nested():
                # Получаем и валидируем аренду
                rental = await self.rental_repo.get_rental_by_id_or_fail(rental_id)
                self.validator.validate_rental_is_returnable(rental)
                self.validator.validate_accessories_returned(
                    rental, request.accessories_returned_confirmation
                )
                # Дата возврата — в границах [начало аренды; сегодня]: без этого
                # дата раньше начала даёт кредит больше списанного, будущая —
                # завышенный штраф
                self.validator.validate_return_date(rental, request.actual_return_date)

                # Рассчитываем дополнительные платежи/возвраты
                credit_amount, surcharge_amount = await self._calculate_return_adjustments(
                    rental, request.actual_return_date
                )
                
                # Создаем транзакции баланса при необходимости
                await self._create_return_balance_transactions(
                    rental, credit_amount, surcharge_amount
                )

                # Завершаем возврат аренды
                self.rental_repo.finalize_rental_return(
                    rental,
                    request.actual_return_date,
                    request.notes_on_return,
                    credit_amount,
                    surcharge_amount,
                )
                await self.rental_repo.save_rental(rental)

            # Получаем аренду с предзагруженными связями
            rental_with_details = await self.rental_repo.get_rental_by_id_or_fail(rental.id)
            
            # Автоматически обновляем статус пользователя на основе количества успешных аренд
            if self.user_status_service:
                try:
                    # Инвалидируем кэш перед обновлением статуса
                    self.user_status_service.invalidate_cache(rental.user_id)
                    await self.user_status_service.update_user_status_by_rentals(rental.user_id)
                    logger.info(f"Статус пользователя {rental.user_id} обновлен после возврата аренды {rental.id}")
                except Exception as e:
                    # Не блокируем возврат аренды, если обновление статуса не удалось
                    logger.error(f"Ошибка при обновлении статуса пользователя {rental.user_id}: {e}", exc_info=True)
            
            # Логируем успешный возврат
            self.notification_helper.log_rental_returned(rental, manager, request.actual_return_date)
            schedule_after_commit(self.db, invalidate_dashboard_summary)

            return rental_with_details
        except Exception as e:
            self.notification_helper.log_rental_error("возврате аренды", rental_id, e, manager)
            raise

    # Приватные методы для возврата аренды
    
    async def _calculate_return_adjustments(
        self, rental: Rental, actual_return_date: date
    ) -> tuple[Decimal, Decimal]:
        """Рассчитывает дополнительные платежи или возвраты при возврате аренды."""
        credit_amount = Decimal("0")
        surcharge_amount = Decimal("0")

        if actual_return_date > rental.end_date:
            # Просрочка - рассчитываем штраф
            surcharge_amount = await self.financial_service.calculate_overdue_surcharge(
                rental, actual_return_date
            )
        else:
            # Досрочный возврат - рассчитываем возврат
            planned_days = await self.financial_service.get_rental_days(
                rental.start_date, rental.end_date
            )
            credit_amount = await self.financial_service.calculate_early_return_credit(
                rental, actual_return_date, planned_days
            )
        
        return credit_amount, surcharge_amount
    
    async def _create_return_balance_transactions(
        self, rental: Rental, credit_amount: Decimal, surcharge_amount: Decimal
    ) -> None:
        """Создает транзакции баланса при возврате аренды."""
        if surcharge_amount > 0:
            await self.balance_service.add_transaction(
                user_id=rental.user_id,
                amount=-surcharge_amount,
                operation_type=BalanceOperationType.OVERDUE_SURCHARGE_DEBIT,
                description=f"Списание за просрочку аренды #{rental.id}",
                rental_id=rental.id,
            )
        elif credit_amount > 0:
            await self.balance_service.add_transaction(
                user_id=rental.user_id,
                amount=credit_amount,
                operation_type=BalanceOperationType.EARLY_RETURN_CREDIT,
                description=f"Возврат за досрочное завершение аренды #{rental.id}",
                rental_id=rental.id,
            )
