# shared/constants/deposit_status.py

from enum import Enum


class DepositStatus(str, Enum):
    """Статусы залога в жизненном цикле аренды."""
    HELD = "held"                          # Залог удерживается (взят при оформлении аренды)
    REFUNDED = "refunded"                  # Залог полностью возвращен клиенту
    PARTIALLY_RETAINED = "partially_retained"  # Залог частично удержан (например, компенсация мелких дефектов)
    RETAINED_FOR_DAMAGE = "retained_for_damage" # Залог полностью удержан за ущерб / утрату


DEPOSIT_STATUS_LABELS = {
    DepositStatus.HELD: "Удерживается",
    DepositStatus.REFUNDED: "Возвращен клиенту",
    DepositStatus.PARTIALLY_RETAINED: "Частично удержан",
    DepositStatus.RETAINED_FOR_DAMAGE: "Удержан за ущерб",
}
