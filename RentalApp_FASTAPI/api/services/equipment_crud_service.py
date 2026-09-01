# api/services/equipment_crud_service.py

from typing import Type
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from api.models.equipment import Equipment
from api.repositories.equipment_repository import EquipmentRepository
from shared.schemas.equipment_schema import EquipmentUpdateExtended, EquipmentCopyRequest


class EquipmentCRUDService:
    """Сервис для базовых CRUD операций с оборудованием."""
    
    def __init__(self, db: AsyncSession, repo: EquipmentRepository):
        self.db = db
        self.repo = repo
    
    async def get_all_equipment(self) -> list[Type[Equipment]]:
        """Возвращает QuerySet всего оборудования с подгрузкой связей."""
        equipment_list = await self.repo.get_all_with_details()
        
        # Дополнительная защита: убеждаемся, что все поля корректны
        self._validate_equipment_fields(equipment_list)
        
        return equipment_list
    
    async def get_equipment_by_id(self, equipment_id: int) -> Equipment:
        """Получает оборудование по ID с загруженными связями."""
        equipment = await self.repo.get_by_id_with_details(equipment_id)
        if not equipment:
            raise HTTPException(status_code=404, detail="Оборудование не найдено")
        return equipment
    
    async def update_equipment_details(self, equipment_id: int, equipment_data: EquipmentUpdateExtended) -> Equipment:
        """Обновляет детали оборудования с обработкой связей."""
        db_equipment = await self.get_equipment_by_id(equipment_id)
        
        # Используем метод репозитория для обновления с обработкой связей
        updated_equipment = await self.repo.update_with_relations(db_equipment, equipment_data)
        # Коммитим транзакцию для сохранения изменений в базе данных
        # Транзакция коммитится middleware
        return updated_equipment

    async def create_equipment(self, equipment_data) -> Equipment:
        """Создает новое оборудование."""
        equipment = await self.repo.create(equipment_data)
        # Коммитим транзакцию для сохранения изменений в базе данных
        # Транзакция коммитится middleware
        return equipment

    async def delete_equipment(self, equipment_id: int) -> None:
        """Удаляет оборудование."""
        # Проверяем, существует ли оборудование
        equipment = await self.repo.get_by_id(equipment_id)
        if not equipment:
            raise HTTPException(status_code=404, detail="Оборудование не найдено")
        
        await self.repo.delete(equipment_id)
        # Коммитим транзакцию для сохранения изменений в базе данных
        # Транзакция коммитится middleware
    
    
    async def copy_equipment(self, source_id: int, copy_data: EquipmentCopyRequest) -> Equipment:
        """Копирует оборудование через репозиторий"""
        return await self.repo.copy_equipment(source_id, copy_data)
    
    def _validate_equipment_fields(self, equipment_list: list[Equipment]) -> None:
        """Валидирует и исправляет поля оборудования."""
        for equipment in equipment_list:
            if equipment.name is None:
                equipment.name = "Неизвестное оборудование"
            if equipment.daily_rate is None:
                equipment.daily_rate = 0.0
            if equipment.condition is None:
                equipment.condition = "Великолепно"
