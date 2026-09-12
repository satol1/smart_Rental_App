# api/repositories/rental_command_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, List
import logging

from decimal import Decimal
from .rental_base_repository import RentalBaseRepository
from api.models.rental import Rental, RentalAccessory
from shared.constants.order_status import OrderStatus
from shared.constants.deposit_status import DepositStatus

logger = logging.getLogger(__name__)


class RentalCommandRepository(RentalBaseRepository):
    """
    Репозиторий для операций создания и обновления аренд.
    Содержит методы для создания аренд из резервов и обновления их состояния.
    """

    def create_rental_from_reservation(
        self, 
        reservation, 
        manager, 
        deposit: float, 
        notes: Optional[str], 
        recalculated_cost: float, 
        recalculated_discount: float, 
        new_start_date, 
        new_end_date=None,
        prepayment_amount: float = 0.0,
        promo_code: Optional[str] = None
    ) -> Rental:
        """
        Создает аренду из резерва.
        
        Args:
            reservation: Объект резерва
            manager: Менеджер, создающий аренду
            deposit: Сумма залога
            notes: Заметки при выдаче
            recalculated_cost: Пересчитанная стоимость
            recalculated_discount: Пересчитанная скидка
            new_start_date: Новая дата начала
            new_end_date: Новая дата окончания (если None, берется из reservation.end_date)
            prepayment_amount: Сумма предоплаты
            promo_code: Промокод (если None, берется из reservation.promo_code)
            
        Returns:
            Созданный объект аренды
        """
        reservation.status = OrderStatus.FULFILLED
        
        # Логируем аксессуары резерва для отладки
        if reservation.accessory_links:
            accessory_ids = [link.accessory_id for link in reservation.accessory_links]
            logger.info(f"ТОЧКА 1 (КОПИРОВАНИЕ): Резерв #{reservation.id} имеет аксессуары с ID: {accessory_ids}")
        else:
            logger.warning(f"ТОЧКА 1 (КОПИРОВАНИЕ): В исходном резерве #{reservation.id} аксессуары не найдены.")
        
        effective_promo_code = promo_code if promo_code is not None else reservation.promo_code
        deposit_dec = Decimal(str(deposit or 0))
        deposit_status = DepositStatus.HELD.value if deposit_dec > 0 else None
        
        # Создаем аренду без передачи аксессуаров в конструктор
        rental = Rental(
            user_id=reservation.user_id,
            created_by_id=manager.id,
            reservation_id=reservation.id,
            equipment=reservation.equipment,
            start_date=new_start_date,
            end_date=new_end_date if new_end_date is not None else reservation.end_date,
            total_cost=recalculated_cost,
            discount_amount=recalculated_discount,
            promo_code=effective_promo_code,
            deposit_amount=deposit,
            deposit_status=deposit_status,
            prepayment_amount=prepayment_amount,
            notes_on_issue=notes
        )

        # Явное копирование аксессуаров из резерва в аренду
        if reservation.accessory_links:
            rental.accessory_links = [
                RentalAccessory(
                    equipment_id=link.equipment_id,
                    accessory_id=link.accessory_id
                )
                for link in reservation.accessory_links
            ]
            logger.info(f"ТОЧКА 1 (КОПИРОВАНИЕ): В аренду скопированы аксессуары: {[link.accessory_id for link in rental.accessory_links]}")

        return rental

    def create_rental_instance(
        self, 
        user, 
        manager, 
        start_date, 
        end_date, 
        equipment, 
        total_cost: float, 
        discount_amount: float = 0.0,
        promo_code: Optional[str] = None,
        deposit_amount: float = 0.0, 
        prepayment_amount: float = 0.0,
        notes_on_issue: Optional[str] = None
    ) -> Rental:
        """
        Создает экземпляр аренды.
        
        Args:
            user: Пользователь
            manager: Менеджер
            start_date: Дата начала
            end_date: Дата окончания
            equipment: Список оборудования
            total_cost: Общая стоимость
            discount_amount: Сумма скидки
            promo_code: Промокод
            deposit_amount: Сумма залога
            prepayment_amount: Сумма предоплаты
            notes_on_issue: Заметки при выдаче
            
        Returns:
            Созданный объект аренды
        """
        deposit_dec = Decimal(str(deposit_amount or 0))
        deposit_status = DepositStatus.HELD.value if deposit_dec > 0 else None

        return Rental(
            user_id=user.id,
            created_by_id=manager.id,
            equipment=equipment,
            start_date=start_date,
            end_date=end_date,
            total_cost=total_cost,
            discount_amount=discount_amount,
            promo_code=promo_code,
            deposit_amount=deposit_amount,
            deposit_status=deposit_status,
            prepayment_amount=prepayment_amount,
            notes_on_issue=notes_on_issue
        )

    def finalize_rental_return(
        self, 
        rental: Rental, 
        return_date, 
        notes: Optional[str], 
        credit: float, 
        surcharge: float = 0.0, 
        has_debt: bool = False,
        deposit_status: Optional[str] = None,
        deposit_refunded_amount: Optional[Decimal] = None,
        deposit_retained_amount: Optional[Decimal] = None,
        deposit_notes: Optional[str] = None
    ):
        """
        Завершает возврат аренды.
        
        Args:
            rental: Объект аренды
            return_date: Дата возврата
            notes: Заметки при возврате
            credit: Сумма кредита
            surcharge: Сумма штрафа
            has_debt: Наличие задолженности у клиента
            deposit_status: Итоговый статус залога
            deposit_refunded_amount: Возвращенная часть залога
            deposit_retained_amount: Удержанная часть залога
            deposit_notes: Комментарий к действиям с залогом
        """
        rental.status = OrderStatus.COMPLETED_WITH_DEBT.value if has_debt else OrderStatus.COMPLETED.value
        rental.actual_return_date = return_date
        rental.notes_on_return = notes
        from api.services.financial_service import to_decimal
        rental.final_cost = to_decimal(rental.total_cost) - to_decimal(credit) + to_decimal(surcharge)
        if deposit_status is not None:
            rental.deposit_status = deposit_status
        if deposit_refunded_amount is not None:
            rental.deposit_refunded_amount = deposit_refunded_amount
        if deposit_retained_amount is not None:
            rental.deposit_retained_amount = deposit_retained_amount
        if deposit_notes is not None:
            rental.deposit_notes = deposit_notes

    def update_rental_instance(self, rental: Rental, update_data: dict):
        """
        Обновляет экземпляр аренды.
        
        Args:
            rental: Объект аренды
            update_data: Словарь с данными для обновления
        """
        for key, value in update_data.items():
            setattr(rental, key, value)

    def revert_rental_status_to_active(self, rental: Rental):
        """
        Возвращает статус аренды к активному резерву.
        
        Args:
            rental: Объект аренды
            
        Returns:
            Объект резерва
        """
        reservation = rental.reservation
        if reservation:
            reservation.status = OrderStatus.ACTIVE
            reservation.rental = None
        rental.reservation = None
        rental.reservation_id = None
        return reservation

    def add_accessory_to_rental(self, rental: Rental, equipment_id: int, accessory_id: int):
        """
        Добавляет аксессуар к аренде.
        
        ВНИМАНИЕ: Этот метод НЕ должен использоваться в асинхронном контексте
        из-за проблем с lazy loading. Используйте add_accessories_to_rental_async.
        
        Args:
            rental: Объект аренды
            equipment_id: ID оборудования
            accessory_id: ID аксессуара
        """
        accessory_link = RentalAccessory(
            rental_id=rental.id,
            equipment_id=equipment_id,
            accessory_id=accessory_id
        )
        # Добавляем в сессию для сохранения
        self.db.add(accessory_link)
        # НЕ обращаемся к rental.accessory_links чтобы избежать lazy loading

    async def add_accessories_to_rental_async(
        self, rental: Rental, selected_accessories: Dict[int, List[int]]
    ) -> None:
        """
        Добавляет аксессуары к аренде асинхронно без lazy loading.
        
        Args:
            rental: Объект аренды
            selected_accessories: Словарь {equipment_id: [accessory_ids]}
        """
        if selected_accessories:
            for equipment_id, accessory_ids in selected_accessories.items():
                for accessory_id in accessory_ids:
                    accessory_link = RentalAccessory(
                        rental_id=rental.id,
                        equipment_id=equipment_id,
                        accessory_id=accessory_id
                    )
                    self.db.add(accessory_link)
