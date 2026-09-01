#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для добавления начальных ассоциаций в базу данных.
Запускать после применения миграций.
"""

import sys
import os

# Добавляем корневую директорию проекта в путь
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from containers import AsyncSessionLocal
from api.models.association import Association
from api.models.equipment import Equipment
import asyncio

async def populate_associations():
    """Добавляет начальные ассоциации в базу данных."""
    
    # Получаем асинхронную сессию базы данных
    async with AsyncSessionLocal() as db:
        try:
            # Проверяем, есть ли уже ассоциации
            from sqlalchemy import select
            result = await db.execute(select(Association))
            existing_associations = len(result.scalars().all())
            if existing_associations > 0:
                print("Ассоциации уже существуют в базе данных. Пропускаем создание.")
                return
            
            # Создаем начальные ассоциации
            associations_data = [
                {
                    "name": "Все для Sony",
                    "description": "Оборудование и аксессуары для камер Sony",
                    "order_index": 1
                },
                {
                    "name": "Все для Fujifilm", 
                    "description": "Оборудование и аксессуары для камер Fujifilm",
                    "order_index": 2
                },
                {
                    "name": "Для съемки видео",
                    "description": "Оборудование для видеосъемки",
                    "order_index": 3
                },
                {
                    "name": "Для фотографии",
                    "description": "Оборудование для фотосъемки",
                    "order_index": 4
                },
                {
                    "name": "Студийное оборудование",
                    "description": "Оборудование для студийной съемки",
                    "order_index": 5
                },
                {
                    "name": "Портативное оборудование",
                    "description": "Легкое и портативное оборудование",
                    "order_index": 6
                }
            ]
            
            # Создаем ассоциации
            for assoc_data in associations_data:
                association = Association(**assoc_data)
                db.add(association)
            
            # Сохраняем изменения
            await db.commit()
            
            print(f"Успешно создано {len(associations_data)} ассоциаций:")
            for assoc_data in associations_data:
                print(f"  - {assoc_data['name']}")
            
            # Показываем созданные ассоциации
            print("\nСозданные ассоциации:")
            result = await db.execute(select(Association).order_by(Association.order_index))
            associations = result.scalars().all()
            for assoc in associations:
                print(f"  ID: {assoc.id}, Название: {assoc.name}, Порядок: {assoc.order_index}")
                
        except Exception as e:
            print(f"Ошибка при создании ассоциаций: {e}")
            await db.rollback()
            raise

async def link_equipment_to_associations():
    """Связывает существующее оборудование с ассоциациями по бренду."""
    
    async with AsyncSessionLocal() as db:
        try:
            # Получаем все ассоциации
            from sqlalchemy import select
            result = await db.execute(select(Association))
            associations = result.scalars().all()
            associations_dict = {assoc.name: assoc for assoc in associations}
            
            # Получаем все оборудование
            result = await db.execute(select(Equipment))
            equipment = result.scalars().all()
            
            linked_count = 0
            
            for eq in equipment:
                # Связываем оборудование с ассоциациями по бренду
                if eq.brand.lower() == "sony" and "Все для Sony" in associations_dict:
                    associations_dict["Все для Sony"].equipment_items.append(eq)
                    linked_count += 1
                elif eq.brand.lower() == "fujifilm" and "Все для Fujifilm" in associations_dict:
                    associations_dict["Все для Fujifilm"].equipment_items.append(eq)
                    linked_count += 1
                
                # Связываем по типу оборудования
                if "видео" in eq.equipment_type.lower() or "видео" in eq.name.lower():
                    if "Для съемки видео" in associations_dict:
                        associations_dict["Для съемки видео"].equipment_items.append(eq)
                        linked_count += 1
                
                if "фото" in eq.equipment_type.lower() or "фото" in eq.name.lower():
                    if "Для фотографии" in associations_dict:
                        associations_dict["Для фотографии"].equipment_items.append(eq)
                        linked_count += 1
            
            await db.commit()
            print(f"Связано {linked_count} единиц оборудования с ассоциациями")
            
        except Exception as e:
            print(f"Ошибка при связывании оборудования: {e}")
            await db.rollback()
            raise

async def main():
    """Главная функция для запуска скрипта."""
    print("Создание начальных ассоциаций...")
    await populate_associations()
    
    print("\nСвязывание оборудования с ассоциациями...")
    await link_equipment_to_associations()
    
    print("\nГотово!")

if __name__ == "__main__":
    asyncio.run(main())
