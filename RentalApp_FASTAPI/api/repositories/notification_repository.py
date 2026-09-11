# api/repositories/notification_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from .base_repository import BaseRepository
from api.models.user import User
from api.models.rental import Rental
from api.models.reservation import Reservation


class NotificationRepository(BaseRepository):
    """
    Репозиторий для работы с данными уведомлений.
    Инкапсулирует методы получения сущностей для NotificationService.
    """
    
    def __init__(self, db: AsyncSession):
        # NotificationRepository не привязан к одной модели, поэтому передаем None
        super().__init__(db, None)
    
    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Получает пользователя по ID.
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Объект пользователя или None, если не найден
        """
        try:
            result = await self.db.execute(
                select(User).filter(User.id == user_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Ошибка при получении пользователя {user_id}: {e}", exc_info=True)
            return None
    
    async def get_rentals_by_ids(self, rental_ids: list) -> list:
        """Аренды по списку ID одним запросом."""
        if not rental_ids:
            return []
        result = await self.db.execute(
            select(Rental).where(Rental.id.in_(rental_ids))
        )
        return result.scalars().all()

    async def get_reservations_by_ids(self, reservation_ids: list) -> list:
        """Резервы по списку ID одним запросом."""
        if not reservation_ids:
            return []
        result = await self.db.execute(
            select(Reservation).where(Reservation.id.in_(reservation_ids))
        )
        return result.scalars().all()

    async def get_rental_by_id(self, rental_id: int) -> Optional[Rental]:
        """
        Получает аренду по ID.
        
        Args:
            rental_id: ID аренды
            
        Returns:
            Объект аренды или None, если не найден
        """
        try:
            result = await self.db.execute(
                select(Rental).filter(Rental.id == rental_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Ошибка при получении аренды {rental_id}: {e}", exc_info=True)
            return None
    
    async def get_reservation_by_id(self, reservation_id: int) -> Optional[Reservation]:
        """
        Получает резерв по ID.
        
        Args:
            reservation_id: ID резерва
            
        Returns:
            Объект резерва или None, если не найден
        """
        try:
            result = await self.db.execute(
                select(Reservation).filter(Reservation.id == reservation_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Ошибка при получении резерва {reservation_id}: {e}", exc_info=True)
            return None
