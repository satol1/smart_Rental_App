# api/services/availability/statuses.py

from datetime import date, timedelta
from typing import List, Dict, Any, Optional
import logging

from .conflicts import AvailabilityConflictsService
from shared.schemas.calendar_schema import DayStatusItem

logger = logging.getLogger(__name__)


class AvailabilityStatusService(AvailabilityConflictsService):
    """
    Сервис для работы со статусами доступности оборудования.
    Отвечает за определение и форматирование статусов оборудования.
    """

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
        statuses: Dict[int, Dict[str, Any]] = {
            eq_id: {"status": "available", "details": "Доступно"}
            for eq_id in equipment_ids
        }
        
        conflicts = await self.get_conflicts(
            equipment_ids, start_date, end_date, exclude_reservation_id, exclude_rental_id
        )
        
        for eq_id, conflict_list in conflicts.items():
            if not conflict_list:
                continue
            
            most_critical = self._get_most_critical_conflict(conflict_list)
            if most_critical:
                statuses[eq_id] = self._format_status_from_conflict(most_critical)
        
        return statuses

    async def get_daily_statuses(
        self,
        equipment_ids: List[int],
        start_date: date,
        end_date: date,
        exclude_reservation_id: Optional[int] = None,
        exclude_rental_id: Optional[int] = None,
        current_user_id: Optional[int] = None
    ) -> Dict[int, Dict[str, DayStatusItem]]:
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
        logger.info(f"Получение статусов по дням для {len(equipment_ids)} ед. оборудования. ID пользователя: {current_user_id}")
        logger.debug(f"Период: {start_date} - {end_date}, исключить резерв: {exclude_reservation_id}, исключить аренду: {exclude_rental_id}")
        
        try:
            num_days = (end_date - start_date).days + 1
            all_dates = [start_date + timedelta(days=i) for i in range(num_days)]
            logger.debug(f"Количество дней в периоде: {num_days}")
            
            result: Dict[int, Dict[str, DayStatusItem]] = {
                eq_id: {
                    day.strftime('%d.%m.%Y'): DayStatusItem(status="available")
                    for day in all_dates
                }
                for eq_id in equipment_ids
            }
            logger.debug(f"Инициализирован результат для {len(result)} ед. оборудования")
            
            logger.info("Вызываем get_conflicts для поиска пересечений")
            conflicts = await self.get_conflicts(
                equipment_ids, start_date, end_date, exclude_reservation_id, exclude_rental_id
            )
            logger.debug(f"Найдено {len(conflicts)} единиц оборудования с конфликтами.")
            
            for eq_id, conflict_list in conflicts.items():
                if eq_id not in result:
                    logger.warning(f"Конфликт для оборудования {eq_id}, которого нет в результате")
                    continue
                    
                logger.debug(f"Обрабатываем {len(conflict_list)} конфликтов для оборудования {eq_id}")
                for conflict in conflict_list:
                    self._apply_conflict_to_daily_statuses(
                        result[eq_id], conflict, start_date, end_date, current_user_id
                    )
            
            logger.info(f"Успешно обработаны статусы для {len(result)} ед. оборудования")
            return result
            
        except Exception as e:
            logger.error(f"Ошибка в get_daily_statuses: {e}", exc_info=True)
            raise

    def _format_status_from_conflict(self, conflict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Форматирует статус на основе конфликта.
        
        Args:
            conflict: Словарь с информацией о конфликте
            
        Returns:
            Отформатированный статус
        """
        if conflict['type'] == 'rental':
            return {
                "status": "rented",
                "details": f"В аренде до {conflict['end_date'].strftime('%d.%m.%Y')}",
                "start_date": conflict['start_date'],
                "end_date": conflict['end_date']
            }
        elif conflict['type'] == 'reservation':
            return {
                "status": "reserved",
                "details": f"Зарезервировано до {conflict['end_date'].strftime('%d.%m.%Y')}",
                "start_date": conflict['start_date'],
                "end_date": conflict['end_date']
            }
        
        return {"status": "available", "details": "Доступно"}

    def _apply_conflict_to_daily_statuses(
        self,
        daily_statuses: Dict[str, DayStatusItem],
        conflict: Dict[str, Any],
        start_date: date,
        end_date: date,
        current_user_id: Optional[int]
    ) -> None:
        """
        Применяет конфликт к статусам по дням.
        
        Args:
            daily_statuses: Словарь со статусами по дням
            conflict: Информация о конфликте
            start_date: Начальная дата периода
            end_date: Конечная дата периода
            current_user_id: ID текущего пользователя
        """
        current_day = conflict['start_date']
        while current_day < conflict['end_date']:
            if start_date <= current_day <= end_date:
                day_str = current_day.strftime('%d.%m.%Y')
                if day_str in daily_statuses and daily_statuses[day_str].status != 'rented':
                    is_user_event = (
                        current_user_id is not None and 
                        conflict.get('user_id') == current_user_id
                    )
                    
                    # Создаем маппинг для корректного преобразования статусов
                    status_map = {
                        "reservation": "reserved",
                        "rental": "rented"
                    }
                    correct_status = status_map.get(conflict['type'], "available")
                    
                    daily_statuses[day_str] = DayStatusItem(
                        status=correct_status,
                        group_id=f"{conflict['type']}-{conflict['id']}",
                        is_user_reservation=is_user_event,
                        user_id=conflict.get('user_id'),
                        order_type=conflict['type']
                    )
            current_day += timedelta(days=1)
