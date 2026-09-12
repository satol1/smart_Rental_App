#! /usr/bin/env python3
# api/services/order/rental_return_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from datetime import date
from decimal import Decimal
import logging

from api.models.user import User
from api.models.rental import Rental, RentalEquipment
from api.models.payment import Payment
from api.repositories.rental_repository import RentalRepository
from api.services.order.order_validator import OrderValidator
from api.services.order.rental_notification_helper import RentalNotificationHelper
from api.services.balance_service import BalanceService
from api.services.financial_service import FinancialService, to_decimal
from api.services.cache_service import invalidate_dashboard_summary
from api.services.post_commit import schedule_after_commit
from shared.constants.balance_operations import BalanceOperationType
from shared.constants.order_status import OrderStatus
from shared.constants.deposit_status import DepositStatus
from shared.schemas.rental_schema import RentalReturnRequest
from fastapi import HTTPException

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
        """Возвращает аренду (полностью или частично)."""
        try:
            async with self.db.begin_nested():
                # Получаем и валидируем аренду
                rental = await self.rental_repo.get_rental_by_id_or_fail(rental_id)
                self.validator.validate_rental_is_returnable(rental)
                self.validator.validate_return_date(rental, request.actual_return_date)

                # Обеспечиваем инициализацию rental_items для обратной совместимости
                if not rental.rental_items and rental.equipment:
                    rental.rental_items = [
                        RentalEquipment(
                            rental_id=rental.id,
                            equipment_id=eq.id,
                            status="rented",
                            daily_rate=getattr(eq, 'daily_rate', None)
                        )
                        for eq in rental.equipment
                    ]
                    self.db.add_all(rental.rental_items)
                    await self.db.flush()

                active_items = [item for item in rental.rental_items if item.status != "returned"]
                active_eq_ids = {item.equipment_id for item in active_items}

                # Определяем возвращаемые позиции
                if request.equipment_ids is not None and len(request.equipment_ids) > 0:
                    requested_eq_ids = set(request.equipment_ids)
                else:
                    requested_eq_ids = active_eq_ids

                # Проверяем, что все запрошенные позиции действительно в аренде
                if not requested_eq_ids.issubset(active_eq_ids):
                    unknown = requested_eq_ids - active_eq_ids
                    raise HTTPException(
                        status_code=400,
                        detail=f"Позиции с ID {list(unknown)} не найдены среди активных позиций этой аренды."
                    )

                is_full_return = (requested_eq_ids == active_eq_ids)

                if is_full_return:
                    # Валидируем аксессуары для полного возврата
                    self.validator.validate_accessories_returned(
                        rental, request.accessories_returned_confirmation
                    )

                    # Рассчитываем дополнительные платежи/возвраты для возвращаемых позиций
                    credit_amount, surcharge_amount = await self._calculate_return_adjustments(
                        rental, request.actual_return_date, equipment_ids=list(requested_eq_ids)
                    )

                    # Добавляем компенсацию за утерянные аксессуары (если есть)
                    lost_cost = to_decimal(request.lost_accessories_cost or 0)
                    if lost_cost > 0:
                        surcharge_amount += lost_cost
                        lost_note = f"Утерянные аксессуары (ID: {request.lost_accessory_ids or []}): компенсация {lost_cost}"
                        request.notes_on_return = f"{request.notes_on_return} | {lost_note}" if request.notes_on_return else lost_note

                    # Помечаем все активные позиции как возвращенные
                    for item in active_items:
                        item.status = "returned"
                        item.actual_return_date = request.actual_return_date
                    
                    # Создаем транзакции баланса при необходимости
                    await self._create_return_balance_transactions(
                        rental, credit_amount, surcharge_amount
                    )

                    # Проверяем пользователя
                    user = getattr(rental, 'user', None)
                    if user is None:
                        try:
                            user = await self.db.get(User, rental.user_id)
                        except Exception:
                            user = None

                    # Атомарно проводим платеж при возврате (если указан)
                    await self._process_return_payment(rental, request, user)

                    user_balance = getattr(user, 'balance', 0)
                    try:
                        has_debt = bool(user_balance is not None and to_decimal(user_balance) < 0)
                    except (TypeError, ValueError):
                        has_debt = False

                    # Обработка жизненного цикла залога
                    deposit_status = None
                    deposit_refunded_amount = Decimal("0.00")
                    deposit_retained_amount = Decimal("0.00")
                    deposit_notes = request.deposit_notes

                    deposit_amount_dec = to_decimal(rental.deposit_amount)
                    if deposit_amount_dec > 0:
                        deposit_action = request.deposit_action
                        if deposit_action in (DepositStatus.REFUNDED.value, "refund"):
                            deposit_status = DepositStatus.REFUNDED.value
                            deposit_refunded_amount = deposit_amount_dec
                            deposit_retained_amount = Decimal("0.00")
                        elif deposit_action in (DepositStatus.RETAINED_FOR_DAMAGE.value, "retain"):
                            deposit_status = DepositStatus.RETAINED_FOR_DAMAGE.value
                            deposit_retained_amount = deposit_amount_dec
                            deposit_refunded_amount = Decimal("0.00")
                        elif deposit_action in (DepositStatus.PARTIALLY_RETAINED.value, "partial_retain"):
                            retained = to_decimal(request.deposit_retained_amount or 0)
                            if retained > deposit_amount_dec:
                                raise HTTPException(
                                    status_code=400,
                                    detail=f"Сумма удержания залога ({retained}) не может превышать сумму залога ({deposit_amount_dec})."
                                )
                            deposit_status = DepositStatus.PARTIALLY_RETAINED.value
                            deposit_retained_amount = retained
                            deposit_refunded_amount = max(Decimal("0.00"), deposit_amount_dec - retained)
                        elif deposit_action in (DepositStatus.HELD.value, "held"):
                            deposit_status = DepositStatus.HELD.value
                        else:
                            deposit_status = DepositStatus.REFUNDED.value
                            deposit_refunded_amount = deposit_amount_dec
                            deposit_retained_amount = Decimal("0.00")

                    # Завершаем возврат аренды
                    self.rental_repo.finalize_rental_return(
                        rental,
                        request.actual_return_date,
                        request.notes_on_return,
                        credit_amount,
                        surcharge_amount,
                        has_debt=has_debt,
                        deposit_status=deposit_status,
                        deposit_refunded_amount=deposit_refunded_amount,
                        deposit_retained_amount=deposit_retained_amount,
                        deposit_notes=deposit_notes
                    )
                    await self.rental_repo.save_rental(rental)
                else:
                    # ЧАСТИЧНЫЙ ВОЗВРАТ:
                    # Проверяем возврат аксессуаров только для сдаваемого оборудования
                    if rental.accessory_links:
                        returning_accessories = [
                            link for link in rental.accessory_links
                            if link.equipment_id in requested_eq_ids
                        ]
                        if returning_accessories and not request.accessories_returned_confirmation:
                            raise HTTPException(
                                status_code=400,
                                detail="Подтвердите возврат аксессуаров для сдаваемого оборудования."
                            )

                    # Помечаем сдаваемые позиции как возвращенные
                    for item in active_items:
                        if item.equipment_id in requested_eq_ids:
                            item.status = "returned"
                            item.actual_return_date = request.actual_return_date

                    # Рассчитываем финансовую корректировку за частичный возврат
                    total_cost_dec = to_decimal(rental.total_cost)
                    discount_dec = to_decimal(rental.discount_amount)
                    effective_discount_ratio = Decimal("0")
                    if (total_cost_dec + discount_dec) > 0:
                        effective_discount_ratio = discount_dec / (total_cost_dec + discount_dec)

                    if request.actual_return_date < rental.end_date:
                        # Досрочный частичный возврат
                        planned_days = await self.financial_service.get_rental_days(
                            rental.start_date, rental.end_date
                        )
                        calculated_credit = await self.financial_service.calculate_early_return_credit(
                            rental, request.actual_return_date, planned_days, equipment_ids=list(requested_eq_ids)
                        )
                        partial_credit = to_decimal(calculated_credit)
                        # Fallback если calculate_final_price не вернул кредит (например, в мок-тестах)
                        if partial_credit <= Decimal("0"):
                            unused_days = await self.financial_service.get_rental_days(
                                request.actual_return_date, rental.end_date
                            )
                            for item in active_items:
                                if item.equipment_id in requested_eq_ids:
                                    base_rate = to_decimal(item.daily_rate) if item.daily_rate is not None else to_decimal(getattr(item.equipment, 'daily_rate', 0))
                                    effective_rate = base_rate * (Decimal("1") - effective_discount_ratio)
                                    partial_credit += effective_rate * Decimal(unused_days)

                        partial_credit = min(partial_credit, total_cost_dec)
                        if partial_credit > 0:
                            await self.balance_service.add_transaction(
                                user_id=rental.user_id,
                                amount=partial_credit,
                                operation_type=BalanceOperationType.PARTIAL_RETURN_CREDIT,
                                description=f"Возврат за досрочную сдачу позиций {list(requested_eq_ids)} по аренде #{rental.id}",
                                rental_id=rental.id
                            )
                            rental.total_cost = max(Decimal("0.00"), total_cost_dec - partial_credit)
                    elif request.actual_return_date > rental.end_date:
                        # Просроченный частичный возврат
                        calculated_surcharge = await self.financial_service.calculate_overdue_surcharge(
                            rental, request.actual_return_date, equipment_ids=list(requested_eq_ids)
                        )
                        partial_surcharge = to_decimal(calculated_surcharge)
                        if partial_surcharge <= Decimal("0"):
                            overdue_days = (request.actual_return_date - rental.end_date).days
                            for item in active_items:
                                if item.equipment_id in requested_eq_ids:
                                    base_rate = to_decimal(item.daily_rate) if item.daily_rate is not None else to_decimal(getattr(item.equipment, 'daily_rate', 0))
                                    partial_surcharge += base_rate * Decimal(overdue_days)

                        if partial_surcharge > 0:
                            await self.balance_service.add_transaction(
                                user_id=rental.user_id,
                                amount=-partial_surcharge,
                                operation_type=BalanceOperationType.OVERDUE_SURCHARGE_DEBIT,
                                description=f"Штраф за просрочку сдачи позиций {list(requested_eq_ids)} по аренде #{rental.id}",
                                rental_id=rental.id
                            )
                            rental.total_cost = total_cost_dec + partial_surcharge

                    # Добавляем списание за утерю аксессуаров при частичном возврате
                    lost_cost = to_decimal(request.lost_accessories_cost or 0)
                    if lost_cost > 0:
                        await self.balance_service.add_transaction(
                            user_id=rental.user_id,
                            amount=-lost_cost,
                            operation_type=BalanceOperationType.OVERDUE_SURCHARGE_DEBIT,
                            description=f"Списание за утерю аксессуаров по аренде #{rental.id}",
                            rental_id=rental.id
                        )
                        lost_note = f"Утерянные аксессуары (ID: {request.lost_accessory_ids or []}): компенсация {lost_cost}"
                        request.notes_on_return = f"{request.notes_on_return} | {lost_note}" if request.notes_on_return else lost_note

                    deposit_amount_dec = to_decimal(rental.deposit_amount)
                    if deposit_amount_dec > 0 and request.deposit_action:
                        if request.deposit_action in (DepositStatus.PARTIALLY_RETAINED.value, "partial_retain"):
                            retained = to_decimal(request.deposit_retained_amount or 0)
                            if retained > deposit_amount_dec:
                                raise HTTPException(
                                    status_code=400,
                                    detail=f"Сумма удержания залога ({retained}) не может превышать сумму залога ({deposit_amount_dec})."
                                )
                            rental.deposit_status = DepositStatus.PARTIALLY_RETAINED.value
                            rental.deposit_retained_amount = retained
                            rental.deposit_refunded_amount = max(Decimal("0.00"), deposit_amount_dec - retained)
                        elif request.deposit_action in (DepositStatus.RETAINED_FOR_DAMAGE.value, "retain"):
                            rental.deposit_status = DepositStatus.RETAINED_FOR_DAMAGE.value
                            rental.deposit_retained_amount = deposit_amount_dec
                            rental.deposit_refunded_amount = Decimal("0.00")
                        elif request.deposit_action in (DepositStatus.REFUNDED.value, "refund"):
                            rental.deposit_status = DepositStatus.REFUNDED.value
                            rental.deposit_refunded_amount = deposit_amount_dec
                            rental.deposit_retained_amount = Decimal("0.00")
                        if request.deposit_notes:
                            rental.deposit_notes = request.deposit_notes

                    note_entry = f"[{request.actual_return_date}] Частичный возврат (позиции: {list(requested_eq_ids)}): {request.notes_on_return or 'без заметок'}"
                    rental.notes_on_return = f"{rental.notes_on_return}\n{note_entry}".strip() if rental.notes_on_return else note_entry

                    # Атомарно проводим платеж при частичном возврате (если указан)
                    user = getattr(rental, 'user', None)
                    if user is None:
                        try:
                            user = await self.db.get(User, rental.user_id)
                        except Exception:
                            user = None
                    await self._process_return_payment(rental, request, user)

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

    async def _process_return_payment(
        self, rental: Rental, request: RentalReturnRequest, user: Optional[User]
    ) -> None:
        """Обрабатывает платеж, вносимый одновременно с возвратом аренды."""
        payment_dec = to_decimal(request.payment_amount or 0)
        if payment_dec <= Decimal("0"):
            return

        current_balance = getattr(user, 'balance', Decimal("0")) if user else Decimal("0")
        is_debt_payment = bool(current_balance is not None and to_decimal(current_balance) < 0)
        operation_type = (
            BalanceOperationType.DEBT_REPAYMENT
            if is_debt_payment
            else BalanceOperationType.BALANCE_TOP_UP
        )
        desc = request.payment_description or f"Платеж при возврате аренды #{rental.id}"

        # 1. Зачисление на баланс клиента
        await self.balance_service.add_transaction(
            user_id=rental.user_id,
            amount=payment_dec,
            operation_type=operation_type,
            description=desc,
            rental_id=rental.id,
        )

        # 2. Фиксация в таблице платежей
        payment_rec = Payment(
            user_id=rental.user_id,
            rental_id=rental.id,
            amount=payment_dec,
            payment_method=request.payment_method or "cash",
            transaction_type="debt_repayment" if is_debt_payment else "rental_payment",
            description=desc,
        )
        self.db.add(payment_rec)
        await self.db.flush()
    
    async def _calculate_return_adjustments(
        self, rental: Rental, actual_return_date: date, equipment_ids: Optional[List[int]] = None
    ) -> tuple[Decimal, Decimal]:
        """Рассчитывает дополнительные платежи или возвраты при возврате аренды."""
        credit_amount = Decimal("0")
        surcharge_amount = Decimal("0")

        if actual_return_date > rental.end_date:
            # Просрочка - рассчитываем штраф
            surcharge_amount = await self.financial_service.calculate_overdue_surcharge(
                rental, actual_return_date, equipment_ids=equipment_ids
            )
        else:
            # Досрочный возврат - рассчитываем возврат
            planned_days = await self.financial_service.get_rental_days(
                rental.start_date, rental.end_date
            )
            credit_amount = await self.financial_service.calculate_early_return_credit(
                rental, actual_return_date, planned_days, equipment_ids=equipment_ids
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
