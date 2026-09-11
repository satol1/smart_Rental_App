# containers/services.py
# All service providers with clear two-phase initialization
# for circular dependency resolution between OrderValidator and FinancialService.

from dependency_injector import containers, providers

from containers.constants import (
    SystemService, StatusService, OrderValidator, FinancialService,
    ReservationLifecycleService, RentalLifecycleService,
    RentalCreationService, RentalReturnService, RentalUpdateService, RentalCancellationService,
    ReservationQueryService, RentalQueryService,
    AvailabilityConflictsService, AvailabilityStatusService,
    AvailabilityCalendarService, AvailabilityQueryService, AvailabilityService,
    EquipmentQueryRepository, EquipmentRepository,
    EquipmentCRUDService, EquipmentFilterService, EquipmentPackService,
    BrandSystemService, AccessoryService, PackService, EquipmentServiceApi,
    PromoCodeValidator, PromoCodeBusinessLogic, PromoCodeManager, PromoCodeService,
    UserService, UserStatusService, OverdueCheckerService,
    AuthService, SecurityAuditService, BruteForceProtectionService,
    DashboardService, FocusService, KpiService, ActivityService,
    DashboardEquipmentService,
    BalanceService, DiscountService, AssociationService,
    HolidayService, NotificationService, CalendarService, CalendarViewService,
    TelegramNotificationService,
    ErrorHandlerService, SettingsService,
    RentalRepository, RentalQueryRepository, RentalCommandRepository, RentalFinancialRepository,
)
from containers.infrastructure import InfrastructureContainer
from containers.repositories import RepositoriesContainer


class ServicesContainer(containers.DeclarativeContainer):
    # === Рефы к репозиториям ===
    db_session = InfrastructureContainer.db_session
    period_service = InfrastructureContainer.period_service
    user_repo = RepositoriesContainer.user_repo
    accessory_repo = RepositoriesContainer.accessory_repo
    association_repo = RepositoriesContainer.association_repo
    discount_repo = RepositoriesContainer.discount_repo
    holiday_repo = RepositoriesContainer.holiday_repo
    balance_history_repo = RepositoriesContainer.balance_history_repo
    brand_system_repo = RepositoriesContainer.brand_system_repo
    promo_code_repo = RepositoriesContainer.promo_code_repo
    system_repo = RepositoriesContainer.system_repo
    pack_repo = RepositoriesContainer.pack_repo
    dashboard_repo = RepositoriesContainer.dashboard_repo
    notification_repo = RepositoriesContainer.notification_repo
    calendar_repo = RepositoriesContainer.calendar_repo
    statistics_repo = RepositoriesContainer.statistics_repo
    payment_repo = RepositoriesContainer.payment_repo
    reservation_repo = RepositoriesContainer.reservation_repo
    rental_query_repo = RepositoriesContainer.rental_query_repo
    rental_command_repo = RepositoriesContainer.rental_command_repo
    equipment_command_repo = RepositoriesContainer.equipment_command_repo
    equipment_relations_repo = RepositoriesContainer.equipment_relations_repo

    # ============================================================
    # ФАЗА 1: Базовые сервисы
    # ============================================================

    system_service = providers.Factory(SystemService, system_repo=system_repo)
    telegram_notification_service = providers.Singleton(TelegramNotificationService)
    status_service = providers.Factory(StatusService)
    error_handler_service = providers.Factory(ErrorHandlerService)
    balance_service = providers.Factory(BalanceService, db=db_session, user_repo=user_repo)
    discount_service = providers.Factory(DiscountService, discount_repo=discount_repo)
    association_service = providers.Factory(AssociationService, repo=association_repo)
    security_audit_service = providers.Factory(SecurityAuditService, db=db_session)
    # Factory: у Singleton первый резолв замораживал сессию БД в
    # security_audit_service (в тестах это давало «connection is closed» на
    # audit-вставках). Разделяемое состояние счётчиков вынесено на уровень КЛАССА
    # сервиса — Factory остаётся безопасным для in-memory fallback.
    brute_force_protection_service = providers.Factory(
        BruteForceProtectionService, security_audit_service=security_audit_service,
    )
    auth_service = providers.Factory(
        AuthService, user_repo=user_repo,
        security_audit_service=security_audit_service,
        brute_force_protection=brute_force_protection_service,
    )

    # ============================================================
    # ФАЗА 2: Availability сервисы (с временным rental_repo)
    # ============================================================

    _rental_query_repo_temp = providers.Factory(RentalQueryRepository, db=db_session, period_service=period_service)
    _rental_command_repo_temp = providers.Factory(RentalCommandRepository, db=db_session)
    _rental_financial_repo_temp = providers.Factory(RentalFinancialRepository, db=db_session, financial_service=None)
    _rental_repo_temp = providers.Factory(
        RentalRepository,
        db=db_session,
        query_repo=_rental_query_repo_temp,
        command_repo=_rental_command_repo_temp,
        financial_repo=_rental_financial_repo_temp,
    )

    availability_conflicts_service = providers.Factory(
        AvailabilityConflictsService, db=db_session,
        reservation_repo=reservation_repo, rental_repo=_rental_repo_temp,
    )
    availability_status_service = providers.Factory(
        AvailabilityStatusService, db=db_session,
        reservation_repo=reservation_repo, rental_repo=_rental_repo_temp,
    )
    availability_calendar_service = providers.Factory(
        AvailabilityCalendarService, db=db_session,
        reservation_repo=reservation_repo, rental_repo=_rental_repo_temp,
    )
    availability_query_service = providers.Factory(
        AvailabilityQueryService, db=db_session,
        reservation_repo=reservation_repo, rental_repo=_rental_repo_temp,
    )
    availability_service = providers.Factory(
        AvailabilityService, db=db_session,
        conflicts_service=availability_conflicts_service,
        status_service=availability_status_service,
        calendar_service=availability_calendar_service,
        query_service=availability_query_service,
    )

    # ============================================================
    # ФАЗА 3: Equipment сервисы (зависят от availability)
    # ============================================================

    equipment_query_repo = providers.Factory(
        EquipmentQueryRepository, db=db_session,
        brand_system_repo=brand_system_repo,
        availability_service=availability_service,
    )
    equipment_repo = providers.Factory(
        EquipmentRepository,
        db=db_session,
        query_repo=equipment_query_repo,
        command_repo=equipment_command_repo,
        relations_repo=equipment_relations_repo,
        availability_service=availability_service,
    )

    notification_service = providers.Factory(NotificationService, db=db_session, notification_repo=notification_repo)
    calendar_service = providers.Factory(CalendarService, db=db_session, calendar_repo=calendar_repo)
    calendar_view_service = providers.Factory(
        CalendarViewService,
        equipment_repo=equipment_repo,
        availability_service=availability_service,
    )
    brand_system_service = providers.Factory(BrandSystemService, repo=brand_system_repo)
    accessory_service = providers.Factory(AccessoryService, db=db_session, repo=accessory_repo)
    equipment_crud_service = providers.Factory(EquipmentCRUDService, db=db_session, repo=equipment_repo)

    # PromoCode сервисы
    promo_code_validator = providers.Factory(
        PromoCodeValidator, db=db_session,
        promo_code_repo=promo_code_repo, equipment_repo=equipment_repo,
    )
    promo_code_business_logic = providers.Factory(
        PromoCodeBusinessLogic, db=db_session,
        validator=promo_code_validator, promo_code_repo=promo_code_repo,
    )
    promo_code_manager = providers.Factory(PromoCodeManager, db=db_session, promo_code_repo=promo_code_repo)
    promo_code_service = providers.Factory(PromoCodeService, db=db_session, business_logic=promo_code_business_logic)

    # Equipment filter и pack
    equipment_filter_service = providers.Factory(
        EquipmentFilterService, db=db_session,
        equipment_repo=equipment_repo, availability_service=availability_service,
        brand_system_repo=brand_system_repo,
    )
    pack_service = providers.Factory(
        PackService, db=db_session, pack_repo=pack_repo,
        equipment_repo=equipment_repo, availability_service=availability_service,
    )
    equipment_pack_service = providers.Factory(
        EquipmentPackService, db=db_session,
        pack_service=pack_service, equipment_repo=equipment_repo,
        brand_system_repo=brand_system_repo,
    )
    equipment_service_api = providers.Factory(
        EquipmentServiceApi, db=db_session,
        crud_service=equipment_crud_service,
        filter_service=equipment_filter_service,
        pack_service=equipment_pack_service,
    )

    # ============================================================
    # ФАЗА 4: Order-сервисы (циклические зависимости)
    # ============================================================

    # OrderValidator без financial_service (фаза 1)
    order_validator_phase1 = providers.Factory(
        OrderValidator, db=db_session,
        financial_service=None,
        availability_service=availability_service,
        holiday_repo=holiday_repo,
    )

    # Financial service
    financial_service = providers.Factory(
        FinancialService, db=db_session,
        status_service=status_service,
        discount_repo=discount_repo,
        promo_code_logic=promo_code_business_logic,
        holiday_repo=holiday_repo,
        equipment_repo=equipment_repo,
        accessory_repo=accessory_repo,
        order_validator=order_validator_phase1,
        discount_service=discount_service,
    )

    # Реальные rental-репозитории: финансы инкапсулируются в rental_financial_repo
    rental_financial_repo = providers.Factory(RentalFinancialRepository, db=db_session, financial_service=financial_service)
    rental_repo = providers.Factory(
        RentalRepository,
        db=db_session,
        query_repo=rental_query_repo,
        command_repo=rental_command_repo,
        financial_repo=rental_financial_repo,
    )

    # User статусы (зависят от rental_repo)
    user_status_service = providers.Factory(
        UserStatusService,
        db=db_session, user_repo=user_repo,
        reservation_repo=reservation_repo, rental_repo=rental_repo,
    )
    overdue_checker_service = providers.Factory(
        OverdueCheckerService,
        db=db_session, user_repo=user_repo,
        reservation_repo=reservation_repo, user_status_service=user_status_service,
    )

    # Финальный OrderValidator (с financial_service и user_status_service)
    order_validator_with_financial = providers.Factory(
        OrderValidator, db=db_session,
        financial_service=financial_service,
        availability_service=availability_service,
        holiday_repo=holiday_repo,
        reservation_repo=reservation_repo,
        user_status_service=user_status_service,
    )

    # lite holiday_service (доступен без полного rental_repo)
    holiday_service = providers.Factory(
        HolidayService, db=db_session, repo=holiday_repo,
        rental_repo=_rental_repo_temp, reservation_repo=reservation_repo,
        notification_service=notification_service,
    )

    # holiday_service_with_repos (полный, с реальным rental_repo)
    holiday_service_with_repos = providers.Factory(
        HolidayService, db=db_session, repo=holiday_repo,
        rental_repo=rental_repo, reservation_repo=reservation_repo,
        notification_service=notification_service,
    )

    # User service
    user_service = providers.Factory(
        UserService, db=db_session, user_repo=user_repo,
        balance_service=balance_service,
        balance_history_repo=balance_history_repo,
        payment_repo=payment_repo,
        order_validator=order_validator_with_financial,
        user_status_service=user_status_service,
    )

    # Query сервисы
    rental_query_service = providers.Factory(
        RentalQueryService, db=db_session,
        financial_service=financial_service, rental_repo=rental_repo,
    )
    reservation_query_service = providers.Factory(
        ReservationQueryService, db=db_session,
        financial_service=financial_service, reservation_repo=reservation_repo,
    )

    # ============================================================
    # ФАЗА 5: Lifecycle сервисы
    # ============================================================

    rental_creation_service = providers.Factory(
        RentalCreationService,
        db=db_session, rental_repo=rental_repo,
        reservation_repo=reservation_repo, user_repo=user_repo,
        equipment_repo=equipment_repo, system_service=system_service,
        validator=order_validator_with_financial,
        balance_service=balance_service,
        financial_service=financial_service,
        promo_code_logic=promo_code_business_logic,
    )
    rental_return_service = providers.Factory(
        RentalReturnService,
        db=db_session, rental_repo=rental_repo,
        validator=order_validator_with_financial,
        balance_service=balance_service,
        financial_service=financial_service,
        user_status_service=user_status_service,
    )
    rental_update_service = providers.Factory(
        RentalUpdateService,
        db=db_session, rental_repo=rental_repo,
        system_service=system_service,
        validator=order_validator_with_financial,
        balance_service=balance_service,
        financial_service=financial_service,
        promo_code_logic=promo_code_business_logic,
    )
    rental_cancellation_service = providers.Factory(
        RentalCancellationService,
        db=db_session, rental_repo=rental_repo,
        validator=order_validator_with_financial,
        balance_service=balance_service,
        system_service=system_service,
        promo_code_logic=promo_code_business_logic,
    )
    reservation_lifecycle_service = providers.Factory(
        ReservationLifecycleService,
        db=db_session, reservation_repo=reservation_repo,
        user_repo=user_repo, equipment_repo=equipment_repo,
        system_service=system_service,
        validator=order_validator_with_financial,
        financial_service=financial_service,
        promo_code_logic=promo_code_business_logic,
        telegram_service=telegram_notification_service,
    )
    rental_lifecycle_service = providers.Factory(
        RentalLifecycleService,
        db=db_session, rental_repo=rental_repo,
        reservation_repo=reservation_repo, user_repo=user_repo,
        equipment_repo=equipment_repo, system_service=system_service,
        validator=order_validator_with_financial,
        balance_service=balance_service,
        financial_service=financial_service,
        promo_code_logic=promo_code_business_logic,
        creation_service=rental_creation_service,
        return_service=rental_return_service,
        update_service=rental_update_service,
        cancellation_service=rental_cancellation_service,
    )

    # ============================================================
    # ФАЗА 6: Dashboard сервисы
    # ============================================================

    focus_service = providers.Factory(
        FocusService, db=db_session, dashboard_repo=dashboard_repo,
        financial_service=financial_service,
    )
    kpi_service = providers.Factory(KpiService, db=db_session, statistics_repo=statistics_repo)
    activity_service = providers.Factory(ActivityService, db=db_session, dashboard_repo=dashboard_repo)
    equipment_dashboard_service = providers.Factory(
        DashboardEquipmentService, db=db_session, dashboard_repo=dashboard_repo,
    )
    dashboard_service = providers.Factory(
        DashboardService, db=db_session, dashboard_repo=dashboard_repo,
        focus_service=focus_service, kpi_service=kpi_service,
        activity_service=activity_service,
        equipment_service=equipment_dashboard_service,
    )

    settings_service = providers.Factory(SettingsService, db=db_session, system_service=system_service)
    discount_service_functions = providers.Singleton(lambda: __import__('api.services.discount_service', fromlist=['']))
