# api/repositories/equipment_query_repository.py

from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, func, or_, and_
from datetime import date
import logging

from .equipment_base_repository import EquipmentBaseRepository
from api.models.equipment import Equipment
from api.models.association import Association, association_equipment_association
from api.models.brand_system import BrandSystem
from shared.schemas.equipment_schema import AvailableFilters
from shared.schemas.association_schema import AssociationSimple

logger = logging.getLogger(__name__)


class EquipmentQueryRepository(EquipmentBaseRepository):
    """
    Репозиторий для операций чтения и поиска оборудования.
    Содержит методы для получения данных с фильтрацией, пагинацией и сортировкой.
    """

    def __init__(self, db: AsyncSession, availability_service=None, brand_system_repo=None):
        super().__init__(db)
        self.availability_service = availability_service
        self._brand_system_repo = brand_system_repo

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
        include_available_filters: bool = True,
        exclude_equipment_ids: Optional[List[int]] = None
    ) -> Tuple[List[Equipment], int, Optional[AvailableFilters]]:
        """
        Получение отфильтрованного и пагинированного списка оборудования.
        Инкапсулирует всю логику фильтрации из EquipmentQueryBuilder.

        Args:
            skip: Количество записей для пропуска
            limit: Максимальное количество записей
            query: Поисковый запрос
            type: Фильтр по типу оборудования
            brand_system_id: Фильтр по системе бренда
            association_id: Фильтр по ассоциации
            start_date: Начальная дата для проверки доступности
            end_date: Конечная дата для проверки доступности
            available_only: Показывать только доступное оборудование
            group_similar: Группировать похожее оборудование
            include_available_filters: Вычислять ли доступные фильтры (~4 доп.
                запроса). Отключайте, когда фильтры не нужны вызывающему коду,
                чтобы не считать их впустую.

        Returns:
            Кортеж (items, total, available_filters); available_filters=None,
            если include_available_filters=False.
        """
        # Создаем базовый запрос с предзагрузкой связей
        base_query = select(Equipment).options(
            selectinload(Equipment.accessories),
            selectinload(Equipment.associations)
        )

        # Применяем фильтры
        filtered_query = self._apply_filters(
            base_query, query, type, brand_system_id, association_id,
            start_date, end_date, available_only
        )

        # Исключение оборудования из пачек (пачки показываются отдельно)
        if exclude_equipment_ids:
            filtered_query = filtered_query.filter(
                Equipment.id.notin_(exclude_equipment_ids)
            )

        # Получаем общее количество записей
        count_query = select(func.count()).select_from(filtered_query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Применяем пагинацию и сортировку (id — tie-breaker для стабильных страниц)
        paginated_query = filtered_query.order_by(Equipment.name, Equipment.id).offset(skip).limit(limit)
        result = await self.db.execute(paginated_query)
        items = result.unique().scalars().all()

        # Получаем доступные фильтры (опционально: вызывающий код может
        # считать их отдельно, тогда здесь они не нужны)
        available_filters: Optional[AvailableFilters] = None
        if include_available_filters:
            available_filters = await self.get_available_filters()

        return items, total, available_filters

    def _apply_filters(
        self,
        query,
        search_query: Optional[str] = None,
        equipment_type: Optional[str] = None,
        brand_system_id: Optional[int] = None,
        association_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        available_only: bool = False
    ):
        """
        Применяет все фильтры к запросу.
        Воспроизводит логику из EquipmentQueryBuilder.
        """
        # Поиск по тексту
        if search_query:
            search_term = f"%{search_query.lower()}%"
            query = query.filter(
                or_(
                    Equipment.name.ilike(search_term),
                    Equipment.brand.ilike(search_term),
                    Equipment.equipment_type.ilike(search_term)
                )
            )

        # Фильтр по типу
        if equipment_type:
            query = query.filter(Equipment.equipment_type == equipment_type)

        # Фильтр по системе бренда (гибридная логика)
        if brand_system_id:
            # Создаем гибридное условие OR
            # Условие 1: Оборудование явно связано с системой через m2m таблицу
            # Условие 2: Бренд оборудования совпадает с именем системы (будет проверено в подзапросе)
            brand_system_filter = or_(
                Equipment.brand_systems.any(id=brand_system_id),
                Equipment.brand.in_(
                    select(BrandSystem.name).where(BrandSystem.id == brand_system_id)
                )
            )
            query = query.filter(brand_system_filter)

        # Фильтр по ассоциации
        if association_id:
            from sqlalchemy import exists
            association_filter = exists().where(
                and_(
                    Equipment.id == association_equipment_association.c.equipment_id,
                    association_equipment_association.c.association_id == association_id
                )
            )
            query = query.filter(association_filter)

        # Фильтр по доступности
        if available_only and start_date and end_date:
            availability_filter = self._get_availability_filter(
                start_date, end_date
            )
            query = query.filter(availability_filter)

        return query

    def _get_availability_filter(self, start_date: date, end_date: date):
        """
        Получает фильтр для доступного оборудования.
        Использует AvailabilityService для получения SQLAlchemy фильтра.
        """
        if not self.availability_service:
            raise ValueError("AvailabilityService не инициализирован. Проверьте настройки DI-контейнера.")
        
        return self.availability_service.get_sqlalchemy_filter_for_available_equipment(
            start_date, end_date, None, None
        )

    async def get_available_filters(self) -> AvailableFilters:
        """
        Получает доступные фильтры для каталога оборудования.
        """
        # Получаем уникальные типы
        types_result = await self.db.execute(
            select(Equipment.equipment_type).distinct().order_by(Equipment.equipment_type)
        )
        types = [row[0] for row in types_result.fetchall()]

        # Получаем системы брендов, связанные с любым оборудованием:
        # 1) прямая связь m2m; 2) совпадение имени бренда оборудования.
        # Раньше выбирались ВСЕ Equipment.id и передавались списком в
        # get_by_equipment_ids — теперь exists/подзапрос без выборки всех ID.
        brand_systems_result = await self.db.execute(
            select(BrandSystem).distinct().where(
                or_(
                    BrandSystem.equipment.any(),
                    BrandSystem.name.in_(select(Equipment.brand))
                )
            ).order_by(BrandSystem.name)
        )
        brand_systems = brand_systems_result.unique().scalars().all()

        # Преобразуем в BrandSystemSimple
        from shared.schemas.brand_system_schema import BrandSystemSimple
        brands = [BrandSystemSimple(id=bs.id, name=bs.name) for bs in brand_systems]

        # Получаем ассоциации
        associations_result = await self.db.execute(
            select(Association).order_by(Association.name)
        )
        associations = [
            AssociationSimple.model_validate(assoc)
            for assoc in associations_result.scalars().all()
        ]

        return AvailableFilters(
            types=types,
            brands=brands,
            associations=associations
        )

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
        """
        Подсчитывает количество отфильтрованного оборудования, исключая указанные ID.
        Используется для подсчета уникального оборудования при работе с пачками.
        
        Args:
            exclude_equipment_ids: Список ID оборудования для исключения
            query: Поисковый запрос
            type: Фильтр по типу оборудования
            brand: Фильтр по бренду
            association_id: Фильтр по ассоциации
            start_date: Начальная дата для проверки доступности
            end_date: Конечная дата для проверки доступности
            available_only: Показывать только доступное оборудование
            
        Returns:
            Количество оборудования
        """
        # Создаем базовый запрос
        base_query = select(Equipment)

        # Применяем фильтры
        filtered_query = self._apply_filters(
            base_query, query, type, brand, association_id, 
            start_date, end_date, available_only
        )

        # Исключаем указанные ID
        if exclude_equipment_ids:
            filtered_query = filtered_query.filter(Equipment.id.notin_(exclude_equipment_ids))

        # Подсчитываем количество
        count_query = select(func.count()).select_from(filtered_query.subquery())
        count_result = await self.db.execute(count_query)
        return count_result.scalar_one()

    async def get_equipment_by_ids_or_fail(self, equipment_ids: List[int]) -> List[Equipment]:
        """
        Получает оборудование по списку ID или выбрасывает исключение.
        Используется в сервисах заказов.
        
        Args:
            equipment_ids: Список ID оборудования
            
        Returns:
            Список объектов Equipment
            
        Raises:
            HTTPException: Если не все оборудование найдено
        """
        if not equipment_ids:
            return []

        result = await self.db.execute(
            select(Equipment)
            .filter(Equipment.id.in_(equipment_ids))
            .options(
                selectinload(Equipment.accessories),
                selectinload(Equipment.associations)
            )
        )
        found_equipment = result.unique().scalars().all()
        
        if len(found_equipment) != len(equipment_ids):
            from fastapi import HTTPException
            found_ids = {eq.id for eq in found_equipment}
            missing_ids = set(equipment_ids) - found_ids
            raise HTTPException(
                status_code=404,
                detail=f"Оборудование с ID {list(missing_ids)} не найдено"
            )
        
        return found_equipment

    async def get_available_types(self, conditions: List) -> List[str]:
        """
        Получает доступные типы оборудования с учетом условий.
        
        Args:
            conditions: Список SQLAlchemy условий для фильтрации
            
        Returns:
            Список доступных типов оборудования
        """
        query = select(Equipment.equipment_type).distinct()
        
        if conditions:
            query = query.filter(and_(*conditions))
        
        result = await self.db.execute(query.order_by(Equipment.equipment_type))
        return [row[0] for row in result.fetchall() if row[0]]

    async def get_available_brands(self, conditions: List) -> List[str]:
        """
        Получает доступные бренды оборудования с учетом условий.
        
        Args:
            conditions: Список SQLAlchemy условий для фильтрации
            
        Returns:
            Список доступных брендов оборудования
        """
        query = select(Equipment.brand).distinct()
        
        if conditions:
            query = query.filter(and_(*conditions))
        
        result = await self.db.execute(query.order_by(Equipment.brand))
        return [row[0] for row in result.fetchall() if row[0]]

    async def get_available_associations(self, conditions: List) -> List[AssociationSimple]:
        """
        Получает доступные ассоциации оборудования с учетом условий.
        
        Args:
            conditions: Список SQLAlchemy условий для фильтрации оборудования
            
        Returns:
            Список доступных ассоциаций
        """
        from sqlalchemy import exists
        from api.models.association import association_equipment_association
        
        associations_query = select(Association).order_by(Association.sort_order)
        
        if conditions:
            # Добавляем EXISTS условие для проверки связанного оборудования
            associations_query = associations_query.where(
                exists().where(
                    and_(
                        association_equipment_association.c.association_id == Association.id,
                        association_equipment_association.c.equipment_id == Equipment.id,
                        *conditions
                    )
                )
            )
        
        associations_result = await self.db.execute(associations_query)
        associations = associations_result.scalars().all()
        
        return [
            AssociationSimple(
                id=assoc.id,
                name=assoc.name,
                sort_order=assoc.sort_order
            )
            for assoc in associations
        ]
    
    async def get_equipment_ids_by_conditions(self, conditions: List) -> List[int]:
        """
        Получает ID оборудования, которое соответствует условиям.
        
        Args:
            conditions: Список SQLAlchemy условий для фильтрации
            
        Returns:
            Список ID оборудования
        """
        query = select(Equipment.id)
        
        # Применяем все условия
        for condition in conditions:
            query = query.filter(condition)
        
        result = await self.db.execute(query)
        return [row[0] for row in result.fetchall()]