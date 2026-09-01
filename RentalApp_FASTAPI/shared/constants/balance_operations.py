# shared/constants/balance_operations.py

"""
Централизованные константы для типов операций с балансом.
Обеспечивает синхронизацию между бэкендом и фронтендом.
"""

from enum import Enum


class BalanceOperationType(str, Enum):
    """Типы операций с балансом пользователя."""
    
    # Операции с арендой
    RENTAL_DEBIT = "rental_debit"
    RENTAL_REVERT_CREDIT = "rental_revert_credit"
    
    # Операции с авансом
    PREPAYMENT = "prepayment"
    PREPAYMENT_REFUND_ON_REVERT = "prepayment_refund_on_revert"
    
    # Операции с возвратом
    EARLY_RETURN_CREDIT = "early_return_credit"
    OVERDUE_SURCHARGE_DEBIT = "overdue_surcharge_debit"
    
    # Операции с балансом
    BALANCE_TOP_UP = "balance_top_up"
    
    # Ручные корректировки
    MANUAL_CREDIT = "manual_credit"
    MANUAL_DEBIT = "manual_debit"
    
    # Резервные операции (если есть)
    RESERVATION_PAYMENT = "reservation_payment"
    RESERVATION_CANCELLATION_REFUND = "reservation_cancellation_refund"


# Словарь для быстрого доступа к константам
BALANCE_OPERATION_TYPES = {
    "RENTAL_DEBIT": BalanceOperationType.RENTAL_DEBIT,
    "RENTAL_REVERT_CREDIT": BalanceOperationType.RENTAL_REVERT_CREDIT,
    "PREPAYMENT": BalanceOperationType.PREPAYMENT,
    "PREPAYMENT_REFUND_ON_REVERT": BalanceOperationType.PREPAYMENT_REFUND_ON_REVERT,
    "EARLY_RETURN_CREDIT": BalanceOperationType.EARLY_RETURN_CREDIT,
    "OVERDUE_SURCHARGE_DEBIT": BalanceOperationType.OVERDUE_SURCHARGE_DEBIT,
    "BALANCE_TOP_UP": BalanceOperationType.BALANCE_TOP_UP,
    "MANUAL_CREDIT": BalanceOperationType.MANUAL_CREDIT,
    "MANUAL_DEBIT": BalanceOperationType.MANUAL_DEBIT,
    "RESERVATION_PAYMENT": BalanceOperationType.RESERVATION_PAYMENT,
    "RESERVATION_CANCELLATION_REFUND": BalanceOperationType.RESERVATION_CANCELLATION_REFUND,
}
