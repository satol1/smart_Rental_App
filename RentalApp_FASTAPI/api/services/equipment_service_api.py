# api/services/equipment_service_api.py

from typing import List, Type, Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from api.models.equipment import Equipment
from shared.schemas.equipment_schema import EquipmentUpdateExtended, EquipmentOut
from shared.schemas.pack_schema import PublicPackOut
from api.services.equipment_crud_service import EquipmentCRUDService
from api.services.equipment_filter_service import EquipmentFilterService
from api.services.equipment_pack_service import EquipmentPackService
from shared.schemas.equipment_schema import CatalogItem 


class EquipmentServiceApi:
    """Сервис для работы с оборудованием через API"""
    
    def __init__(
        self, 
        db: AsyncSession,
        crud_service: EquipmentCRUDService,
        filter_service: EquipmentFilterService,
        pack_service: EquipmentPackService
    ):
        self.db = db
        self.crud_service = crud_service
        self.filter_service = filter_service
        self.pack_service = pack_service

    async def get_all_equipment(self) -> list[Type[Equipment]]:
        """Возвращает QuerySet всего оборудования с подгрузкой связей."""
        return await self.crud_service.get_all_equipment()

    async def get_paginated_equipment(
            self,
            skip: int,
            limit: int,
            query: Optional[str] = None,
            type: Optional[str] = None,
            brand_system_id: Optional[int] = None,
            association_id: Optional[int] = None,
            start_date: Optional[date] = None,
            end_date: Optional[date] = None,
            available_only: bool = False,
            group_similar: bool = True
    ) -> (List[CatalogItem], int, dict):
        """
        Возвращает отфильтрованный, отсортированный и пагинированный список,
        где пачки всегда идут первыми, если включена группировка.
        """
        # Получаем отфильтрованные пачки и оборудование
        filtered_packs = []
        if group_similar:
            filtered_packs = await self.pack_service.get_filtered_packs_async(
                query, type, brand_system_id, association_id, start_date, end_date, available_only=available_only
            )

        # 2. Получаем ВСЕ отфильтрованное оборудование (без пагинации)
        # Используем get_paginated_equipment, но с очень большим лимитом, чтобы получить все.
        # В реальном проекте здесь лучше создать отдельный метод в сервисе, который не делает пагинацию.
        items, base_total = await self.filter_service.get_paginated_equipment(
            0, 10000, query, type, brand_system_id, association_id, start_date, end_date, available_only
        )
        
        # 3. Создаем единый список и сортируем его
        combined_items: List[CatalogItem] = []
        
        if group_similar:
            # Если группировка включена, добавляем пачки первыми
            equipment_in_packs = {eq_id for p in filtered_packs for eq_id in p.equipment_ids}
            standalone_items = [item for item in items if item.id not in equipment_in_packs]
            
            # Преобразуем к единому формату CatalogItem
            pack_items: List[CatalogItem] = [PublicPackOut.model_validate(p) for p in filtered_packs]
            equipment_items: List[CatalogItem] = [EquipmentOut.model_validate(i) for i in standalone_items]
            
            combined_items = pack_items + equipment_items
            total = len(combined_items)
        else:
            # Если группировка выключена, показываем только оборудование
            equipment_items: List[CatalogItem] = [EquipmentOut.model_validate(i) for i in items]
            combined_items = equipment_items
            total = base_total

        # 4. Применяем пагинацию к итоговому отсортированному списку
        paginated_items = combined_items[skip : skip + limit]

        # 5. Вычисляем доступные фильтры, как и раньше
        available_filters = await self.filter_service.calculate_available_filters(
            query, type, brand_system_id, association_id, start_date, end_date, available_only
        )
        
        # Возвращаем пагинированный список, total и фильтры
        return paginated_items, total, available_filters

    async def update_equipment_details(self, equipment_id: int, equipment_data: EquipmentUpdateExtended) -> Equipment:
        """Обновляет детали оборудования."""
        return await self.crud_service.update_equipment_details(equipment_id, equipment_data)