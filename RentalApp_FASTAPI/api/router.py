# api/router.py

from fastapi import APIRouter
from api.auth_api import router as auth_router
from api.equipment_api import router as equipment_router
from api.reservation_api import router as reservation_router
from api.user_profile_api import router as user_profile_router
from api.admin_user_api import router as admin_user_router
from api.admin_balance_api import router as admin_balance_router
from api.calendar_api import router as calendar_router
from api.accessory_api import router as accessory_router
from api.admin_reservation_api import router as admin_reservation_router
from api.promo_code_api import router as promo_code_router
from api.holiday_api import router as holiday_router
from api.discount_api import router as discount_router
from api.association_api import router as association_router
from api.admin_rental_api import router as admin_rental_router
from api.admin_dashboard_api import router as admin_dashboard_router
from api.pack_api import router as pack_router
from api.settings_api import router as settings_router
from api.brand_system_api import router as brand_system_router
from api.admin_security_api import router as admin_security_router
from api.uploads_api import router as uploads_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(equipment_router)
router.include_router(reservation_router)
router.include_router(user_profile_router)
router.include_router(admin_user_router)
router.include_router(admin_balance_router)
router.include_router(calendar_router)
router.include_router(accessory_router)
router.include_router(admin_reservation_router)
router.include_router(promo_code_router)
router.include_router(holiday_router)
router.include_router(discount_router)
router.include_router(association_router)
router.include_router(admin_rental_router)
router.include_router(admin_dashboard_router)
router.include_router(pack_router)
router.include_router(settings_router)
router.include_router(brand_system_router, prefix="/admin")
router.include_router(admin_security_router)
router.include_router(uploads_router)

# Старые сервисы были удалены, поэтому никаких изменений в роутере не требуется,
# так как он подключает только API-слой (например, admin_rental_api),
# а внутренние зависимости этих API уже изменены.