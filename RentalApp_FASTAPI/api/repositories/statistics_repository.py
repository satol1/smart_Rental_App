# api/repositories/statistics_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date, timedelta
from typing import List, Optional

from api.models.user import User
from api.models.equipment import Equipment
from api.models.reservation import Reservation
from api.models.rental import Rental
from api.models.accessory import Accessory
from api.models.association import Association
from shared.constants.order_status import OrderStatus


class StatisticsRepository:
    """Репозиторий для статистических запросов."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_user_count(self) -> int:
        """Получает общее количество пользователей."""
        result = await self.db.execute(select(func.count(User.id)))
        return int(result.scalar_one())
    
    async def get_active_users_count(self, days: int = 30) -> int:
        """Получает количество активных пользователей за указанный период."""
        cutoff_date = date.today() - timedelta(days=days)
        
        # Пользователи с активными резервациями
        active_reservations_query = select(User.id).join(
            Reservation, User.id == Reservation.user_id
        ).filter(
            and_(
                Reservation.created_at >= cutoff_date,
                Reservation.status.in_([OrderStatus.ACTIVE, OrderStatus.FULFILLED, OrderStatus.CANCELLED])
            )
        )
        
        # Пользователи с активными арендами
        active_rentals_query = select(User.id).join(
            Rental, User.id == Rental.user_id
        ).filter(
            and_(
                Rental.created_at >= cutoff_date,
                Rental.status.in_([OrderStatus.ACTIVE, OrderStatus.COMPLETED])
            )
        )
        
        reservations_result = await self.db.execute(active_reservations_query)
        rentals_result = await self.db.execute(active_rentals_query)
        
        active_user_ids = set()
        for row in reservations_result:
            active_user_ids.add(row.id)
        for row in rentals_result:
            active_user_ids.add(row.id)
            
        return len(active_user_ids)
    
    async def get_equipment_count(self) -> int:
        """Получает общее количество оборудования."""
        result = await self.db.execute(select(func.count(Equipment.id)))
        return int(result.scalar_one())
    
    async def get_reservations_count(self) -> int:
        """Получает общее количество резерваций."""
        result = await self.db.execute(select(func.count(Reservation.id)))
        return int(result.scalar_one())
    
    async def get_rentals_count(self) -> int:
        """Получает общее количество аренд."""
        result = await self.db.execute(select(func.count(Rental.id)))
        return int(result.scalar_one())
    
    async def get_revenue_today(self) -> float:
        """Получает доход за сегодня."""
        today = date.today()
        result = await self.db.execute(
            select(func.coalesce(func.sum(Rental.final_cost), 0)).filter(
                and_(
                    Rental.status == OrderStatus.COMPLETED,
                    func.date(Rental.actual_return_date) == today
                )
            )
        )
        return float(result.scalar_one())
    
    async def get_revenue_this_month(self) -> float:
        """Получает доход за текущий месяц."""
        today = date.today()
        first_day_of_month = today.replace(day=1)
        
        result = await self.db.execute(
            select(func.coalesce(func.sum(Rental.final_cost), 0)).filter(
                and_(
                    Rental.status == OrderStatus.COMPLETED,
                    Rental.actual_return_date >= first_day_of_month,
                    Rental.actual_return_date <= today
                )
            )
        )
        return float(result.scalar_one())
    
    async def get_occupancy_rate(self) -> float:
        """Рассчитывает коэффициент загруженности оборудования."""
        today = date.today()
        
        # Получаем общее количество оборудования
        total_result = await self.db.execute(select(func.count(Equipment.id)))
        total_equipment = total_result.scalar_one()
        
        if total_equipment == 0:
            return 0.0
        
        # Получаем уникальное оборудование из активных резерваций и аренд
        from api.models.reservation import reservation_equipment_association
        from api.models.rental import rental_equipment_association
        
        active_reservations_query = select(reservation_equipment_association.c.equipment_id).join(
            Reservation, 
            reservation_equipment_association.c.reservation_id == Reservation.id
        ).filter(
            and_(
                Reservation.start_date <= today,
                Reservation.end_date >= today,
                Reservation.status == OrderStatus.ACTIVE
            )
        )
        
        active_rentals_query = select(rental_equipment_association.c.equipment_id).join(
            Rental,
            rental_equipment_association.c.rental_id == Rental.id
        ).filter(
            and_(
                Rental.start_date <= today,
                Rental.end_date >= today,
                Rental.status == OrderStatus.ACTIVE
            )
        )
        
        reservations_result = await self.db.execute(active_reservations_query)
        rentals_result = await self.db.execute(active_rentals_query)
        
        reservation_equipment_ids = set(row.equipment_id for row in reservations_result)
        rental_equipment_ids = set(row.equipment_id for row in rentals_result)
        
        unique_equipment_ids = reservation_equipment_ids.union(rental_equipment_ids)
        unique_equipment = len(unique_equipment_ids)
        
        return (unique_equipment / total_equipment) * 100
    
    async def get_avg_rental_duration(self) -> float:
        """Рассчитывает среднюю продолжительность аренды в днях."""
        result = await self.db.execute(
            select(func.avg(
                Rental.actual_return_date - Rental.start_date
            )).filter(
                and_(
                    Rental.status == OrderStatus.COMPLETED,
                    Rental.actual_return_date.isnot(None)
                )
            )
        )
        avg_duration = result.scalar_one()
        return float(avg_duration) if avg_duration is not None else 0.0
    
    async def get_active_reservations_count(self) -> int:
        """Получает количество активных резервов."""
        today = date.today()
        result = await self.db.execute(
            select(func.count(Reservation.id)).filter(
                and_(
                    Reservation.status == OrderStatus.ACTIVE,
                    Reservation.end_date >= today
                )
            )
        )
        return int(result.scalar_one())
    
    async def get_active_rentals_count(self) -> int:
        """Получает количество активных аренд."""
        result = await self.db.execute(
            select(func.count(Rental.id)).filter(Rental.status == OrderStatus.ACTIVE)
        )
        return int(result.scalar_one())
    
    async def get_overdue_rentals_count(self) -> int:
        """Получает количество просроченных аренд."""
        today = date.today()
        result = await self.db.execute(
            select(func.count(Rental.id)).filter(
                and_(
                    Rental.status == OrderStatus.ACTIVE,
                    Rental.end_date < today
                )
            )
        )
        return int(result.scalar_one())
    
    async def get_accessories_count(self) -> int:
        """Получает общее количество аксессуаров."""
        result = await self.db.execute(select(func.count(Accessory.id)))
        return int(result.scalar_one())
    
    async def get_associations_count(self) -> int:
        """Получает общее количество ассоциаций."""
        result = await self.db.execute(select(func.count(Association.id)))
        return int(result.scalar_one())
