# api/repositories/association_repository.py

from typing import List, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from api.models.association import Association
from api.models.equipment import Equipment
from shared.schemas.association_schema import AssociationCreate, AssociationUpdate
from .base_repository import BaseRepository


class AssociationRepository(BaseRepository[Association, AssociationCreate, AssociationUpdate]):
    """
    Репозиторий для работы с ассоциациями.
    Наследует базовые CRUD операции от BaseRepository.
    Инкапсулирует всю логику работы с базой данных для ассоциаций.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Инициализация репозитория ассоциаций.
        
        Args:
            db: Асинхронная сессия базы данных
        """
        super().__init__(db, model=Association)
    
    async def get_all_paginated(self, skip: int, limit: int) -> Tuple[List[Association], int]:
        """
        Получение всех ассоциаций с пагинацией.
        
        Выполняет два асинхронных запроса:
        1. Подсчет общего количества ассоциаций
        2. Получение страницы ассоциаций с offset и limit
        
        Args:
            skip: Количество записей для пропуска (offset)
            limit: Максимальное количество записей для возврата
            
        Returns:
            Кортеж, содержащий список объектов Association и общее количество
        """
        # Первый запрос: подсчет общего количества ассоциаций
        count_result = await self.db.execute(
            select(func.count(Association.id))
        )
        total_count = count_result.scalar_one()
        
        # Второй запрос: получение страницы ассоциаций с предзагрузкой оборудования
        associations_result = await self.db.execute(
            select(Association)
            .options(selectinload(Association.equipment))
            .order_by(Association.sort_order, Association.name)
            .offset(skip)
            .limit(limit)
        )
        associations = associations_result.unique().scalars().all()
        
        return associations, total_count
    
    async def create_with_equipment(self, assoc_data: AssociationCreate) -> Association:
        """
        Создание новой ассоциации с привязкой оборудования.
        
        Args:
            assoc_data: Данные для создания ассоциации
            
        Returns:
            Созданный объект Association с загруженными связями
            
        Raises:
            HTTPException: 409 если ассоциация с таким именем уже существует
            HTTPException: 404 если одно или несколько оборудований не найдено
        """
        # Проверяем уникальность имени
        existing_result = await self.db.execute(
            select(Association).filter(Association.name == assoc_data.name)
        )
        if existing_result.scalars().first():
            raise HTTPException(
                status_code=409, 
                detail="Ассоциация с таким названием уже существует."
            )

        # Создаем новый объект ассоциации
        new_assoc = Association(
            name=assoc_data.name,
            description=assoc_data.description,
            sort_order=assoc_data.sort_order
        )

        # Привязываем оборудование, если указано
        if assoc_data.equipment_ids:
            equipment_result = await self.db.execute(
                select(Equipment)
                .filter(Equipment.id.in_(assoc_data.equipment_ids))
                .options(
                    selectinload(Equipment.accessories),
                    selectinload(Equipment.associations)
                )
            )
            equipment = equipment_result.unique().scalars().all()
            
            # Проверяем, что все оборудование найдено
            if len(equipment) != len(set(assoc_data.equipment_ids)):
                raise HTTPException(
                    status_code=404, 
                    detail="Одно или несколько оборудований не найдено."
                )
            new_assoc.equipment = equipment

        # Добавляем в сессию
        self.db.add(new_assoc)
        await self.db.flush()
        await self.db.refresh(new_assoc)
        
        # Возвращаем созданный объект с загруженными данными из БД
        result = await self.db.execute(
            select(Association)
            .filter(Association.id == new_assoc.id)
            .options(selectinload(Association.equipment))
        )
        return result.scalars().first()
    
    async def update_with_equipment(self, assoc_id: int, assoc_data: AssociationUpdate) -> Association:
        """
        Обновление существующей ассоциации с обновлением связей с оборудованием.
        
        Args:
            assoc_id: ID ассоциации для обновления
            assoc_data: Данные для обновления
            
        Returns:
            Обновленный объект Association с загруженными связями
            
        Raises:
            HTTPException: 404 если ассоциация не найдена
            HTTPException: 404 если одно или несколько оборудований не найдено
        """
        # Находим существующую ассоциацию
        result = await self.db.execute(
            select(Association)
            .filter(Association.id == assoc_id)
            .options(selectinload(Association.equipment))
        )
        assoc = result.scalars().first()
        if not assoc:
            raise HTTPException(
                status_code=404, 
                detail="Ассоциация не найдена."
            )

        # Получаем данные для обновления
        update_data = assoc_data.model_dump(exclude_unset=True)

        # Обрабатываем обновление связей с оборудованием
        if 'equipment_ids' in update_data:
            equipment_ids = update_data.pop('equipment_ids')
            assoc.equipment.clear()
            
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
                assoc.equipment = equipment

        # Обновляем остальные поля
        for key, value in update_data.items():
            setattr(assoc, key, value)

        # Добавляем в сессию для отслеживания изменений
        self.db.add(assoc)
        await self.db.flush()
        
        # Повторно получаем объект из БД с загруженными связями
        result = await self.db.execute(
            select(Association)
            .filter(Association.id == assoc_id)
            .options(selectinload(Association.equipment))
        )
        return result.scalars().first()
    
    async def delete_by_id(self, assoc_id: int) -> None:
        """
        Удаление ассоциации по ID.
        
        Args:
            assoc_id: ID ассоциации для удаления
            
        Raises:
            HTTPException: 404 если ассоциация не найдена
        """
        # Находим ассоциацию по ID
        result = await self.db.execute(
            select(Association)
            .filter(Association.id == assoc_id)
            .options(selectinload(Association.equipment))
        )
        assoc = result.scalars().first()
        if not assoc:
            raise HTTPException(
                status_code=404, 
                detail="Ассоциация не найдена."
            )

        # Удаляем ассоциацию
        await self.db.delete(assoc)
        await self.db.flush()
