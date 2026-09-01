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
    
    def __init__(self, db: AsyncSession, repo: HolidayRepository, rental_repo=None, reservation_repo=None, notification_service=None):
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
        
        # Генерируем выходные для указанного дня недели в диапазоне дат
        holidays_to_create = []
        current_date = rule_in.start_date
        
        while current_date <= rule_in.end_date:
            if current_date.weekday() == rule_in.day_of_week:
                # Проверяем, не существует ли уже такой выходной
                existing_holiday = await self.repo.find_holiday_by_date(current_date)
                if not existing_holiday:
                    holidays_to_create.append(
                        Holiday(
                            date=current_date,
                            description=f"Авто (правило #{new_rule.id})",
                            created_by_id=current_user.id,
                            rule_id=new_rule.id
                        )
                    )
            current_date += timedelta(days=1)
        
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
        
        # Создаем выходные для каждого праздника
        holidays_to_create = []
        for holiday_date, holiday_name in public_holidays.items():
            # Проверяем, не существует ли уже такой выходной
            existing_holiday = await self.repo.find_holiday_by_date(holiday_date)
            if not existing_holiday:
                holidays_to_create.append(
                    Holiday(
                        date=holiday_date,
                        description=holiday_name,
                        created_by_id=current_user.id,
                        rule_id=new_rule.id
                    )
                )
        
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
            return {"message": "Репозитории не инициализированы", "extended_rentals": [], "extended_reservations": []}
        
        # Находим следующий рабочий день
        next_working_day = await self.repo.find_next_working_day(holiday_date + timedelta(days=1))
        
        # Находим конфликтующие аренды и резервы
        conflicting_rental_ids = await self.repo.check_conflicting_rentals(holiday_date)
        conflicting_reservation_ids = await self.repo.check_conflicting_reservations_end_date(holiday_date)
        
        extended_rentals = []
        extended_reservations = []
        
        # Продлеваем аренды
        for rental_id in conflicting_rental_ids:
            success = await self.rental_repo.update_rental_end_date(rental_id, next_working_day)
            if success:
                extended_rentals.append({
                    "id": rental_id,
                    "old_end_date": holiday_date,
                    "new_end_date": next_working_day
                })
        
        # Продлеваем резервы
        for reservation_id in conflicting_reservation_ids:
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
        
        return {
            "message": f"Автоматически продлено {len(extended_rentals)} аренд и {len(extended_reservations)} резервов",
            "next_working_day": next_working_day,
            "extended_rentals": extended_rentals,
            "extended_reservations": extended_reservations
        }
