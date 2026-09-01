# api/repositories/equipment_base_repository.py

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
import logging

from .base_repository import BaseRepository
from api.models.equipment import Equipment
from shared.schemas.equipment_schema import EquipmentCreate, EquipmentUpdateExtended

logger = logging.getLogger(__name__)


class EquipmentBaseRepository(BaseRepository[Equipment, EquipmentCreate, EquipmentUpdateExtended]):
    """
    Базовый репозиторий для работы с оборудованием.
    Содержит основные CRUD операции и базовые методы получения данных.
    """

    def __init__(self, db: AsyncSession):
        super().__init__(db, Equipment)

    async def get_by_id_with_details(self, equipment_id: int) -> Optional[Equipment]:
        """
        Получение оборудования по ID с обязательной предзагрузкой связей.
        
        Args:
            equipment_id: ID оборудования
            
        Returns:
            Объект Equipment с загруженными связями или None
        """
        result = await self.db.execute(
            select(Equipment)
            .filter(Equipment.id == equipment_id)
            .options(
                selectinload(Equipment.accessories),
                selectinload(Equipment.associations)
            )
        )
        equipment = result.scalars().first()
        return equipment

    async def get_equipment_by_id_or_fail(self, equipment_id: int) -> Equipment:
        """
        Получает оборудование по ID или выбрасывает исключение.
        
        Args:
            equipment_id: ID оборудования
            
        Returns:
            Объект Equipment
            
        Raises:
            HTTPException: Если оборудование не найдено
        """
        from fastapi import HTTPException, status
        
        equipment = await self.get_by_id_with_details(equipment_id)
        if not equipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"Equipment with ID {equipment_id} not found."
            )
        return equipment

    async def save_equipment(self, equipment: Equipment):
        """
        Сохраняет оборудование.
        
        Args:
            equipment: Объект оборудования для сохранения
        """
        self.db.add(equipment)
        await self.db.flush()

    async def delete_equipment(self, equipment: Equipment):
        """
        Удаляет оборудование.
        
        Args:
            equipment: Объект оборудования для удаления
        """
        await self.db.delete(equipment)
        await self.db.flush()

    async def delete(self, equipment_id: int) -> None:
        """
        Удаление оборудования по ID.
        
        Args:
            equipment_id: ID оборудования для удаления
        """
        equipment = await self.get_by_id(equipment_id)
        if equipment:
            await self.db.delete(equipment)
            await self.db.flush()
