# api/repositories/holiday_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Tuple, Optional
from datetime import date

from api.models.holiday import Holiday, HolidayRule
from api.models.reservation import Reservation


class HolidayRepository:
    """Репозиторий для работы с выходными днями и правилами их генерации."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_holidays_paginated(
        self, 
        start_date: date, 
        end_date: date, 
        skip: int, 
        limit: int
    ) -> Tuple[List[Holiday], int]:
        """Получает страницу выходных в диапазоне дат и их общее количество."""
        # Запрос для получения общего количества выходных в диапазоне
        total_result = await self.db.execute(
            select(func.count(Holiday.date)).filter(Holiday.date.between(start_date, end_date))
        )
        total_holidays = total_result.scalar_one()
        
        # Запрос для получения "страницы" выходных
        holidays_result = await self.db.execute(
            select(Holiday).filter(Holiday.date.between(start_date, end_date)).offset(skip).limit(limit)
        )
        holidays_orm = holidays_result.scalars().all()
        
        return holidays_orm, total_holidays
    
    async def get_rules_paginated(
        self, 
        skip: int, 
        limit: int
    ) -> Tuple[List[HolidayRule], int]:
        """Получает страницу правил генерации выходных."""
        # Запрос для получения общего количества правил
        total_result = await self.db.execute(select(func.count(HolidayRule.id)))
        total_rules = total_result.scalar_one()
        
        # Запрос для получения "страницы" правил
        rules_result = await self.db.execute(
            select(HolidayRule).order_by(HolidayRule.created_at.desc()).offset(skip).limit(limit)
        )
        rules_orm = rules_result.scalars().all()
        
        return rules_orm, total_rules
    
    async def find_holiday_by_date(self, holiday_date: date) -> Optional[Holiday]:
        """Находит выходной по конкретной дате."""
        result = await self.db.execute(select(Holiday).filter(Holiday.date == holiday_date))
        return result.scalars().first()
    
    async def find_rule_by_id(self, rule_id: int) -> Optional[HolidayRule]:
        """Находит правило по его ID."""
        result = await self.db.execute(select(HolidayRule).filter(HolidayRule.id == rule_id))
        return result.scalars().first()
    
    async def check_conflicting_reservations(self, holiday_date: date) -> List[int]:
        """Находит ID резервов, которые начинаются или заканчиваются в указанную дату."""
        conflicting_result = await self.db.execute(
            select(Reservation.id).filter(
                (Reservation.start_date == holiday_date) | (Reservation.end_date == holiday_date)
            )
        )
        return list(conflicting_result.scalars().all())
    
    async def save_holiday(self, holiday: Holiday) -> Holiday:
        """Сохраняет один объект Holiday (flush без commit — транзакцию держит middleware)."""
        self.db.add(holiday)
        await self.db.flush()
        return holiday

    async def save_rule(self, rule: HolidayRule) -> HolidayRule:
        """Сохраняет один объект HolidayRule."""
        self.db.add(rule)
        await self.db.flush()  # Используем flush для получения ID без коммита
        return rule

    async def bulk_save_holidays(self, holidays: List[Holiday]):
        """Сохраняет список объектов Holiday с помощью db.add_all() единым flush."""
        if holidays:
            self.db.add_all(holidays)
            await self.db.flush()

    async def delete_holiday(self, holiday: Holiday):
        """Удаляет объект Holiday."""
        await self.db.delete(holiday)
        await self.db.flush()

    async def delete_rule(self, rule: HolidayRule):
        """Удаляет объект HolidayRule."""
        await self.db.delete(rule)
        await self.db.flush()
    
    async def is_holiday(self, date: date) -> bool:
        """Проверяет, является ли дата выходным днем."""
        result = await self.db.execute(
            select(Holiday).filter(Holiday.date == date)
        )
        return result.scalar_one_or_none() is not None
    
    async def get_holidays_in_range(self, start_date: date, end_date: date) -> List[Holiday]:
        """Получает все выходные дни в диапазоне."""
        result = await self.db.execute(
            select(Holiday).filter(
                Holiday.date >= start_date,
                Holiday.date <= end_date
            )
        )
        return result.scalars().all()
    
    async def find_next_working_day(self, start_date: date) -> date:
        """Находит ближайший рабочий день."""
        from datetime import timedelta
        
        next_day = start_date
        max_iterations = 365
        iterations = 0
        
        while iterations < max_iterations:
            if not await self.is_holiday(next_day):
                break
            next_day += timedelta(days=1)
            iterations += 1
            
        return next_day
    
    async def check_conflicting_rentals(self, holiday_date: date) -> List[int]:
        """Находит ID аренд, которые заканчиваются в указанную дату."""
        from api.models.rental import Rental
        from shared.constants.order_status import OrderStatus
        
        conflicting_result = await self.db.execute(
            select(Rental.id).filter(
                Rental.end_date == holiday_date,
                Rental.status.in_([OrderStatus.ACTIVE, OrderStatus.OVERDUE])
            )
        )
        return list(conflicting_result.scalars().all())
    
    async def check_conflicting_reservations_end_date(self, holiday_date: date) -> List[int]:
        """Находит ID резервов, которые заканчиваются в указанную дату."""
        from api.models.reservation import Reservation
        from shared.constants.order_status import OrderStatus
        
        conflicting_result = await self.db.execute(
            select(Reservation.id).filter(
                Reservation.end_date == holiday_date,
                Reservation.status.in_([OrderStatus.ACTIVE])
            )
        )
        return list(conflicting_result.scalars().all())