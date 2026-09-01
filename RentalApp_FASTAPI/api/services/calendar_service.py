# api/services/calendar_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from typing import Optional
import logging

from api.models.equipment import Equipment as ApiEquipment
from api.models.user import User as ApiUser
from shared.schemas.calendar_schema import PublicOrderDetails, PublicOrderDetailsResponse
from shared.schemas.reservation_schema import AdminReservationOut
from shared.schemas.rental_schema import RentalOut as AdminRentalOut
from api.repositories.calendar_repository import CalendarRepository

logger = logging.getLogger(__name__)


class CalendarService:
    """Сервис для работы с календарными данными"""
    
    def __init__(self, db: AsyncSession, calendar_repo: CalendarRepository = None):
        self.db = db
        self.calendar_repo = calendar_repo or CalendarRepository(db)
    
    async def get_order_details(
        self, 
        order_type: str, 
        order_id: int, 
        current_user: Optional[ApiUser] = None
    ) -> PublicOrderDetailsResponse:
        """
        Получает детали заказа (резерв или аренда) с учетом прав доступа.
        Для неавторизованных пользователей возвращает только публичные данные.
        """
        logger.info(f"Запрос деталей заказа: тип={order_type}, ID={order_id}, пользователь={current_user.id if current_user else None}")
        
        if order_type not in ["reservation", "rental"]:
            logger.error(f"Недопустимый тип заказа: {order_type}")
            raise HTTPException(status_code=400, detail="Недопустимый тип заказа")
        
        try:
            if order_type == "reservation":
                logger.debug(f"Получение деталей резерва ID={order_id}")
                return await self._get_reservation_details(order_id, current_user)
            else:  # rental
                logger.debug(f"Получение деталей аренды ID={order_id}")
                return await self._get_rental_details(order_id, current_user)
                
        except HTTPException as he:
            logger.error(f"HTTPException в get_order_details: {he.detail}")
            raise
        except Exception as e:
            logger.error(f"Критическая ошибка в get_order_details: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Ошибка при получении данных заказа: {str(e)}")
    
    async def _get_reservation_details(
        self, 
        order_id: int, 
        current_user: Optional[ApiUser] = None
    ) -> PublicOrderDetailsResponse:
        """Получает детали резерва"""
        logger.debug(f"Получение деталей резерва ID={order_id}")
        
        try:
            from api.models.reservation import Reservation, ReservationAccessory
            
            # Получаем резерв с загруженным оборудованием и пользователем
            logger.debug(f"Выполняем запрос к БД для резерва ID={order_id}")
            reservation = await self.calendar_repo.get_reservation_details(order_id)
            
            if not reservation:
                logger.warning(f"Резерв с ID={order_id} не найден")
                raise HTTPException(status_code=404, detail="Резерв не найден")
            
            logger.debug(f"Резерв найден: ID={reservation.id}, пользователь={reservation.user_id}, оборудование={len(reservation.equipment) if reservation.equipment else 0}")
            
            # Проверяем права доступа
            is_owner = bool(current_user and current_user.id == reservation.user_id)
            has_extended_access = bool(is_owner or (current_user and current_user.role in ['admin', 'manager']))
            
            logger.debug(f"Права доступа: владелец={is_owner}, расширенный_доступ={has_extended_access}")
            
            # Если есть расширенный доступ, возвращаем полные данные
            if has_extended_access:
                logger.debug("Возвращаем полные данные резерва")
                return PublicOrderDetailsResponse(
                    order=AdminReservationOut.model_validate(reservation),
                    is_owner=is_owner,
                    has_extended_access=has_extended_access
                )
            
            # Иначе возвращаем публичные данные
            equipment = reservation.equipment[0] if reservation.equipment else None
            equipment_id = equipment.id if equipment else None
            
            logger.debug(f"Возвращаем публичные данные резерва, оборудование ID={equipment_id}")
            return PublicOrderDetailsResponse(
                order=PublicOrderDetails(
                    id=reservation.id,
                    order_type="reservation",
                    equipment_id=equipment_id,
                    start_date=reservation.start_date,
                    end_date=reservation.end_date,
                    status=reservation.status,
                    equipment_name=equipment.name if equipment else None,
                    equipment_type=equipment.equipment_type if equipment else None,
                    equipment_brand=equipment.brand if equipment else None,
                ),
                is_owner=is_owner,
                has_extended_access=has_extended_access
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Ошибка в _get_reservation_details для ID={order_id}: {e}", exc_info=True)
            raise
    
    async def _get_rental_details(
        self, 
        order_id: int, 
        current_user: Optional[ApiUser] = None
    ) -> PublicOrderDetailsResponse:
        """Получает детали аренды"""
        logger.debug(f"Получение деталей аренды ID={order_id}")
        
        try:
            from api.models.rental import Rental
            
            # Получаем аренду с загруженным оборудованием и пользователем
            logger.debug(f"Выполняем запрос к БД для аренды ID={order_id}")
            rental = await self.calendar_repo.get_rental_details(order_id)
            
            if not rental:
                logger.warning(f"Аренда с ID={order_id} не найдена")
                raise HTTPException(status_code=404, detail="Аренда не найдена")
            
            logger.debug(f"Аренда найдена: ID={rental.id}, пользователь={rental.user_id}, оборудование={len(rental.equipment) if rental.equipment else 0}")
            
            # Проверяем права доступа
            is_owner = bool(current_user and current_user.id == rental.user_id)
            has_extended_access = bool(is_owner or (current_user and current_user.role in ['admin', 'manager']))
            
            logger.debug(f"Права доступа: владелец={is_owner}, расширенный_доступ={has_extended_access}")
            
            # Если есть расширенный доступ, возвращаем полные данные
            if has_extended_access:
                logger.debug("Возвращаем полные данные аренды")
                try:
                    return PublicOrderDetailsResponse(
                        order=AdminRentalOut.model_validate(rental),
                        is_owner=is_owner,
                        has_extended_access=has_extended_access
                    )
                except Exception as e:
                    logger.warning(f"Ошибка при валидации полных данных аренды: {e}, возвращаем публичные данные")
                    # Fallback к публичным данным
                    pass
            
            # Иначе возвращаем публичные данные
            equipment = rental.equipment[0] if rental.equipment else None
            equipment_id = equipment.id if equipment else None
            
            logger.debug(f"Возвращаем публичные данные аренды, оборудование ID={equipment_id}")
            return PublicOrderDetailsResponse(
                order=PublicOrderDetails(
                    id=rental.id,
                    order_type="rental",
                    equipment_id=equipment_id,
                    start_date=rental.start_date,
                    end_date=rental.end_date,
                    status=rental.status,
                    equipment_name=equipment.name if equipment else None,
                    equipment_type=equipment.equipment_type if equipment else None,
                    equipment_brand=equipment.brand if equipment else None,
                ),
                is_owner=is_owner,
                has_extended_access=has_extended_access
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Ошибка в _get_rental_details для ID={order_id}: {e}", exc_info=True)
            raise
    
    async def _get_equipment_by_id(self, equipment_id: int) -> Optional[ApiEquipment]:
        """Получает оборудование по ID"""
        return await self.calendar_repo.get_equipment_by_id(equipment_id)
