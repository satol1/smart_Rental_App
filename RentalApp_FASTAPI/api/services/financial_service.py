# api/services/financial_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import date, timedelta
from typing import List, Dict, Optional, NamedTuple, Union
from fastapi import HTTPException
import logging

from api.models.equipment import Equipment
from api.models.promo_code import PromoCode
from api.models.accessory import Accessory
from api.models.holiday import Holiday
from api.models.rental import Rental
from api.models.reservation import Reservation
# from .discount_service import get_duration_discount_percentage  # Удалено - теперь используется DiscountService
from .promo_code import PromoCodeBusinessLogic
from .order.status_service import StatusService
from api.repositories.discount_repository import DiscountRepository
from api.repositories.holiday_repository import HolidayRepository
from api.repositories.equipment_repository import EquipmentRepository
from api.repositories.accessory_repository import AccessoryRepository
from shared.schemas.rental_schema import RentalOut
from shared.schemas.reservation_schema import AdminReservationOut, ReservationItem
from shared.constants.order_status import OrderStatus

logger = logging.getLogger(__name__)


class PriceDetails(NamedTuple):
    """Структура для возврата детализированной информации о цене."""
    full_total: float
    discount_amount: float
    final_total: float


class FinancialService:
    """
    Единый сервис для всех финансовых расчетов и обогащения данных.
    Объединяет логику из price_calculation_service и rental_calculation_service.
    """

    def __init__(self, db: AsyncSession, status_service: StatusService = None, discount_repo: DiscountRepository = None, promo_code_logic: PromoCodeBusinessLogic = None, holiday_repo: HolidayRepository = None, equipment_repo: EquipmentRepository = None, accessory_repo: AccessoryRepository = None, order_validator=None, discount_service=None):
        self.db = db
        self.status_service = status_service or StatusService()
        self.discount_repo = discount_repo or DiscountRepository(db)
        if not promo_code_logic:
            raise ValueError("PromoCodeBusinessLogic must be injected via DI container")
        self.promo_code_logic = promo_code_logic
        self.holiday_repo = holiday_repo or HolidayRepository(db)
        if not equipment_repo:
            raise ValueError("EquipmentRepository must be injected via DI container")
        self.equipment_repo = equipment_repo
        self.accessory_repo = accessory_repo or AccessoryRepository(db)
        self.order_validator = order_validator
        self.discount_service = discount_service

    # --- Методы расчета стоимости (из price_calculation_service) ---

    async def find_next_working_day(self, start_date: date) -> date:
        """Находит ближайшую следующую дату, которая не является выходным."""
        return await self.holiday_repo.find_next_working_day(start_date)

    def validate_date_range(self, start_date: date, end_date: date):
        """Проверяет, что конечная дата больше или равна начальной."""
        if not self.order_validator:
            raise ValueError("OrderValidator не инициализирован. Проверьте настройки DI-контейнера.")
        self.order_validator.validate_date_range(start_date, end_date)

    async def validate_holidays(self, start_date: date, end_date: date):
        """Проверяет, что дата начала или окончания резерва не выпадает на выходной."""
        if not self.order_validator:
            raise ValueError("OrderValidator не инициализирован. Проверьте настройки DI-контейнера.")
        await self.order_validator.validate_dates_and_holidays(start_date, end_date)

    async def get_rental_days(self, start_date: date, end_date: date) -> int:
        """Рассчитывает количество тарифицируемых суток, исключая выходные дни."""
        if start_date > end_date:
            return 0
        # Если даты одинаковые, это аренда на 1 день
        if start_date == end_date:
            return 1
        total_days = (end_date - start_date).days
        # Подсчитываем количество выходных дней в диапазоне
        holidays = await self.holiday_repo.get_holidays_in_range(start_date, end_date)
        holidays_count = len(holidays)
        return total_days - holidays_count

    async def calculate_final_price(
            self,
            equipment_ids: List[int],
            selected_accessories: Optional[Dict[int, List[int]]],
            start_date: date,
            end_date: date,
            promo_code: Optional[PromoCode]
    ) -> PriceDetails:
        """Рассчитывает полную, финальную стоимость заказа, включая все скидки."""
        if not equipment_ids:
            return PriceDetails(full_total=0.0, discount_amount=0.0, final_total=0.0)

        rental_days = await self.get_rental_days(start_date, end_date)
        if rental_days <= 0:
            return PriceDetails(full_total=0.0, discount_amount=0.0, final_total=0.0)

        # Получаем оборудование по ID
        selected_equipment = await self.equipment_repo.get_by_ids(equipment_ids)
        
        if len(selected_equipment) != len(equipment_ids):
            found_ids = {eq.id for eq in selected_equipment}
            missing_ids = set(equipment_ids) - found_ids
            raise HTTPException(status_code=404, detail=f"Equipment with IDs {list(missing_ids)} not found.")
        base_equipment_cost = sum(item.daily_rate for item in selected_equipment)

        accessories_cost = 0.0
        if selected_accessories:
            all_accessory_ids = [acc_id for equip_accs in selected_accessories.values() for acc_id in equip_accs]
            if all_accessory_ids:
                # Получаем аксессуары по ID
                found_accessories = await self.accessory_repo.get_by_ids(all_accessory_ids)
                accessories_cost = sum(acc.price for acc in found_accessories)

        full_total = (base_equipment_cost + accessories_cost) * rental_days
        if self.discount_service:
            duration_discount = await self.discount_service.get_duration_discount_percentage(rental_days)
        else:
            # Fallback для обратной совместимости - используем только discount_repo
            # Не создаем новый экземпляр DiscountService
            duration_discount = 0  # Без скидки по длительности, если discount_service недоступен
        
        # Используем новую архитектуру промокодов для расчета скидки
        promo_discount = 0
        if promo_code:
            promo_discount = promo_code.discount_percentage
            # Используем метод валидации комбинированной скидки
            total_discount_percentage = self.promo_code_logic.validate_combined_discount(
                duration_discount, promo_discount
            )
        else:
            total_discount_percentage = duration_discount

        discount_amount = full_total * (total_discount_percentage / 100)
        final_total = full_total - discount_amount

        return PriceDetails(
            full_total=round(full_total, 2),
            discount_amount=round(discount_amount, 2),
            final_total=round(final_total, 2)
        )

    # --- Методы расчета аренды (из rental_calculation_service) ---

    async def calculate_daily_rate(self, rental: Rental) -> float:
        """
        Рассчитывает дневную ставку аренды на основе общей стоимости и планового количества дней.
        """
        if rental.total_cost <= 0:
            return 0.0
            
        planned_days = await self.get_rental_days(rental.start_date, rental.end_date)
        if planned_days <= 0:
            return 0.0
            
        return rental.total_cost / planned_days
    
    def calculate_overdue_days(self, rental: Rental, actual_return_date: date) -> int:
        """
        Рассчитывает количество просроченных дней.
        """
        if actual_return_date <= rental.end_date:
            return 0
            
        return (actual_return_date - rental.end_date).days
    
    async def calculate_overdue_surcharge(self, rental: Rental, actual_return_date: date) -> float:
        """
        Рассчитывает штраф за просроченные дни аренды.
        """
        overdue_days = self.calculate_overdue_days(rental, actual_return_date)
        if overdue_days <= 0:
            return 0.0
            
        daily_rate = await self.calculate_daily_rate(rental)
        if daily_rate <= 0:
            return 0.0
            
        surcharge_amount = daily_rate * overdue_days
        return round(surcharge_amount, 2)
    
    async def calculate_early_return_credit(self, rental: Rental, actual_return_date: date, planned_days: int) -> float:
        """
        Рассчитывает кредит за досрочный возврат аренды.
        """
        if actual_return_date >= rental.end_date or planned_days <= 0:
            return 0.0

        daily_rate = await self.calculate_daily_rate(rental)
        if daily_rate <= 0:
            return 0.0
            
        # Рассчитываем именно тарифицируемые дни в оставшемся периоде
        unused_billable_days = await self.get_rental_days(actual_return_date, rental.end_date)
        if unused_billable_days <= 0:
            return 0.0
            
        credit_amount = unused_billable_days * daily_rate
        return round(credit_amount, 2)
    
    async def get_rental_calculation_summary(self, rental: Rental, actual_return_date: date, planned_days: int) -> dict:
        """
        Возвращает полную сводку расчетов для аренды.
        """
        daily_rate = await self.calculate_daily_rate(rental)
        overdue_days = self.calculate_overdue_days(rental, actual_return_date)
        surcharge_amount = await self.calculate_overdue_surcharge(rental, actual_return_date)
        credit_amount = await self.calculate_early_return_credit(rental, actual_return_date, planned_days)
        
        return {
            'daily_rate': daily_rate,
            'overdue_days': overdue_days,
            'surcharge_amount': surcharge_amount,
            'credit_amount': credit_amount,
            'is_overdue': overdue_days > 0,
            'is_early_return': actual_return_date < rental.end_date and credit_amount > 0
        }

    def calculate_remaining_amount(self, rental: Rental) -> float:
        """
        Рассчитывает остаток к оплате по аренде.
        
        Это единственный авторитетный источник для расчета remaining_amount.
        Формула: total_cost - prepayment_amount
        (total_cost уже содержит стоимость с учётом скидки)
        
        Args:
            rental: Объект аренды
            
        Returns:
            Остаток к оплате (может быть отрицательным, если предоплата превышает стоимость)
        """
        return rental.total_cost - rental.prepayment_amount

    # --- Универсальный метод обогащения данных ---

    async def enrich_order_with_financials(self, order: Union[Rental, Reservation]) -> Union[RentalOut, AdminReservationOut, ReservationItem]:
        """
        Универсальный метод для обогащения заказа (аренды или резерва) финансовыми данными.
        
        Args:
            order: ORM-объект аренды или резерва
            
        Returns:
            Pydantic-схема с полностью заполненными финансовыми данными
        """
        if isinstance(order, Rental):
            return await self._enrich_rental_with_financials(order)
        elif isinstance(order, Reservation):
            return await self._enrich_reservation_with_financials(order)
        else:
            raise ValueError(f"Unsupported order type: {type(order)}")

    async def _enrich_rental_with_financials(self, rental: Rental) -> RentalOut:
        """Обогащает объект аренды финансовыми данными."""
        rental_out = RentalOut.model_validate(rental)
        today = date.today()

        # Используем центральный сервис для получения статуса
        rental_out.status = self.status_service.get_status(rental)

        # Расчет просрочки или оставшихся дней
        if rental_out.status == OrderStatus.OVERDUE:
            rental_out.overdue_days = self.calculate_overdue_days(rental, today)
            rental_out.overdue_surcharge = await self.calculate_overdue_surcharge(rental, today)
        elif rental.status == OrderStatus.ACTIVE:
            rental_out.days_remaining = (rental.end_date - today).days

        # Расчет стоимости аксессуаров
        accessories_cost = 0.0
        for accessory_link in rental.accessory_links:
            if accessory_link.accessory and accessory_link.accessory.price:
                accessories_cost += accessory_link.accessory.price
        rental_out.accessories_cost = accessories_cost

        # Расчет остатка к оплате через централизованный метод
        rental_out.remaining_amount = self.calculate_remaining_amount(rental)

        return rental_out

    async def _enrich_reservation_with_financials(self, reservation: Reservation) -> ReservationItem:
        """Обогащает объект резерва финансовыми данными."""
        reservation_out = ReservationItem.model_validate(reservation)

        # Используем центральный сервис для получения статуса
        reservation_out.status = self.status_service.get_status(reservation)

        # Устанавливаем rental_id если есть связанная аренда
        if reservation.rental:
            reservation_out.rental_id = reservation.rental.id

        return reservation_out

    async def _enrich_admin_reservation_with_financials(self, reservation: Reservation) -> AdminReservationOut:
        """Обогащает объект резерва для админ-панели финансовыми данными."""
        if not reservation.user:
            raise ValueError("Reservation must have user for admin view")

        reservation_base = await self._enrich_reservation_with_financials(reservation)
        user_info = reservation.user

        return AdminReservationOut(
            **reservation_base.model_dump(),
            user_info=user_info
        )
