# path: RentalApp_FASTAPI/shared/constants/order_status.py

from enum import Enum

class OrderStatus(str, Enum):
    """
    Единый Enum для всех статусов заказов (резервов и аренд).
    """
    # Общие статусы
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    COMPLETED_WITH_DEBT = "completed_with_debt"

    # Динамические статусы (не хранятся в БД, но используются в логике)
    OVERDUE = "overdue"

    # Специфичный статус для резервов
    FULFILLED = "fulfilled"  # Резерв, из которого создана аренда

# Список статусов, которые считаются "завершенными"
COMPLETED_STATUSES = [
    OrderStatus.COMPLETED,
    OrderStatus.COMPLETED_WITH_DEBT,
    OrderStatus.CANCELLED,
    OrderStatus.FULFILLED
]
