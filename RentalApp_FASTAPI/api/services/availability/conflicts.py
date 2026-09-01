# api/services/availability/conflicts.py

from datetime import date
from typing import List, Dict, Any, Optional

from .base import AvailabilityBaseService


class AvailabilityConflictsService(AvailabilityBaseService):
    """
    Сервис для работы с конфликтами доступности оборудования.
    Отвечает за поиск и анализ конфликтов между резервированиями и арендами.
    """

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
        conflicts: Dict[int, List[Dict[str, Any]]] = {}
        
        # Проверяем, что список оборудования не пустой
        if not equipment_ids:
            return conflicts
        
        # Получаем пересекающиеся резервирования
        overlapping_reservations = await self._get_overlapping_reservations(
            equipment_ids, start_date, end_date, exclude_reservation_id
        )
        
        # Получаем пересекающиеся аренды
        overlapping_rentals = await self._get_overlapping_rentals(
            equipment_ids, start_date, end_date, exclude_rental_id
        )
        
        # Обработка резервирований
        for reservation in overlapping_reservations:
            for equipment in reservation.equipment:
                if equipment.id in equipment_ids:
                    if equipment.id not in conflicts:
                        conflicts[equipment.id] = []
                    
                    conflict_dict = self._create_conflict_dict(
                        'reservation',
                        reservation.id,
                        reservation.start_date,
                        reservation.end_date,
                        reservation.user_id
                    )
                    conflicts[equipment.id].append(conflict_dict)
        
        # Обработка аренд
        for rental in overlapping_rentals:
            for equipment in rental.equipment:
                if equipment.id in equipment_ids:
                    if equipment.id not in conflicts:
                        conflicts[equipment.id] = []
                    
                    conflict_dict = self._create_conflict_dict(
                        'rental',
                        rental.id,
                        rental.start_date,
                        rental.end_date,
                        rental.user_id
                    )
                    conflicts[equipment.id].append(conflict_dict)
        
        return conflicts

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
        conflicts = await self.get_conflicts(
            equipment_ids, start_date, end_date, exclude_reservation_id, exclude_rental_id
        )
        return list(conflicts.keys())

    def _get_most_critical_conflict(
        self,
        conflict_list: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Возвращает наиболее критичный конфликт из списка.
        Приоритет: rental > reservation.
        
        Args:
            conflict_list: Список конфликтов
            
        Returns:
            Наиболее критичный конфликт или None
        """
        if not conflict_list:
            return None
        
        # Сортируем конфликты по приоритету: rental > reservation
        sorted_conflicts = sorted(
            conflict_list, 
            key=lambda c: (c['type'] != 'rental', c['type'] != 'reservation')
        )
        return sorted_conflicts[0]
