#!/usr/bin/env python3
"""
Скрипт для проверки состояния развертывания системы.
Показывает статистику по созданным данным.
"""

import asyncio
import sys
import os
from sqlalchemy import select, func

# Добавляем корневую директорию проекта в путь, чтобы работали импорты
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'RentalApp_FASTAPI'))

from containers import AsyncSessionLocal
from api.models.user import User
from api.models.equipment import Equipment
from api.models.brand_system import BrandSystem
from api.models.accessory import Accessory

async def check_deployment_status():
    """Проверяет состояние развертывания системы."""
    print("🔍 Проверка состояния развертывания системы...")
    print("=" * 60)
    
    db_session = AsyncSessionLocal()
    try:
        # Проверяем администратора
        admin_result = await db_session.execute(
            select(User).filter(User.role == "admin")
        )
        admins = admin_result.scalars().all()
        
        print(f"👤 Администраторы: {len(admins)}")
        for admin in admins:
            print(f"  - {admin.full_name} ({admin.email}) - {'✅ Активен' if admin.is_active else '❌ Неактивен'}")
        
        # Проверяем оборудование
        equipment_result = await db_session.execute(
            select(func.count(Equipment.id))
        )
        equipment_count = equipment_result.scalar_one()
        
        print(f"\n📷 Оборудование: {equipment_count} единиц")
        
        # Группировка по типам
        type_result = await db_session.execute(
            select(Equipment.equipment_type, func.count(Equipment.id))
            .group_by(Equipment.equipment_type)
        )
        type_stats = type_result.all()
        
        for equipment_type, count in type_stats:
            print(f"  - {equipment_type}: {count}")
        
        # Проверяем системы брендов
        brand_system_result = await db_session.execute(
            select(func.count(BrandSystem.id))
        )
        brand_system_count = brand_system_result.scalar_one()
        
        print(f"\n🏷️  Системы брендов: {brand_system_count}")
        
        # Проверяем аксессуары
        accessory_result = await db_session.execute(
            select(func.count(Accessory.id))
        )
        accessory_count = accessory_result.scalar_one()
        
        print(f"\n🎒 Аксессуары: {accessory_count}")
        
        # Группировка аксессуаров по типам
        accessory_type_result = await db_session.execute(
            select(Accessory.accessory_type, func.count(Accessory.id))
            .group_by(Accessory.accessory_type)
        )
        accessory_type_stats = accessory_type_result.all()
        
        for accessory_type, count in accessory_type_stats:
            print(f"  - {accessory_type}: {count}")
        
        # Общая статистика
        print(f"\n📊 ОБЩАЯ СТАТИСТИКА:")
        print(f"  👤 Пользователи: {len(admins)}")
        print(f"  📷 Оборудование: {equipment_count}")
        print(f"  🏷️  Системы брендов: {brand_system_count}")
        print(f"  🎒 Аксессуары: {accessory_count}")
        
        # Проверяем готовность системы
        if len(admins) > 0 and equipment_count > 0:
            print(f"\n✅ СИСТЕМА ГОТОВА К ИСПОЛЬЗОВАНИЮ!")
            print(f"🔑 Для входа используйте данные администратора выше")
        else:
            print(f"\n⚠️  СИСТЕМА НЕ ПОЛНОСТЬЮ РАЗВЕРНУТА")
            if len(admins) == 0:
                print(f"❌ Отсутствует администратор - запустите create_admin.py")
            if equipment_count == 0:
                print(f"❌ Отсутствует оборудование - запустите seed_equipment_data.py")
        
    except Exception as e:
        print(f"❌ Ошибка при проверке: {e}")
    finally:
        await db_session.close()

if __name__ == "__main__":
    asyncio.run(check_deployment_status())
