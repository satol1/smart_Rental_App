# api/services/availability/availability_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from typing import List, Dict, Any, Optional
import logging

from .conflicts import AvailabilityConflictsService
from .statuses import AvailabilityStatusService
from .calendar import AvailabilityCalendarService
from .queries import AvailabilityQueryService

logger = logging.getLogger(__name__)


class AvailabilityService:
    """
    Главный фасад для сервисов проверки доступности оборудования.
    Объединяет все специализированные сервисы в единый интерфейс.
    Единственный источник правды для всех проверок доступности в системе.
    """

    def __init__(self, 
                 db: AsyncSession,
                 conflicts_service: AvailabilityConflictsService,
                 status_service: AvailabilityStatusService,
                 calendar_service: AvailabilityCalendarService,
                 query_service: AvailabilityQueryService):
        self.db = db
        self._conflicts_service = conflicts_service
        self._status_service = status_service
        self._calendar_service = calendar_service
        self._query_service = query_service

    # === МЕТОДЫ ДЛЯ РАБОТЫ С КОНФЛИКТАМИ ===
    
    async def get_conflicts(
        self,
        equipment_ids: List[int],
        start_date: date,
        end_date: date,
        exclude_reservation_id: Optional[int] = None,
        exclude_rental_id: Optional[int] = None
    ) -> Dict[int, List[Dict[str, Any]]]:
        """
        Основной метод для получения всех конфликтов доступности оборудования.
        
        Args:
            equipment_ids: Список ID оборудования для проверки
            start_date: Дата начала периода
            end_date: Дата окончания периода (включительно)
            exclude_reservation_id: ID резервирования для исключения из проверки
            exclude_rental_id: ID аренды для исключения из проверки
            
        Returns:
            Словарь, где ключ - ID оборудования, значение - список конфликтов
        """
        return await self._conflicts_service.get_conflicts(
            equipment_ids, start_date, end_date, exclude_reservation_id, exclude_rental_id
        )

    async def get_conflicting_equipment_ids(
        self,
        equipment_ids: List[int],
        start_date: date,
        end_date: date,
        exclude_reservation_id: Optional[int] = None,
        exclude_rental_id: Optional[int] = None
    ) -> List[int]:
        """
        Возвращает список ID оборудования, у которого есть конфликты доступности.
        
        Args:
            equipment_ids: Список ID оборудования для проверки
            start_date: Дата начала периода
            end_date: Дата окончания периода
            exclude_reservation_id: ID резервирования для исключения
            exclude_rental_id: ID аренды для исключения
            
        Returns:
            Список ID оборудования с конфликтами
        """
        return await self._conflicts_service.get_conflicting_equipment_ids(
            equipment_ids, start_date, end_date, exclude_reservation_id, exclude_rental_id
        )

    # === МЕТОДЫ ДЛЯ РАБОТЫ СО СТАТУСАМИ ===
    
    async def get_availability_statuses(
        self,
        equipment_ids: List[int],
        start_date: date,
        end_date: date,
        exclude_reservation_id: Optional[int] = None,
        exclude_rental_id: Optional[int] = None
    ) -> Dict[int, Dict[str, Any]]:
        """
        Возвращает статусы доступности для списка оборудования.
        
        Args:
            equipment_ids: Список ID оборудования для проверки
            start_date: Дата начала периода
            end_date: Дата окончания периода
            exclude_reservation_id: ID резервирования для исключения
            exclude_rental_id: ID аренды для исключения
            
        Returns:
            Словарь со статусами оборудования
        """
        return await self._status_service.get_availability_statuses(
            equipment_ids, start_date, end_date, exclude_reservation_id, exclude_rental_id
        )

    async def get_daily_statuses(
        self,
        equipment_ids: List[int],
        start_date: date,
        end_date: date,
        exclude_reservation_id: Optional[int] = None,
        exclude_rental_id: Optional[int] = None,
        current_user_id: Optional[int] = None
    ) -> Dict[int, Dict[str, Any]]:
        """
        Возвращает статусы оборудования по дням для календарного представления.
        
        Args:
            equipment_ids: Список ID оборудования для проверки
            start_date: Дата начала периода
            end_date: Дата окончания периода
            exclude_reservation_id: ID резервирования для исключения
            exclude_rental_id: ID аренды для исключения
            current_user_id: ID текущего пользователя для выделения его резервирований
            
        Returns:
            Словарь со статусами по дням
        """
        return await self._status_service.get_daily_statuses(
            equipment_ids, start_date, end_date, exclude_reservation_id, exclude_rental_id, current_user_id
        )

    # === МЕТОДЫ ДЛЯ РАБОТЫ С КАЛЕНДАРЕМ ===
    
    async def get_calendar_events(
        self,
        equipment_ids: List[int],
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """
        Возвращает события для календаря в формате FullCalendar.
        
        Args:
            equipment_ids: Список ID оборудования
            start_date: Дата начала периода
            end_date: Дата окончания периода
            
        Returns:
            Список событий для календаря
        """
        return await self._calendar_service.get_calendar_events(
            equipment_ids, start_date, end_date
        )

    # === МЕТОДЫ ДЛЯ РАБОТЫ С SQL-ЗАПРОСАМИ ===
    
    def get_sqlalchemy_filter_for_available_equipment(
        self,
        start_date: date,
        end_date: date,
        exclude_reservation_id: Optional[int] = None,
        exclude_rental_id: Optional[int] = None
    ):
        """
        Возвращает SQLAlchemy фильтр для исключения недоступного оборудования.
        Используется для оптимизации запросов в EquipmentQueryBuilder.
        
        Args:
            start_date: Дата начала периода
            end_date: Дата окончания периода
            exclude_reservation_id: ID резервирования для исключения
            exclude_rental_id: ID аренды для исключения
            
        Returns:
            SQLAlchemy BinaryExpression для фильтрации
        """
        return self._query_service.get_sqlalchemy_filter_for_available_equipment(
            start_date, end_date, exclude_reservation_id, exclude_rental_id
        )
