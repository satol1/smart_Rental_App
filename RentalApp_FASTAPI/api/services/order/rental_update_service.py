#! /usr/bin/env python3
# api/services/order/rental_update_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import logging

from fastapi import HTTPException, status

from api.services.financial_service import to_decimal

from api.models.user import User
from api.models.rental import Rental
from api.repositories.rental_repository import RentalRepository
from api.services.order.system_repository import SystemService
from api.services.order.order_validator import OrderValidator
from api.services.order.rental_notification_helper import RentalNotificationHelper
from api.services.balance_service import BalanceService
from api.services.financial_service import FinancialService
from api.services.promo_code import PromoCodeBusinessLogic
from api.services.cache_service import invalidate_dashboard_summary
from shared.constants.balance_operations import BalanceOperationType
from shared.constants.order_status import OrderStatus
from shared.schemas.rental_schema import AdminRentalUpdate

logger = logging.getLogger(__name__)


class RentalUpdateService:
    """Сервис для обновления аренд."""

    def __init__(self,
                 db: AsyncSession,
                 rental_repo: RentalRepository,
                 system_service: SystemService,
                 validator: OrderValidator,
                 balance_service: BalanceService,
                 financial_service: FinancialService,
                 promo_code_logic: PromoCodeBusinessLogic):
        self.db = db
        self.rental_repo = rental_repo
        self.system_service = system_service
        self.validator = validator
        self.balance_service = balance_service
        self.financial_service = financial_service
        self.promo_code_logic = promo_code_logic
        self.notification_helper = RentalNotificationHelper()

    async def update_rental_details_by_admin(
        self, rental_id: int, request: AdminRentalUpdate, manager: User
    ) -> Rental:
        """Обновляет детали аренды администратором."""
        try:
            async with self.db.begin_nested():
                rental = await self.rental_repo.get_rental_by_id_or_fail(rental_id)
                update_data = request.model_dump(exclude_unset=True)

                # Обрабатываем обновления в зависимости от статуса
                updated_fields = await self._process_rental_updates(rental, update_data)

                # Применяем оставшиеся обновления
                if update_data:
                    self.rental_repo.update_rental_instance(rental, update_data)

                await self.rental_repo.save_rental(rental)

            # Получаем аренду с предзагруженными связями
            rental_with_details = await self.rental_repo.get_rental_by_id_or_fail(rental.id)

            # Логируем успешное обновление
            self.notification_helper.log_rental_updated(rental, manager, updated_fields)
            # end_date/prepayment/final_cost влияют на метрики дашборда
            invalidate_dashboard_summary()

            return rental_with_details
        except Exception as e:
            self.notification_helper.log_rental_error("обновлении деталей аренды", rental_id, e, manager)
            raise

    # Приватные методы для обновления аренды

    async def _process_rental_updates(self, rental: Rental, update_data: Dict[str, Any]) -> List[str]:
        """Обрабатывает обновления аренды в зависимости от статуса."""
        updated_fields = []

        if rental.status in (OrderStatus.ACTIVE, OrderStatus.OVERDUE):
            updated_fields.extend(await self._process_active_rental_updates(rental, update_data))
        elif rental.status == OrderStatus.COMPLETED:
            updated_fields.extend(self._process_completed_rental_updates(update_data))

        return updated_fields

    async def _process_active_rental_updates(self, rental: Rental, update_data: Dict[str, Any]) -> List[str]:
        """Обрабатывает обновления активной аренды."""
        updated_fields = []

        # Изменение даты окончания и/или промокода пересчитывает стоимость.
        # Оба поля могут прийти в одном запросе — обрабатываем вместе,
        # а не взаимоисключающе (раньше end_date глотал promo_code через elif).
        end_date_changing = 'end_date' in update_data and update_data['end_date'] != rental.end_date
        promo_changing = 'promo_code' in update_data

        if end_date_changing or promo_changing:
            await self._apply_price_recalculation(rental, update_data)
            if end_date_changing:
                updated_fields.append('end_date')
            if promo_changing:
                updated_fields.append('promo_code')

        # Обработка изменения предоплаты
        if 'prepayment_amount' in update_data:
            await self._handle_prepayment_change(rental, update_data)
            updated_fields.append('prepayment_amount')

        # Запрещаем редактирование полей для завершенных аренд
        self._remove_forbidden_fields_for_active_rental(update_data)

        return updated_fields

    def _process_completed_rental_updates(self, update_data: Dict[str, Any]) -> List[str]:
        """Обрабатывает обновление завершенной аренды."""
        updated_fields = []

        # Для завершенных аренд разрешены: final_cost, deposit_amount, notes_on_issue, notes_on_return
        allowed_fields = ['final_cost', 'deposit_amount', 'notes_on_issue', 'notes_on_return']
        for field in allowed_fields:
            if field in update_data:
                updated_fields.append(field)

        # Запрещаем редактирование дат и состава оборудования
        forbidden_fields = ['end_date', 'prepayment_amount', 'promo_code', 'actual_return_date', 'status']
        for field in forbidden_fields:
            update_data.pop(field, None)

        return updated_fields

    async def _apply_price_recalculation(self, rental: Rental, update_data: Dict[str, Any]) -> None:
        """Пересчитывает стоимость активной аренды при изменении дат/промокода.

        - валидирует диапазон дат (новый end_date не раньше start_date);
        - при сдвиге end_date проверяет доступность оборудования в новом окне
          (advisory-лок + конфликты, исключая саму эту аренду);
        - валидирует промокод по фактической предварительной сумме
          (раньше order_amount=0 отбрасывал любой промокод с порогом);
        - фиксирует дельту стоимости транзакцией баланса;
        - при смене промокода пересчитывает лимиты использований.
        """
        target_end_date = update_data.get('end_date', rental.end_date)
        if target_end_date < rental.start_date:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Дата окончания аренды не может быть раньше даты начала.",
            )

        equipment_ids = self.rental_repo.get_rental_equipment_ids(rental)
        selected_accessories = self.rental_repo.get_rental_accessories_mapping(rental)

        end_date_changing = target_end_date != rental.end_date
        if end_date_changing and equipment_ids:
            await self.validator.validate_equipment_availability(
                equipment_ids,
                rental.start_date,
                target_end_date,
                exclude_reservation_id=rental.reservation_id,
                exclude_rental_id=rental.id,
            )

        # Предварительная сумма без промокода — для проверки min_order_amount
        preliminary_price = await self.financial_service.calculate_final_price(
            equipment_ids, selected_accessories, rental.start_date, target_end_date, None
        )
        old_promo_code_str = rental.promo_code
        promo_obj = await self._resolve_promo_code_for_recalculation(
            update_data, rental, equipment_ids, preliminary_price.final_total
        )

        price_details = await self.financial_service.calculate_final_price(
            equipment_ids, selected_accessories, rental.start_date, target_end_date, promo_obj
        )

        old_total_cost = rental.total_cost
        rental.total_cost = price_details.final_total
        rental.discount_amount = price_details.discount_amount
        rental.promo_code = promo_obj.code if promo_obj else None

        # promo_code уже применён на объекте — из сырого update_data его убираем,
        # иначе update_rental_instance перезапишет результат валидации сырой строкой
        update_data.pop('promo_code', None)

        # Смена промокода пересчитывает лимиты использований. Для аренд из резерва
        # использование исходного промо принадлежит резерву — освобождаем только
        # для аренд «с нуля» (записаны при их создании)
        new_promo_code_str = rental.promo_code
        if old_promo_code_str != new_promo_code_str:
            if old_promo_code_str and rental.reservation_id is None:
                old_promo = await self.system_service.get_promo_code_by_name(old_promo_code_str)
                if old_promo:
                    await self.promo_code_logic.release_promo_code_usage(old_promo.id, rental.user_id)
            if promo_obj and promo_obj.code != old_promo_code_str:
                await self.promo_code_logic.record_promo_code_usage(promo_obj, rental.user)

        # Дельта стоимости отражается на балансе: при создании аренды списывался
        # полный total_cost, значит продление — доплата, сокращение — возврат
        difference = to_decimal(price_details.final_total) - to_decimal(old_total_cost)
        if difference > 0:
            await self.balance_service.add_transaction(
                user_id=rental.user_id,
                amount=-difference,
                operation_type=BalanceOperationType.RENTAL_DEBIT,
                description=f"Доплата за изменение стоимости аренды #{rental.id} на {difference} ₽",
                rental_id=rental.id,
            )
        elif difference < 0:
            await self.balance_service.add_transaction(
                user_id=rental.user_id,
                amount=abs(difference),
                operation_type=BalanceOperationType.EARLY_RETURN_CREDIT,
                description=f"Возврат за уменьшение стоимости аренды #{rental.id} на {abs(difference)} ₽",
                rental_id=rental.id,
            )

    async def _handle_prepayment_change(self, rental: Rental, update_data: Dict[str, Any]) -> None:
        """Обрабатывает изменение предоплаты аренды."""
        new_prepayment_amount = update_data['prepayment_amount']
        current_prepayment_amount = rental.prepayment_amount

        if new_prepayment_amount != current_prepayment_amount:
            difference = to_decimal(new_prepayment_amount) - to_decimal(current_prepayment_amount)

            if difference > 0:
                # Увеличение предоплаты
                await self.balance_service.add_transaction(
                    user_id=rental.user_id,
                    amount=difference,
                    operation_type=BalanceOperationType.PREPAYMENT,
                    description=f"Увеличение предоплаты по аренде #{rental.id} на {difference} ₽",
                    rental_id=rental.id,
                )
            else:
                # Уменьшение предоплаты — списание, а не начисление:
                # предоплата зачислялась положительной транзакцией, её
                # уменьшение должно зеркально списываться (иначе баланс
                # растёт при уменьшении предоплаты — деньги из воздуха)
                await self.balance_service.add_transaction(
                    user_id=rental.user_id,
                    amount=difference,
                    operation_type=BalanceOperationType.PREPAYMENT_REFUND_ON_REVERT,
                    description=f"Списание уменьшенной предоплаты по аренде #{rental.id} на {abs(difference)} ₽",
                    rental_id=rental.id,
                )

            # Обновляем сумму предоплаты
            rental.prepayment_amount = new_prepayment_amount

    def _remove_forbidden_fields_for_active_rental(self, update_data: Dict[str, Any]) -> None:
        """Удаляет запрещенные поля для активной аренды."""
        forbidden_fields = ['actual_return_date', 'notes_on_return', 'status', 'final_cost']
        for field in forbidden_fields:
            update_data.pop(field, None)

    async def _resolve_promo_code_for_recalculation(
        self,
        update_data: dict,
        rental: Rental,
        equipment_ids: List[int],
        order_amount: float
    ):
        """Определяет промокод для перерасчета стоимости аренды.

        Промокод из запроса валидируется по фактической сумме заказа; если он
        невалиден, изменение дат не должно падать — промокод отбрасывается
        с предупреждением в лог (менеджер видит пересчитанную сумму в UI).
        Действующий промокод аренды перевалидируется без проверки лимитов
        использований: его собственное использование уже учтено.
        """
        if 'promo_code' in update_data and update_data['promo_code']:
            code = update_data['promo_code']
            skip_usage_limits = code == rental.promo_code
        elif rental.promo_code and 'promo_code' not in update_data:
            code = rental.promo_code
            skip_usage_limits = True
        else:
            return None

        try:
            return await self.promo_code_logic.validate_and_get_promo_code(
                code=code,
                order_amount=order_amount,
                equipment_ids=equipment_ids,
                user=rental.user,
                skip_usage_limits=skip_usage_limits
            )
        except HTTPException:
            # Явный отказ вместо молчаливого пересчёта без скидки:
            # клиент ожидает сумму с промокодом
            raise
        except Exception as e:
            logger.error(
                f"Промокод '{code}' при пересчете аренды #{rental.id} не удалось проверить: {e}",
                exc_info=True,
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Не удалось подтвердить промокод '{code}'. Повторите позже или уберите промокод."
            )
