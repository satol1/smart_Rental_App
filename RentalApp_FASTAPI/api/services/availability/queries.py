# api/services/availability/queries.py

from sqlalchemy import select, and_
from datetime import date
from typing import Optional

from .base import AvailabilityBaseService
from api.models.equipment import Equipment
from api.models.reservation import Reservation
from api.models.rental import Rental
from shared.constants.order_status import OrderStatus


def get_interval_overlap_filter(model, start_date: date, end_date: date, custom_end_date=None):
    """
    Формирует условие пересечения периодов с поддержкой как многодневных,
    так и однодневных заказов (start_date == end_date).
    custom_end_date: опциональная колонка или выражение даты окончания (по умолчанию model.end_date).
    """
    from sqlalchemy import and_, or_
    end_col = custom_end_date if custom_end_date is not None else model.end_date
    return or_(
        and_(
            end_col > start_date,
            model.start_date < end_date,
        ),
        and_(
            model.start_date == end_col,
            model.start_date >= start_date,
            model.start_date <= end_date,
        ),
        and_(
            start_date == end_date,
            model.start_date <= start_date,
            end_col >= start_date,
        ),
    )


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
        from api.models.reservation import reservation_equipment_association
        
        subquery = (
            select(reservation_equipment_association.c.equipment_id)
            .join(Reservation, reservation_equipment_association.c.reservation_id == Reservation.id)
            .filter(
                get_interval_overlap_filter(Reservation, start_date, end_date),
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
        from api.models.rental import rental_equipment_association
        from sqlalchemy import case, and_

        effective_end_date = case(
            (
                and_(
                    rental_equipment_association.c.status == 'returned',
                    rental_equipment_association.c.actual_return_date.is_not(None)
                ),
                rental_equipment_association.c.actual_return_date
            ),
            else_=Rental.end_date
        )
        
        subquery = (
            select(rental_equipment_association.c.equipment_id)
            .join(Rental, rental_equipment_association.c.rental_id == Rental.id)
            .filter(
                get_interval_overlap_filter(Rental, start_date, end_date, custom_end_date=effective_end_date),
                Rental.status.in_([OrderStatus.ACTIVE, OrderStatus.OVERDUE]),
                # Если позиция возвращена до или в день начала запрашиваемого интервала — она доступна
                ~(
                    (rental_equipment_association.c.status == 'returned') &
                    (rental_equipment_association.c.actual_return_date <= start_date)
                )
            )
        )
        
        if exclude_rental_id:
            subquery = subquery.filter(Rental.id != exclude_rental_id)
        
        return subquery.distinct()
