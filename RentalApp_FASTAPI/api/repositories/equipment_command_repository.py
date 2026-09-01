# api/repositories/equipment_command_repository.py

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from .equipment_base_repository import EquipmentBaseRepository
from api.models.equipment import Equipment
from api.models.brand_system import BrandSystem
from shared.schemas.equipment_schema import EquipmentCreate, EquipmentCopyRequest

logger = logging.getLogger(__name__)


class EquipmentCommandRepository(EquipmentBaseRepository):
    """
    Репозиторий для операций создания и обновления оборудования.
    Содержит методы для создания оборудования с автоматическим созданием систем брендов.
    """

    async def create(self, data: EquipmentCreate) -> Equipment:
        """
        Создает новое оборудование и автоматически создает 
        соответствующую 'Систему Бренда', если она не существует.
        """
        # 1. Вызываем базовый метод для создания самого оборудования
        # Он добавит объект в сессию, но еще не закоммитит транзакцию.
        new_equipment = await super().create(data)
        
        # 2. Получаем название бренда из созданного объекта
        brand_name = new_equipment.brand
        if brand_name:
            # 3. Проверяем, существует ли уже такая система бренда
            existing_system_res = await self.db.execute(
                select(BrandSystem).filter_by(name=brand_name)
            )
            existing_system = existing_system_res.scalar_one_or_none()

            # 4. Если не существует - создаем новую и добавляем в ту же сессию
            if not existing_system:
                new_brand_system = BrandSystem(
                    name=brand_name,
                    description=f"Автоматически созданная система для бренда {brand_name}"
                )
                self.db.add(new_brand_system)
                logger.info(f"Добавлена новая Система Бренда '{brand_name}' в транзакцию.")

        # 5. Возвращаем созданный объект оборудования.
        # Финальный коммит произойдет на уровне сервиса, что атомарно сохранит
        # и новое оборудование, и (если нужно) новую систему бренда.
        return new_equipment

    async def copy_equipment(self, source_id: int, copy_data: EquipmentCopyRequest) -> Equipment:
        """
        Копирует оборудование с возможностью изменения некоторых полей.
        Автоматически создает систему бренда если нужно.
        """
        # 1. Получить исходное оборудование с связями
        source_equipment = await self.get_by_id_with_details(source_id)
        if not source_equipment:
            raise ValueError(f"Оборудование с ID {source_id} не найдено")

        # 2. Создать новый объект с копированием полей
        new_equipment_data = EquipmentCreate(
            equipment_type=source_equipment.equipment_type,
            brand=source_equipment.brand,
            name=copy_data.name or f"{source_equipment.name} (копия)",
            serial_number=copy_data.serial_number or None,  # Очищаем серийный номер
            condition=source_equipment.condition,
            daily_rate=source_equipment.daily_rate,
            notes=copy_data.notes or f"Скопировано из ID: {source_id}",
            description=source_equipment.description,
            last_maintenance=source_equipment.last_maintenance,
            image_url=source_equipment.image_url,
            image_urls=source_equipment.image_urls,
            short_description=source_equipment.short_description
        )

        # 3. Создать новое оборудование
        new_equipment = await self.create(new_equipment_data)

        # 4. Копировать связи (аксессуары, ассоциации)
        # Используем правильный способ работы с связями "многие-ко-многим"
        if source_equipment.accessories:
            # Получаем ID аксессуаров и добавляем их через SQL
            accessory_ids = [accessory.id for accessory in source_equipment.accessories]
            logger.info(f"Копируем {len(accessory_ids)} аксессуаров: {accessory_ids}")
            if accessory_ids:
                # Добавляем связи через SQL запрос
                from sqlalchemy import text
                for accessory_id in accessory_ids:
                    logger.info(f"Добавляем связь: equipment_id={new_equipment.id}, accessory_id={accessory_id}")
                    await self.db.execute(
                        text("INSERT INTO equipment_accessories (equipment_id, accessory_id) VALUES (:equipment_id, :accessory_id)"),
                        {"equipment_id": new_equipment.id, "accessory_id": accessory_id}
                    )

        if source_equipment.associations:
            # Получаем ID ассоциаций и добавляем их через SQL
            association_ids = [association.id for association in source_equipment.associations]
            if association_ids:
                # Добавляем связи через SQL запрос
                from sqlalchemy import text
                for association_id in association_ids:
                    await self.db.execute(
                        text("INSERT INTO association_equipment_association (association_id, equipment_id) VALUES (:association_id, :equipment_id)"),
                        {"association_id": association_id, "equipment_id": new_equipment.id}
                    )

        # 5. Обновляем объект из базы данных с загруженными связями
        await self.db.refresh(new_equipment)
        
        # 6. Загружаем связи явно
        from sqlalchemy.orm import selectinload
        from sqlalchemy import select
        result = await self.db.execute(
            select(Equipment)
            .filter(Equipment.id == new_equipment.id)
            .options(
                selectinload(Equipment.accessories),
                selectinload(Equipment.associations)
            )
        )
        new_equipment_with_relations = result.scalars().first()
        
        logger.info(f"Скопировано оборудование ID {source_id} -> ID {new_equipment.id}")
        return new_equipment_with_relations
