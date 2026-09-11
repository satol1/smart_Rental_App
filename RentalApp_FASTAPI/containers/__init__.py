# containers/__init__.py
# Main DI Container — агрегирует суб-контейнеры и предоставляет плоский доступ
# ко всем провайдерам для обратной совместимости с Provide[Container.xxx].

from dependency_injector import containers, providers

from containers.constants import (
    AsyncSessionLocal, engine, SessionLocal, request_db_session, get_request_db_session,
)
from containers.infrastructure import InfrastructureContainer
from containers.repositories import RepositoriesContainer
from containers.services import ServicesContainer


class Container(containers.DeclarativeContainer):
    wiring_config = containers.WiringConfiguration(
        modules=[
            "api.dependencies",
            "api.admin_reservation_api",
            "api.admin_rental_api",
            "api.reservation_api",
            "api.equipment_api",
            "api.user_profile_api",
            "api.admin_user_api",
            "api.admin_balance_api",
            "api.admin_security_api",
            "api.auth_api",
            "api.accessory_api",
            "api.association_api",
            "api.discount_api",
            "api.holiday_api",
            "api.pack_api",
            "api.promo_code_api",
            "api.settings_api",
            "api.calendar_api",
            "api.admin_dashboard_api",
            "api.brand_system_api",
        ]
    )

    # --- Суб-контейнеры ---
    infrastructure = providers.Container(InfrastructureContainer)
    repositories = providers.Container(RepositoriesContainer)
    services = providers.Container(ServicesContainer)

    # ================================================================
    # Плоские алиасы для обратной совместимости
    # (Provide[Container.xxx] продолжает работать)
    # ================================================================

    # --- Инфраструктура ---
    db_session = InfrastructureContainer.db_session
    period_service = InfrastructureContainer.period_service

    # --- Репозитории ---
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
    rental_financial_repo = ServicesContainer.rental_financial_repo
    rental_repo = ServicesContainer.rental_repo
    equipment_command_repo = RepositoriesContainer.equipment_command_repo
    equipment_relations_repo = RepositoriesContainer.equipment_relations_repo
    equipment_query_repo = ServicesContainer.equipment_query_repo
    equipment_repo = ServicesContainer.equipment_repo
    reservation_query_repo = RepositoriesContainer.reservation_query_repo
    reservation_filter_repo = RepositoriesContainer.reservation_filter_repo
    reservation_availability_repo = RepositoriesContainer.reservation_availability_repo

    # --- Базовые сервисы ---
    system_service = ServicesContainer.system_service
    status_service = ServicesContainer.status_service
    error_handler_service = ServicesContainer.error_handler_service
    balance_service = ServicesContainer.balance_service
    discount_service = ServicesContainer.discount_service
    association_service = ServicesContainer.association_service
    security_audit_service = ServicesContainer.security_audit_service
    brute_force_protection_service = ServicesContainer.brute_force_protection_service
    auth_service = ServicesContainer.auth_service

    # --- Availability ---
    availability_conflicts_service = ServicesContainer.availability_conflicts_service
    availability_status_service = ServicesContainer.availability_status_service
    availability_calendar_service = ServicesContainer.availability_calendar_service
    availability_query_service = ServicesContainer.availability_query_service
    availability_service = ServicesContainer.availability_service

    # --- Equipment ---
    equipment_crud_service = ServicesContainer.equipment_crud_service
    equipment_filter_service = ServicesContainer.equipment_filter_service
    equipment_pack_service = ServicesContainer.equipment_pack_service
    brand_system_service = ServicesContainer.brand_system_service
    accessory_service = ServicesContainer.accessory_service
    pack_service = ServicesContainer.pack_service
    equipment_service_api = ServicesContainer.equipment_service_api

    # --- PromoCode ---
    promo_code_validator = ServicesContainer.promo_code_validator
    promo_code_business_logic = ServicesContainer.promo_code_business_logic
    promo_code_manager = ServicesContainer.promo_code_manager
    promo_code_service = ServicesContainer.promo_code_service

    # --- Order ---
    order_validator = ServicesContainer.order_validator_phase1
    order_validator_with_financial = ServicesContainer.order_validator_with_financial
    financial_service = ServicesContainer.financial_service

    # --- User / Статусы ---
    user_status_service = ServicesContainer.user_status_service
    overdue_checker_service = ServicesContainer.overdue_checker_service
    user_service = ServicesContainer.user_service

    # --- Query сервисы ---
    rental_query_service = ServicesContainer.rental_query_service
    reservation_query_service = ServicesContainer.reservation_query_service

    # --- Holiday ---
    holiday_service = ServicesContainer.holiday_service
    holiday_service_with_repos = ServicesContainer.holiday_service_with_repos

    # --- Notification ---
    notification_service = ServicesContainer.notification_service
    telegram_notification_service = ServicesContainer.telegram_notification_service
    calendar_service = ServicesContainer.calendar_service

    # --- Lifecycle ---
    rental_creation_service = ServicesContainer.rental_creation_service
    rental_return_service = ServicesContainer.rental_return_service
    rental_update_service = ServicesContainer.rental_update_service
    rental_cancellation_service = ServicesContainer.rental_cancellation_service
    reservation_lifecycle_service = ServicesContainer.reservation_lifecycle_service
    rental_lifecycle_service = ServicesContainer.rental_lifecycle_service

    # --- Dashboard ---
    focus_service = ServicesContainer.focus_service
    kpi_service = ServicesContainer.kpi_service
    activity_service = ServicesContainer.activity_service
    equipment_dashboard_service = ServicesContainer.equipment_dashboard_service
    dashboard_service = ServicesContainer.dashboard_service

    # --- Прочее ---
    settings_service = ServicesContainer.settings_service
    discount_service_functions = ServicesContainer.discount_service_functions
