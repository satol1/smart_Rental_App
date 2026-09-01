# api/services/availability/queries.py

from sqlalchemy import select, and_
from datetime import date
from typing import Optional

from .base import AvailabilityBaseService
from api.models.equipment import Equipment
from api.models.reservation import Reservation
from api.models.rental import Rental
from shared.constants.order_status import OrderStatus


class AvailabilityQueryService(AvailabilityBaseService):
    """
    Сервис для работы с SQL-запросами и фильтрами.
    Отвечает за создание оптимизированных SQL-запросов для проверки доступности.
    """

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
        from api.models.reservation import reservation_equipment_association
        from api.models.rental import rental_equipment_association
        
        # Подзапрос для ID оборудования, занятого в активных резервах
        booked_in_reservations_subquery = self._create_reservations_subquery(
            start_date, end_date, exclude_reservation_id
        )
        
        # Подзапрос для ID оборудования, занятого в активных/просроченных арендах
        booked_in_rentals_subquery = self._create_rentals_subquery(
            start_date, end_date, exclude_rental_id
        )
        
        # Возвращаем условие для исключения недоступного оборудования
        return and_(
            Equipment.id.notin_(booked_in_reservations_subquery),
            Equipment.id.notin_(booked_in_rentals_subquery)
        )

    def _create_reservations_subquery(
        self,
        start_date: date,
        end_date: date,
        exclude_reservation_id: Optional[int] = None
    ):
        """
        Создает подзапрос для резервирований.
        
        Args:
            start_date: Дата начала периода
            end_date: Дата окончания периода
            exclude_reservation_id: ID резервирования для исключения
            
        Returns:
            Подзапрос для резервирований
        """
        from api.models.reservation import reservation_equipment_association
        
        subquery = (
            select(reservation_equipment_association.c.equipment_id)
            .join(Reservation, reservation_equipment_association.c.reservation_id == Reservation.id)
            .filter(
                Reservation.end_date > start_date,
                Reservation.start_date < end_date,
                Reservation.status == OrderStatus.ACTIVE
            )
        )
        
        if exclude_reservation_id:
            subquery = subquery.filter(Reservation.id != exclude_reservation_id)
        
        return subquery.distinct()

    def _create_rentals_subquery(
        self,
        start_date: date,
        end_date: date,
        exclude_rental_id: Optional[int] = None
    ):
        """
        Создает подзапрос для аренд.
        
        Args:
            start_date: Дата начала периода
            end_date: Дата окончания периода
            exclude_rental_id: ID аренды для исключения
            
        Returns:
            Подзапрос для аренд
        """
        from api.models.rental import rental_equipment_association
        
        subquery = (
            select(rental_equipment_association.c.equipment_id)
            .join(Rental, rental_equipment_association.c.rental_id == Rental.id)
            .filter(
                Rental.end_date > start_date,
                Rental.start_date < end_date,
                Rental.status.in_([OrderStatus.ACTIVE, OrderStatus.OVERDUE])
            )
        )
        
        if exclude_rental_id:
            subquery = subquery.filter(Rental.id != exclude_rental_id)
        
        return subquery.distinct()
