#! /usr/bin/env python3
# api/services/order/reservation_service.py

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from api.services.telegram_notification_service import TelegramNotificationService

from api.models.user import User
from api.models.reservation import Reservation
from api.repositories.reservation_repository import ReservationRepository
from api.repositories.user_repository import UserRepository
from api.repositories.equipment_repository import EquipmentRepository
from api.services.order.system_repository import SystemService
from api.services.order.order_validator import OrderValidator
from api.services.financial_service import FinancialService
from api.services.promo_code import PromoCodeBusinessLogic
from api.services.cache_service import invalidate_dashboard_summary
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
                 promo_code_logic: PromoCodeBusinessLogic,
                 telegram_service: Optional[TelegramNotificationService] = None):
        self.db = db
        self.reservation_repo = reservation_repo
        self.user_repo = user_repo
        self.equipment_repo = equipment_repo
        self.system_service = system_service
        self.validator = validator
        self.financial_service = financial_service
        self.promo_code_logic = promo_code_logic
        self.telegram_service = telegram_service

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

                # Учитываем использование промокода в лимитах (max_uses/max_uses_per_user)
                if promo_code_obj:
                    await self.promo_code_logic.record_promo_code_usage(promo_code_obj, user)

            logger.info(f"User {user.id} created reservation #{reservation.id}")
            invalidate_dashboard_summary()
            created_reservation = await self.reservation_repo.get_by_id_with_details(reservation.id)
            if self.telegram_service:
                self.telegram_service.send_in_background(
                    self.telegram_service.notify_new_reservation(created_reservation, user)
                )
            return created_reservation

        except Exception as e:
            # Явный rollback больше не нужен. Он выполнился автоматически при выходе из блока `with` с ошибкой.
            logger.error(
                f"Ошибка при создании резерва пользователем {user.id}: {e}", exc_info=True
            )
            raise

    async def _ensure_reservation_version(self, reservation) -> None:
        """Оптимистичная блокировка резерва.

        Условный инкремент version: если параллельная транзакция уже изменила
        резерв (версия не совпала), отказываем с 409 вместо last-writer-wins.
        """
        from sqlalchemy import update
        from api.models.reservation import Reservation
        current_version = reservation.version or 1
        result = await self.db.execute(
            update(Reservation)
            .where(
                Reservation.id == reservation.id,
                Reservation.version == current_version,
            )
            .values(version=current_version + 1)
        )
        if result.rowcount is not None and result.rowcount == 0:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Резерв был изменён другим пользователем. Обновите страницу и повторите изменения.",
            )
        reservation.version = current_version + 1

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
                
                old_start_date = reservation.start_date
                old_end_date = reservation.end_date
                old_equipment_ids = set(reservation.equipment_ids)
                old_equipment_names = [
                    f"{eq.brand} {eq.name}".strip() if getattr(eq, "brand", None) else eq.name
                    for eq in reservation.equipment
                ] if getattr(reservation, "equipment", None) else []
                
                # Валидация прав на редактирование резерва (включая предлагаемую
                # новую дату начала — иначе «далёкий» резерв можно передвинуть
                # на близкую дату, минуя ограничение по дням)
                if self.validator.user_status_service:
                    await self.validator.validate_user_can_edit_reservation(
                        user, reservation, is_manager=False, new_start_date=request.start_date
                    )

                # Выданный (fulfilled) резерв редактировать нельзя — он уже аренда
                self.validator.validate_reservation_is_editable(reservation)

                # Оптимистичная блокировка: отказ при параллельном изменении
                await self._ensure_reservation_version(reservation)

                # confirm_date_adjustment: пользователь подтвердил дату на выходной
                # (после диалога подтверждения) — не отбиваем её повторным 409
                await self.validator.validate_dates_and_holidays(
                    request.start_date, request.end_date,
                    force_issue_on_holiday=request.confirm_date_adjustment
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

                old_promo_code_id = reservation.promo_code_id
                promo_sent = 'promo_code' in request.model_fields_set

                # Текущий код резерва: если прислан тот же промокод, что уже
                # применён, лимиты использования не перепроверяем — собственная
                # запись использования отвергла бы его же самого
                current_promo_code = (
                    await self.system_service.get_promo_code_by_id(old_promo_code_id)
                    if old_promo_code_id else None
                )
                same_promo_sent = (
                    promo_sent and current_promo_code is not None
                    and request.promo_code == current_promo_code.code
                )

                promo_code_obj = None
                if request.promo_code:
                    promo_code_obj = await self.promo_code_logic.validate_and_get_promo_code(
                        code=request.promo_code,
                        order_amount=preliminary_price_details.final_total,
                        equipment_ids=request.equipment_ids,
                        user=user,
                        skip_usage_limits=same_promo_sent
                    )
                elif not promo_sent and reservation.promo_code_id:
                    # Поле promo_code не прислано — сохраняем действующий промокод
                    # (старое поведение молча стирало скидку при PUT без поля)
                    promo_code_obj = current_promo_code

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

                # Пересчёт использования промокодов в лимитах при смене
                new_promo_code_id = reservation.promo_code_id
                if old_promo_code_id != new_promo_code_id:
                    if old_promo_code_id:
                        await self.promo_code_logic.release_promo_code_usage(old_promo_code_id, reservation.user_id)
                    if promo_code_obj and not same_promo_sent:
                        await self.promo_code_logic.record_promo_code_usage(promo_code_obj, user)
                
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
            # даты/состав/стоимость влияют на метрики дашборда
            invalidate_dashboard_summary()
            updated_reservation = await self.reservation_repo.get_by_id_with_details(reservation.id)
            dates_changed = (old_start_date != updated_reservation.start_date or old_end_date != updated_reservation.end_date)
            new_equipment_ids = set(updated_reservation.equipment_ids)
            equipment_changed = (old_equipment_ids != new_equipment_ids)

            if self.telegram_service and (dates_changed or equipment_changed):
                self.telegram_service.send_in_background(
                    self.telegram_service.notify_reservation_updated(
                        reservation=updated_reservation,
                        old_start_date=old_start_date,
                        old_end_date=old_end_date,
                        old_equipment_names=old_equipment_names,
                        dates_changed=dates_changed,
                        equipment_changed=equipment_changed,
                        user=user,
                    )
                )
            return updated_reservation

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
                
                cancelled_start_date = reservation.start_date
                cancelled_end_date = reservation.end_date
                cancelled_total_cost = reservation.total_cost
                cancelled_equipment_names = [
                    f"{eq.brand} {eq.name}".strip() if getattr(eq, "brand", None) else eq.name
                    for eq in reservation.equipment
                ] if getattr(reservation, "equipment", None) else []

                # Отмена освобождает лимит использованного промокода
                if reservation.promo_code_id:
                    await self.promo_code_logic.release_promo_code_usage(
                        reservation.promo_code_id, reservation.user_id
                    )
                await self.reservation_repo.delete(reservation.id)
                # Убираем ручной коммит - middleware автоматически коммитит транзакцию
            logger.info(f"User {user.id} cancelled reservation #{reservation_id}")
            invalidate_dashboard_summary()
            if self.telegram_service:
                self.telegram_service.send_in_background(
                    self.telegram_service.notify_reservation_cancelled(
                        reservation_id=reservation_id,
                        user=user,
                        start_date=cancelled_start_date,
                        end_date=cancelled_end_date,
                        equipment_names=cancelled_equipment_names,
                        total_cost=cancelled_total_cost,
                    )
                )

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

                # Учитываем использование промокода в лимитах
                if promo_code_obj:
                    await self.promo_code_logic.record_promo_code_usage(promo_code_obj, user)

            logger.info(f"Admin created reservation #{reservation.id} for user {user.id}")
            invalidate_dashboard_summary()
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
                # Выданный (fulfilled) резерв редактировать нельзя — он уже аренда
                self.validator.validate_reservation_is_editable(reservation)

                # Оптимистичная блокировка: отказ при параллельном изменении
                await self._ensure_reservation_version(reservation)

                # Пропускаем валидацию прав на редактирование для менеджера;
                # confirm_date_adjustment прокидываем как подтверждение даты-выходного
                await self.validator.validate_dates_and_holidays(
                    request.start_date, request.end_date,
                    force_issue_on_holiday=request.confirm_date_adjustment
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

                old_promo_code_id = reservation.promo_code_id
                promo_sent = 'promo_code' in request.model_fields_set

                # Текущий код резерва: тот же присланный код не перепроверяет лимиты
                current_promo_code = (
                    await self.system_service.get_promo_code_by_id(old_promo_code_id)
                    if old_promo_code_id else None
                )
                same_promo_sent = (
                    promo_sent and current_promo_code is not None
                    and request.promo_code == current_promo_code.code
                )

                promo_code_obj = None
                if request.promo_code:
                    promo_code_obj = await self.promo_code_logic.validate_and_get_promo_code(
                        code=request.promo_code,
                        order_amount=preliminary_price_details.final_total,
                        equipment_ids=request.equipment_ids,
                        user=user,
                        skip_usage_limits=same_promo_sent
                    )
                elif not promo_sent and reservation.promo_code_id:
                    # Поле promo_code не прислано — сохраняем действующий промокод
                    promo_code_obj = current_promo_code

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

                # Пересчёт использования промокодов в лимитах при смене
                if old_promo_code_id != reservation.promo_code_id:
                    if old_promo_code_id:
                        await self.promo_code_logic.release_promo_code_usage(old_promo_code_id, reservation.user_id)
                    if promo_code_obj and not same_promo_sent:
                        await self.promo_code_logic.record_promo_code_usage(promo_code_obj, user)

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
            invalidate_dashboard_summary()
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
                # Отмена освобождает лимит использованного промокода
                if reservation.promo_code_id:
                    await self.promo_code_logic.release_promo_code_usage(
                        reservation.promo_code_id, reservation.user_id
                    )
                await self.reservation_repo.delete(reservation.id)
                # Убираем ручной коммит - middleware автоматически коммитит транзакцию
            logger.warning(f"Admin cancelled reservation #{reservation_id}")
            invalidate_dashboard_summary()
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
                    # Отмена освобождает лимит использованного промокода
                    if reservation.promo_code_id:
                        await self.promo_code_logic.release_promo_code_usage(
                            reservation.promo_code_id, reservation.user_id
                        )
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