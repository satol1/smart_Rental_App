# api/repositories/equipment_repository.py

from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date
import logging

from .equipment_base_repository import EquipmentBaseRepository
from .equipment_query_repository import EquipmentQueryRepository
from .equipment_command_repository import EquipmentCommandRepository
from .equipment_relations_repository import EquipmentRelationsRepository
from api.models.equipment import Equipment
from api.models.accessory import Accessory
from shared.schemas.equipment_schema import EquipmentCreate, EquipmentUpdateExtended, AvailableFilters
from shared.schemas.association_schema import AssociationSimple

logger = logging.getLogger(__name__)


class EquipmentRepository(EquipmentBaseRepository):
    """
    Главный репозиторий для работы с оборудованием.
    Объединяет функциональность всех специализированных репозиториев.
    """

    def __init__(self, db: AsyncSession, query_repo: EquipmentQueryRepository, command_repo: EquipmentCommandRepository, relations_repo: EquipmentRelationsRepository, availability_service=None):
        super().__init__(db)
        # Используем только инъекцию специализированных репозиториев
        self._query_repo = query_repo
        self._command_repo = command_repo
        self._relations_repo = relations_repo

    # Делегируем методы создания к EquipmentCommandRepository
    async def create(self, data: EquipmentCreate) -> Equipment:
        """Создает новое оборудование с автоматическим созданием системы бренда."""
        return await self._command_repo.create(data)

    # Делегируем методы запросов к EquipmentQueryRepository
    async def get_by_id_with_details(self, equipment_id: int) -> Optional[Equipment]:
        """Получение оборудования по ID с обязательной предзагрузкой связей."""
        return await self._query_repo.get_by_id_with_details(equipment_id)

    async def get_filtered_paginated(
        self,
        skip: int = 0,
        limit: int = 10,
        query: Optional[str] = None,
        type: Optional[str] = None,
        brand_system_id: Optional[int] = None,
        association_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        available_only: bool = False,
        group_similar: bool = True,
        include_available_filters: bool = True
    ) -> Tuple[List[Equipment], int, Optional[AvailableFilters]]:
        """Получение отфильтрованного и пагинированного списка оборудования."""
        return await self._query_repo.get_filtered_paginated(
            skip, limit, query, type, brand_system_id, association_id,
            start_date, end_date, available_only, group_similar,
            include_available_filters
        )

    async def get_available_filters(self) -> AvailableFilters:
        """Получает доступные фильтры для каталога оборудования."""
        return await self._query_repo.get_available_filters()

    # Делегируем методы работы со связями к EquipmentRelationsRepository
    async def update_with_relations(
        self, 
        db_obj: Equipment, 
        update_data: EquipmentUpdateExtended
    ) -> Equipment:
        """Обновление оборудования с обработкой связей "многие-ко-многим"."""
        return await self._relations_repo.update_with_relations(db_obj, update_data)

    async def get_equipment_by_ids_or_fail(self, equipment_ids: List[int]) -> List[Equipment]:
        """Получает оборудование по списку ID или выбрасывает исключение."""
        return await self._query_repo.get_equipment_by_ids_or_fail(equipment_ids)

    async def get_by_ids(self, equipment_ids: List[int]) -> List[Equipment]:
        """Получает оборудование по списку ID."""
        return await self._query_repo.get_equipment_by_ids_or_fail(equipment_ids)

    async def get_existing_by_ids(self, equipment_ids: List[int]) -> List[Equipment]:
        """
        Пакетная выборка оборудования по списку ID без ошибки для отсутствующих.
        Отсутствующие ID просто пропускаются (в отличие от get_by_ids /
        get_equipment_by_ids_or_fail). Порядок результата не гарантируется.
        """
        if not equipment_ids:
            return []
        result = await self.db.execute(
            select(Equipment).where(Equipment.id.in_(equipment_ids))
        )
        return list(result.scalars().all())

    async def count_filtered_equipment_excluding_ids(
        self,
        exclude_equipment_ids: List[int],
        query: Optional[str] = None,
        type: Optional[str] = None,
        brand: Optional[str] = None,
        association_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        available_only: bool = False
    ) -> int:
        """Подсчитывает количество отфильтрованного оборудования, исключая указанные ID."""
        return await self._query_repo.count_filtered_equipment_excluding_ids(
            exclude_equipment_ids, query, type, brand, association_id,
            start_date, end_date, available_only
        )

    async def get_accessories_by_ids(self, accessory_ids: List[int]) -> List[Accessory]:
        """Получает аксессуары по списку ID."""
        return await self._relations_repo.get_accessories_by_ids(accessory_ids)

    async def get_all_with_details(self) -> List[Equipment]:
        """
        Получение всего оборудования с предзагрузкой связей accessories и associations.
        
        Returns:
            Список всего оборудования с загруженными связями
        """
        from sqlalchemy.orm import joinedload
        
        result = await self.db.execute(
            select(Equipment).options(
                joinedload(Equipment.accessories),
                joinedload(Equipment.associations)
            )
        )
        return result.unique().scalars().all()

    async def delete(self, equipment_id: int) -> None:
        """Удаление оборудования по ID."""
        return await super().delete(equipment_id)

    async def copy_equipment(self, source_id: int, copy_data) -> Equipment:
        """Копирует оборудование"""
        return await self._command_repo.copy_equipment(source_id, copy_data)

    async def get_available_types(self, conditions: List) -> List[str]:
        """Получает доступные типы оборудования с учетом условий."""
        return await self._query_repo.get_available_types(conditions)

    async def get_available_brands(self, conditions: List) -> List[str]:
        """Получает доступные бренды оборудования с учетом условий."""
        return await self._query_repo.get_available_brands(conditions)

    async def get_available_associations(self, conditions: List) -> List[AssociationSimple]:
        """Получает доступные ассоциации оборудования с учетом условий."""
        return await self._query_repo.get_available_associations(conditions)
    
    async def get_equipment_ids_by_conditions(self, conditions: List) -> List[int]:
        """Получает ID оборудования, которое соответствует условиям."""
        return await self._query_repo.get_equipment_ids_by_conditions(conditions)
    
    async def get_similar_equipment(self, equipment_type: str, brand: str, name: str, exclude_id: Optional[int] = None) -> List[Equipment]:
        """Находит похожее оборудование по типу, бренду и названию."""
        from sqlalchemy import and_
        
        query = select(Equipment).filter(
            and_(
                Equipment.equipment_type == equipment_type,
                Equipment.brand == brand,
                Equipment.name == name
            )
        )
        
        if exclude_id:
            query = query.filter(Equipment.id != exclude_id)
            
        result = await self.db.execute(query)
        return result.scalars().all()