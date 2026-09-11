# api/services/availability/calendar.py

from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import select
from datetime import date
from typing import List, Dict, Any

from .base import AvailabilityBaseService
from api.models.rental import Rental 
from api.models.reservation import Reservation


class AvailabilityCalendarService(AvailabilityBaseService):
    """
    Сервис для работы с календарными событиями.
    Отвечает за генерацию событий для FullCalendar и других календарных представлений.
    """

    async def get_calendar_events(
        self,
        equipment_ids: List[int],
        start_date: date,
        end_date: date,
        include_client_name: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Возвращает события для календаря в формате FullCalendar.

        Args:
            equipment_ids: Список ID оборудования
            start_date: Дата начала периода
            end_date: Дата окончания периода
            include_client_name: Показывать ФИО клиента в заголовке резерва
                (только для менеджеров; иначе обезличенный номер)

        Returns:
            Список событий для календаря
        """
        events = []

        # 1. Используем исправленный метод из базового класса для получения аренд
        rentals = await self._get_overlapping_rentals(equipment_ids, start_date, end_date)
        for rental in rentals:
            for equipment in rental.equipment:
                # Проверяем, что оборудование из аренды есть в нашем запросе
                if equipment.id in equipment_ids:
                    events.append({
                        "id": f"rental-{rental.id}-{equipment.id}",
                        "title": f"Аренда: {equipment.name}",
                        "start": rental.start_date.strftime("%Y-%m-%d"),
                        "end": rental.end_date.strftime("%Y-%m-%d"),
                        "resourceId": equipment.id,
                        "status": "rented"
                    })

        # 2. Используем исправленный метод из базового класса для получения резервов
        # (связь user загружается joinedload'ом на уровне модели, отдельный refresh не нужен)
        reservations = await self._get_overlapping_reservations(equipment_ids, start_date, end_date)
        for reservation in reservations:
            for equipment in reservation.equipment:
                # Проверяем, что оборудование из резерва есть в нашем запросе
                if equipment.id in equipment_ids:
                    if include_client_name:
                        title = f"Резерв: {reservation.user.full_name}"
                    else:
                        title = f"Резерв №{reservation.id}"
                    events.append({
                        "id": f"reservation-{reservation.id}-{equipment.id}",
                        "title": title,
                        "start": reservation.start_date.strftime("%Y-%m-%d"),
                        "end": reservation.end_date.strftime("%Y-%m-%d"),
                        "resourceId": equipment.id,
                        "status": "reserved"
                    })

        return events

