# containers/infrastructure.py
# Infrastructure-level providers.

from dependency_injector import containers, providers

from containers.constants import get_request_db_session, PeriodService


class InfrastructureContainer(containers.DeclarativeContainer):
    db_session = providers.Callable(get_request_db_session)
    period_service = providers.Factory(PeriodService)
