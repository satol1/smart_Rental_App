#! /usr/bin/env python3
# api/services/order/rental_update_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import logging

from api.models.user import User
from api.models.rental import Rental
from api.repositories.rental_repository import RentalRepository
from api.services.order.system_repository import SystemService
from api.services.order.rental_notification_helper import RentalNotificationHelper
from api.services.balance_service import BalanceService
from api.services.financial_service import FinancialService
from api.services.promo_code import PromoCodeBusinessLogic
from shared.constants.balance_operations import BalanceOperationType
from shared.schemas.rental_schema import AdminRentalUpdate

logger = logging.getLogger(__name__)


class RentalUpdateService:
    """Сервис для обновления аренд."""

    def __init__(self, 
                 db: AsyncSession, 
                 rental_repo: RentalRepository,
                 system_service: SystemService,
                 balance_service: BalanceService,
                 financial_service: FinancialService,
                 promo_code_logic: PromoCodeBusinessLogic):
        self.db = db
        self.rental_repo = rental_repo
        self.system_service = system_service
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
            
            return rental_with_details
        except Exception as e:
            self.notification_helper.log_rental_error("обновлении деталей аренды", rental_id, e, manager)
            raise

    # Приватные методы для обновления аренды
    
    async def _process_rental_updates(self, rental: Rental, update_data: Dict[str, Any]) -> List[str]:
        """Обрабатывает обновления аренды в зависимости от статуса."""
        updated_fields = []
        
        if rental.status in ['active', 'overdue']:
            updated_fields.extend(await self._process_active_rental_updates(rental, update_data))
        elif rental.status == 'completed':
            updated_fields.extend(self._process_completed_rental_updates(update_data))
        
        return updated_fields
    
    async def _process_active_rental_updates(self, rental: Rental, update_data: Dict[str, Any]) -> List[str]:
        """Обрабатывает обновления активной аренды."""
        updated_fields = []
        
        # Обработка изменения даты окончания
        if 'end_date' in update_data and update_data['end_date'] != rental.end_date:
            await self._handle_end_date_change(rental, update_data)
            updated_fields.append('end_date')
        
        # Обработка изменения промокода
        elif 'promo_code' in update_data:
            await self._handle_promo_code_change(rental, update_data)
            updated_fields.append('promo_code')
        
        # Обработка изменения предоплаты
        if 'prepayment_amount' in update_data:
            await self._handle_prepayment_change(rental, update_data)
            updated_fields.append('prepayment_amount')
        
        # Запрещаем редактирование полей для завершенных аренд
        self._remove_forbidden_fields_for_active_rental(update_data)
        
        return updated_fields
    
    def _process_completed_rental_updates(self, update_data: Dict[str, Any]) -> List[str]:
        """Обрабатывает обновления завершенной аренды."""
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
    
    async def _handle_end_date_change(self, rental: Rental, update_data: Dict[str, Any]) -> None:
        """Обрабатывает изменение даты окончания аренды."""
        new_end_date = update_data['end_date']
        
        # Получаем состав оборудования и аксессуаров
        equipment_ids = self.rental_repo.get_rental_equipment_ids(rental)
        selected_accessories = self.rental_repo.get_rental_accessories_mapping(rental)
        
        # Получаем промокод для перерасчета
        promo_obj = await self._get_promo_code_for_recalculation(update_data, rental, equipment_ids)
        
        # Пересчитываем стоимость с новой датой
        price_details = await self.financial_service.calculate_final_price(
            equipment_ids, selected_accessories, rental.start_date, new_end_date, promo_obj
        )
        
        # Обновляем финансовые поля
        rental.total_cost = price_details.final_total
        rental.discount_amount = price_details.discount_amount
        rental.promo_code = promo_obj.code if promo_obj else None
    
    async def _handle_promo_code_change(self, rental: Rental, update_data: Dict[str, Any]) -> None:
        """Обрабатывает изменение промокода аренды."""
        # Получаем состав оборудования и аксессуаров
        equipment_ids = self.rental_repo.get_rental_equipment_ids(rental)
        selected_accessories = self.rental_repo.get_rental_accessories_mapping(rental)
        
        # Получаем промокод для перерасчета
        promo_obj = await self._get_promo_code_for_recalculation(update_data, rental, equipment_ids)
        
        # Пересчитываем стоимость с новым промокодом
        price_details = await self.financial_service.calculate_final_price(
            equipment_ids, selected_accessories, rental.start_date, rental.end_date, promo_obj
        )
        
        # Обновляем финансовые поля
        rental.total_cost = price_details.final_total
        rental.discount_amount = price_details.discount_amount
        rental.promo_code = promo_obj.code if promo_obj else None
    
    async def _handle_prepayment_change(self, rental: Rental, update_data: Dict[str, Any]) -> None:
        """Обрабатывает изменение предоплаты аренды."""
        new_prepayment_amount = update_data['prepayment_amount']
        current_prepayment_amount = rental.prepayment_amount
        
        if new_prepayment_amount != current_prepayment_amount:
            difference = new_prepayment_amount - current_prepayment_amount
            
            if difference > 0:
                # Увеличение предоплаты
                await self.balance_service.add_transaction(
                    user_id=rental.user_id,
                    amount=difference,
                    operation_type=BalanceOperationType.PREPAYMENT,
                    description=f"Увеличение предоплаты по аренде #{rental.id} на {difference} ₽"
                )
            elif difference < 0:
                # Уменьшение предоплаты
                await self.balance_service.add_transaction(
                    user_id=rental.user_id,
                    amount=abs(difference),
                    operation_type=BalanceOperationType.BALANCE_TOP_UP,
                    description=f"Возврат предоплаты по аренде #{rental.id} на {abs(difference)} ₽"
                )
            
            # Обновляем сумму предоплаты
            rental.prepayment_amount = new_prepayment_amount
    
    def _remove_forbidden_fields_for_active_rental(self, update_data: Dict[str, Any]) -> None:
        """Удаляет запрещенные поля для активной аренды."""
        forbidden_fields = ['actual_return_date', 'notes_on_return', 'status', 'final_cost']
        for field in forbidden_fields:
            update_data.pop(field, None)

    async def _get_promo_code_for_recalculation(self, update_data: dict, rental: Rental, equipment_ids: List[int]):
        """Получает промокод для перерасчета стоимости аренды."""
        promo_obj = None
        
        if 'promo_code' in update_data and update_data['promo_code']:
            try:
                promo_obj = await self.promo_code_logic.validate_and_get_promo_code(
                    code=update_data['promo_code'],
                    order_amount=0,  # Будет пересчитано
                    equipment_ids=equipment_ids,
                    user=rental.user
                )
            except Exception:
                # Если промокод невалиден, игнорируем его
                promo_obj = None
        elif rental.promo_code:
            # Используем существующий промокод
            promo_obj = await self.system_service.get_promo_code_by_name(rental.promo_code)
        
        return promo_obj
