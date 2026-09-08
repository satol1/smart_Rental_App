#! /usr/bin/env python3
# api/services/order/rental_creation_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from typing import List, Dict, Any
import logging

from api.models.user import User
from api.models.rental import Rental
from api.models.reservation import Reservation
from api.repositories.rental_repository import RentalRepository
from api.repositories.reservation_repository import ReservationRepository
from api.repositories.user_repository import UserRepository
from api.repositories.equipment_repository import EquipmentRepository
from api.services.order.system_repository import SystemService
from api.services.order.order_validator import OrderValidator
from api.services.order.rental_notification_helper import RentalNotificationHelper
from api.services.balance_service import BalanceService
from api.services.financial_service import FinancialService
from api.services.promo_code import PromoCodeBusinessLogic
from api.services.cache_service import invalidate_dashboard_summary
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from shared.constants.balance_operations import BalanceOperationType
from shared.schemas.rental_schema import (
    RentalCreateFromReservationRequest,
    RentalCreateFromScratchRequest,
)

logger = logging.getLogger(__name__)


class RentalCreationService:
    """Сервис для создания аренд."""

    def __init__(self, 
                 db: AsyncSession, 
                 rental_repo: RentalRepository,
                 reservation_repo: ReservationRepository,
                 user_repo: UserRepository,
                 equipment_repo: EquipmentRepository,
                 system_service: SystemService,
                 validator: OrderValidator,
                 balance_service: BalanceService,
                 financial_service: FinancialService,
                 promo_code_logic: PromoCodeBusinessLogic):
        self.db = db
        self.rental_repo = rental_repo
        self.reservation_repo = reservation_repo
        self.user_repo = user_repo
        self.equipment_repo = equipment_repo
        self.system_service = system_service
        self.validator = validator
        self.balance_service = balance_service
        self.financial_service = financial_service
        self.promo_code_logic = promo_code_logic
        self.notification_helper = RentalNotificationHelper()

    async def convert_reservation_to_rental(
        self, reservation_id: int, request: RentalCreateFromReservationRequest, manager: User
    ) -> Rental:
        """Конвертирует резерв в аренду."""
        try:
            async with self.db.begin_nested():
                # Получаем и валидируем резерв
                reservation = await self._get_and_validate_reservation_for_conversion(reservation_id, request)

                # Валидация статуса пользователя - проверка прав на получение аренды
                if self.validator.user_status_service:
                    user = await self.user_repo.get_by_id(reservation.user_id)
                    if user:
                        await self.validator.validate_user_can_receive_rental(user)

                # Подготавливаем данные для создания аренды
                equipment_ids, selected_accessories = self._extract_reservation_data(reservation)
                new_start_date = date.today()

                # Пересчитываем стоимость с учетом новой даты
                price_details = await self._recalculate_price_for_conversion(
                    reservation, equipment_ids, selected_accessories, new_start_date
                )

                # Создаем аренду
                try:
                    rental = await self._create_rental_from_reservation(
                        reservation, manager, request, price_details, new_start_date
                    )
                except IntegrityError:
                    # Гонка двух конвертаций: unique(reservation_id) уже занят
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Резерв уже был преобразован в аренду другим менеджером.",
                    )

                # Создаем транзакции баланса
                await self._create_balance_transactions_for_conversion(rental, request)

            # Получаем аренду с предзагруженными связями
            rental_with_details = await self.rental_repo.get_rental_by_id_or_fail(rental.id)
            
            # Логируем успешную конвертацию
            self.notification_helper.log_rental_converted_from_reservation(rental, reservation, manager)
            invalidate_dashboard_summary()

            return rental_with_details

        except Exception as e:
            self.notification_helper.log_rental_error("конвертации резерва в аренду", reservation_id, e, manager)
            raise

    async def create_rental_from_scratch(
        self, request: RentalCreateFromScratchRequest, manager: User
    ) -> Rental:
        """Создает аренду с нуля."""
        try:
            logger.info(f"Начинаем создание аренды для пользователя {request.user_id}")
            
            async with self.db.begin_nested():
                # Валидация и подготовка данных
                logger.debug("Этап 1: Валидация и подготовка данных")
                user, equipment = await self._validate_and_prepare_rental_data(request)

                # Финансовые расчеты: сначала без промокода — его min_order_amount
                # нужно проверять по фактической сумме заказа (как в резервах),
                # а не по 0 (иначе промо с порогом всегда отклонялся)
                logger.debug("Этап 2: Финансовые расчеты")
                preliminary_price = await self.financial_service.calculate_final_price(
                    request.equipment_ids,
                    request.selected_accessories,
                    request.start_date,
                    request.end_date,
                    None
                )
                promo_code_obj = None
                if request.promo_code:
                    promo_code_obj = await self.promo_code_logic.validate_and_get_promo_code(
                        code=request.promo_code,
                        order_amount=preliminary_price.final_total,
                        equipment_ids=request.equipment_ids,
                        user=user
                    )
                price_details = await self.financial_service.calculate_final_price(
                    request.equipment_ids,
                    request.selected_accessories,
                    request.start_date,
                    request.end_date,
                    promo_code_obj
                )

                # Создаем аренду
                logger.debug("Этап 3: Создание экземпляра аренды")
                rental = await self._create_rental_instance(
                    user, manager, request, equipment, price_details
                )
                
                # Добавляем аксессуары
                logger.debug("Этап 4: Добавление аксессуаров")
                await self._add_accessories_to_rental(rental, request.selected_accessories)

                # Создаем транзакции баланса
                logger.debug("Этап 5: Создание транзакций баланса")
                await self._create_balance_transactions_for_new_rental(rental, request, user)

                # Учитываем использование промокода в лимитах
                if promo_code_obj:
                    await self.promo_code_logic.record_promo_code_usage(promo_code_obj, user)

            # Получаем аренду с предзагруженными связями
            logger.debug("Этап 6: Получение аренды с деталями")
            rental_with_details = await self.rental_repo.get_rental_by_id_or_fail(rental.id)
            
            # Логируем успешное создание
            logger.info(f"Успешно создана аренда #{rental.id}")
            self.notification_helper.log_rental_created(rental, manager, user)
            invalidate_dashboard_summary()

            return rental_with_details
        except Exception as e:
            logger.error(f"Ошибка при создании аренды: {e}", exc_info=True)
            self.notification_helper.log_rental_error("создании аренды с нуля", 0, e, manager)
            raise

    # Приватные методы для конвертации резерва в аренду
    
    async def _get_and_validate_reservation_for_conversion(
        self, reservation_id: int, request: RentalCreateFromReservationRequest
    ) -> Reservation:
        """Получает и валидирует резерв для конвертации в аренду."""
        reservation = await self.reservation_repo.get_by_id_with_details(reservation_id)
        if not reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Резерв #{reservation_id} не найден.",
            )
        self.validator.validate_reservation_for_conversion(reservation)

        # Конвертация просроченного резерва дала бы аренду с end < start
        # и нулевой стоимостью (дни считаются от today)
        if reservation.end_date < date.today():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Дата окончания резерва ({reservation.end_date.strftime('%d.%m.%Y')}) "
                    "уже прошла — конвертация невозможна. Создайте аренду с нуля."
                ),
            )

        new_start_date = date.today()
        await self.validator.validate_issue_on_holiday(
            new_start_date, request.force_issue_on_holiday
        )

        # Аренда начинается сегодня и может начинаться раньше start_date резерва —
        # проверяем, что расширенный период не занят другими заказами
        equipment_ids = [eq.id for eq in reservation.equipment]
        await self.validator.validate_equipment_availability(
            equipment_ids, new_start_date, reservation.end_date,
            exclude_reservation_id=reservation.id
        )

        return reservation
    
    def _extract_reservation_data(self, reservation: Reservation) -> tuple[List[int], Dict[int, List[int]]]:
        """Извлекает данные оборудования и аксессуаров из резерва."""
        equipment_ids = [eq.id for eq in reservation.equipment]
        
        selected_accessories = {}
        for link in reservation.accessory_links:
            if link.equipment_id not in selected_accessories:
                selected_accessories[link.equipment_id] = []
            selected_accessories[link.equipment_id].append(link.accessory_id)
        
        return equipment_ids, selected_accessories
    
    async def _recalculate_price_for_conversion(
        self, reservation: Reservation, equipment_ids: List[int], 
        selected_accessories: Dict[int, List[int]], new_start_date: date
    ) -> Any:
        """Пересчитывает стоимость для конвертации резерва в аренду."""
        # Предварительный расчет
        preliminary_price = await self.financial_service.calculate_final_price(
            equipment_ids, selected_accessories, new_start_date, reservation.end_date, None
        )
        
        # Перепроверка промокода
        # skip_usage_limits: использование уже записано за этим резервом —
        # повторная проверка счётчиков отвергла бы его же самого и молча
        # создала аренду без скидки
        re_validated_promo_obj = None
        if reservation.promo_code_id:
            original_promo_code = await self.system_service.get_promo_code_by_id(reservation.promo_code_id)

            if original_promo_code:
                try:
                    re_validated_promo_obj = await self.promo_code_logic.validate_and_get_promo_code(
                        code=original_promo_code.code,
                        order_amount=preliminary_price.final_total,
                        equipment_ids=equipment_ids,
                        user=reservation.user,
                        skip_usage_limits=True
                    )
                except Exception:
                    re_validated_promo_obj = None
        
        # Финальный расчет
        return await self.financial_service.calculate_final_price(
            equipment_ids, selected_accessories, new_start_date, reservation.end_date, re_validated_promo_obj
        )
    
    async def _create_rental_from_reservation(
        self, reservation: Reservation, manager: User, request: RentalCreateFromReservationRequest,
        price_details: Any, new_start_date: date
    ) -> Rental:
        """Создает аренду из резерва."""
        rental = self.rental_repo.create_rental_from_reservation(
            reservation,
            manager,
            request.deposit_amount,
            request.notes_on_issue,
            recalculated_cost=price_details.final_total,
            recalculated_discount=price_details.discount_amount,
            new_start_date=new_start_date,
            prepayment_amount=request.prepayment_amount,
        )
        
        # Сохраняем резерв через репозиторий (статус уже изменен на FULFILLED в create_rental_from_reservation)
        await self.reservation_repo.save_object(reservation)
        await self.rental_repo.save_rental(rental)
        
        return rental
    
    async def _create_balance_transactions_for_conversion(
        self, rental: Rental, request: RentalCreateFromReservationRequest
    ) -> None:
        """Создает транзакции баланса для конвертации резерва в аренду."""
        if request.prepayment_amount > 0:
            await self.balance_service.add_transaction(
                user_id=rental.user_id,
                amount=request.prepayment_amount,
                operation_type=BalanceOperationType.PREPAYMENT,
                description=f"Предоплата за аренду #{rental.id}",
                rental_id=rental.id,
            )
        
        await self.balance_service.add_transaction(
            user_id=rental.user_id,
            amount=-rental.total_cost,
            operation_type=BalanceOperationType.RENTAL_DEBIT,
            description=f"Списание за аренду #{rental.id}",
            rental_id=rental.id,
        )

    # Приватные методы для создания аренды с нуля
    
    async def _validate_and_prepare_rental_data(
        self, request: RentalCreateFromScratchRequest
    ) -> tuple[User, List[Any]]:
        """Валидирует данные и подготавливает объекты для создания аренды.

        Промокод здесь не валидируется: его min_order_amount проверяется
        в create_rental_from_scratch по фактической предварительной сумме.
        """
        # Валидация пользователя
        user = await self.user_repo.get_user_by_id_or_fail(request.user_id)

        # Валидация статуса пользователя - проверка прав на получение аренды
        if self.validator.user_status_service:
            await self.validator.validate_user_can_receive_rental(user)

        # Валидация дат: без проверки диапазона аренда с end < start создаётся
        # с нулевой стоимостью (get_rental_days возвращает 0)
        self.validator.validate_date_range(request.start_date, request.end_date)
        if request.start_date < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Дата начала аренды не может быть в прошлом.",
            )
        await self.validator.validate_issue_on_holiday(
            request.start_date, request.force_issue_on_holiday
        )
        await self.validator.validate_equipment_availability(
            request.equipment_ids, request.start_date, request.end_date
        )

        # Получаем оборудование
        equipment = await self.equipment_repo.get_equipment_by_ids_or_fail(request.equipment_ids)

        return user, equipment
    
    async def _create_rental_instance(
        self, user: User, manager: User, request: RentalCreateFromScratchRequest,
        equipment: List[Any], price_details: Any
    ) -> Rental:
        """Создает экземпляр аренды."""
        rental = self.rental_repo.create_rental_instance(
            user=user,
            manager=manager,
            start_date=request.start_date,
            end_date=request.end_date,
            equipment=equipment,
            total_cost=price_details.final_total,
            discount_amount=price_details.discount_amount,
            promo_code=request.promo_code,
            deposit_amount=request.deposit_amount,
            prepayment_amount=request.prepayment_amount,
            notes_on_issue=request.notes_on_issue,
        )
        
        return await self.rental_repo.save_rental(rental)
    
    async def _add_accessories_to_rental(
        self, rental: Rental, selected_accessories: Dict[int, List[int]]
    ) -> None:
        """Добавляет аксессуары к аренде через репозиторий."""
        if selected_accessories:
            await self.rental_repo.add_accessories_to_rental_async(rental, selected_accessories)
    
    async def _create_balance_transactions_for_new_rental(
        self, rental: Rental, request: RentalCreateFromScratchRequest, user: User
    ) -> None:
        """Создает транзакции баланса для новой аренды."""
        if request.prepayment_amount > 0:
            await self.balance_service.add_transaction(
                user_id=user.id,
                amount=request.prepayment_amount,
                operation_type=BalanceOperationType.PREPAYMENT,
                description=f"Предоплата за аренду #{rental.id}",
                rental_id=rental.id,
            )
        
        await self.balance_service.add_transaction(
            user_id=user.id,
            amount=-rental.total_cost,
            operation_type=BalanceOperationType.RENTAL_DEBIT,
            description=f"Списание за новую аренду #{rental.id}",
            rental_id=rental.id,
        )
