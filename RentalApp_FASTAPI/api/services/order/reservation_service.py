#! /usr/bin/env python3
# api/services/order/reservation_service.py

from sqlalchemy.ext.asyncio import AsyncSession
import logging

from api.models.user import User
from api.models.reservation import Reservation
from api.repositories.reservation_repository import ReservationRepository
from api.repositories.user_repository import UserRepository
from api.repositories.equipment_repository import EquipmentRepository
from api.services.order.system_repository import SystemService
from api.services.order.order_validator import OrderValidator
from api.services.financial_service import FinancialService
from api.services.promo_code import PromoCodeBusinessLogic
from shared.constants.order_status import OrderStatus
from shared.constants.user_status import UserStatus
from shared.utils.user_status_utils import parse_user_status
from shared.schemas.reservation_schema import (
    ReservationCreateRequest,
    ReservationUpdateRequest,
    AdminReservationCreateRequest,
)

logger = logging.getLogger(__name__)


class ReservationLifecycleService:
    """Сервис для управления жизненным циклом Резервов."""

    def __init__(self, 
                 db: AsyncSession, 
                 reservation_repo: ReservationRepository,
                 user_repo: UserRepository,
                 equipment_repo: EquipmentRepository,
                 system_service: SystemService,
                 validator: OrderValidator,
                 financial_service: FinancialService,
                 promo_code_logic: PromoCodeBusinessLogic):
        self.db = db
        self.reservation_repo = reservation_repo
        self.user_repo = user_repo
        self.equipment_repo = equipment_repo
        self.system_service = system_service
        self.validator = validator
        self.financial_service = financial_service
        self.promo_code_logic = promo_code_logic

    async def create_user_reservation(self, request: ReservationCreateRequest, user: User) -> Reservation:
        try:
            # Все операции с БД теперь внутри одного блока транзакции
            async with self.db.begin_nested():
                # Валидация статуса пользователя и прав на создание резерва
                if self.validator.user_status_service:
                    await self.validator.validate_user_can_create_reservation(user)
                
                await self.validator.validate_dates_and_holidays(request.start_date, request.end_date)
                equipment = await self.equipment_repo.get_equipment_by_ids_or_fail(request.equipment_ids)
                self.validator.validate_accessories_for_equipment(request.selected_accessories, request.equipment_ids)
                await self.validator.validate_equipment_availability(
                    request.equipment_ids, request.start_date, request.end_date
                )

                # Рассчитываем предварительную стоимость БЕЗ промокода для валидации
                preliminary_price_details = await self.financial_service.calculate_final_price(
                    request.equipment_ids, request.selected_accessories,
                    request.start_date, request.end_date, None
                )

                promo_code_obj = None
                if request.promo_code:
                    promo_code_obj = await self.promo_code_logic.validate_and_get_promo_code(
                        code=request.promo_code,
                        order_amount=preliminary_price_details.final_total,
                        equipment_ids=request.equipment_ids,
                        user=user
                    )
                
                # Финальный расчет уже с валидным промокодом
                price_details = await self.financial_service.calculate_final_price(
                    request.equipment_ids,
                    request.selected_accessories,
                    request.start_date,
                    request.end_date,
                    promo_code_obj,
                )

                # Создаем экземпляр резерва
                reservation = Reservation(
                    user_id=user.id,
                    start_date=request.start_date,
                    end_date=request.end_date,
                    equipment=equipment,
                    total_cost=price_details.final_total,
                    discount_amount=price_details.discount_amount,
                    promo_code_id=promo_code_obj.id if promo_code_obj else None,
                )
                
                # Добавляем аксессуары
                if request.selected_accessories:
                    from api.models.reservation import ReservationAccessory
                    links = []
                    for eq_id, acc_ids in request.selected_accessories.items():
                        for acc_id in acc_ids:
                            if acc_id != eq_id:  # Фильтруем некорректные ID
                                links.append(ReservationAccessory(equipment_id=eq_id, accessory_id=acc_id))
                    reservation.accessory_links = links
                
                # Сохраняем через репозиторий
                await self.reservation_repo.save_object(reservation)
                # Убираем ручной коммит - middleware автоматически коммитит транзакцию

            logger.info(f"User {user.id} created reservation #{reservation.id}")
            return await self.reservation_repo.get_by_id_with_details(reservation.id)

        except Exception as e:
            # Явный rollback больше не нужен. Он выполнился автоматически при выходе из блока `with` с ошибкой.
            logger.error(
                f"Ошибка при создании резерва пользователем {user.id}: {e}", exc_info=True
            )
            raise

    async def update_user_reservation(
        self, reservation_id: int, request: ReservationUpdateRequest, user: User
    ) -> Reservation:
        try:
            # Все операции с БД теперь внутри одного блока транзакции
            async with self.db.begin_nested():
                reservation = await self.reservation_repo.get_by_id_with_details(reservation_id)
                if not reservation or reservation.user_id != user.id:
                    from fastapi import HTTPException, status
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found or you do not have permission to access it.")
                
                # Валидация прав на редактирование резерва
                if self.validator.user_status_service:
                    await self.validator.validate_user_can_edit_reservation(user, reservation, is_manager=False)
                
                await self.validator.validate_dates_and_holidays(
                    request.start_date, request.end_date
                )
                equipment = await self.equipment_repo.get_equipment_by_ids_or_fail(request.equipment_ids)
                self.validator.validate_accessories_for_equipment(
                    request.selected_accessories, request.equipment_ids
                )
                await self.validator.validate_equipment_availability(
                    request.equipment_ids,
                    request.start_date,
                    request.end_date,
                    exclude_reservation_id=reservation_id,
                )

                # Рассчитываем предварительную стоимость БЕЗ промокода для валидации
                preliminary_price_details = await self.financial_service.calculate_final_price(
                    request.equipment_ids, request.selected_accessories,
                    request.start_date, request.end_date, None
                )

                promo_code_obj = None
                if request.promo_code:
                    promo_code_obj = await self.promo_code_logic.validate_and_get_promo_code(
                        code=request.promo_code,
                        order_amount=preliminary_price_details.final_total,
                        equipment_ids=request.equipment_ids,
                        user=user
                    )
                
                # Финальный расчет уже с валидным промокодом
                price_details = await self.financial_service.calculate_final_price(
                    request.equipment_ids,
                    request.selected_accessories,
                    request.start_date,
                    request.end_date,
                    promo_code_obj,
                )

                # Обновляем поля резерва
                reservation.start_date = request.start_date
                reservation.end_date = request.end_date
                reservation.equipment = equipment
                reservation.total_cost = price_details.final_total
                reservation.discount_amount = price_details.discount_amount
                reservation.promo_code_id = promo_code_obj.id if promo_code_obj else None
                
                # Обновляем аксессуары
                # Используем clear() для удаления старых связей (cascade="all, delete-orphan" обработает это автоматически)
                reservation.accessory_links.clear()
                if request.selected_accessories:
                    from api.models.reservation import ReservationAccessory
                    links = []
                    for eq_id, acc_ids in request.selected_accessories.items():
                        for acc_id in acc_ids:
                            if acc_id != eq_id:  # Фильтруем некорректные ID
                                links.append(ReservationAccessory(equipment_id=eq_id, accessory_id=acc_id))
                    reservation.accessory_links = links
                
                # Сохраняем через репозиторий (flush выполнится автоматически)
                await self.reservation_repo.save_object(reservation)
                # Убираем ручной коммит - middleware автоматически коммитит транзакцию

            logger.info(f"User {user.id} updated reservation #{reservation.id}")
            return await self.reservation_repo.get_by_id_with_details(reservation.id)

        except Exception as e:
            # Явный rollback больше не нужен. Он выполнился автоматически при выходе из блока `with` с ошибкой.
            logger.error(
                f"Ошибка при обновлении резерва #{reservation_id} пользователем {user.id}: {e}",
                exc_info=True,
            )
            raise

    async def cancel_user_reservation(self, reservation_id: int, user: User):
        try:
            # Все операции с БД теперь внутри одного блока транзакции
            async with self.db.begin_nested():
                reservation = await self.reservation_repo.get_by_id_with_details(reservation_id)
                if not reservation or reservation.user_id != user.id:
                    from fastapi import HTTPException, status
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found or you do not have permission to access it.")
                
                # Валидация прав на отмену резерва
                if self.validator.user_status_service:
                    await self.validator.validate_user_can_cancel_reservation(user, reservation, is_manager=False)
                
                self.validator.validate_reservation_is_cancellable(reservation)
                await self.reservation_repo.delete(reservation.id)
                # Убираем ручной коммит - middleware автоматически коммитит транзакцию
            logger.info(f"User {user.id} cancelled reservation #{reservation_id}")

        except Exception as e:
            # Явный rollback больше не нужен. Он выполнился автоматически при выходе из блока `with` с ошибкой.
            logger.error(
                f"Ошибка при отмене резерва #{reservation_id} пользователем {user.id}: {e}",
                exc_info=True,
            )
            raise

    async def create_admin_reservation(self, request: AdminReservationCreateRequest) -> Reservation:
        """
        Создает резерв для пользователя от имени менеджера.
        Менеджеры могут создавать резервы для заблокированных пользователей.
        """
        user = await self.user_repo.get_user_by_id_or_fail(request.user_id)
        
        # Для менеджеров: проверяем только статус "Персона НонГрата"
        # (заблокированные пользователи могут получить резерв от менеджера)
        if self.validator.user_status_service:
            user_status = parse_user_status(user.status)
            if user_status == UserStatus.PERSONA_NON_GRATA:
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Нельзя создавать резервы для пользователя со статусом 'Персона НонГрата'."
                )
        
        # Создаем резерв, но пропускаем проверку статуса (менеджер может создавать для заблокированных)
        try:
            async with self.db.begin_nested():
                # Пропускаем валидацию статуса пользователя для менеджера
                await self.validator.validate_dates_and_holidays(request.start_date, request.end_date)
                equipment = await self.equipment_repo.get_equipment_by_ids_or_fail(request.equipment_ids)
                self.validator.validate_accessories_for_equipment(request.selected_accessories, request.equipment_ids)
                await self.validator.validate_equipment_availability(
                    request.equipment_ids, request.start_date, request.end_date
                )

                # Рассчитываем предварительную стоимость БЕЗ промокода для валидации
                preliminary_price_details = await self.financial_service.calculate_final_price(
                    request.equipment_ids, request.selected_accessories,
                    request.start_date, request.end_date, None
                )

                promo_code_obj = None
                if request.promo_code:
                    promo_code_obj = await self.promo_code_logic.validate_and_get_promo_code(
                        code=request.promo_code,
                        order_amount=preliminary_price_details.final_total,
                        equipment_ids=request.equipment_ids,
                        user=user
                    )
                
                # Финальный расчет уже с валидным промокодом
                price_details = await self.financial_service.calculate_final_price(
                    request.equipment_ids,
                    request.selected_accessories,
                    request.start_date,
                    request.end_date,
                    promo_code_obj,
                )

                # Создаем экземпляр резерва
                reservation = Reservation(
                    user_id=user.id,
                    start_date=request.start_date,
                    end_date=request.end_date,
                    equipment=equipment,
                    total_cost=price_details.final_total,
                    discount_amount=price_details.discount_amount,
                    promo_code_id=promo_code_obj.id if promo_code_obj else None,
                )
                
                # Добавляем аксессуары
                if request.selected_accessories:
                    from api.models.reservation import ReservationAccessory
                    links = []
                    for eq_id, acc_ids in request.selected_accessories.items():
                        for acc_id in acc_ids:
                            if acc_id != eq_id:  # Фильтруем некорректные ID
                                links.append(ReservationAccessory(equipment_id=eq_id, accessory_id=acc_id))
                    reservation.accessory_links = links
                
                # Сохраняем через репозиторий
                await self.reservation_repo.save_object(reservation)

            logger.info(f"Admin created reservation #{reservation.id} for user {user.id}")
            return await self.reservation_repo.get_by_id_with_details(reservation.id)

        except Exception as e:
            logger.error(
                f"Ошибка при создании резерва администратором для пользователя {user.id}: {e}", exc_info=True
            )
            raise

    async def update_admin_reservation(
        self, reservation_id: int, request: ReservationUpdateRequest
    ) -> Reservation:
        """
        Обновляет резерв от имени менеджера.
        Менеджеры могут редактировать резервы всегда, независимо от статуса пользователя.
        """
        reservation = await self.reservation_repo.get_by_id_with_details(reservation_id)
        if not reservation:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
        
        user = await self.user_repo.get_user_by_id_or_fail(reservation.user_id)
        # Менеджеры могут редактировать всегда (is_manager=True)
        try:
            async with self.db.begin_nested():
                # Пропускаем валидацию прав на редактирование для менеджера
                await self.validator.validate_dates_and_holidays(
                    request.start_date, request.end_date
                )
                equipment = await self.equipment_repo.get_equipment_by_ids_or_fail(request.equipment_ids)
                self.validator.validate_accessories_for_equipment(
                    request.selected_accessories, request.equipment_ids
                )
                await self.validator.validate_equipment_availability(
                    request.equipment_ids,
                    request.start_date,
                    request.end_date,
                    exclude_reservation_id=reservation_id,
                )

                # Рассчитываем предварительную стоимость БЕЗ промокода для валидации
                preliminary_price_details = await self.financial_service.calculate_final_price(
                    request.equipment_ids, request.selected_accessories,
                    request.start_date, request.end_date, None
                )

                promo_code_obj = None
                if request.promo_code:
                    promo_code_obj = await self.promo_code_logic.validate_and_get_promo_code(
                        code=request.promo_code,
                        order_amount=preliminary_price_details.final_total,
                        equipment_ids=request.equipment_ids,
                        user=user
                    )
                
                # Финальный расчет уже с валидным промокодом
                price_details = await self.financial_service.calculate_final_price(
                    request.equipment_ids,
                    request.selected_accessories,
                    request.start_date,
                    request.end_date,
                    promo_code_obj,
                )

                # Обновляем резерв
                reservation.start_date = request.start_date
                reservation.end_date = request.end_date
                reservation.equipment = equipment
                reservation.total_cost = price_details.final_total
                reservation.discount_amount = price_details.discount_amount
                reservation.promo_code_id = promo_code_obj.id if promo_code_obj else None

                # Обновляем аксессуары
                # Используем clear() для удаления старых связей (cascade="all, delete-orphan" обработает это автоматически)
                reservation.accessory_links.clear()
                if request.selected_accessories:
                    from api.models.reservation import ReservationAccessory
                    # Создаем новые связи
                    links = []
                    for eq_id, acc_ids in request.selected_accessories.items():
                        for acc_id in acc_ids:
                            if acc_id != eq_id:  # Фильтруем некорректные ID
                                links.append(ReservationAccessory(equipment_id=eq_id, accessory_id=acc_id))
                    reservation.accessory_links = links
                
                # Сохраняем через репозиторий (flush выполнится автоматически)
                await self.reservation_repo.save_object(reservation)

            logger.info(f"Admin updated reservation #{reservation.id}")
            return await self.reservation_repo.get_by_id_with_details(reservation.id)

        except Exception as e:
            logger.error(
                f"Ошибка при обновлении резерва #{reservation_id} администратором: {e}",
                exc_info=True,
            )
            raise

    async def cancel_admin_reservation(self, reservation_id: int):
        """
        Отменяет резерв от имени менеджера.
        Менеджеры могут отменять резервы всегда, независимо от статуса пользователя.
        """
        try:
            # Все операции с БД теперь внутри одного блока транзакции
            async with self.db.begin_nested():
                reservation = await self.reservation_repo.get_by_id_with_details(reservation_id)
                if not reservation:
                    from fastapi import HTTPException, status
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
                
                # Менеджеры могут отменять всегда (пропускаем валидацию прав на отмену)
                self.validator.validate_reservation_is_cancellable(reservation)
                await self.reservation_repo.delete(reservation.id)
                # Убираем ручной коммит - middleware автоматически коммитит транзакцию
            logger.warning(f"Admin cancelled reservation #{reservation_id}")
        except Exception as e:
            # Явный rollback больше не нужен. Он выполнился автоматически при выходе из блока `with` с ошибкой.
            logger.error(
                f"Ошибка при отмене резерва #{reservation_id} администратором: {e}",
                exc_info=True,
            )
            raise

    async def bulk_cancel_admin_reservations(self, reservation_ids: list[int]):
        try:
            # Все операции с БД теперь внутри одного блока транзакции
            async with self.db.begin_nested():
                reservations = await self.reservation_repo.find_by_ids(reservation_ids)
                cancellable, not_cancellable = self.validator.filter_cancellable_reservations(
                    reservations
                )

                if not_cancellable:
                    logger.warning(
                        "Cannot bulk delete reservations already converted to rental: "
                        f"{[r.id for r in not_cancellable]}"
                    )

                if not cancellable:
                    return

                for reservation in cancellable:
                    await self.reservation_repo.delete(reservation.id)
                
                # Убираем ручной коммит - middleware автоматически коммитит транзакцию
            logger.warning(
                f"Admin bulk cancelled reservations: {[r.id for r in cancellable]}"
            )
        except Exception as e:
            # Явный rollback больше не нужен. Он выполнился автоматически при выходе из блока `with` с ошибкой.
            logger.error(
                f"Ошибка при пакетном удалении резервов: {e}", exc_info=True
            )
            raise

    # Обертки для совместимости с тестами
    async def update_reservation(self, reservation_id: int, update_data: dict):
        """Обновление резерва."""
        # Получаем резерв
        reservation = await self.reservation_repo.get_by_id_with_details(reservation_id)
        if not reservation:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Резерв не найден")
        
        # Создаем запрос обновления
        update_request = ReservationUpdateRequest(**update_data)
        return await self.update_user_reservation(reservation_id, update_request, reservation.user)

    async def cancel_reservation(self, reservation_id: int):
        """Отмена резерва."""
        reservation = await self.reservation_repo.get_by_id_with_details(reservation_id)
        if not reservation:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Резерв не найден")
        
        return await self.cancel_user_reservation(reservation_id, reservation.user)

    async def get_user_reservations(self, user_id: int, status_filter: str = None):
        """Получение резервов пользователя."""
        return await self.reservation_repo.get_reservations_by_user_id(user_id, status_filter)

    async def get_reservation_by_id(self, reservation_id: int):
        """Получение резерва по ID."""
        return await self.reservation_repo.get_by_id_with_details(reservation_id)