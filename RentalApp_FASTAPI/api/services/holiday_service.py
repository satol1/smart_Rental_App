# api/services/holiday_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Tuple
from datetime import date, timedelta, datetime
import holidays
import asyncio
from fastapi import HTTPException

from api.repositories.holiday_repository import HolidayRepository
from api.models.holiday import Holiday, HolidayRule
from api.models.user import User
from shared.schemas.holiday_schema import HolidayCreate, RecurringHolidayRuleCreate, HolidayListResponse, HolidayRuleListResponse, HolidayRuleOut


class HolidayService:
    """Сервис для управления выходными днями и правилами их генерации."""
    
    def __init__(self, db: AsyncSession, repo: HolidayRepository, rental_repo=None,
                 reservation_repo=None, notification_service=None, order_validator=None):
        from typing import Optional
        from api.services.order.order_validator import OrderValidator
        self._order_validator: Optional[OrderValidator] = order_validator
        self.db = db
        self.repo = repo
        self.rental_repo = rental_repo
        self.reservation_repo = reservation_repo
        self.notification_service = notification_service
    
    async def get_holidays(
        self, 
        start_date: date, 
        end_date: date, 
        skip: int, 
        limit: int
    ) -> HolidayListResponse:
        """Получить список выходных в заданном диапазоне дат с пагинацией."""
        holidays_orm, total_holidays = await self.repo.get_holidays_paginated(
            start_date, end_date, skip, limit
        )
        
        return HolidayListResponse(
            items=holidays_orm,
            total=total_holidays
        )
    
    async def create_single_holiday(
        self, 
        holiday_in: HolidayCreate, 
        current_user: User
    ) -> dict:
        """Создать новый выходной день (ручное добавление)."""
        # Проверяем конфликты с резервами (начало или конец)
        conflicting_ids = await self.repo.check_conflicting_reservations(holiday_in.date)
        if conflicting_ids and not holiday_in.force:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Эта дата является началом или концом существующих резервов. Подтвердите действие.",
                    "conflicting_reservation_ids": conflicting_ids
                }
            )
        
        # Проверяем, не существует ли уже такой выходной
        existing_holiday = await self.repo.find_holiday_by_date(holiday_in.date)
        if existing_holiday:
            raise HTTPException(status_code=400, detail="Этот день уже является выходным.")
        
        # Создаем новый выходной
        new_holiday = Holiday(
            **holiday_in.model_dump(exclude={"force"}),
            created_by_id=current_user.id
        )
        
        await self.repo.save_holiday(new_holiday)
        
        # Автоматически продлеваем заказы, которые заканчиваются в этот день
        auto_extension_result = await self._auto_extend_orders_on_holiday_creation(holiday_in.date)
        
        return {
            "message": "Выходной день успешно добавлен", 
            "date": new_holiday.date,
            "auto_extension": auto_extension_result
        }
    
    async def delete_holiday(self, holiday_date: date) -> None:
        """Удалить выходной день."""
        holiday = await self.repo.find_holiday_by_date(holiday_date)
        if not holiday:
            raise HTTPException(status_code=404, detail="Выходной день не найден")
        
        await self.repo.delete_holiday(holiday)
    
    async def create_weekly_recurring_holidays(
        self, 
        rule_in: RecurringHolidayRuleCreate, 
        current_user: User
    ) -> dict:
        """Создает правило и генерирует выходные для указанного дня недели в диапазоне дат."""
        if rule_in.start_date >= rule_in.end_date:
            raise HTTPException(status_code=400, detail="Дата начала должна быть раньше даты окончания.")
        
        # Создаем новое правило
        new_rule = HolidayRule(
            rule_type="weekly",
            parameters={"day_of_week": rule_in.day_of_week},
            description=rule_in.description,
            created_by_id=current_user.id
        )
        
        await self.repo.save_rule(new_rule)
        
        # Генерируем выходные для указанного дня недели в диапазоне дат.
        # Существующие даты получаем одним батч-запросом, а не по одной (N+1)
        rule_dates = []
        current_date = rule_in.start_date
        while current_date <= rule_in.end_date:
            if current_date.weekday() == rule_in.day_of_week:
                rule_dates.append(current_date)
            current_date += timedelta(days=1)

        existing_dates = await self.repo.find_existing_holiday_dates(rule_dates)
        holidays_to_create = [
            Holiday(
                date=d,
                description=f"Авто (правило #{new_rule.id})",
                created_by_id=current_user.id,
                rule_id=new_rule.id
            )
            for d in rule_dates if d not in existing_dates
        ]
        
        # Сохраняем все созданные выходные
        await self.repo.bulk_save_holidays(holidays_to_create)
        
        return {"message": f"Правило создано. Добавлено {len(holidays_to_create)} новых выходных."}
    
    async def import_public_holidays(
        self, 
        country_code: str, 
        year: int, 
        current_user: User
    ) -> dict:
        """Импортирует государственные праздники для указанной страны и года."""
        try:
            # Обертываем синхронную операцию в asyncio.to_thread
            public_holidays = await asyncio.to_thread(holidays.country_holidays, country_code, years=year)
            if not public_holidays:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Не найдены праздники для страны '{country_code}' в {year} году."
                )
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Неверный код страны: '{country_code}'")
        
        # Создаем правило для импорта
        rule_description = f"Импорт гос. праздников для {country_code} на {year} год"
        new_rule = HolidayRule(
            rule_type="public_import",
            parameters={"country": country_code, "year": year},
            description=rule_description,
            created_by_id=current_user.id
        )
        
        await self.repo.save_rule(new_rule)
        
        # Создаем выходные для каждого праздника (батч-проверка существующих)
        existing_dates = await self.repo.find_existing_holiday_dates(list(public_holidays.keys()))
        holidays_to_create = [
            Holiday(
                date=holiday_date,
                description=holiday_name,
                created_by_id=current_user.id,
                rule_id=new_rule.id
            )
            for holiday_date, holiday_name in public_holidays.items()
            if holiday_date not in existing_dates
        ]
        
        # Сохраняем все созданные выходные
        await self.repo.bulk_save_holidays(holidays_to_create)
        
        return {"message": f"Правило импорта создано. Добавлено {len(holidays_to_create)} праздничных дней."}
    
    async def get_all_rules(
        self, 
        skip: int, 
        limit: int
    ) -> HolidayRuleListResponse:
        """Возвращает все созданные правила для генерации выходных с пагинацией."""
        rules_orm, total_rules = await self.repo.get_rules_paginated(skip, limit)
        
        return HolidayRuleListResponse(
            items=[HolidayRuleOut.model_validate(rule) for rule in rules_orm],
            total=total_rules
        )
    
    async def delete_rule(self, rule_id: int) -> None:
        """Удаляет правило. Благодаря `cascade='all, delete-orphan'`, все созданные им выходные будут удалены автоматически."""
        rule = await self.repo.find_rule_by_id(rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Правило не найдено.")
        
        await self.repo.delete_rule(rule)
    
    async def _auto_extend_orders_on_holiday_creation(self, holiday_date: date) -> dict:
        """
        Автоматически продлевает аренды и резервы, которые заканчиваются в новый выходной день.
        
        Args:
            holiday_date: Дата нового выходного дня
            
        Returns:
            Словарь с информацией о продленных заказах
        """
        if not self.rental_repo or not self.reservation_repo:
            return {
                "message": "Репозитории не инициализированы",
                "extended_rentals": [], "extended_reservations": [],
                "skipped_rentals": [], "skipped_reservations": [],
            }
        
        # Находим следующий рабочий день
        next_working_day = await self.repo.find_next_working_day(holiday_date + timedelta(days=1))
        
        # Находим конфликтующие аренды и резервы
        conflicting_rental_ids = await self.repo.check_conflicting_rentals(holiday_date)
        conflicting_reservation_ids = await self.repo.check_conflicting_reservations_end_date(holiday_date)
        
        extended_rentals = []
        extended_reservations = []
        skipped_rentals = []
        skipped_reservations = []
        
        # Продлеваем аренды — только если новый интервал [start, next_working_day]
        # свободен (advisory-лок + проверка пересечений в validate_equipment_availability).
        # Иначе продление создавало бы овербукинг — единственный живой обход
        # анти-овербукинга (закрытие хвоста 2.7 аудита)
        for rental_id in conflicting_rental_ids:
            reason = await self._check_extension_availability(
                rental_id, next_working_day, order_type="rental"
            )
            if reason:
                skipped_rentals.append({"id": rental_id, "reason": reason})
                continue
            success = await self.rental_repo.update_rental_end_date(rental_id, next_working_day)
            if success:
                extended_rentals.append({
                    "id": rental_id,
                    "old_end_date": holiday_date,
                    "new_end_date": next_working_day
                })
        
        # Продлеваем резервы — с той же проверкой
        for reservation_id in conflicting_reservation_ids:
            reason = await self._check_extension_availability(
                reservation_id, next_working_day, order_type="reservation"
            )
            if reason:
                skipped_reservations.append({"id": reservation_id, "reason": reason})
                continue
            success = await self.reservation_repo.update_reservation_end_date(reservation_id, next_working_day)
            if success:
                extended_reservations.append({
                    "id": reservation_id,
                    "old_end_date": holiday_date,
                    "new_end_date": next_working_day
                })
        
        # Отправляем уведомления пользователям об автоматическом продлении
        if self.notification_service and (extended_rentals or extended_reservations):
            try:
                await self.notification_service.notify_auto_extension(
                    extended_rentals,
                    extended_reservations,
                    holiday_date,
                    next_working_day
                )
            except Exception as e:
                # Логируем ошибку, но не прерываем выполнение
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Ошибка при отправке уведомлений об автоматическом продлении: {e}")
        
        skipped_note = ""
        if skipped_rentals or skipped_reservations:
            skipped_note = (
                f" Пропущено без продления: {len(skipped_rentals)} аренд и "
                f"{len(skipped_reservations)} резервов (конфликт занятости оборудования)."
            )
        return {
            "message": (
                f"Автоматически продлено {len(extended_rentals)} аренд и "
                f"{len(extended_reservations)} резервов.{skipped_note}"
            ),
            "next_working_day": next_working_day,
            "extended_rentals": extended_rentals,
            "extended_reservations": extended_reservations,
            "skipped_rentals": skipped_rentals,
            "skipped_reservations": skipped_reservations,
        }

    async def _check_extension_availability(
        self, order_id: int, next_working_day: date, order_type: str
    ) -> "str | None":
        """Проверяет, свободно ли оборудование заказа на интервал продления.

        Возвращает None, если продление допустимо, иначе текст причины отказа
        (заказ не продлевается — овербукинг не создаётся).
        """
        if self._order_validator is None:
            # Валидатор не настроен — продление запрещено: не создаём овербукинг вслепую
            return "валидатор доступности оборудования не настроен"

        if order_type == "rental":
            rental = await self.rental_repo.get_by_id_with_details(order_id)
            if rental is None:
                return "аренда не найдена"
            equipment_ids = [eq.id for eq in rental.equipment]
            start_date = rental.start_date
            exclude = {"exclude_rental_id": order_id}
        else:
            reservation = await self.reservation_repo.get_by_id(order_id)
            if reservation is None:
                return "резерв не найден"
            equipment_ids = [eq.id for eq in reservation.equipment]
            start_date = reservation.start_date
            exclude = {"exclude_reservation_id": order_id}

        if not equipment_ids:
            return None

        try:
            await self._order_validator.validate_equipment_availability(
                equipment_ids, start_date, next_working_day, **exclude
            )
            return None
        except HTTPException as e:
            return e.detail if isinstance(e.detail, str) else str(e.detail)
