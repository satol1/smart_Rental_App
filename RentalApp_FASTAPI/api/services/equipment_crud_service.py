# api/services/equipment_crud_service.py

from datetime import date, datetime
from typing import Tuple, Type
from shared.utils.date_utils import get_business_today

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from api.models.equipment import Equipment
from api.models.rental import Rental
from api.models.reservation import Reservation
from api.repositories.equipment_repository import EquipmentRepository
from api.services.equipment_filter_service import invalidate_available_filters_cache
from shared.constants.order_status import OrderStatus
from shared.schemas.equipment_schema import EquipmentUpdateExtended, EquipmentCopyRequest

# Статусы, при которых заказ больше не занимает оборудование
INACTIVE_RESERVATION_STATUSES = [
    OrderStatus.COMPLETED.value,
    OrderStatus.CANCELLED.value,
    OrderStatus.FULFILLED.value,
]
INACTIVE_RENTAL_STATUSES = [
    OrderStatus.COMPLETED.value,
    OrderStatus.CANCELLED.value,
]


class EquipmentCRUDService:
    """Сервис для базовых CRUD операций с оборудованием."""
    
    def __init__(self, db: AsyncSession, repo: EquipmentRepository):
        self.db = db
        self.repo = repo
    
    async def get_all_equipment(self) -> list[Type[Equipment]]:
        """Возвращает QuerySet всего оборудования с подгрузкой связей."""
        equipment_list = await self.repo.get_all_with_details()
        
        # Дополнительная защита: убеждаемся, что все поля корректны
        self._validate_equipment_fields(equipment_list)
        
        return equipment_list
    
    async def get_equipment_by_id(self, equipment_id: int) -> Equipment:
        """Получает оборудование по ID с загруженными связями."""
        equipment = await self.repo.get_by_id_with_details(equipment_id)
        if not equipment:
            raise HTTPException(status_code=404, detail="Оборудование не найдено")
        return equipment
    
    async def update_equipment_details(self, equipment_id: int, equipment_data: EquipmentUpdateExtended) -> Equipment:
        """Обновляет детали оборудования с обработкой связей."""
        db_equipment = await self.get_equipment_by_id(equipment_id)

        # Используем метод репозитория для обновления с обработкой связей
        updated_equipment = await self.repo.update_with_relations(db_equipment, equipment_data)
        # Коммитим транзакцию для сохранения изменений в базе данных
        # Транзакция коммитится middleware

        # Инвалидация кэша availableFilters каталога
        invalidate_available_filters_cache()
        return updated_equipment

    async def create_equipment(self, equipment_data) -> Equipment:
        """Создает новое оборудование."""
        equipment = await self.repo.create(equipment_data)
        # Коммитим транзакцию для сохранения изменений в базе данных
        # Транзакция коммитится middleware

        # Инвалидация кэша availableFilters каталога
        invalidate_available_filters_cache()
        return equipment

    async def count_active_links(self, equipment_id: int) -> Tuple[int, int]:
        """Считает незавершённые резервы и аренды, ссылающиеся на оборудование."""
        today_start_of_day = datetime.combine(get_business_today(), datetime.min.time())

        reservations_result = await self.db.execute(
            select(func.count(Reservation.id)).filter(
                Reservation.equipment.any(Equipment.id == equipment_id),
                Reservation.end_date >= today_start_of_day,
                Reservation.status.notin_(INACTIVE_RESERVATION_STATUSES),
            )
        )
        active_reservations_count = reservations_result.scalar_one()

        rentals_result = await self.db.execute(
            select(func.count(Rental.id)).filter(
                Rental.equipment.any(Equipment.id == equipment_id),
                Rental.end_date >= today_start_of_day,
                Rental.status.notin_(INACTIVE_RENTAL_STATUSES),
            )
        )
        active_rentals_count = rentals_result.scalar_one()

        return active_reservations_count, active_rentals_count

    async def delete_equipment(self, equipment_id: int) -> None:
        """Удаляет оборудование, запрещая удаление при активных резервах/арендах."""
        # Проверяем, существует ли оборудование
        equipment = await self.repo.get_by_id(equipment_id)
        if not equipment:
            raise HTTPException(status_code=404, detail="Оборудование не найдено")

        active_reservations_count, active_rentals_count = await self.count_active_links(equipment_id)
        if active_reservations_count or active_rentals_count:
            details = []
            if active_reservations_count:
                details.append(f"активных резервов: {active_reservations_count}")
            if active_rentals_count:
                details.append(f"активных аренд: {active_rentals_count}")
            raise HTTPException(
                status_code=409,
                detail=(
                    "Нельзя удалить оборудование, участвующее в незавершённых заказах "
                    f"({', '.join(details)}). Завершите или отмените их сначала."
                ),
            )

        await self.repo.delete(equipment_id)
        # Коммитим транзакцию для сохранения изменений в базе данных
        # Транзакция коммитится middleware

        # Инвалидация кэша availableFilters каталога
        invalidate_available_filters_cache()


    async def copy_equipment(self, source_id: int, copy_data: EquipmentCopyRequest) -> Equipment:
        """Копирует оборудование через репозиторий"""
        equipment = await self.repo.copy_equipment(source_id, copy_data)

        # Инвалидация кэша availableFilters каталога (копия = новое оборудование)
        invalidate_available_filters_cache()
        return equipment
    
    def _validate_equipment_fields(self, equipment_list: list[Equipment]) -> None:
        """Дефолты nullable-полей без пометки объекта dirty (GET не пишет в БД)."""
        from api.services.equipment_defaults import apply_equipment_field_defaults
        apply_equipment_field_defaults(equipment_list)
