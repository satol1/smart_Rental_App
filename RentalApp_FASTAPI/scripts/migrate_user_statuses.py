#!/usr/bin/env python3
"""
Скрипт миграции статусов пользователей для градации статусов.
Обновляет существующие статусы пользователей на основе количества успешных аренд
и просроченных резервов.

Логика миграции:
1. Подсчитывает успешные аренды для каждого пользователя
2. Обновляет статусы на основе количества аренд:
   - ≥7 аренд → "VIP"
   - ≥3 аренд → "Постоянный"
   - Иначе → "Новый" (если текущий статус не "Заблокирован" или "Персона НонГрата")
3. Проверяет просроченные резервы и устанавливает "Заблокирован" при необходимости
4. Мигрирует старые статусы:
   - "Активный" → "Новый"
   - "Требует подтверждения" → "Новый"
   - "Заблокирован" → "Заблокирован" (оставляем как есть)
"""

import asyncio
import sys
import os
from datetime import date
from typing import Dict, List
import logging

# Добавляем корневую директорию проекта в путь, чтобы работали импорты
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Устанавливаем рабочую директорию для корректной работы импортов
os.chdir(project_root)

from containers import AsyncSessionLocal
from api.models.user import User
from api.models.rental import Rental
from api.models.reservation import Reservation
from api.repositories.user_repository import UserRepository
from shared.constants.user_status import (
    UserStatus,
    COMPLETED_RENTALS_FOR_REGULAR,
    COMPLETED_RENTALS_FOR_VIP,
    OVERDUE_RESERVATIONS_FOR_BLOCK
)
from shared.constants.order_status import OrderStatus
from sqlalchemy import select, func, and_, not_
from sqlalchemy.orm import selectinload

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def get_completed_rentals_count(user_id: int, db_session) -> int:
    """Получает количество завершенных аренд для пользователя."""
    result = await db_session.execute(
        select(func.count(Rental.id))
        .where(
            and_(
                Rental.user_id == user_id,
                Rental.status == OrderStatus.COMPLETED
            )
        )
    )
    return result.scalar() or 0


async def get_overdue_reservations_count(
    user_id: int, 
    db_session,
    today: date
) -> int:
    """Получает количество просроченных резервов для пользователя."""
    # Просроченный резерв: ACTIVE, start_date < сегодня, rental is None
    subquery = select(1).where(
        Rental.reservation_id == Reservation.id
    ).exists()
    
    result = await db_session.execute(
        select(func.count(Reservation.id))
        .where(
            and_(
                Reservation.user_id == user_id,
                Reservation.status == OrderStatus.ACTIVE,
                Reservation.start_date < today,
                not_(subquery)  # rental не существует
            )
        )
    )
    return result.scalar() or 0


async def migrate_user_statuses():
    """
    Основная функция миграции статусов пользователей.
    """
    logger.info("🚀 Запуск миграции статусов пользователей...")
    
    db_session = AsyncSessionLocal()
    try:
        user_repo = UserRepository(db_session)
        
        # Получаем всех пользователей
        result = await db_session.execute(select(User))
        all_users = result.scalars().all()
        logger.info(f"📊 Найдено {len(all_users)} пользователей для миграции")
        
        stats = {
            "migrated_to_new": 0,
            "migrated_to_regular": 0,
            "migrated_to_vip": 0,
            "blocked_due_to_overdue": 0,
            "unchanged": 0,
            "errors": 0
        }
        
        today = date.today()
        
        for user in all_users:
            try:
                current_status = user.status
                new_status = None
                
                # Миграция старых статусов
                if current_status == "Активный" or current_status == "Требует подтверждения":
                    new_status = UserStatus.NEW.value
                    stats["migrated_to_new"] += 1
                    logger.info(f"Пользователь {user.id}: '{current_status}' → '{new_status}' (миграция старого статуса)")
                elif current_status == UserStatus.PERSONA_NON_GRATA.value:
                    # Не изменяем статус "Персона НонГрата"
                    stats["unchanged"] += 1
                    logger.info(f"Пользователь {user.id}: остаётся '{UserStatus.PERSONA_NON_GRATA.value}' (не изменяется автоматически)")
                    continue
                elif current_status == UserStatus.BLOCKED.value:
                    # Проверяем, нужно ли оставить блокировку или снять её
                    overdue_count = await get_overdue_reservations_count(
                        user.id, db_session, today
                    )
                    if overdue_count >= OVERDUE_RESERVATIONS_FOR_BLOCK:
                        # Оставляем блокировку
                        new_status = UserStatus.BLOCKED.value
                        stats["unchanged"] += 1
                        logger.info(f"Пользователь {user.id}: остаётся '{UserStatus.BLOCKED.value}' (просроченных резервов: {overdue_count})")
                    else:
                        # Снимаем блокировку и пересчитываем статус по арендам
                        new_status = None  # Будет пересчитан ниже
                        logger.info(f"Пользователь {user.id}: снимаем блокировку (просроченных резервов: {overdue_count})")
                
                # Если статус не был определен выше, пересчитываем по арендам
                if new_status is None:
                    completed_count = await get_completed_rentals_count(user.id, db_session)
                    
                    if completed_count >= COMPLETED_RENTALS_FOR_VIP:
                        new_status = UserStatus.VIP.value
                        stats["migrated_to_vip"] += 1
                    elif completed_count >= COMPLETED_RENTALS_FOR_REGULAR:
                        new_status = UserStatus.REGULAR.value
                        stats["migrated_to_regular"] += 1
                    else:
                        new_status = UserStatus.NEW.value
                        stats["migrated_to_new"] += 1
                    
                    logger.info(
                        f"Пользователь {user.id}: '{current_status}' → '{new_status}' "
                        f"(завершено аренд: {completed_count})"
                    )
                
                # Проверяем просроченные резервы для пользователей, которые не заблокированы
                if new_status != UserStatus.BLOCKED.value and new_status != UserStatus.PERSONA_NON_GRATA.value:
                    overdue_count = await get_overdue_reservations_count(
                        user.id, db_session, today
                    )
                    if overdue_count >= OVERDUE_RESERVATIONS_FOR_BLOCK:
                        new_status = UserStatus.BLOCKED.value
                        stats["blocked_due_to_overdue"] += 1
                        logger.warning(
                            f"Пользователь {user.id}: заблокирован из-за {overdue_count} просроченных резервов"
                        )
                
                # Обновляем статус пользователя
                if new_status and new_status != current_status:
                    await user_repo.update_user_status(user, UserStatus(new_status))
                    logger.info(f"✅ Пользователь {user.id}: статус обновлён с '{current_status}' на '{new_status}'")
                else:
                    stats["unchanged"] += 1
                    
            except Exception as e:
                stats["errors"] += 1
                logger.error(f"❌ Ошибка при миграции пользователя {user.id}: {e}", exc_info=True)
                continue
        
        # Коммитим все изменения
        await db_session.commit()
        
        # Выводим статистику
        logger.info("=" * 60)
        logger.info("📊 Статистика миграции:")
        logger.info(f"   Мигрировано в 'Новый': {stats['migrated_to_new']}")
        logger.info(f"   Мигрировано в 'Постоянный': {stats['migrated_to_regular']}")
        logger.info(f"   Мигрировано в 'VIP': {stats['migrated_to_vip']}")
        logger.info(f"   Заблокировано из-за просрочек: {stats['blocked_due_to_overdue']}")
        logger.info(f"   Без изменений: {stats['unchanged']}")
        logger.info(f"   Ошибок: {stats['errors']}")
        logger.info("=" * 60)
        logger.info("✅ Миграция завершена успешно!")
        
    except Exception as e:
        logger.error(f"❌ Критическая ошибка при миграции: {e}", exc_info=True)
        await db_session.rollback()
        raise
    finally:
        await db_session.close()


if __name__ == "__main__":
    asyncio.run(migrate_user_statuses())

