# api/services/calendar_view_service.py

from datetime import date, timedelta
from typing import List, Optional
import logging

from api.repositories.equipment_repository import EquipmentRepository
from api.services.availability import AvailabilityService
from shared.schemas.calendar_schema import (
    EquipmentStatusListResponse,
    EquipmentStatusResponse,
)

logger = logging.getLogger(__name__)


class CalendarViewService:
    """
    Собирает календарное представление статусов оборудования.
    Инкапсулирует логику, ранее находившуюся в роутере /calendar/view:
    разрешение списка ID, получение статусов и пакетную догрузку оборудования.
    """

    def __init__(
        self,
        equipment_repo: EquipmentRepository,
        availability_service: AvailabilityService,
    ):
        self.equipment_repo = equipment_repo
        self.availability_service = availability_service

    async def resolve_equipment_ids(self, equipment_ids: Optional[List[int]]) -> List[int]:
        """Возвращает список ID оборудования: переданный либо все ID из каталога."""
        if not equipment_ids:
            all_equipment = await self.equipment_repo.get_all()
            equipment_ids = [eq.id for eq in all_equipment]
        return equipment_ids or []

    async def get_equipment_status_list(
        self,
        start_date: date,
        end_date: date,
        equipment_ids: Optional[List[int]] = None,
        exclude_reservation_id: Optional[int] = None,
    ) -> EquipmentStatusListResponse:
        """
        Возвращает готовый ответ со статусами оборудования за период.

        Контракт идентичен бывшей логике роутера /calendar/view
        (та же схема EquipmentStatusListResponse).
        """
        if start_date == end_date:
            end_date = end_date + timedelta(days=1)

        equipment_ids = await self.resolve_equipment_ids(equipment_ids)
        if not equipment_ids:
            return EquipmentStatusListResponse(items=[], total=0)

        statuses = await self.availability_service.get_availability_statuses(
            equipment_ids=equipment_ids,
            start_date=start_date,
            end_date=end_date,
            exclude_reservation_id=exclude_reservation_id,
        )

        # Пакетная выборка вместо N+1 запросов get_by_id по каждому ID
        equipment = await self.equipment_repo.get_existing_by_ids(equipment_ids)
        equipment_map = {e.id: e for e in equipment}

        result = []
        for eq_id, status_info in statuses.items():
            eq = equipment_map.get(eq_id)
            result.append(
                EquipmentStatusResponse(
                    equipment_id=eq_id,
                    status=status_info["status"],
                    details=status_info["details"],
                    name=eq.name if eq else None,
                    equipment_type=eq.equipment_type if eq else None,
                    brand=eq.brand if eq else None,
                    start_date=status_info.get("start_date"),
                    end_date=status_info.get("end_date"),
                )
            )

        # Возвращаем полный результат без пагинации
        return EquipmentStatusListResponse(items=result, total=len(result))
