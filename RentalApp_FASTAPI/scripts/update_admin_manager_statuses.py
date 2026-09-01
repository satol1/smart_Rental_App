#!/usr/bin/env python3
"""
Скрипт для обновления статусов существующих администраторов и менеджеров на VIP.
Устанавливает статус VIP и флаг status_changed_manually = True для всех пользователей
с ролью admin или manager.

Использование:
    python scripts/update_admin_manager_statuses.py
"""

import asyncio
import sys
import os
from sqlalchemy import select

# Добавляем корневую директорию проекта в путь, чтобы работали импорты
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from containers import AsyncSessionLocal
from api.models.user import User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def update_admin_manager_statuses():
    """
    Обновляет статусы всех администраторов и менеджеров на VIP.
    Устанавливает status_changed_manually = True для этих пользователей.
    """
    logger.info("🚀 Запуск скрипта обновления статусов админов и менеджеров...")
    
    db_session = AsyncSessionLocal()
    try:
        # Находим всех пользователей с ролью admin или manager
        result = await db_session.execute(
            select(User).filter(User.role.in_(["admin", "manager"]))
        )
        users = result.scalars().all()
        
        if not users:
            logger.info("✅ Администраторы и менеджеры не найдены. Пропускаем обновление.")
            return
        
        logger.info(f"📋 Найдено {len(users)} пользователей с ролью admin или manager")
        
        updated_count = 0
        for user in users:
            old_status = user.status
            old_manually = getattr(user, 'status_changed_manually', False)
            
            # Обновляем статус на VIP, если он еще не установлен
            if user.status != "VIP":
                user.status = "VIP"
                updated_count += 1
                logger.info(f"  ✅ Пользователь {user.id} ({user.email}, роль: {user.role}): статус изменен с '{old_status}' на 'VIP'")
            else:
                logger.info(f"  ℹ️  Пользователь {user.id} ({user.email}, роль: {user.role}): статус уже 'VIP'")
            
            # Устанавливаем флаг status_changed_manually = True
            if not old_manually:
                user.status_changed_manually = True
                logger.info(f"  ✅ Флаг status_changed_manually установлен в True для пользователя {user.id}")
        
        # Коммитим изменения
        await db_session.commit()
        
        logger.info("=" * 60)
        logger.info(f"✅ Обновление завершено успешно!")
        logger.info(f"   Всего пользователей обработано: {len(users)}")
        logger.info(f"   Статусов обновлено: {updated_count}")
        logger.info("=" * 60)
        
    except Exception as e:
        await db_session.rollback()
        logger.error(f"❌ Произошла ошибка: {e}", exc_info=True)
        raise
    finally:
        await db_session.close()
        logger.info("🏁 Скрипт завершил работу.")


if __name__ == "__main__":
    asyncio.run(update_admin_manager_statuses())


