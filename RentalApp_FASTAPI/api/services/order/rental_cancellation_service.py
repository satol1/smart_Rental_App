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
from api.services.order.system_repository import SystemService
from api.services.promo_code import PromoCodeBusinessLogic
from api.services.cache_service import invalidate_dashboard_summary
from api.services.post_commit import schedule_after_commit
from fastapi import HTTPException, status
from shared.constants.balance_operations import BalanceOperationType
from shared.constants.order_status import OrderStatus
from shared.schemas.rental_schema import RentalRevertRequest

logger = logging.getLogger(__name__)


class RentalCancellationService:
    """Сервис для отмены и удаления аренд."""

    def __init__(self,
                 db: AsyncSession,
                 rental_repo: RentalRepository,
                 validator: OrderValidator,
                 balance_service: BalanceService,
                 system_service: SystemService,
                 promo_code_logic: PromoCodeBusinessLogic):
        self.db = db
        self.rental_repo = rental_repo
        self.validator = validator
        self.balance_service = balance_service
        self.system_service = system_service
        self.promo_code_logic = promo_code_logic
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

                # Промокод аренды, отличающийся от промокода резерва, был записан
                # отдельно (смена промокода на аренде) — освобождаем именно его.
                # Совпадающий с резервом промокод принадлежит резерву и остаётся.
                await self._release_rental_specific_promo_usage(rental, reservation)

                # Удаляем аренду
                await self.rental_repo.delete_rental(rental)

            # Логируем успешную отмену
            self.notification_helper.log_rental_reverted(rental_id, reservation, manager)
            schedule_after_commit(self.db, invalidate_dashboard_summary)
        except Exception as e:
            self.notification_helper.log_rental_error("отмене аренды", rental_id, e, manager)
            raise

    async def delete_rental_by_admin(self, rental_id: int):
        """Удаляет аренду администратором."""
        try:
            async with self.db.begin_nested():
                rental = await self.rental_repo.get_rental_by_id_or_fail(rental_id)

                # Аренда из резерва: DELETE не компенсирует списанные средства и
                # оставляет резерв «мертвым» (fulfilled без аренды) — только revert,
                # который возвращает деньги и восстанавливает статус резерва
                if rental.reservation_id is not None:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Аренда #{rental.id} создана из резерва #{rental.reservation_id}. "
                            "Используйте отмену выдачи (revert), чтобы вернуть средства "
                            "и восстановить резерв."
                        ),
                    )

                # Обрабатываем удаление в зависимости от типа аренды
                await self._handle_scratch_rental_deletion(rental)

                # Удаляем аренду
                await self.rental_repo.delete_rental(rental)

            # Логируем успешное удаление
            self.notification_helper.log_rental_deleted(rental_id)
            schedule_after_commit(self.db, invalidate_dashboard_summary)
        except Exception as e:
            self.notification_helper.log_rental_error("удалении аренды", rental_id, e)
            raise

    # Приватные методы для отмены и удаления аренды
    
    async def _release_rental_specific_promo_usage(self, rental: Rental, reservation) -> None:
        """Освобождает использование промокода, записанное на аренду, а не на резерв.

        При смене промокода на аренде A→B использование B записывается отдельно
        (A принадлежит резерву). Revert восстанавливает резерв с промокодом A —
        если не освободить B, times_used по B остаётся навсегда завышенным.
        """
        if not rental.promo_code:
            return

        if reservation.promo_code_id:
            reservation_promo = await self.system_service.get_promo_code_by_id(
                reservation.promo_code_id
            )
            if reservation_promo and reservation_promo.code == rental.promo_code:
                return  # одно и то же использование — принадлежит резерву

        rental_promo = await self.system_service.get_promo_code_by_name(rental.promo_code)
        if rental_promo:
            await self.promo_code_logic.release_promo_code_usage(
                rental_promo.id, rental.user_id
            )

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

        # Завершённая аренда уже имеет пересчёт (final_cost, кредит/штраф):
        # удаление «вернуло» бы total_cost поверх этих транзакций — деньги задвоились
        if rental.status == OrderStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Аренда #{rental.id} уже завершена — удаление невозможно "
                    "(пересчёт финальной стоимости уже проведён)."
                ),
            )

        # Окно удаления — тот же календарный день создания (UTC), что и у отмены
        # выдачи (revert): раньше правила расходились (24 часа против дня)
        if rental.created_at.date() != datetime.now(timezone.utc).date():
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

        # Освобождаем лимит использованного промокода
        if rental.promo_code:
            promo_obj = await self.system_service.get_promo_code_by_name(rental.promo_code)
            if promo_obj:
                await self.promo_code_logic.release_promo_code_usage(promo_obj.id, rental.user_id)
