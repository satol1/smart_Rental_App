# api/repositories/brand_system_repository.py

from typing import List, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from api.models.brand_system import BrandSystem
from api.models.equipment import Equipment
from shared.schemas.brand_system_schema import BrandSystemCreate, BrandSystemUpdate
from .base_repository import BaseRepository

class BrandSystemRepository(BaseRepository[BrandSystem, BrandSystemCreate, BrandSystemUpdate]):
    """
    Репозиторий для работы с "Системами Бренда".
    Инкапсулирует всю логику доступа к данным для BrandSystem.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Инициализация репозитория систем бренда.
        
        Args:
            db: Асинхронная сессия базы данных
        """
        super().__init__(db, model=BrandSystem)

    async def get_all_paginated(self, skip: int, limit: int) -> Tuple[List[BrandSystem], int]:
        """
        Получение всех систем бренда с пагинацией и предзагрузкой оборудования.
        
        Выполняет два асинхронных запроса:
        1. Подсчет общего количества систем бренда
        2. Получение страницы систем бренда с offset и limit
        
        Args:
            skip: Количество записей для пропуска (offset)
            limit: Максимальное количество записей для возврата
            
        Returns:
            Кортеж, содержащий список объектов BrandSystem и общее количество
        """
        # Первый запрос: подсчет общего количества систем бренда
        count_result = await self.db.execute(select(func.count(BrandSystem.id)))
        total_count = count_result.scalar_one()
        
        # Второй запрос: получение страницы систем бренда с предзагрузкой оборудования
        systems_result = await self.db.execute(
            select(BrandSystem)
            .options(selectinload(BrandSystem.equipment))
            .order_by(BrandSystem.name)
            .offset(skip)
            .limit(limit)
        )
        systems = systems_result.unique().scalars().all()
        return systems, total_count

    async def create_with_equipment(self, data: BrandSystemCreate) -> BrandSystem:
        """
        Создание новой системы бренда с привязкой оборудования.
        
        Args:
            data: Данные для создания системы бренда
            
        Returns:
            Созданный объект BrandSystem с загруженными связями
            
        Raises:
            HTTPException: 409 если система бренда с таким именем уже существует
            HTTPException: 404 если одно или несколько оборудований не найдено
        """
        # Проверяем уникальность имени
        existing_result = await self.db.execute(
            select(BrandSystem).filter(BrandSystem.name == data.name)
        )
        if existing_result.scalars().first():
            raise HTTPException(
                status_code=409, 
                detail="Система бренда с таким названием уже существует."
            )

        # Создаем новый объект системы бренда
        new_system = BrandSystem(
            name=data.name, 
            description=data.description
        )

        # Привязываем оборудование, если указано
        if data.equipment_ids:
            equipment_result = await self.db.execute(
                select(Equipment)
                .filter(Equipment.id.in_(data.equipment_ids))
                .options(
                    selectinload(Equipment.accessories),
                    selectinload(Equipment.associations)
                )
            )
            equipment = equipment_result.unique().scalars().all()
            
            # Проверяем, что все оборудование найдено
            if len(equipment) != len(set(data.equipment_ids)):
                raise HTTPException(
                    status_code=404, 
                    detail="Одно или несколько оборудований не найдено."
                )
            new_system.equipment = equipment

        # Добавляем в сессию
        self.db.add(new_system)
        await self.db.flush()
        await self.db.refresh(new_system, attribute_names=['equipment'])
        return new_system

    async def update_with_equipment(self, system_id: int, data: BrandSystemUpdate) -> BrandSystem:
        """
        Обновление системы бренда и связей с оборудованием.
        
        Args:
            system_id: ID системы бренда для обновления
            data: Данные для обновления
            
        Returns:
            Обновленный объект BrandSystem с загруженными связями
            
        Raises:
            HTTPException: 404 если система бренда не найдена
            HTTPException: 404 если одно или несколько оборудований не найдено
        """
        # Находим существующую систему бренда
        result = await self.db.execute(
            select(BrandSystem)
            .filter(BrandSystem.id == system_id)
            .options(selectinload(BrandSystem.equipment))
        )
        system = result.scalars().first()
        if not system:
            raise HTTPException(
                status_code=404, 
                detail="Система бренда не найдена."
            )

        # Получаем данные для обновления
        update_data = data.model_dump(exclude_unset=True)

        # Обрабатываем обновление связей с оборудованием
        if 'equipment_ids' in update_data:
            equipment_ids = update_data.pop('equipment_ids')
            system.equipment.clear()
            
            if equipment_ids:
                equipment_result = await self.db.execute(
                    select(Equipment)
                    .filter(Equipment.id.in_(equipment_ids))
                    .options(
                        selectinload(Equipment.accessories),
                        selectinload(Equipment.associations)
                    )
                )
                equipment = equipment_result.unique().scalars().all()
                
                # Проверяем, что все оборудование найдено
                if len(equipment) != len(set(equipment_ids)):
                    raise HTTPException(
                        status_code=404, 
                        detail="Одно или несколько оборудований не найдено."
                    )
                system.equipment = equipment

        # Обновляем остальные поля
        for key, value in update_data.items():
            setattr(system, key, value)

        # Добавляем в сессию для отслеживания изменений
        self.db.add(system)
        await self.db.flush()
        await self.db.refresh(system, attribute_names=['equipment'])
        return system

    async def delete_by_id(self, system_id: int) -> None:
        """
        Удаление системы бренда по ID.
        
        Args:
            system_id: ID системы бренда для удаления
            
        Raises:
            HTTPException: 404 если система бренда не найдена
        """
        # Находим систему бренда по ID
        result = await self.db.execute(
            select(BrandSystem)
            .filter(BrandSystem.id == system_id)
            .options(selectinload(BrandSystem.equipment))
        )
        system = result.scalars().first()
        if not system:
            raise HTTPException(
                status_code=404, 
                detail="Система бренда не найдена."
            )

        # Удаляем систему бренда
        await self.db.delete(system)
        await self.db.flush()

    async def get_name_by_id(self, brand_system_id: int) -> Optional[str]:
        """
        Получает название системы бренда по ID.
        
        Args:
            brand_system_id: ID системы бренда
            
        Returns:
            Название системы бренда или None, если не найдена
        """
        result = await self.db.execute(
            select(BrandSystem.name).where(BrandSystem.id == brand_system_id)
        )
        return result.scalar_one_or_none()

    async def get_by_equipment_ids(self, equipment_ids: List[int]) -> List[BrandSystem]:
        """
        Получает системы брендов, связанные с указанным оборудованием.
        
        Args:
            equipment_ids: Список ID оборудования
            
        Returns:
            Список систем брендов, связанных с оборудованием
        """
        if not equipment_ids:
            return []
            
        # Получаем системы брендов, которые связаны с оборудованием через:
        # 1. Прямую связь через m2m таблицу
        # 2. Совпадение имени бренда оборудования с именем системы
        result = await self.db.execute(
            select(BrandSystem).distinct().where(
                or_(
                    # Прямая связь через m2m
                    BrandSystem.equipment.any(Equipment.id.in_(equipment_ids)),
                    # Совпадение имени бренда
                    BrandSystem.name.in_(
                        select(Equipment.brand).where(Equipment.id.in_(equipment_ids))
                    )
                )
            ).order_by(BrandSystem.name)
        )
        return result.unique().scalars().all()