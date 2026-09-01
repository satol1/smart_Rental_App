# api/services/availability/base.py

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from typing import List, Dict, Any, Optional
import logging

from api.models.equipment import Equipment
from api.models.reservation import Reservation
from api.models.rental import Rental
from api.repositories.reservation_repository import ReservationRepository
from api.repositories.rental_repository import RentalRepository
from shared.services.period_service import PeriodService

logger = logging.getLogger(__name__)


class AvailabilityBaseService:
    """
    Базовый класс для сервисов проверки доступности оборудования.
    Содержит общую логику для работы с резервированиями и арендами.
    """

    def __init__(self, db: AsyncSession, reservation_repo: ReservationRepository = None, rental_repo: RentalRepository = None):
        self.db = db
        if not reservation_repo:
            raise ValueError("ReservationRepository must be injected via DI container")
        self.reservation_repo = reservation_repo
        if not rental_repo:
            raise ValueError("RentalRepository must be injected via DI container")
        self.rental_repo = rental_repo

    async def _get_overlapping_reservations(
        self,
        equipment_ids: List[int],
        start_date: date,
        end_date: date,
        exclude_reservation_id: Optional[int] = None
    ) -> List[Reservation]:
        """
        Получает резервирования, пересекающиеся с указанным периодом.
        
        Args:
            equipment_ids: Список ID оборудования для проверки
            start_date: Дата начала периода
            end_date: Дата окончания периода
            exclude_reservation_id: ID резервирования для исключения
            
        Returns:
            Список резервирований, пересекающихся с периодом
        """
        logger.debug(f"Поиск пересекающихся резервирований для {len(equipment_ids)} ед. оборудования")
        logger.debug(f"Период: {start_date} - {end_date}, исключить резерв: {exclude_reservation_id}")
        
        try:
            reservations = await self.reservation_repo.get_reservations_for_availability_check(
                equipment_ids, start_date, end_date, exclude_reservation_id
            )
            logger.info(f"Найдено {len(reservations)} пересекающихся резервов.")
            return reservations
            
        except Exception as e:
            logger.error(f"Ошибка при выполнении запроса _get_overlapping_reservations: {e}", exc_info=True)
            
            # Используем сервис обработки ошибок для восстановления
            from api.services.error_handler_service import error_handler
            recovery_result = error_handler.handle_database_error(e, "_get_overlapping_reservations")
            
            if recovery_result and recovery_result.get("recovered"):
                logger.info("Успешно восстановлено после ошибки базы данных")
                return recovery_result.get("data", [])
            else:
                # Если восстановление невозможно, возвращаем пустой результат
                logger.warning("Не удалось восстановить после ошибки, возвращаем пустой результат")
                return []

    async def _get_overlapping_rentals(
        self,
        equipment_ids: List[int],
        start_date: date,
        end_date: date,
        exclude_rental_id: Optional[int] = None
    ) -> List[Rental]:
        """
        Получает аренды, пересекающиеся с указанным периодом.
        
        Args:
            equipment_ids: Список ID оборудования для проверки
            start_date: Дата начала периода
            end_date: Дата окончания периода
            exclude_rental_id: ID аренды для исключения
            
        Returns:
            Список аренд, пересекающихся с периодом
        """
        logger.debug(f"Поиск пересекающихся аренд для {len(equipment_ids)} ед. оборудования")
        logger.debug(f"Период: {start_date} - {end_date}, исключить аренду: {exclude_rental_id}")
        
        try:
            rentals = await self.rental_repo.get_overlapping_for_availability_check(
                equipment_ids, start_date, end_date, exclude_rental_id
            )
            logger.info(f"Найдено {len(rentals)} пересекающихся аренд.")
            return rentals
            
        except Exception as e:
            logger.error(f"Ошибка при выполнении запроса _get_overlapping_rentals: {e}", exc_info=True)
            
            # Используем сервис обработки ошибок для восстановления
            from api.services.error_handler_service import error_handler
            recovery_result = error_handler.handle_database_error(e, "_get_overlapping_rentals")
            
            if recovery_result and recovery_result.get("recovered"):
                logger.info("Успешно восстановлено после ошибки базы данных")
                return recovery_result.get("data", [])
            else:
                # Если восстановление невозможно, возвращаем пустой результат
                logger.warning("Не удалось восстановить после ошибки, возвращаем пустой результат")
                return []

    def _filter_equipment_in_list(
        self,
        equipment_list: List[Equipment],
        equipment_ids: List[int]
    ) -> List[Equipment]:
        """
        Фильтрует оборудование по списку ID.
        
        Args:
            equipment_list: Список оборудования для фильтрации
            equipment_ids: Список ID оборудования для включения
            
        Returns:
            Отфильтрованный список оборудования
        """
        return [eq for eq in equipment_list if eq.id in equipment_ids]

    def _create_conflict_dict(
        self,
        conflict_type: str,
        conflict_id: int,
        start_date: date,
        end_date: date,
        user_id: int
    ) -> Dict[str, Any]:
        """
        Создает словарь с информацией о конфликте.
        
        Args:
            conflict_type: Тип конфликта ('reservation' или 'rental')
            conflict_id: ID конфликта
            start_date: Дата начала
            end_date: Дата окончания
            user_id: ID пользователя
            
        Returns:
            Словарь с информацией о конфликте
        """
        return {
            'type': conflict_type,
            'id': conflict_id,
            'start_date': start_date,
            'end_date': end_date,
            'user_id': user_id
        }
