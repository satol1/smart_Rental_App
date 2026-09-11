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
        # Пагинация выполняется в SQL: главный публичный эндпоинт не должен
        # тянуть весь каталог с eager-связями и строить Pydantic-объекты
        # для каждой записи, чтобы затем отрезать страницу в Python.

        if not group_similar:
            # Без группировки — только оборудование, прямая SQL-пагинация
            items, total = await self.filter_service.get_paginated_equipment(
                skip, limit, query, type, brand_system_id, association_id,
                start_date, end_date, available_only
            )
            paginated_items: List[CatalogItem] = [EquipmentOut.model_validate(i) for i in items]
        else:
            # С группировкой пачки идут первыми, оборудование — за ними.
            # Окно страницы [skip, skip+limit) раскладываем на две части
            # и каждую берём из БД по отдельности.
            filtered_packs = await self.pack_service.get_filtered_packs_async(
                query, type, brand_system_id, association_id, start_date, end_date, available_only=available_only
            )
            pack_items: List[CatalogItem] = [PublicPackOut.model_validate(p) for p in filtered_packs]
            equipment_in_packs = sorted({eq_id for p in filtered_packs for eq_id in p.equipment_ids})

            packs_on_page = pack_items[skip : skip + limit]
            remaining = limit - len(packs_on_page)
            equipment_offset = max(skip - len(pack_items), 0)

            equipment_items: List[CatalogItem] = []
            standalone_total: Optional[int] = None
            if remaining > 0:
                # total из этого же запроса равен standalone-количеству:
                # те же фильтры и то же исключение пачек — отдельный COUNT не нужен
                items, standalone_total = await self.filter_service.get_paginated_equipment(
                    equipment_offset, remaining, query, type, brand_system_id, association_id,
                    start_date, end_date, available_only,
                    exclude_equipment_ids=equipment_in_packs or None
                )
                equipment_items = [EquipmentOut.model_validate(i) for i in items]

            if standalone_total is None:
                # Страница целиком внутри пачек — оборудования не запрашивали
                standalone_total = await self.filter_service.count_standalone_equipment(
                    equipment_in_packs, query, type, brand_system_id, association_id,
                    start_date, end_date, available_only
                )
            total = len(pack_items) + standalone_total
            paginated_items = packs_on_page + equipment_items

        # Доступные фильтры считаются отдельно (с кэшем)
        available_filters = await self.filter_service.calculate_available_filters(
            query, type, brand_system_id, association_id, start_date, end_date, available_only
        )

        # Возвращаем пагинированный список, total и фильтры
        return paginated_items, total, available_filters

    async def update_equipment_details(self, equipment_id: int, equipment_data: EquipmentUpdateExtended) -> Equipment:
        """Обновляет детали оборудования."""
        return await self.crud_service.update_equipment_details(equipment_id, equipment_data)