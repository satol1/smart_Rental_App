# api/services/equipment_pack_service.py

from typing import List, Optional, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date

from api.models.equipment import Equipment
from api.models.association import Association
from api.repositories.equipment_repository import EquipmentRepository
from api.repositories.brand_system_repository import BrandSystemRepository
from api.services.pack_service import PackService
from shared.schemas.pack_schema import PublicPackOut


class EquipmentPackService:
    """Сервис для работы с пачками оборудования и группировкой."""
    
    def __init__(self, db: AsyncSession, pack_service: PackService = None, equipment_repo: EquipmentRepository = None, brand_system_repo: BrandSystemRepository = None):
        self.db = db
        self.pack_service = pack_service or PackService(db)
        self.equipment_repo = equipment_repo or EquipmentRepository(db)
        self.brand_system_repo = brand_system_repo or BrandSystemRepository(db)
    
    async def get_filtered_packs(
        self,
        query: Optional[str] = None,
        type: Optional[str] = None,
        brand: Optional[str] = None,
        association_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[PublicPackOut]:
        """
        Получает отфильтрованные пачки оборудования по заданным критериям.
        """
        # Получаем все пачки для публичного каталога
        all_packs = await self.pack_service.get_public_packs_for_catalog(start_date, end_date)
        
        # Фильтруем пачки по критериям
        filtered_packs = []
        for pack in all_packs:
            if self._pack_matches_filters(pack, query, type, brand, association_id):
                filtered_packs.append(pack)
        
        return filtered_packs
    
    async def get_equipment_excluding_packs(
        self,
        equipment_list: List[Equipment],
        filtered_packs: List[PublicPackOut]
    ) -> List[Equipment]:
        """
        Исключает из списка оборудования те элементы, которые входят в пачки.
        """
        # Собираем все ID оборудования, которое входит в отфильтрованные пачки
        equipment_in_packs = self._get_equipment_ids_from_packs(filtered_packs)
        
        # Фильтруем items, исключая оборудование, которое входит в пачки
        return [item for item in equipment_list if item.id not in equipment_in_packs]
    
    async def calculate_total_with_packs(
        self,
        query: Optional[str] = None,
        type: Optional[str] = None,
        brand: Optional[str] = None,
        association_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        available_only: bool = False
    ) -> int:
        """
        Вычисляет общее количество элементов (пачки + уникальное оборудование).
        """
        # Получаем отфильтрованные пачки (используем асинхронную версию для корректной фильтрации по ассоциациям)
        filtered_packs = await self.get_filtered_packs_async(
            query, type, brand, association_id, start_date, end_date, available_only
        )
        
        # Получаем ID оборудования из отфильтрованных пачек
        equipment_in_packs = self._get_equipment_ids_from_packs(filtered_packs)
        
        # Считаем количество уникального оборудования, исключая оборудование из пачек
        standalone_items_count = await self.equipment_repo.count_filtered_equipment_excluding_ids(
            exclude_equipment_ids=list(equipment_in_packs),
            query=query,
            type=type,
            brand=brand,
            association_id=association_id,
            start_date=start_date,
            end_date=end_date,
            available_only=available_only
        )
        
        # Итоговый total = количество отфильтрованных пачек + количество уникального оборудования
        return len(filtered_packs) + standalone_items_count
    
    def _pack_matches_filters(
        self,
        pack: PublicPackOut,
        query: Optional[str] = None,
        type: Optional[str] = None,
        brand: Optional[str] = None,
        association_id: Optional[int] = None
    ) -> bool:
        """
        Проверяет, соответствует ли пачка заданным фильтрам.
        """
        # Фильтр по поиску
        if query:
            search_term = query.lower()
            if not (search_term in pack.name.lower() or 
                   search_term in pack.equipment_type.lower() or 
                   search_term in pack.brand.lower()):
                return False
        
        # Фильтр по типу
        if type and pack.equipment_type != type:
            return False
        
        # Фильтр по бренду
        if brand and brand != "__all__" and pack.brand != brand:
            return False
        
        # Фильтр по ассоциации (проверяем, есть ли в пачке оборудование из нужной ассоциации)
        if association_id:
            # Здесь нужно проверить, есть ли в пачке оборудование из нужной ассоциации
            # Это требует дополнительного запроса к БД, поэтому вынесем в отдельный метод
            return self._pack_has_equipment_from_association(pack, association_id)
        
        return True
    
    def _pack_has_equipment_from_association(self, pack: PublicPackOut, association_id: int) -> bool:
        """
        Проверяет, есть ли в пачке оборудование из указанной ассоциации.
        ВАЖНО: Этот метод требует синхронного выполнения, так как используется в фильтре.
        Для асинхронной версии нужно переписать логику фильтрации.
        """
        # Временное решение - возвращаем True для всех пачек
        # В реальной реализации здесь должен быть запрос к БД
        # Но поскольку это используется в синхронном контексте фильтрации,
        # нужно переписать логику фильтрации пачек
        return True
    
    async def _pack_has_equipment_from_association_async(
        self, 
        pack: PublicPackOut, 
        association_id: int
    ) -> bool:
        """
        Асинхронная версия проверки наличия оборудования из ассоциации в пачке.
        """
        # Получаем оборудование из пачки и проверяем ассоциации
        pack_equipment = await self.equipment_repo.get_by_ids(pack.equipment_ids)
        for equipment in pack_equipment:
            if any(assoc.id == association_id for assoc in equipment.associations):
                return True
        return False
    
    def _get_equipment_ids_from_packs(self, packs: List[PublicPackOut]) -> Set[int]:
        """
        Собирает все ID оборудования из списка пачек.
        """
        equipment_in_packs = set()
        for pack in packs:
            equipment_in_packs.update(pack.equipment_ids)
        return equipment_in_packs
    
    async def get_filtered_packs_async(
        self,
        query: Optional[str] = None,
        type: Optional[str] = None,
        brand_system_id: Optional[int] = None,
        association_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        # ✅ ИЗМЕНЕНИЕ: Добавляем новый аргумент
        available_only: bool = False
    ) -> List[PublicPackOut]:
        """
        Асинхронная версия получения отфильтрованных пачек с поддержкой фильтра по ассоциации.
        """
        # Получаем все пачки для публичного каталога
        # ✅ ИЗМЕНЕНИЕ: Передаем available_only дальше
        all_packs = await self.pack_service.get_public_packs_for_catalog(start_date, end_date, available_only)
        
        # Фильтруем пачки по критериям
        filtered_packs = []
        for pack in all_packs:
            matches_filters = True
            
            # Фильтр по поиску
            if query:
                search_term = query.lower()
                if not (search_term in pack.name.lower() or 
                       search_term in pack.equipment_type.lower() or 
                       search_term in pack.brand.lower()):
                    matches_filters = False
            
            # Фильтр по типу
            if type and pack.equipment_type != type:
                matches_filters = False
            
            # Фильтр по системе бренда (гибридная логика)
            if brand_system_id and matches_filters:
                matches_filters = await self._pack_matches_brand_system_async(pack, brand_system_id)
            
            # Фильтр по ассоциации (асинхронная проверка)
            if association_id and matches_filters:
                matches_filters = await self._pack_has_equipment_from_association_async(pack, association_id)
            
            if matches_filters:
                filtered_packs.append(pack)
        
        return filtered_packs
    
    async def _pack_matches_brand_system_async(self, pack: PublicPackOut, brand_system_id: int) -> bool:
        """
        Проверяет, соответствует ли пачка системе бренда (гибридная логика).
        """
        from api.models.brand_system import BrandSystem
        from sqlalchemy import or_
        
        # Получаем имя системы бренда
        brand_system_name = await self.brand_system_repo.get_name_by_id(brand_system_id)
        
        if not brand_system_name:
            return False
        
        # Проверяем, есть ли в пачке оборудование, которое:
        # 1. Явно связано с системой бренда через m2m таблицу
        # 2. Имеет бренд, совпадающий с именем системы
        pack_equipment = await self.equipment_repo.get_by_ids(pack.equipment_ids)
        for equipment in pack_equipment:
            if (equipment.brand == brand_system_name or
                any(bs.id == brand_system_id for bs in equipment.brand_systems)):
                return True
        return False
