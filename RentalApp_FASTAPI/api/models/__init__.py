# api/models/__init__.py

# Этот файл делает все модели в этой директории доступными как часть пакета 'models'

from .user import User
from .equipment import Equipment
from .association import Association, association_equipment_association
from .accessory import Accessory, equipment_accessories_association
from .promo_code import PromoCode, PromoCodeApplicableType, promo_code_equipment_association, promo_code_usages
from .discount import DurationDiscount
from .holiday import Holiday, HolidayRule
from .reservation import Reservation, ReservationAccessory, reservation_equipment_association
from .rental import Rental, RentalAccessory, rental_equipment_association
from .payment import Payment
from .balance_history import BalanceHistory
from .pack import Pack, pack_equipment_association
from .setting import Setting
from .brand_system import BrandSystem, brand_system_equipment_association

__all__ = [
    "User",
    "Equipment",
    "Association",
    "association_equipment_association",
    "Accessory",
    "equipment_accessories_association",
    "PromoCode",
    "PromoCodeApplicableType",
    "promo_code_equipment_association",
    "promo_code_usages",
    "DurationDiscount",
    "Holiday",
    "HolidayRule",
    "Reservation",
    "ReservationAccessory",
    "reservation_equipment_association",
    "Rental",
    "RentalAccessory",
    "rental_equipment_association",
    "Payment",
    "BalanceHistory",
    "Pack",
    "pack_equipment_association",
    "Setting",
    "BrandSystem",
    "brand_system_equipment_association",
]