# containers/repositories.py
# All repository providers.

from dependency_injector import containers, providers

from containers.constants import (
    UserRepository, ReservationRepository, RentalRepository,
    EquipmentRepository, AccessoryRepository, AssociationRepository,
    DiscountRepository, HolidayRepository, BalanceHistoryRepository,
    EquipmentQueryRepository, EquipmentCommandRepository, EquipmentRelationsRepository,
    RentalQueryRepository, RentalCommandRepository, RentalFinancialRepository,
    ReservationQueryRepository, ReservationFilterRepository, ReservationAvailabilityRepository,
    PromoCodeRepository, BrandSystemRepository, StatisticsRepository,
    PackRepository, SystemRepository, DashboardRepository,
    NotificationRepository, CalendarRepository, PaymentRepository,
)
from containers.infrastructure import InfrastructureContainer


class RepositoriesContainer(containers.DeclarativeContainer):
    db_session = InfrastructureContainer.db_session
    period_service = InfrastructureContainer.period_service

    user_repo = providers.Factory(UserRepository, db=db_session)
    accessory_repo = providers.Factory(AccessoryRepository, db=db_session)
    association_repo = providers.Factory(AssociationRepository, db=db_session)
    discount_repo = providers.Factory(DiscountRepository, db=db_session)
    holiday_repo = providers.Factory(HolidayRepository, db=db_session)
    balance_history_repo = providers.Factory(BalanceHistoryRepository, db=db_session)
    brand_system_repo = providers.Factory(BrandSystemRepository, db=db_session)
    promo_code_repo = providers.Factory(PromoCodeRepository, db=db_session)
    system_repo = providers.Factory(SystemRepository, db=db_session)
    pack_repo = providers.Factory(PackRepository, db=db_session)
    dashboard_repo = providers.Factory(DashboardRepository, db=db_session)
    notification_repo = providers.Factory(NotificationRepository, db=db_session)
    calendar_repo = providers.Factory(CalendarRepository, db=db_session)
    statistics_repo = providers.Factory(StatisticsRepository, db=db_session)
    payment_repo = providers.Factory(PaymentRepository, db=db_session)

    equipment_command_repo = providers.Factory(EquipmentCommandRepository, db=db_session)
    equipment_relations_repo = providers.Factory(EquipmentRelationsRepository, db=db_session)
    rental_query_repo = providers.Factory(RentalQueryRepository, db=db_session, period_service=period_service)
    rental_command_repo = providers.Factory(RentalCommandRepository, db=db_session)
    reservation_query_repo = providers.Factory(ReservationQueryRepository, db=db_session)
    reservation_filter_repo = providers.Factory(ReservationFilterRepository, db=db_session, period_service=period_service)
    reservation_availability_repo = providers.Factory(ReservationAvailabilityRepository, db=db_session)

    reservation_repo = providers.Factory(
        ReservationRepository,
        db=db_session,
        period_service=period_service,
        query_repo=reservation_query_repo,
        filter_repo=reservation_filter_repo,
        availability_repo=reservation_availability_repo,
    )
