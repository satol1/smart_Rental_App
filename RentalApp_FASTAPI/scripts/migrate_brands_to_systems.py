import asyncio
import sys
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Добавляем корневую директорию проекта в путь, чтобы работали импорты
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from containers import AsyncSessionLocal
from api.models.equipment import Equipment
from api.models.brand_system import BrandSystem

async def run_migration():
    """
    Находит все уникальные бренды в таблице оборудования и создает для них
    соответствующие записи в таблице 'brand_systems', если они еще не существуют.
    """
    print("🚀 Запуск скрипта для миграции существующих брендов в Системы Бренда...")
    db_session: AsyncSession = AsyncSessionLocal()
    try:
        # Используем одну транзакцию для всех операций
        async with db_session.begin():
            # 1. Получаем все уникальные бренды из таблицы оборудования
            brands_result = await db_session.execute(select(Equipment.brand).distinct())
            unique_brands = [b[0] for b in brands_result if b[0]]
            
            if not unique_brands:
                print("ℹ️ В каталоге не найдено брендов для миграции. Завершение.")
                return

            print(f"🔍 Найдено {len(unique_brands)} уникальных брендов: {unique_brands}")

            # 2. Создаем 'Системы Бренда' для каждого уникального бренда
            created_count = 0
            for brand_name in unique_brands:
                # Проверяем, не существует ли уже такая система
                existing_system_res = await db_session.execute(
                    select(BrandSystem).filter_by(name=brand_name)
                )
                if existing_system_res.scalar_one_or_none():
                    print(f"ℹ️ Система Бренда '{brand_name}' уже существует. Пропускаем.")
                    continue

                # Создаем новую систему
                new_system = BrandSystem(
                    name=brand_name,
                    description=f"Автоматически созданная система для бренда {brand_name}"
                )
                db_session.add(new_system)
                created_count += 1
                print(f"✅ Будет создана Система Бренда: '{brand_name}'")

        # Коммит произойдет автоматически при выходе из блока 'async with'
        if created_count > 0:
            print(f"\n🎉 Успешно создано {created_count} новых Систем Бренда.")
        else:
            print("\n✅ Все бренды уже синхронизированы с Системами Бренда.")
            
        print("Миграция данных успешно завершена!")

    except Exception as e:
        await db_session.rollback()
        print(f"❌ Произошла ошибка во время миграции: {e}")
    finally:
        await db_session.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
