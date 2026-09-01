# api/repositories/rental_base_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select
from typing import Optional
import logging

from .base_repository import BaseRepository
from api.models.rental import Rental, RentalAccessory
from api.models.equipment import Equipment

logger = logging.getLogger(__name__)


class RentalBaseRepository(BaseRepository[Rental, None, None]):
    """
    Базовый репозиторий для работы с арендами.
    Содержит основные CRUD операции и базовые методы получения данных.
    """

    def __init__(self, db: AsyncSession):
        super().__init__(db, model=Rental)

    async def get_by_id_with_details(self, rental_id: int) -> Optional[Rental]:
        """
        Находит аренду по ID с обязательной предзагрузкой всех связанных данных.
        
        Args:
            rental_id: ID аренды
            
        Returns:
            Объект аренды с предзагруженными связями или None
        """
        query = select(Rental).options(
            joinedload(Rental.user),
            joinedload(Rental.created_by),
            selectinload(Rental.equipment).options(
                selectinload(Equipment.accessories),
                selectinload(Equipment.associations)
            ),
            joinedload(Rental.accessory_links).joinedload(RentalAccessory.accessory),
            joinedload(Rental.reservation),
            joinedload(Rental.payments),
            joinedload(Rental.balance_history)
        ).filter(Rental.id == rental_id)

        result = await self.db.execute(query)
        return result.unique().scalar_one_or_none()

    async def get_rental_by_id_or_fail(self, rental_id: int) -> Rental:
        """
        Получает аренду по ID или выбрасывает исключение.
        Использует get_by_id_with_details для предзагрузки связей.
        
        Args:
            rental_id: ID аренды
            
        Returns:
            Объект аренды с предзагруженными связями
            
        Raises:
            HTTPException: Если аренда не найдена
        """
        from fastapi import HTTPException, status
        
        rental = await self.get_by_id_with_details(rental_id)
        if not rental:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"Rental with ID {rental_id} not found."
            )
        return rental

    async def save_rental(self, rental: Rental) -> Rental:
        """
        Сохраняет аренду.
        
        Args:
            rental: Объект аренды для сохранения
            
        Returns:
            Сохраненный объект аренды
        """
        if isinstance(rental, Rental) and rental.accessory_links:
            accessory_ids = [link.accessory_id for link in rental.accessory_links]
            logger.info(f"ТОЧКА 2 (СОХРАНЕНИЕ): Перед добавлением в сессию аренда #{rental.id} имеет аксессуары с ID: {accessory_ids}")
        self.db.add(rental)
        await self.db.flush()
        return rental

    async def delete_rental(self, rental: Rental):
        """
        Удаляет аренду.
        
        Args:
            rental: Объект аренды для удаления
        """
        await self.db.delete(rental)
        await self.db.flush()
