# api/repositories/calendar_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from typing import Optional

from .base_repository import BaseRepository
from api.models.reservation import Reservation
from api.models.rental import Rental
from api.models.equipment import Equipment as ApiEquipment


class CalendarRepository(BaseRepository):
    """
    Репозиторий для работы с календарными данными.
    Инкапсулирует методы получения деталей заказов для CalendarService.
    """
    
    def __init__(self, db: AsyncSession):
        # CalendarRepository не привязан к одной модели, поэтому передаем None
        super().__init__(db, None)
    
    async def get_reservation_details(self, reservation_id: int) -> Optional[Reservation]:
        """
        Получает резерв с загруженным оборудованием и пользователем.
        
        Args:
            reservation_id: ID резерва
            
        Returns:
            Объект резерва с предзагруженными связями или None, если не найден
        """
        try:
            result = await self.db.execute(
                select(Reservation)
                .options(
                    joinedload(Reservation.equipment).joinedload(ApiEquipment.accessories),
                    joinedload(Reservation.user)
                )
                .filter(Reservation.id == reservation_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Ошибка при получении резерва {reservation_id}: {e}", exc_info=True)
            return None
    
    async def get_rental_details(self, rental_id: int) -> Optional[Rental]:
        """
        Получает аренду с загруженным оборудованием и пользователем.
        
        Args:
            rental_id: ID аренды
            
        Returns:
            Объект аренды с предзагруженными связями или None, если не найден
        """
        try:
            result = await self.db.execute(
                select(Rental)
                .options(
                    joinedload(Rental.equipment).joinedload(ApiEquipment.accessories),
                    joinedload(Rental.user)
                )
                .filter(Rental.id == rental_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Ошибка при получении аренды {rental_id}: {e}", exc_info=True)
            return None
    
    async def get_equipment_by_id(self, equipment_id: int) -> Optional[ApiEquipment]:
        """
        Получает оборудование по ID.
        
        Args:
            equipment_id: ID оборудования
            
        Returns:
            Объект оборудования или None, если не найден
        """
        try:
            result = await self.db.execute(
                select(ApiEquipment).filter(ApiEquipment.id == equipment_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Ошибка при получении оборудования {equipment_id}: {e}", exc_info=True)
            return None
