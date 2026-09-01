# api/repositories/dashboard_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, literal_column, union_all
from datetime import date, datetime, timedelta
from typing import List

from .base_repository import BaseRepository
from api.models.rental import Rental
from api.models.reservation import Reservation
from api.models.equipment import Equipment
from api.models.user import User
from shared.schemas.dashboard_schema import PopularEquipmentItem, ActivityFeedItem


class DashboardRepository(BaseRepository):
    """
    Репозиторий для работы с данными панели управления.
    Инкапсулирует все SQL-запросы для dashboard сервисов.
    """
    
    def __init__(self, db: AsyncSession):
        # DashboardRepository не привязан к одной модели, поэтому передаем None
        super().__init__(db, None)
    
    async def get_popular_equipment(self, days: int = 30) -> List[PopularEquipmentItem]:
        """
        Получает популярное оборудование за указанное количество дней.
        
        Args:
            days: Количество дней для анализа (по умолчанию 30)
            
        Returns:
            Список популярного оборудования с количеством аренд и выручкой
        """
        try:
            cutoff_date = date.today() - timedelta(days=days)
            query = (
                select(
                    Equipment.id.label("equipment_id"),
                    Equipment.name.label("equipment_name"),
                    func.count(Rental.id).label("rental_count"),
                    func.sum(Rental.total_cost).label("revenue")
                )
                .join(Rental.equipment)
                .where(Rental.created_at >= cutoff_date)
                .group_by(Equipment.id, Equipment.name)
                .order_by(desc("rental_count"))
                .limit(12)
            )
            result = await self.db.execute(query)
            return [PopularEquipmentItem.model_validate(row) for row in result.mappings().all()]
            
        except Exception as e:
            # Логируем ошибку, но возвращаем пустой список для стабильности
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Ошибка при получении популярного оборудования: {e}", exc_info=True)
            return []
    
    async def get_recent_activity(self, days: int = 7) -> List[ActivityFeedItem]:
        """
        Получает последние события за указанное количество дней.
        
        Args:
            days: Количество дней для анализа (по умолчанию 7)
            
        Returns:
            Список последних событий в системе
        """
        try:
            cutoff_datetime = datetime.now() - timedelta(days=days)

            # Запрос 1: Новые аренды
            new_rentals_q = (
                select(
                    Rental.id,
                    Rental.created_at.label("timestamp"),
                    literal_column("'rental_started'").label("activity_type"),
                    User.full_name.label("user_name"),
                    func.string_agg(Equipment.name, ', ').label("equipment_name")
                )
                .join(User, Rental.user_id == User.id)
                .join(Rental.equipment)
                .where(Rental.created_at >= cutoff_datetime)
                .group_by(Rental.id, User.full_name, Rental.created_at)
            )
            
            # Запрос 2: Новые пользователи
            new_users_q = (
                select(
                    User.id,
                    User.created_at.label("timestamp"),
                    literal_column("'user_registered'").label("activity_type"),
                    User.full_name.label("user_name"),
                    literal_column("NULL").label("equipment_name")
                )
                .where(User.created_at >= cutoff_datetime)
            )

            # Объединяем запросы
            combined_query = union_all(new_rentals_q, new_users_q).order_by(desc("timestamp")).limit(12)
            
            result = await self.db.execute(combined_query)
            
            activities = []
            for row in result.mappings().all():
                description = ""
                if row.activity_type == 'rental_started':
                    description = f"Новая аренда для {row.user_name}"
                elif row.activity_type == 'user_registered':
                    description = f"Новый пользователь: {row.user_name}"
                
                activities.append(ActivityFeedItem(
                    id=row.id, 
                    timestamp=row.timestamp, 
                    activity_type=row.activity_type,
                    description=description, 
                    user_name=row.user_name, 
                    equipment_name=row.equipment_name
                ))
            return activities
            
        except Exception as e:
            # Логируем ошибку, но возвращаем пустой список для стабильности
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Ошибка при получении последних событий: {e}", exc_info=True)
            return []
    
    async def get_today_pickups(self, today: date) -> List[Reservation]:
        """
        Получает резервы, которые должны быть забраны сегодня или ранее (не просроченные).
        
        Args:
            today: Дата для поиска резервов
            
        Returns:
            Список резервов на выдачу (включая просроченные к выдаче)
        """
        try:
            from sqlalchemy.orm import selectinload, joinedload
            from shared.constants.order_status import OrderStatus
            query = (
                select(Reservation)
                .options(
                    joinedload(Reservation.user),
                    selectinload(Reservation.equipment)
                )
                .where(Reservation.start_date <= today)
                .where(Reservation.end_date >= today)
                .where(Reservation.status == OrderStatus.ACTIVE)
            )
            result = await self.db.execute(query)
            return result.unique().scalars().all()
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Ошибка при получении резервов на сегодня: {e}", exc_info=True)
            return []
    
    async def get_today_returns(self, today: date) -> List[Rental]:
        """
        Получает аренды, которые должны быть возвращены сегодня.
        
        Args:
            today: Дата для поиска аренд
            
        Returns:
            Список аренд на возврат сегодня
        """
        try:
            from sqlalchemy.orm import selectinload, joinedload
            from shared.constants.order_status import OrderStatus
            query = (
                select(Rental)
                .options(
                    joinedload(Rental.user),
                    selectinload(Rental.equipment)
                )
                .where(Rental.end_date == today)
                .where(Rental.status == OrderStatus.ACTIVE)
            )
            result = await self.db.execute(query)
            return result.unique().scalars().all()
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Ошибка при получении аренд на возврат сегодня: {e}", exc_info=True)
            return []
    
    async def get_overdue_rentals(self, today: date) -> List[Rental]:
        """
        Получает просроченные аренды.
        
        Args:
            today: Текущая дата для сравнения
            
        Returns:
            Список просроченных аренд
        """
        try:
            from sqlalchemy.orm import selectinload, joinedload
            query = (
                select(Rental)
                .options(
                    joinedload(Rental.user),
                    selectinload(Rental.equipment)
                )
                .where(Rental.end_date < today)
                .where(Rental.status == "active")
            )
            result = await self.db.execute(query)
            return result.unique().scalars().all()
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Ошибка при получении просроченных аренд: {e}", exc_info=True)
            return []
    
    async def get_user_completed_rentals_count(self, user_ids: List[int]) -> dict:
        """
        Получает количество завершенных аренд для пользователей.
        
        Args:
            user_ids: Список ID пользователей
            
        Returns:
            Словарь {user_id: count} с количеством завершенных аренд
        """
        try:
            if not user_ids:
                return {}
                
            query = (
                select(
                    Rental.user_id,
                    func.count(Rental.id).label("completed_count")
                )
                .where(Rental.user_id.in_(user_ids))
                .where(Rental.status == "completed")
                .group_by(Rental.user_id)
            )
            result = await self.db.execute(query)
            rows = result.fetchall()
            
            return {row.user_id: row.completed_count for row in rows}
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Ошибка при получении количества завершенных аренд: {e}", exc_info=True)
            return {}