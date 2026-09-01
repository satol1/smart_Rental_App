# api/services/user/overdue_checker_service.py

"""
Сервис для проверки просроченных резервов и автоматической блокировки пользователей.
Используется для фоновых задач (cron, Celery, FastAPI BackgroundTasks).
"""

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import logging

from api.repositories.user_repository import UserRepository
from api.repositories.reservation_repository import ReservationRepository
from api.services.user.user_status_service import UserStatusService

logger = logging.getLogger(__name__)


class OverdueCheckerService:
    """
    Сервис для проверки просроченных резервов и автоматической блокировки пользователей.
    
    Следует принципу Single Responsibility - отдельный сервис для фоновых задач.
    """
    
    def __init__(
        self,
        db: AsyncSession,
        user_repo: UserRepository,
        reservation_repo: ReservationRepository,
        user_status_service: UserStatusService
    ):
        self.db = db
        self.user_repo = user_repo
        self.reservation_repo = reservation_repo
        self.user_status_service = user_status_service
    
    async def check_and_block_users_with_overdue_reservations(self) -> List[int]:
        """
        Проверяет всех пользователей на просроченные резервы и блокирует тех,
        у кого ≥3 просроченных резервов.
        
        Returns:
            Список ID пользователей, которые были заблокированы
        """
        blocked_user_ids = []
        
        try:
            # Получаем активных пользователей (исключая заблокированных и Persona Non Grata)
            from shared.constants.user_status import UserStatus
            
            # Используем оптимизированный метод репозитория для получения пользователей
            active_users = await self.user_repo.get_active_users(
                exclude_statuses=[UserStatus.BLOCKED.value, UserStatus.PERSONA_NON_GRATA.value]
            )
            
            logger.info(f"Начинаем проверку просроченных резервов для {len(active_users)} пользователей")
            
            for user in active_users:
                user_id = user.id
                try:
                    was_blocked = await self.user_status_service.check_and_block_on_overdue(user_id)
                    if was_blocked:
                        blocked_user_ids.append(user_id)
                        logger.info(f"Пользователь {user_id} заблокирован из-за просроченных резервов")
                except Exception as e:
                    logger.error(f"Ошибка при проверке пользователя {user_id}: {e}", exc_info=True)
                    continue
            
            if blocked_user_ids:
                logger.warning(f"Заблокировано {len(blocked_user_ids)} пользователей: {blocked_user_ids}")
            else:
                logger.info("Пользователи с просроченными резервами не найдены")
            
            return blocked_user_ids
            
        except Exception as e:
            logger.error(f"Ошибка при проверке просроченных резервов: {e}", exc_info=True)
            return blocked_user_ids

