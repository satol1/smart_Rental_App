#! /usr/bin/env python3
# api/services/order/rental_lifecycle_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import logging

from api.models.user import User
from api.models.rental import Rental
from api.repositories.rental_repository import RentalRepository
from api.repositories.reservation_repository import ReservationRepository
from api.repositories.user_repository import UserRepository
from api.repositories.equipment_repository import EquipmentRepository
from api.services.order.system_repository import SystemService
from api.services.order.order_validator import OrderValidator
from api.services.order.rental_creation_service import RentalCreationService
from api.services.order.rental_return_service import RentalReturnService
from api.services.order.rental_update_service import RentalUpdateService
from api.services.order.rental_cancellation_service import RentalCancellationService
from api.services.balance_service import BalanceService
from api.services.financial_service import FinancialService
from api.services.promo_code import PromoCodeBusinessLogic
from shared.schemas.rental_schema import (
    RentalCreateFromReservationRequest,
    RentalReturnRequest,
    RentalCreateFromScratchRequest,
    AdminRentalUpdate,
    RentalRevertRequest,
    RentalAddItemsRequest,
)

logger = logging.getLogger(__name__)


class RentalLifecycleService:
    """Фасад для управления жизненным циклом аренд."""

    def __init__(self, 
                 db: AsyncSession, 
                 rental_repo: RentalRepository,
                 reservation_repo: ReservationRepository,
                 user_repo: UserRepository,
                 equipment_repo: EquipmentRepository,
                 system_service: SystemService,
                 validator: OrderValidator,
                 balance_service: BalanceService,
                 financial_service: FinancialService,
                 promo_code_logic: PromoCodeBusinessLogic,
                 creation_service: RentalCreationService,
                 return_service: RentalReturnService,
                 update_service: RentalUpdateService,
                 cancellation_service: RentalCancellationService):
        self.db = db
        self.rental_repo = rental_repo
        self.reservation_repo = reservation_repo
        self.user_repo = user_repo
        self.equipment_repo = equipment_repo
        self.system_service = system_service
        self.validator = validator
        self.balance_service = balance_service
        self.financial_service = financial_service
        self.promo_code_logic = promo_code_logic
        
        # Используем только инъекцию специализированных сервисов
        self.creation_service = creation_service
        self.return_service = return_service
        self.update_service = update_service
        self.cancellation_service = cancellation_service

    # Делегирование методов создания аренд
    
    async def convert_reservation_to_rental(
        self, reservation_id: int, request: RentalCreateFromReservationRequest, manager: User
    ) -> Rental:
        """Конвертирует резерв в аренду."""
        return await self.creation_service.convert_reservation_to_rental(reservation_id, request, manager)

    async def create_rental_from_scratch(
        self, request: RentalCreateFromScratchRequest, manager: User
    ) -> Rental:
        """Создает аренду с нуля."""
        return await self.creation_service.create_rental_from_scratch(request, manager)

    # Делегирование методов возврата аренд
    
    async def return_rental(
        self, rental_id: int, request: RentalReturnRequest, manager: User
    ) -> Rental:
        """Возвращает аренду."""
        return await self.return_service.return_rental(rental_id, request, manager)

    # Делегирование методов обновления аренд
    
    async def update_rental_details_by_admin(
        self, rental_id: int, request: AdminRentalUpdate, manager: User
    ) -> Rental:
        """Обновляет детали аренды администратором."""
        return await self.update_service.update_rental_details_by_admin(rental_id, request, manager)

    async def add_equipment_to_rental(
        self, rental_id: int, request: RentalAddItemsRequest, manager: User
    ) -> Rental:
        """Добавляет оборудование в активную аренду."""
        return await self.update_service.add_equipment_to_rental(rental_id, request, manager)

    # Делегирование методов отмены и удаления аренд
    
    async def revert_rental_to_reservation(self, rental_id: int, manager: User, request: RentalRevertRequest):
        """Отменяет аренду и возвращает к резерву."""
        return await self.cancellation_service.revert_rental_to_reservation(rental_id, manager, request)

    async def delete_rental_by_admin(self, rental_id: int):
        """Удаляет аренду администратором."""
        return await self.cancellation_service.delete_rental_by_admin(rental_id)
    
    async def revert_rental(self, rental_id: int, manager: User, request: RentalRevertRequest):
        """Отмена аренды и возврат к резерву."""
        return await self.cancellation_service.revert_rental_to_reservation(rental_id, manager, request)