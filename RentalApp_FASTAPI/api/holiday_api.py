# api/holiday_api.py

from fastapi import APIRouter, Depends, Query
from datetime import date, datetime

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.permissions import require_admin
from api.models.user import User
from api.services.holiday_service import HolidayService
from shared.schemas.holiday_schema import HolidayCreate, RecurringHolidayRuleCreate, HolidayListResponse, HolidayRuleListResponse


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

router = APIRouter(prefix="/holidays", tags=["Выходные и праздники"])

# Dependency providers
@router.get("/", response_model=HolidayListResponse)
@inject
async def get_holidays(
        start_date: date,
        end_date: date,
        service: HolidayService = Depends(Provide[Container.holiday_service_with_repos]),
        skip: int = Query(0, ge=0, description="Сколько записей пропустить"),
        limit: int = Query(400, ge=1, description="Максимальное количество записей на странице")
):
    """Получить список выходных в заданном диапазоне дат с пагинацией."""
    return await service.get_holidays(start_date, end_date, skip, limit)

@router.post("/", response_model=dict)
@inject
async def create_holiday(
        holiday_in: HolidayCreate,
        service: HolidayService = Depends(Provide[Container.holiday_service_with_repos]),
        current_user: User = Depends(require_admin)
):
    """Создать новый выходной день (ручное добавление)."""
    return await service.create_single_holiday(holiday_in, current_user)


@router.delete("/{holiday_date}", status_code=204)
@inject
async def delete_holiday(
        holiday_date: date,
        service: HolidayService = Depends(Provide[Container.holiday_service_with_repos]),
        _current_user: User = Depends(require_admin)
):
    """Удалить выходной день."""
    await service.delete_holiday(holiday_date)
    return None

@router.post("/recurring/weekly", status_code=201, summary="Создать еженедельные выходные")
@inject
async def create_weekly_recurring_holidays(
        rule_in: RecurringHolidayRuleCreate,
        service: HolidayService = Depends(Provide[Container.holiday_service_with_repos]),
        current_user: User = Depends(require_admin)
):
    """Создает правило и генерирует выходные для указанного дня недели в диапазоне дат."""
    return await service.create_weekly_recurring_holidays(rule_in, current_user)


@router.post("/import/public", status_code=201, summary="Импортировать гос. праздники")
@inject
async def import_public_holidays(
        country_code: str = Query("RU", description="ISO 3166-1 alpha-2 код страны"),
        year: int = Query(datetime.now().year, description="Год для импорта"),
        service: HolidayService = Depends(Provide[Container.holiday_service_with_repos]),
        current_user: User = Depends(require_admin)
):
    """Импортирует государственные праздники для указанной страны и года."""
    return await service.import_public_holidays(country_code, year, current_user)

@router.get("/rules", response_model=HolidayRuleListResponse, summary="Получить список всех правил")
@inject
async def get_all_rules(
        service: HolidayService = Depends(Provide[Container.holiday_service_with_repos]),
        current_user: User = Depends(require_admin),
        skip: int = Query(0, ge=0, description="Сколько записей пропустить"),
        limit: int = Query(10, ge=1, le=100, description="Максимальное количество записей на странице")
):
    """Возвращает все созданные правила для генерации выходных с пагинацией."""
    return await service.get_all_rules(skip, limit)


@router.delete("/rules/{rule_id}", status_code=204, summary="Удалить правило и связанные с ним выходные")
@inject
async def delete_rule(
        rule_id: int,
        service: HolidayService = Depends(Provide[Container.holiday_service_with_repos]),
        current_user: User = Depends(require_admin)
):
    """Удаляет правило. Благодаря `cascade='all, delete-orphan'`, все созданные им выходные будут удалены автоматически."""
    await service.delete_rule(rule_id)
    return None