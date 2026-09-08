#RentalApp_FASTAPI/api/services/order/order_validator.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date, datetime, timezone
from typing import List, Optional, Dict, Tuple

from fastapi import HTTPException, status
from api.models.reservation import Reservation
from api.models.rental import Rental
from api.models.holiday import Holiday
from api.models.user import User
from api.models.equipment import Equipment
from api.services.availability import AvailabilityService
from api.services.financial_service import FinancialService
from api.repositories.holiday_repository import HolidayRepository
from api.repositories.reservation_repository import ReservationRepository
from shared.constants.order_status import OrderStatus
from shared.constants.user_status import EDIT_RESTRICTION_DAYS, RESERVATION_GRACE_PERIOD_HOURS
from shared.utils.user_status_utils import parse_user_status
import logging

logger = logging.getLogger(__name__)

class OrderValidator:
    """
    Слой для валидации бизнес-правил, связанных с Резервами и Арендами.
    """
    def __init__(
        self, 
        db: AsyncSession, 
        financial_service: Optional[FinancialService], 
        availability_service: AvailabilityService, 
        holiday_repo: HolidayRepository,
        reservation_repo: Optional[ReservationRepository] = None,
        user_status_service: Optional['UserStatusService'] = None
    ):
        self.db = db
        self.financial_service = financial_service
        self.availability_service = availability_service
        self.holiday_repo = holiday_repo
        self.reservation_repo = reservation_repo
        self.user_status_service = user_status_service

    async def validate_dates_and_holidays(self, start_date: date, end_date: date, force_issue_on_holiday: bool = False):
        """
        Проверяет корректность диапазона дат и то, что он не попадает на выходные.
        Используется при создании/редактировании резервов пользователями.
        """
        if not self.financial_service:
            raise ValueError("FinancialService не инициализирован. Проверьте настройки DI-контейнера.")
        self.financial_service.validate_date_range(start_date, end_date)

        # Дата начала не может быть в прошлом: такой резерв сразу считался бы
        # «просроченным» и блокировал бы пользователя правилами отмены
        if start_date < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Дата начала не может быть в прошлом.",
            )

        # Проверяем выходные дни для резервов (возвращаем 409 с типом DATE_IS_HOLIDAY)
        is_start_holiday = await self.holiday_repo.is_holiday(start_date)
        is_end_holiday = await self.holiday_repo.is_holiday(end_date)

        if is_start_holiday and not force_issue_on_holiday:
            # Находим следующую рабочую дату для предложения
            if not self.financial_service:
                raise ValueError("FinancialService не инициализирован. Проверьте настройки DI-контейнера.")
            suggested_start_date = await self.financial_service.find_next_working_day(start_date)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_type": "DATE_IS_HOLIDAY",
                    "message": f"Дата начала ({start_date.strftime('%d.%m.%Y')}) является выходным днем.",
                    "suggested_start_date": suggested_start_date.strftime('%Y-%m-%d')
                }
            )
        
        if is_end_holiday and not force_issue_on_holiday:
            # Находим следующую рабочую дату для предложения
            if not self.financial_service:
                raise ValueError("FinancialService не инициализирован. Проверьте настройки DI-контейнера.")
            suggested_end_date = await self.financial_service.find_next_working_day(end_date)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_type": "DATE_IS_HOLIDAY",
                    "message": f"Дата окончания ({end_date.strftime('%d.%m.%Y')}) является выходным днем.",
                    "suggested_end_date": suggested_end_date.strftime('%Y-%m-%d')
                }
            )

    async def validate_issue_on_holiday(self, issue_date: date, force: bool):
        """
        Проверяет, является ли дата выдачи выходным днем.
        Возвращает ошибку 409 Conflict, если это так и не установлен флаг force.
        Используется в админ-панели при конвертации резерва в аренду.
        """
        is_holiday = await self.holiday_repo.is_holiday(issue_date)
        
        if is_holiday and not force:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_type": "ISSUE_ON_HOLIDAY",
                    "message": f"Дата выдачи ({issue_date.strftime('%d.%m.%Y')}) является выходным днем. Подтвердите действие для продолжения."
                }
            )

    async def validate_equipment_availability(
        self,
        equipment_ids: list[int],
        start_date: date,
        end_date: date,
        exclude_reservation_id: Optional[int] = None,
        exclude_rental_id: Optional[int] = None
    ):
        # Сериализация конкурирующих созданий заказов: advisory-локировка строк
        # оборудования в рамках текущей транзакции закрывает гонку «два резерва
        # на один слот прошли проверку и закоммитились» (ovербукинг).
        await self._lock_equipment_ids(equipment_ids)
        conflicting_ids = await self.availability_service.get_conflicting_equipment_ids(
            equipment_ids, start_date, end_date, exclude_reservation_id, exclude_rental_id
        )
        if conflicting_ids:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Оборудование с ID {conflicting_ids} недоступно в выбранный период."
            )

    async def _lock_equipment_ids(self, equipment_ids: list[int]) -> None:
        """pg_advisory_xact_lock по каждому equipment_id (в порядке сортировки —
        от одинакового порядка блокировка дедлоков не даёт)."""
        if not equipment_ids:
            return
        from sqlalchemy import text
        for eq_id in sorted(set(equipment_ids)):
            await self.db.execute(text(f"SELECT pg_advisory_xact_lock({int(eq_id)})"))

    def validate_accessories_for_equipment(self, selected_accessories: Optional[Dict[int, List[int]]], equipment_ids: List[int]):
        if not selected_accessories:
            return

        accessory_eq_ids = set(selected_accessories.keys())
        if not accessory_eq_ids.issubset(set(equipment_ids)):
            missing_eq_ids = accessory_eq_ids - set(equipment_ids)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Аксессуары не могут быть выбраны для оборудования, отсутствующего в резерве. Неверные ID оборудования: {list(missing_eq_ids)}")

    def validate_reservation_is_cancellable(self, reservation: Reservation):
        if reservation.rental:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Нельзя отменить резерв, так как он был преобразован в аренду #{reservation.rental.id}.")

    def filter_cancellable_reservations(self, reservations: List[Reservation]) -> Tuple[List[Reservation], List[Reservation]]:
        cancellable = [r for r in reservations if not r.rental]
        not_cancellable = [r for r in reservations if r.rental]
        return cancellable, not_cancellable

    def validate_reservation_for_conversion(self, reservation: Reservation):
        if reservation.status != OrderStatus.ACTIVE:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Резерв уже выполнен или отменен.")
        if reservation.rental:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Резерв уже был преобразован в аренду #{reservation.rental.id}.")

    def validate_accessories_returned(self, rental: Rental, confirmation: bool):
        if rental.accessory_links and not confirmation:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Требуется подтверждение возврата всех аксессуаров.")

    def validate_rental_is_returnable(self, rental: Rental):
        """Возврат возможен только для активной аренды.

        Без этого guard'а повторный POST /return (двойной клик, повтор после
        сетевой ошибки) создавал бы повторные транзакции штрафа/возврата
        и перезаписывал final_cost. OVERDUE не отбиваем — это динамический
        статус, в БД такая аренда остаётся active.
        """
        if rental.status != OrderStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Аренда #{rental.id} уже возвращена — повторный возврат невозможен."
            )

    def validate_return_date(self, rental: Rental, actual_return_date: date):
        """Фактическая дата возврата: не раньше начала аренды и не в будущем
        относительно сегодняшнего дня, кроме возврата «в плановую дату».

        Границы закрывают денежные дыры: дата раньше start_date даёт кредит
        больше списанного (unused_billable_days > planned_days), а будущая дата
        позже end_date — завышенный штраф за просрочку. Регистрация возврата
        ровно в плановую end_date (в т.ч. будущую) разрешена: «возврат по плану».
        """
        today = date.today()
        if actual_return_date < rental.start_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Дата возврата ({actual_return_date.strftime('%d.%m.%Y')}) не может быть "
                    f"раньше начала аренды ({rental.start_date.strftime('%d.%m.%Y')})."
                ),
            )
        if actual_return_date > rental.end_date and actual_return_date > today:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Дата возврата ({actual_return_date.strftime('%d.%m.%Y')}) позже планового "
                    f"окончания аренды и позже сегодняшнего дня: просрочку нельзя "
                    "зарегистрировать заранее."
                ),
            )

    def validate_reservation_is_editable(self, reservation: Reservation):
        """Редактирование выданного (fulfilled) резерва запрещено: он уже
        сконвертирован в аренду, сдвиг дат создал бы расхождение с арендой."""
        if reservation.rental:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Резерв уже преобразован в аренду #{reservation.rental.id} и не подлежит редактированию."
            )

    def validate_rental_for_revert(self, rental: Rental):
        if not rental.reservation_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя отменить аренду, созданную без резерва.")
        
        # Проверяем, что аренда не завершена
        if rental.status == OrderStatus.COMPLETED:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Нельзя отменить выдачу для уже завершенной аренды.")
        
        # Сравниваем дату создания аренды (в UTC) с текущей датой (в UTC),
        # чтобы избежать проблем с часовыми поясами на границе суток.
        if rental.created_at.date() != datetime.now(timezone.utc).date():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Отмена выдачи возможна только в день создания аренды.")

    # --- Методы валидации дат и диапазонов ---
    
    def validate_date_range(self, start_date: date, end_date: date):
        """Проверяет, что конечная дата больше или равна начальной."""
        if start_date > end_date:
            raise HTTPException(
                status_code=400,
                detail="Дата окончания должна быть позже или равна дате начала."
            )


    # --- Методы валидации пользователей ---
    
    def validate_user_exists(self, user: Optional[User], user_id: int):
        """Проверяет, что пользователь существует."""
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found.")

    def validate_user_email_unique(self, existing_user: Optional[User], email: str):
        """Проверяет, что email пользователя уникален."""
        if existing_user:
            raise HTTPException(status_code=409, detail="Email уже зарегистрирован")

    # --- Методы валидации оборудования ---
    
    def validate_equipment_exists(self, equipment: List[Equipment], equipment_ids: List[int]):
        """Проверяет, что все запрошенное оборудование существует."""
        if len(equipment) != len(set(equipment_ids)):
            found_ids = {eq.id for eq in equipment}
            missing_ids = set(equipment_ids) - found_ids
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Equipment with IDs {list(missing_ids)} not found.")

    # --- Методы валидации платежей ---
    
    def validate_payment_amount(self, amount: float):
        """Проверяет корректность суммы платежа."""
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Сумма платежа должна быть положительной.")

    def validate_balance_adjustment(self, amount: float, description: str):
        """Проверяет корректность корректировки баланса."""
        if amount == 0:
            raise HTTPException(status_code=400, detail="Сумма корректировки не может быть нулевой.")
        if not description or not description.strip():
            raise HTTPException(status_code=400, detail="Описание корректировки обязательно.")

    # --- Методы валидации статусов пользователей ---
    
    async def validate_user_can_create_reservation(self, user: User, user_status_service: Optional['UserStatusService'] = None):
        """
        Проверяет, может ли пользователь создавать резервы.
        
        Args:
            user: Объект пользователя
            user_status_service: Сервис управления статусами (опционально, может быть из self)
            
        Raises:
            HTTPException: Если пользователь не может создавать резервы
        """
        service = user_status_service or self.user_status_service
        if not service:
            # Если сервис не доступен, пропускаем проверку (для обратной совместимости)
            return
        
        can_create = await service.can_user_create_reservation(user)
        if not can_create:
            from shared.constants.user_status import UserStatus
            user_status = parse_user_status(user.status)
            
            if user_status == UserStatus.PERSONA_NON_GRATA:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Пользователь со статусом 'Персона НонГрата' не может создавать резервы."
                )
            elif user_status == UserStatus.BLOCKED:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Заблокированный пользователь не может создавать резервы самостоятельно. Обратитесь к менеджеру."
                )
        
        # Проверяем лимит активных резервов
        max_reservations = await service.get_user_max_reservations(user)
        if max_reservations > 0:
            # Используем метод репозитория для подсчета активных резервов
            if not self.reservation_repo:
                # Если репозиторий не передан (fallback для обратной совместимости), пропускаем проверку
                logger.warning(f"ReservationRepository не передан в OrderValidator, пропускаем проверку лимита резервов для пользователя {user.id}")
            else:
                active_count = await self.reservation_repo.count_active_reservations_by_user(user.id)
                if active_count >= max_reservations:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Достигнут лимит одновременных резервов ({max_reservations}). У вас уже есть {active_count} активных резервов."
                    )
    
    async def validate_user_can_edit_reservation(
        self,
        user: User,
        reservation: Reservation,
        user_status_service: Optional['UserStatusService'] = None,
        is_manager: bool = False,
        new_start_date: Optional[date] = None
    ):
        """
        Проверяет, может ли пользователь редактировать резерв.

        Args:
            user: Объект пользователя
            reservation: Резерв для редактирования
            user_status_service: Сервис управления статусами (опционально)
            is_manager: True, если действие выполняется менеджером
            new_start_date: Предлагаемая новая дата начала (опционально) —
                редактирование не должно позволять обойти ограничение по дням,
                переставив «далёкий» резерв на близкую дату

        Raises:
            HTTPException: Если пользователь не может редактировать резерв
        """
        # Менеджеры могут редактировать всегда
        if is_manager:
            return

        service = user_status_service or self.user_status_service
        if not service:
            # Если сервис не доступен, пропускаем проверку (для обратной совместимости)
            return

        can_edit = await service.can_user_edit_reservation(user, reservation.start_date, reservation.created_at)
        if can_edit and new_start_date is not None:
            # Проверяем и новую дату начала: иначе «далёкий» резерв можно
            # передвинуть на завтра, минуя ограничение по дням
            can_edit = await service.can_user_edit_reservation(user, new_start_date, reservation.created_at)
        if not can_edit:
            from shared.constants.user_status import UserStatus
            user_status = parse_user_status(user.status)
            restriction_days = EDIT_RESTRICTION_DAYS.get(user_status, 0)

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Редактирование резерва доступно не позднее чем за {restriction_days + 1} дн. "
                    f"до начала (ваш статус: «{user_status.value}») либо в течение "
                    f"{RESERVATION_GRACE_PERIOD_HOURS} ч после создания. Обратитесь к менеджеру."
                )
            )

    async def validate_user_can_cancel_reservation(
        self,
        user: User,
        reservation: Reservation,
        user_status_service: Optional['UserStatusService'] = None,
        is_manager: bool = False
    ):
        """
        Проверяет, может ли пользователь отменить резерв.

        Args:
            user: Объект пользователя
            reservation: Резерв для отмены
            user_status_service: Сервис управления статусами (опционально)
            is_manager: True, если действие выполняется менеджером

        Raises:
            HTTPException: Если пользователь не может отменить резерв
        """
        # Менеджеры могут отменять всегда
        if is_manager:
            return

        service = user_status_service or self.user_status_service
        if not service:
            # Если сервис не доступен, пропускаем проверку (для обратной совместимости)
            return

        can_cancel = await service.can_user_cancel_reservation(user, reservation.start_date, reservation.created_at)
        if not can_cancel:
            from shared.constants.user_status import UserStatus
            user_status = parse_user_status(user.status)
            restriction_days = EDIT_RESTRICTION_DAYS.get(user_status, 0)

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Отмена резерва доступна не позднее чем за {restriction_days + 1} дн. "
                    f"до начала (ваш статус: «{user_status.value}») либо в течение "
                    f"{RESERVATION_GRACE_PERIOD_HOURS} ч после создания. Обратитесь к менеджеру."
                )
            )
    
    async def validate_user_can_receive_rental(self, user: User, user_status_service: Optional['UserStatusService'] = None):
        """
        Проверяет, может ли пользователь получать аренду.
        
        Args:
            user: Объект пользователя
            user_status_service: Сервис управления статусами (опционально)
            
        Raises:
            HTTPException: Если пользователю нельзя выдавать аренду
        """
        service = user_status_service or self.user_status_service
        if not service:
            # Если сервис не доступен, пропускаем проверку (для обратной совместимости)
            return
        
        can_receive = await service.can_user_receive_rental(user)
        if not can_receive:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Пользователю со статусом 'Персона НонГрата' нельзя выдавать аренду."
            )
    