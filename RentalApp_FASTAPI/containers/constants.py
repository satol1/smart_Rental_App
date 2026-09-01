# containers/constants.py
# Module-level configuration: engine, session factories, context vars, and all class imports.

import contextvars

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from config.core import settings

# КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Используем contextvars для изоляции сессий
request_db_session = contextvars.ContextVar('request_db_session', default=None)

def get_request_db_session():
    session = request_db_session.get()
    if session is None:
        return AsyncSessionLocal()
    return session

# Создаем асинхронный движок
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=False,
    pool_recycle=3600,
    pool_timeout=30
)

# Создаем фабрику асинхронных сессий
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

from api.database_models import Base

# Синхронная сессия для скриптов (если нужна)
try:
    from sqlalchemy import create_engine as create_sync_engine
    from sqlalchemy.orm import sessionmaker

    sync_engine = create_sync_engine(settings.DATABASE_URL.replace("+asyncpg", ""), echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
except ImportError:
    SessionLocal = None


# --- Импорты репозиториев ---
from api.repositories import (
    UserRepository,
    ReservationRepository,
    RentalRepository,
    EquipmentRepository,
    AccessoryRepository,
    AssociationRepository,
    DiscountRepository,
    HolidayRepository,
    BalanceHistoryRepository,
)
from api.repositories.equipment_query_repository import EquipmentQueryRepository
from api.repositories.equipment_command_repository import EquipmentCommandRepository
from api.repositories.equipment_relations_repository import EquipmentRelationsRepository
from api.repositories.rental_query_repository import RentalQueryRepository
from api.repositories.rental_command_repository import RentalCommandRepository
from api.repositories.rental_financial_repository import RentalFinancialRepository
from api.repositories.reservation_query_repository import ReservationQueryRepository
from api.repositories.reservation_filter_repository import ReservationFilterRepository
from api.repositories.reservation_availability_repository import ReservationAvailabilityRepository
from api.repositories.promo_code_repository import PromoCodeRepository
from api.repositories.brand_system_repository import BrandSystemRepository
from api.repositories.statistics_repository import StatisticsRepository
from api.repositories.pack_repository import PackRepository
from api.repositories.system_repository import SystemRepository
from api.repositories.dashboard_repository import DashboardRepository
from api.repositories.notification_repository import NotificationRepository
from api.repositories.calendar_repository import CalendarRepository

# --- Импорты сервисов order ---
from api.services.order.reservation_service import ReservationLifecycleService
from api.services.order.rental_service import RentalLifecycleService
from api.services.order.system_repository import SystemService
from api.services.order.payment_repository import PaymentRepository
from api.services.order.rental_creation_service import RentalCreationService
from api.services.order.rental_return_service import RentalReturnService
from api.services.order.rental_update_service import RentalUpdateService
from api.services.order.rental_cancellation_service import RentalCancellationService
from api.services.order.order_validator import OrderValidator
from api.services.order.status_service import StatusService

# --- Импорты основных сервисов ---
from api.services.rental.rental_query_service import RentalQueryService
from api.services.reservation_query_service import ReservationQueryService

# --- Импорты сервисов для управления статусами ---
from api.services.user.user_status_service import UserStatusService
from api.services.user.overdue_checker_service import OverdueCheckerService
from api.services.balance_service import BalanceService
from api.services.financial_service import FinancialService
from api.services.user_service import UserService
from api.services.auth_service import AuthService
from api.services.security_audit_service import SecurityAuditService
from api.services.brute_force_protection_service import BruteForceProtectionService
from api.services.discount_service import DiscountService
from api.services.association_service import AssociationService

from api.services.availability.availability_service import AvailabilityService
from api.services.availability.conflicts import AvailabilityConflictsService
from api.services.availability.statuses import AvailabilityStatusService
from api.services.availability.calendar import AvailabilityCalendarService
from api.services.availability.queries import AvailabilityQueryService

from api.services.dashboard.dashboard_service import DashboardService
from api.services.holiday_service import HolidayService
from api.services.notification_service import NotificationService
from api.services.calendar_service import CalendarService
from api.services.pack_service import PackService
from api.services.equipment_crud_service import EquipmentCRUDService
from api.services.equipment_filter_service import EquipmentFilterService
from api.services.equipment_pack_service import EquipmentPackService
from api.services.brand_system_service import BrandSystemService
from api.services.accessory_service import AccessoryService

from api.services.promo_code import PromoCodeBusinessLogic
from api.services.promo_code.promo_code_validator import PromoCodeValidator
from api.services.promo_code.promo_code_manager import PromoCodeManager
from api.services.promo_code_service import PromoCodeService
from api.services.equipment_service_api import EquipmentServiceApi

from api.services.dashboard.focus_service import FocusService
from api.services.dashboard.kpi_service import KpiService
from api.services.dashboard.activity_service import ActivityService
from api.services.dashboard.equipment_service import EquipmentService as DashboardEquipmentService

from api.services.error_handler_service import ErrorHandlerService
from api.services.settings_service import SettingsService

from shared.services.period_service import PeriodService
