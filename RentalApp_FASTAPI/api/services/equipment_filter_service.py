# api/services/equipment_filter_service.py

import time
from typing import Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, and_
from fastapi import HTTPException
from datetime import date

from api.models.equipment import Equipment
from api.models.association import Association
from api.repositories.equipment_repository import EquipmentRepository
from api.repositories.brand_system_repository import BrandSystemRepository
from api.services.availability.availability_service import AvailabilityService
from shared.schemas.association_schema import AssociationSimple
from shared.schemas.brand_system_schema import BrandSystemSimple

# --- In-process TTL-кэш availableFilters каталога ---
# Простой кэш на время жизни процесса (без cache_service/redis): фильтры
# каталога меняются редко, а рассинхрон между воркерами до TTL допустим.
# Инвалидация — invalidate_available_filters_cache() при CUD оборудования.
AVAILABLE_FILTERS_CACHE_TTL_SECONDS = 60.0
# Верхняя граница записей: ключ включает свободный текст query, и без лимита
# словарь неограниченно растёт от каждого уникального поискового запроса
# (истёкшие по TTL записи иначе никто не вычищает).
AVAILABLE_FILTERS_CACHE_MAX_ENTRIES = 128

_available_filters_cache: Dict[Tuple, Tuple[float, dict]] = {}


def _evict_and_bound_filters_cache(now: float) -> None:
    """Вычищает просроченные записи; при переполнении выкидывает самые старые."""
    expired = [k for k, (ts, _) in _available_filters_cache.items()
               if now - ts >= AVAILABLE_FILTERS_CACHE_TTL_SECONDS]
    for key in expired:
        del _available_filters_cache[key]
    overflow = len(_available_filters_cache) - AVAILABLE_FILTERS_CACHE_MAX_ENTRIES + 1
    if overflow > 0:
        oldest = sorted(_available_filters_cache.items(), key=lambda kv: kv[1][0])[:overflow]
        for key, _ in oldest:
            del _available_filters_cache[key]


def invalidate_available_filters_cache() -> None:
    """Сбрасывает in-process кэш availableFilters (вызывается при CUD оборудования)."""
    _available_filters_cache.clear()


class EquipmentFilterService:
    """Сервис для фильтрации и поиска оборудования."""
    
    def __init__(self, db: AsyncSession, equipment_repo: EquipmentRepository, availability_service: AvailabilityService, brand_system_repo: BrandSystemRepository):
        self.db = db
        self.equipment_repo = equipment_repo
        self.availability_service = availability_service
        self.brand_system_repo = brand_system_repo
    
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
        exclude_equipment_ids: Optional[List[int]] = None
    ) -> tuple[List[Equipment], int]:
        """
        Возвращает отфильтрованный и пагинированный список оборудования и их общее количество.
        """
        # Валидация дат на уровне сервиса
        self._validate_date_range(available_only, start_date, end_date)

        # Используем репозиторий для получения отфильтрованных данных.
        # Фильтры здесь не запрашиваем: доступные фильтры считаются отдельно
        # через calculate_available_filters (с кэшем) — не считаем их дважды.
        items, total, _ = await self.equipment_repo.get_filtered_paginated(
            skip=skip,
            limit=limit,
            query=query,
            type=type,
            brand_system_id=brand_system_id,
            association_id=association_id,
            start_date=start_date,
            end_date=end_date,
            available_only=available_only,
            include_available_filters=False,
            exclude_equipment_ids=exclude_equipment_ids
        )
        
        # Валидируем поля оборудования
        self._validate_equipment_fields(items)
        
        return items, total

    async def count_standalone_equipment(
        self,
        exclude_equipment_ids: List[int],
        query: Optional[str] = None,
        type: Optional[str] = None,
        brand_system_id: Optional[int] = None,
        association_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        available_only: bool = False
    ) -> int:
        """Количество оборудования, исключая элементы пачек (для total каталога)."""
        self._validate_date_range(available_only, start_date, end_date)
        return await self.equipment_repo.count_filtered_equipment_excluding_ids(
            exclude_equipment_ids=exclude_equipment_ids,
            query=query,
            type=type,
            brand=brand_system_id,
            association_id=association_id,
            start_date=start_date,
            end_date=end_date,
            available_only=available_only
        )
    
    async def calculate_available_filters(
        self,
        query: Optional[str] = None,
        type: Optional[str] = None,
        brand_system_id: Optional[int] = None,
        association_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        available_only: bool = False
    ) -> dict:
        """
        Вычисляет доступные опции для фильтров на основе текущих примененных фильтров.
        Реализует "умную" фильтрацию - показывает только те опции, которые релевантны
        для текущего набора фильтров.

        Результат кэшируется in-process на AVAILABLE_FILTERS_CACHE_TTL_SECONDS
        (ключ — набор примененных фильтров), поэтому повторные запросы каталога
        не выполняют служебные запросы фильтров заново.
        """
        cache_key: Tuple = (
            query, type, brand_system_id, association_id,
            start_date, end_date, available_only
        )
        now = time.monotonic()
        cached = _available_filters_cache.get(cache_key)
        if cached is not None and now - cached[0] < AVAILABLE_FILTERS_CACHE_TTL_SECONDS:
            # Копия включая вложенные списки — внешние мутации не должны попасть в кэш
            return {k: list(v) for k, v in cached[1].items()}

        # Получаем базовые условия для всех запросов
        base_conditions = self._get_base_filter_conditions(
            query, start_date, end_date, available_only
        )

        # Выполняем все запросы последовательно для избежания конфликтов сессий
        available_types = await self._get_available_types(base_conditions, brand_system_id, association_id)
        available_brands = await self._get_available_brands(base_conditions, type, association_id)
        available_associations = await self._get_available_associations(base_conditions, type, brand_system_id)

        result = {
            "types": available_types,
            "brands": available_brands,
            "associations": available_associations
        }

        _evict_and_bound_filters_cache(now)
        _available_filters_cache[cache_key] = (now, result)
        return {k: list(v) for k, v in result.items()}
    
    def _validate_date_range(
        self, 
        available_only: bool, 
        start_date: Optional[date], 
        end_date: Optional[date]
    ) -> None:
        """Валидирует диапазон дат."""
        if available_only and start_date and end_date:
            if start_date >= end_date:
                raise HTTPException(
                    status_code=400, 
                    detail="Дата начала должна быть раньше даты окончания."
                )
    
    def _get_base_filter_conditions(
        self,
        query: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        available_only: bool = False
    ) -> List:
        """
        Возвращает список базовых SQLAlchemy условий для фильтрации оборудования.
        """
        base_conditions = []
        
        # Применяем поисковый запрос
        if query:
            search_term = f"%{query.lower()}%"
            base_conditions.append(
                or_(
                    Equipment.name.ilike(search_term),
                    Equipment.brand.ilike(search_term),
                    Equipment.equipment_type.ilike(search_term)
                )
            )
        
        # Применяем фильтр доступности
        if available_only and start_date and end_date:
            availability_filter = self.availability_service.get_sqlalchemy_filter_for_available_equipment(
                start_date, end_date
            )
            base_conditions.append(availability_filter)
        
        return base_conditions
    
    async def _get_available_types(
        self, 
        base_conditions: List, 
        brand_system_id: Optional[int], 
        association_id: Optional[int]
    ) -> List[str]:
        """Получает доступные типы оборудования."""
        type_conditions = base_conditions.copy()
        
        # Применяем фильтр по системе бренда
        if brand_system_id:
            brand_system_name = await self.brand_system_repo.get_name_by_id(brand_system_id)
            if brand_system_name:
                brand_system_filter = or_(
                    Equipment.brand_systems.any(id=brand_system_id),
                    Equipment.brand == brand_system_name
                )
                type_conditions.append(brand_system_filter)
        
        # Применяем фильтр по ассоциации
        if association_id:
            from sqlalchemy import exists
            from api.models.association import association_equipment_association
            association_filter = exists().where(
                and_(
                    Equipment.id == association_equipment_association.c.equipment_id,
                    association_equipment_association.c.association_id == association_id
                )
            )
            type_conditions.append(association_filter)
        
        return await self.equipment_repo.get_available_types(type_conditions)
    
    async def _get_available_brands(
        self, 
        base_conditions: List, 
        type: Optional[str], 
        association_id: Optional[int]
    ) -> List[BrandSystemSimple]:
        """Получает доступные системы брендов оборудования."""
        brand_conditions = base_conditions.copy()
        
        # Применяем фильтр по типу
        if type:
            brand_conditions.append(Equipment.equipment_type == type)
        
        # Применяем фильтр по ассоциации
        if association_id:
            from sqlalchemy import exists
            from api.models.association import association_equipment_association
            association_filter = exists().where(
                and_(
                    Equipment.id == association_equipment_association.c.equipment_id,
                    association_equipment_association.c.association_id == association_id
                )
            )
            brand_conditions.append(association_filter)
        
        # Получаем ID оборудования, которое соответствует условиям
        equipment_ids = await self.equipment_repo.get_equipment_ids_by_conditions(brand_conditions)
        
        # Получаем системы брендов для этого оборудования
        brand_systems = await self.brand_system_repo.get_by_equipment_ids(equipment_ids)
        
        # Преобразуем в BrandSystemSimple
        return [BrandSystemSimple(id=bs.id, name=bs.name) for bs in brand_systems]
    
    async def _get_available_associations(
        self, 
        base_conditions: List, 
        type: Optional[str], 
        brand_system_id: Optional[int]
    ) -> List[AssociationSimple]:
        """Получает доступные ассоциации оборудования."""
        # КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ: Используем EXISTS вместо двойного JOIN
        # Это решает проблему с медленными запросами к associations
        
        # Строим условия для фильтрации оборудования
        equipment_conditions = []
        
        # Применяем фильтр по типу
        if type:
            equipment_conditions.append(Equipment.equipment_type == type)
        
        # Применяем фильтр по системе бренда
        if brand_system_id:
            brand_system_name = await self.brand_system_repo.get_name_by_id(brand_system_id)
            if brand_system_name:
                brand_system_filter = or_(
                    Equipment.brand_systems.any(id=brand_system_id),
                    Equipment.brand == brand_system_name
                )
                equipment_conditions.append(brand_system_filter)
        
        return await self.equipment_repo.get_available_associations(equipment_conditions)
    
    def _validate_equipment_fields(self, equipment_list: List[Equipment]) -> None:
        """Дефолты nullable-полей без пометки объекта dirty (GET не пишет в БД)."""
        from api.services.equipment_defaults import apply_equipment_field_defaults
        apply_equipment_field_defaults(equipment_list)
