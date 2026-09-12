# path: RentalApp_FASTAPI/api/services/order/status_service.py

from datetime import date
from typing import Union
from api.models.reservation import Reservation
from api.models.rental import Rental
from shared.constants.order_status import OrderStatus, COMPLETED_STATUSES

class StatusService:
    """
    Центральный сервис для управления и определения статусов заказов.
    """

    def get_status(self, order: Union[Reservation, Rental]) -> OrderStatus:
        """
        Определяет и возвращает актуальный статус для любого заказа (резерва или аренды).
        Инкапсулирует логику определения просроченных заказов.
        """
        # Если статус уже является одним из завершенных, просто возвращаем его.
        if OrderStatus(order.status) in COMPLETED_STATUSES:
            return OrderStatus(order.status)

        # Если заказ активен, проверяем, не просрочен ли он.
        from shared.utils.date_utils import get_business_today
        if order.end_date < get_business_today():
            return OrderStatus.OVERDUE

        # В противном случае, статус - активен.
        return OrderStatus.ACTIVE

    def can_cancel(self, order: Union[Reservation, Rental]) -> bool:
        """
        Проверяет, можно ли отменить заказ.
        """
        if isinstance(order, Reservation):
            # Резерв можно отменить, если он еще не был выдан в аренду.
            return order.rental is None
        return True  # Для аренд могут быть другие правила

    def can_edit(self, order: Union[Reservation, Rental]) -> bool:
        """
        Проверяет, можно ли редактировать заказ.
        """
        # Редактировать можно только активные заказы
        return self.get_status(order) == OrderStatus.ACTIVE
