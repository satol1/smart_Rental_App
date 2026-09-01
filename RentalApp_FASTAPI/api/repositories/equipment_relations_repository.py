# api/repositories/equipment_relations_repository.py

from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from .equipment_base_repository import EquipmentBaseRepository
from api.models.equipment import Equipment
from api.models.accessory import Accessory
from api.models.association import Association
from shared.schemas.equipment_schema import EquipmentUpdateExtended

logger = logging.getLogger(__name__)


class EquipmentRelationsRepository(EquipmentBaseRepository):
    """
    Репозиторий для работы со связями оборудования.
    Содержит методы для обновления аксессуаров и ассоциаций оборудования.
    """

    async def update_with_relations(
        self, 
        db_obj: Equipment, 
        update_data: EquipmentUpdateExtended
    ) -> Equipment:
        """
        Обновление оборудования с обработкой связей "многие-ко-многим".
        Воспроизводит логику из equipment_crud_service.py.
        
        Args:
            db_obj: Существующий объект Equipment
            update_data: Данные для обновления
            
        Returns:
            Обновленный объект Equipment
        """
        update_dict = update_data.model_dump(exclude_unset=True)

        try:
            # Обработка аксессуаров
            if "accessory_ids" in update_dict:
                await self._update_accessories(db_obj, update_dict.pop("accessory_ids"))
            
            # Обработка ассоциаций
            if "association_ids" in update_dict:
                await self._update_associations(db_obj, update_dict.pop("association_ids"))

            # Обновление остальных полей
            for key, value in update_dict.items():
                if hasattr(db_obj, key):
                    setattr(db_obj, key, value)

            # Добавляем в сессию для отслеживания изменений
            self.db.add(db_obj)
            await self.db.flush()
            await self.db.refresh(db_obj)
            
            # Возвращаем обновленный объект с загруженными данными
            updated_equipment = await self.get_by_id_with_details(db_obj.id)
            return updated_equipment
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Ошибка при обновлении оборудования {db_obj.id}: {e}")
            raise e

    async def _update_accessories(self, equipment: Equipment, accessory_ids: List[int]) -> None:
        """
        Обновляет аксессуары оборудования.
        """
        equipment.accessories.clear()
        await self.db.flush()
        
        if accessory_ids:
            accessories_result = await self.db.execute(
                select(Accessory).filter(Accessory.id.in_(accessory_ids))
            )
            found_accessories = accessories_result.unique().scalars().all()
            
            if len(found_accessories) != len(accessory_ids):
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=404, 
                    detail="Один или несколько аксессуаров с указанными ID не найдены"
                )
            
            equipment.accessories.extend(found_accessories)

    async def _update_associations(self, equipment: Equipment, association_ids: List[int]) -> None:
        """
        Обновляет ассоциации оборудования.
        """
        equipment.associations.clear()
        await self.db.flush()
        
        if association_ids:
            associations_result = await self.db.execute(
                select(Association).filter(Association.id.in_(association_ids))
            )
            found_associations = associations_result.unique().scalars().all()
            
            if len(found_associations) != len(association_ids):
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=404, 
                    detail="Одна или несколько ассоциаций с указанными ID не найдены"
                )
            
            equipment.associations.extend(found_associations)

    async def get_accessories_by_ids(self, accessory_ids: List[int]) -> List[Accessory]:
        """
        Получает аксессуары по списку ID.
        Используется в сервисах заказов.
        
        Args:
            accessory_ids: Список ID аксессуаров
            
        Returns:
            Список объектов Accessory
        """
        if not accessory_ids:
            return []

        result = await self.db.execute(
            select(Accessory).filter(Accessory.id.in_(accessory_ids))
        )
        return result.unique().scalars().all()
