# shared/schemas/__init__.py

# Import all schemas
from .equipment_schema import *
from .pack_schema import *
from .accessory_schema import *
from .association_schema import *
from .reservation_schema import *
from .user_schema import *
from .promo_code_schema import *
from .holiday_schema import *
from .discount_schema import *

# Rebuild models with forward references
from .pack_schema import PackOut, EquipmentSimple
from .equipment_schema import EquipmentOut

# Rebuild models to resolve forward references
PackOut.model_rebuild()
EquipmentOut.model_rebuild()
EquipmentSimple.model_rebuild()
