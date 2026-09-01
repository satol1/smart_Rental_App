# api/repositories/reservation_availability_repository.py

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, and_, exists
from datetime import date

from api.models.reservation import Reservation
from api.models.equipment import Equipment
from shared.constants.order_status import OrderStatus
from .reservation_base_repository import ReservationBaseRepository


class ReservationAvailabilityRepository(ReservationBaseRepository):
    """
    Репозиторий для проверки доступности оборудования.
    Содержит методы для проверки конфликтов резервирования.
    """

    async def get_reservations_for_availability_check(
        self, 
        equipment_ids: List[int], 
        start_date: date, 
        end_date: date, 
        exclude_reservation_id: Optional[int] = None
    ) -> List[Reservation]:
        """
        Получение резервов для проверки доступности оборудования.
        Использует оптимизированный запрос с EXISTS для лучшей производительности.
        
        Args:
            equipment_ids: Список ID оборудования для проверки
            start_date: Начальная дата периода
            end_date: Конечная дата периода
            exclude_reservation_id: ID резерва для исключения из проверки
            
        Returns:
            Список резервов, которые пересекаются с указанным периодом
        """
        from api.models.reservation import reservation_equipment_association
        
        # ОПТИМИЗАЦИЯ: Используем EXISTS вместо ANY для лучшей производительности
        query = select(Reservation).options(
            selectinload(Reservation.equipment)
        ).filter(
            Reservation.end_date > start_date,
            Reservation.start_date < end_date,
            Reservation.status == OrderStatus.ACTIVE
        ).where(
            exists().where(
                and_(
                    reservation_equipment_association.c.reservation_id == Reservation.id,
                    reservation_equipment_association.c.equipment_id.in_(equipment_ids)
                )
            )
        )
        
        # Исключаем конкретный резерв из проверки (для обновления)
        if exclude_reservation_id:
            query = query.filter(Reservation.id != exclude_reservation_id)
        
        result = await self.db.execute(query)
        return result.unique().scalars().all()

    async def check_equipment_availability(
        self,
        equipment_ids: List[int],
        start_date: date,
        end_date: date,
        exclude_reservation_id: Optional[int] = None
    ) -> bool:
        """
        Проверка доступности оборудования в указанном периоде.
        
        Args:
            equipment_ids: Список ID оборудования для проверки
            start_date: Начальная дата периода
            end_date: Конечная дата периода
            exclude_reservation_id: ID резерва для исключения из проверки
            
        Returns:
            True, если оборудование доступно, False - если занято
        """
        conflicting_reservations = await self.get_reservations_for_availability_check(
            equipment_ids, start_date, end_date, exclude_reservation_id
        )
        return len(conflicting_reservations) == 0

    async def get_equipment_conflicts(
        self,
        equipment_ids: List[int],
        start_date: date,
        end_date: date,
        exclude_reservation_id: Optional[int] = None
    ) -> List[Reservation]:
        """
        Получение списка конфликтующих резервов для указанного оборудования.
        
        Args:
            equipment_ids: Список ID оборудования для проверки
            start_date: Начальная дата периода
            end_date: Конечная дата периода
            exclude_reservation_id: ID резерва для исключения из проверки
            
        Returns:
            Список резервов, которые конфликтуют с указанным периодом
        """
        return await self.get_reservations_for_availability_check(
            equipment_ids, start_date, end_date, exclude_reservation_id
        )
