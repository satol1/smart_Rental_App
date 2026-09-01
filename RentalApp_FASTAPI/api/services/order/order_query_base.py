# api/services/order/order_query_base.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import or_, select, func, desc, asc
from typing import Optional, List, Tuple, TypeVar, Generic
from datetime import date
import logging

from api.models.user import User
from api.models.equipment import Equipment
from shared.constants.order_status import OrderStatus

logger = logging.getLogger(__name__)

T = TypeVar('T')  # Тип модели (Reservation или Rental)

class OrderQueryBase(Generic[T]):
    """
    Базовый класс для общих операций фильтрации, поиска и сортировки заказов.
    Содержит общую логику для резервов и аренд.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    def _apply_user_search(self, query, search_term: str, model_class):
        """
        Применяет поиск по имени или email пользователя.
        """
        search_pattern = f"%{search_term.lower()}%"
        # Убеждаемся, что JOIN к пользователю уже есть или добавляем его
        # В наших случаях он всегда будет, так как мы его добавляем в базовых запросах
        query = query.join(model_class.user).filter(
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )
        return query

    def _apply_equipment_search(self, query, search_term: str, model_class):
        """
        Применяет полнотекстовый поиск по связанному оборудованию.
        Ищет по полям name, brand, equipment_type.
        """
        search_pattern = f"%{search_term.lower()}%"
        
        # Применяем фильтр поиска через EXISTS подзапрос
        # Это более безопасный способ для связанных таблиц
        equipment_subquery = select(Equipment.id).where(
            or_(
                Equipment.name.ilike(search_pattern),
                Equipment.brand.ilike(search_pattern),
                Equipment.equipment_type.ilike(search_pattern)
            )
        )
        
        # Добавляем фильтр через EXISTS для связанного оборудования
        query = query.filter(
            model_class.equipment.any(
                Equipment.id.in_(equipment_subquery)
            )
        )
        
        return query

    def _apply_status_filter(self, query, status_filter: Optional[str], model_class):
        """
        Применяет фильтрацию по статусу.
        """
        if not status_filter:
            return query
            
        today = date.today()
        
        if status_filter == OrderStatus.ACTIVE:
            # Ищем активные, но не просроченные
            query = query.filter(model_class.status == OrderStatus.ACTIVE, model_class.end_date >= today)
        elif status_filter == OrderStatus.COMPLETED:
            # Завершенные - это все неактивные статусы
            query = query.filter(model_class.status.in_([OrderStatus.FULFILLED, OrderStatus.CANCELLED, OrderStatus.COMPLETED]))
        elif status_filter == OrderStatus.OVERDUE:
            # Активные, но просроченные
            query = query.filter(
                model_class.status == OrderStatus.ACTIVE,
                model_class.end_date < today
            )
            
        return query

    def _apply_sorting(self, query, sort_option: Optional[str], model_class):
        """
        Применяет сортировку по различным полям.
        Поддерживаемые опции: id, start_date, end_date, count
        """
        if not sort_option:
            # Сортировка по умолчанию
            return query.order_by(model_class.id.desc())
        
        sort_parts = sort_option.split('_')
        field = sort_parts[0]
        direction = sort_parts[1] if len(sort_parts) > 1 else 'desc'
        
        # Определяем направление сортировки
        sort_func = desc if direction == 'desc' else asc
        
        if field == "id":
            query = query.order_by(sort_func(model_class.id))
        elif field == "start_date":
            query = query.order_by(sort_func(model_class.start_date))
        elif field == "end_date":
            query = query.order_by(sort_func(model_class.end_date))
        elif field == "count":
            # Сортировка по количеству оборудования
            # Для этого нужно подсчитать количество связанного оборудования
            equipment_count = select(func.count()).select_from(
                model_class.equipment.property.mapper.class_.__table__
            ).where(
                model_class.equipment.property.mapper.class_.id.in_(
                    select(model_class.equipment.property.mapper.class_.id)
                    .where(model_class.id == model_class.id)
                )
            ).scalar_subquery()
            
            query = query.order_by(sort_func(equipment_count))
        else:
            # Неизвестное поле - используем сортировку по умолчанию
            query = query.order_by(model_class.id.desc())
            
        return query

    def _apply_pagination(self, query, skip: int, limit: int):
        """
        Применяет пагинацию к запросу.
        """
        return query.offset(skip).limit(limit)

    async def _get_total_count(self, base_query) -> int:
        """
        Получает общее количество записей для базового запроса.
        """
        count_query = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_query)
        return result.scalar_one()

    def _get_equipment_joins(self):
        """
        Возвращает стандартные JOIN'ы для оборудования.
        Переопределяется в наследниках для специфичных моделей.
        """
        return [
            selectinload(Equipment.accessories),
            selectinload(Equipment.associations)
        ]
