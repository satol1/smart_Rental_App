#!/usr/bin/env python3
"""
Скрипт для заполнения базы данных начальными данными оборудования.
Адаптирует данные с Bukza под критерии приложения аренды оборудования.
"""

import asyncio
import sys
import os
from decimal import Decimal
from datetime import date
from typing import List, Dict, Any

# Добавляем корневую директорию проекта в путь, чтобы работали импорты
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'RentalApp_FASTAPI'))

from containers import AsyncSessionLocal
from api.models.equipment import Equipment
from api.models.brand_system import BrandSystem
from api.models.accessory import Accessory
from api.repositories.equipment_repository import EquipmentRepository
from api.repositories.brand_system_repository import BrandSystemRepository
from api.repositories.accessory_repository import AccessoryRepository
from shared.schemas.equipment_schema import EquipmentCreate

# Данные оборудования, адаптированные под приложение аренды
EQUIPMENT_DATA = [
    # Фотоаппараты
    {
        "equipment_type": "Фотоаппарат",
        "brand": "Canon",
        "name": "EOS R5",
        "description": "Профессиональная беззеркальная камера с разрешением 45 МП, 8K видео и стабилизацией изображения",
        "daily_rate": 2500.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/canon-r5-1.jpg", "https://example.com/canon-r5-2.jpg"],
        "short_description": "Профессиональная беззеркальная камера Canon EOS R5",
        "brand_system": "Canon RF"
    },
    {
        "equipment_type": "Фотоаппарат",
        "brand": "Canon",
        "name": "EOS R6 Mark II",
        "description": "Универсальная беззеркальная камера с отличной производительностью в условиях низкой освещенности",
        "daily_rate": 2000.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/canon-r6-ii-1.jpg"],
        "short_description": "Универсальная беззеркальная камера Canon EOS R6 Mark II",
        "brand_system": "Canon RF"
    },
    {
        "equipment_type": "Фотоаппарат",
        "brand": "Nikon",
        "name": "Z9",
        "description": "Флагманская беззеркальная камера с разрешением 45.7 МП и продвинутой системой автофокуса",
        "daily_rate": 3000.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/nikon-z9-1.jpg", "https://example.com/nikon-z9-2.jpg"],
        "short_description": "Флагманская беззеркальная камера Nikon Z9",
        "brand_system": "Nikon Z"
    },
    {
        "equipment_type": "Фотоаппарат",
        "brand": "Sony",
        "name": "A7R V",
        "description": "Высокотехнологичная беззеркальная камера с разрешением 61 МП и ИИ-автофокусом",
        "daily_rate": 2800.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/sony-a7r5-1.jpg"],
        "short_description": "Высокотехнологичная беззеркальная камера Sony A7R V",
        "brand_system": "Sony E"
    },
    
    # Объективы Canon RF
    {
        "equipment_type": "Объектив",
        "brand": "Canon",
        "name": "RF 24-70mm f/2.8L IS USM",
        "description": "Универсальный зум-объектив для профессиональной съемки с постоянной диафрагмой f/2.8",
        "daily_rate": 1200.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/canon-rf-24-70-1.jpg"],
        "short_description": "Универсальный зум-объектив Canon RF 24-70mm f/2.8L",
        "brand_system": "Canon RF"
    },
    {
        "equipment_type": "Объектив",
        "brand": "Canon",
        "name": "RF 70-200mm f/2.8L IS USM",
        "description": "Телеобъектив для портретной и спортивной съемки с оптической стабилизацией",
        "daily_rate": 1500.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/canon-rf-70-200-1.jpg"],
        "short_description": "Телеобъектив Canon RF 70-200mm f/2.8L",
        "brand_system": "Canon RF"
    },
    {
        "equipment_type": "Объектив",
        "brand": "Canon",
        "name": "RF 85mm f/1.2L USM",
        "description": "Портретный объектив с очень светосильной диафрагмой f/1.2",
        "daily_rate": 1800.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/canon-rf-85-1.jpg"],
        "short_description": "Портретный объектив Canon RF 85mm f/1.2L",
        "brand_system": "Canon RF"
    },
    
    # Объективы Nikon Z
    {
        "equipment_type": "Объектив",
        "brand": "Nikon",
        "name": "Z 24-70mm f/2.8 S",
        "description": "Профессиональный зум-объектив с постоянной диафрагмой и отличным качеством изображения",
        "daily_rate": 1300.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/nikon-z-24-70-1.jpg"],
        "short_description": "Профессиональный зум-объектив Nikon Z 24-70mm f/2.8 S",
        "brand_system": "Nikon Z"
    },
    {
        "equipment_type": "Объектив",
        "brand": "Nikon",
        "name": "Z 70-200mm f/2.8 VR S",
        "description": "Телеобъектив с оптической стабилизацией для профессиональной съемки",
        "daily_rate": 1600.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/nikon-z-70-200-1.jpg"],
        "short_description": "Телеобъектив Nikon Z 70-200mm f/2.8 VR S",
        "brand_system": "Nikon Z"
    },
    
    # Объективы Sony E
    {
        "equipment_type": "Объектив",
        "brand": "Sony",
        "name": "FE 24-70mm f/2.8 GM",
        "description": "Флагманский зум-объектив серии G Master с превосходным качеством изображения",
        "daily_rate": 1400.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/sony-fe-24-70-1.jpg"],
        "short_description": "Флагманский зум-объектив Sony FE 24-70mm f/2.8 GM",
        "brand_system": "Sony E"
    },
    {
        "equipment_type": "Объектив",
        "brand": "Sony",
        "name": "FE 85mm f/1.4 GM",
        "description": "Портретный объектив G Master с исключительной резкостью и боке",
        "daily_rate": 1700.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/sony-fe-85-1.jpg"],
        "short_description": "Портретный объектив Sony FE 85mm f/1.4 GM",
        "brand_system": "Sony E"
    },
    
    # Студийное освещение
    {
        "equipment_type": "Освещение",
        "brand": "Godox",
        "name": "AD600Pro",
        "description": "Мощная портативная вспышка с батарейным питанием для студийной и выездной съемки",
        "daily_rate": 800.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/godox-ad600pro-1.jpg"],
        "short_description": "Портативная вспышка Godox AD600Pro",
        "brand_system": "Godox"
    },
    {
        "equipment_type": "Освещение",
        "brand": "Profoto",
        "name": "A1X",
        "description": "Компактная вспышка для накамерного использования с высоким качеством света",
        "daily_rate": 600.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/profoto-a1x-1.jpg"],
        "short_description": "Компактная вспышка Profoto A1X",
        "brand_system": "Profoto"
    },
    
    # Студийные модификаторы
    {
        "equipment_type": "Модификатор",
        "brand": "Elinchrom",
        "name": "Rotalux 100cm Octa",
        "description": "Большой октабокс для создания мягкого рассеянного света",
        "daily_rate": 300.0,
        "condition": "Хорошо",
        "image_urls": ["https://example.com/elinchrom-octa-1.jpg"],
        "short_description": "Большой октабокс Elinchrom Rotalux 100cm",
        "brand_system": "Elinchrom"
    },
    {
        "equipment_type": "Модификатор",
        "brand": "Westcott",
        "name": "Rapid Box 26\"",
        "description": "Универсальный софтбокс для портретной и предметной съемки",
        "daily_rate": 200.0,
        "condition": "Хорошо",
        "image_urls": ["https://example.com/westcott-rapid-1.jpg"],
        "short_description": "Универсальный софтбокс Westcott Rapid Box 26\"",
        "brand_system": "Westcott"
    },
    
    # Штативы
    {
        "equipment_type": "Штатив",
        "brand": "Gitzo",
        "name": "GT3543XLS",
        "description": "Профессиональный карбоновый штатив с максимальной нагрузкой 25 кг",
        "daily_rate": 500.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/gitzo-gt3543xls-1.jpg"],
        "short_description": "Профессиональный карбоновый штатив Gitzo GT3543XLS",
        "brand_system": "Gitzo"
    },
    {
        "equipment_type": "Штатив",
        "brand": "Manfrotto",
        "name": "055 Carbon Fiber",
        "description": "Надежный карбоновый штатив для профессиональной съемки",
        "daily_rate": 400.0,
        "condition": "Хорошо",
        "image_urls": ["https://example.com/manfrotto-055-1.jpg"],
        "short_description": "Карбоновый штатив Manfrotto 055",
        "brand_system": "Manfrotto"
    },
    
    # Видеооборудование
    {
        "equipment_type": "Видеокамера",
        "brand": "Sony",
        "name": "FX6",
        "description": "Кинематографическая камера с полнокадровым сенсором и профессиональными функциями",
        "daily_rate": 4000.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/sony-fx6-1.jpg"],
        "short_description": "Кинематографическая камера Sony FX6",
        "brand_system": "Sony E"
    },
    {
        "equipment_type": "Видеокамера",
        "brand": "Canon",
        "name": "C70",
        "description": "Компактная кинокамера с полнокадровым сенсором и встроенными ND-фильтрами",
        "daily_rate": 3500.0,
        "condition": "Отлично",
        "image_urls": ["https://example.com/canon-c70-1.jpg"],
        "short_description": "Компактная кинокамера Canon C70",
        "brand_system": "Canon RF"
    }
]

# Данные аксессуаров
ACCESSORIES_DATA = [
    {
        "name": "Карта памяти SanDisk Extreme Pro 128GB",
        "accessory_type": "Накопитель",
        "price": 50.0,
        "description": "Быстрая карта памяти для профессиональной съемки"
    },
    {
        "name": "Аккумулятор Canon LP-E6NH",
        "accessory_type": "Аккумулятор",
        "price": 80.0,
        "description": "Оригинальный аккумулятор для камер Canon EOS R"
    },
    {
        "name": "Аккумулятор Sony NP-FZ100",
        "accessory_type": "Аккумулятор",
        "price": 90.0,
        "description": "Оригинальный аккумулятор для камер Sony A7/A9"
    },
    {
        "name": "Зарядное устройство универсальное",
        "accessory_type": "Зарядное устройство",
        "price": 120.0,
        "description": "Универсальное зарядное устройство для различных типов аккумуляторов"
    },
    {
        "name": "Фильтр UV 77mm",
        "accessory_type": "Фильтр",
        "price": 60.0,
        "description": "Защитный UV-фильтр для объективов с диаметром 77mm"
    },
    {
        "name": "Поляризационный фильтр 82mm",
        "accessory_type": "Фильтр",
        "price": 150.0,
        "description": "Круговой поляризационный фильтр для уменьшения бликов"
    },
    {
        "name": "Ремень для камеры",
        "accessory_type": "Аксессуар",
        "price": 40.0,
        "description": "Удобный ремень для переноски камеры"
    },
    {
        "name": "Чехол для объектива",
        "accessory_type": "Чехол",
        "price": 30.0,
        "description": "Защитный чехол для транспортировки объективов"
    }
]

# Данные систем брендов
BRAND_SYSTEMS_DATA = [
    {
        "name": "Canon RF",
        "description": "Система беззеркальных камер Canon с байонетом RF"
    },
    {
        "name": "Nikon Z",
        "description": "Система беззеркальных камер Nikon с байонетом Z"
    },
    {
        "name": "Sony E",
        "description": "Система беззеркальных камер Sony с байонетом E"
    },
    {
        "name": "Godox",
        "description": "Система студийного освещения Godox"
    },
    {
        "name": "Profoto",
        "description": "Система профессионального освещения Profoto"
    },
    {
        "name": "Elinchrom",
        "description": "Система студийного освещения Elinchrom"
    },
    {
        "name": "Westcott",
        "description": "Система модификаторов света Westcott"
    },
    {
        "name": "Gitzo",
        "description": "Система штативов Gitzo"
    },
    {
        "name": "Manfrotto",
        "description": "Система штативов Manfrotto"
    }
]

async def create_brand_systems(db_session):
    """Создает системы брендов в базе данных."""
    print("🔧 Создание систем брендов...")
    brand_system_repo = BrandSystemRepository(db_session)
    
    for system_data in BRAND_SYSTEMS_DATA:
        # Проверяем, существует ли уже система бренда
        existing = await brand_system_repo.get_by_name(system_data["name"])
        if not existing:
            brand_system = BrandSystem(
                name=system_data["name"],
                description=system_data["description"]
            )
            db_session.add(brand_system)
            print(f"  ✅ Создана система бренда: {system_data['name']}")
        else:
            print(f"  ⏭️  Система бренда уже существует: {system_data['name']}")
    
    await db_session.commit()

async def create_accessories(db_session):
    """Создает аксессуары в базе данных."""
    print("🎒 Создание аксессуаров...")
    accessory_repo = AccessoryRepository(db_session)
    
    for accessory_data in ACCESSORIES_DATA:
        # Проверяем, существует ли уже аксессуар
        existing = await accessory_repo.get_by_name(accessory_data["name"])
        if not existing:
            accessory = Accessory(
                name=accessory_data["name"],
                accessory_type=accessory_data["accessory_type"],
                price=accessory_data["price"],
                description=accessory_data["description"]
            )
            db_session.add(accessory)
            print(f"  ✅ Создан аксессуар: {accessory_data['name']}")
        else:
            print(f"  ⏭️  Аксессуар уже существует: {accessory_data['name']}")
    
    await db_session.commit()

async def create_equipment(db_session):
    """Создает оборудование в базе данных."""
    print("📷 Создание оборудования...")
    equipment_repo = EquipmentRepository(db_session)
    brand_system_repo = BrandSystemRepository(db_session)
    
    for i, equipment_data in enumerate(EQUIPMENT_DATA, 1):
        # Проверяем, существует ли уже оборудование с таким названием
        existing = await equipment_repo.get_by_name(equipment_data["name"])
        if existing:
            print(f"  ⏭️  Оборудование уже существует: {equipment_data['name']}")
            continue
        
        # Создаем оборудование
        equipment_create = EquipmentCreate(
            equipment_type=equipment_data["equipment_type"],
            brand=equipment_data["brand"],
            name=equipment_data["name"],
            description=equipment_data["description"],
            daily_rate=equipment_data["daily_rate"],
            condition=equipment_data["condition"],
            image_urls=equipment_data["image_urls"],
            short_description=equipment_data["short_description"],
            serial_number=f"SN{1000 + i:06d}"  # Генерируем серийный номер
        )
        
        # Создаем оборудование через репозиторий
        equipment = await equipment_repo.create(equipment_create)
        
        # Добавляем в систему бренда
        if equipment_data.get("brand_system"):
            brand_system = await brand_system_repo.get_by_name(equipment_data["brand_system"])
            if brand_system:
                equipment.brand_systems.append(brand_system)
                await db_session.commit()
        
        print(f"  ✅ Создано оборудование: {equipment_data['name']} (ID: {equipment.id})")

async def seed_database():
    """Основная функция для заполнения базы данных."""
    print("🚀 Запуск скрипта заполнения базы данных...")
    db_session = AsyncSessionLocal()
    
    try:
        # Создаем системы брендов
        await create_brand_systems(db_session)
        
        # Создаем аксессуары
        await create_accessories(db_session)
        
        # Создаем оборудование
        await create_equipment(db_session)
        
        print("✅ База данных успешно заполнена начальными данными!")
        print(f"📊 Создано:")
        print(f"  - {len(BRAND_SYSTEMS_DATA)} систем брендов")
        print(f"  - {len(ACCESSORIES_DATA)} аксессуаров")
        print(f"  - {len(EQUIPMENT_DATA)} единиц оборудования")
        
    except Exception as e:
        await db_session.rollback()
        print(f"❌ Произошла ошибка: {e}")
        raise
    finally:
        await db_session.close()
        print("🏁 Скрипт завершил работу.")

if __name__ == "__main__":
    asyncio.run(seed_database())
