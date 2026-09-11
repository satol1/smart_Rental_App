# api/equipment_api.py

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import date
from collections import defaultdict
from api.csrf import validate_csrf_dependency
# Удален импорт get_db_session

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.models.equipment import Equipment
from api.models.user import User
from api.repositories.equipment_repository import EquipmentRepository
from api.permissions import require_manager
# --- ИЗМЕНЕНИЕ: Импортируем новый сервисный класс и схему ответа ---
from api.services.equipment_service_api import EquipmentServiceApi
from api.services.equipment_crud_service import EquipmentCRUDService
from shared.schemas.equipment_schema import (
    EquipmentOut,
    EquipmentCreateOut,
    EquipmentTreeItem,
    EquipmentUpdateExtended,
    EquipmentCreate,
    EquipmentCopyRequest,
    EquipmentAvailabilityStatus,
    EquipmentListResponse,
    EquipmentTreeListResponse
)

router = APIRouter(prefix="/equipment", tags=["Оборудование"])


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

@router.get("/", response_model=EquipmentListResponse)
@inject
async def list_equipment_paginated(
        skip: int = Query(0, ge=0),
        limit: int = Query(10, ge=1, le=1000),
        query: Optional[str] = Query(None),
        type: Optional[str] = Query(None),
        brand_system_id: Optional[int] = Query(None, alias="brandSystemId"),
        association_id: Optional[int] = Query(None, alias="associationId"),
        start_date: Optional[date] = Query(None, alias="startDate"),
        end_date: Optional[date] = Query(None, alias="endDate"),
        available_only: bool = Query(False, alias="availableOnly"),
        group_similar: bool = Query(True, alias="groupSimilar"),
        equipment_service: EquipmentServiceApi = Depends(Provide[Container.equipment_service_api])
):
    """Возвращает отфильтрованный и пагинированный список оборудования."""
    # ✅ Сервис теперь возвращает единый список `items`
    items, total, available_filters = await equipment_service.get_paginated_equipment(
        skip=skip, limit=limit, query=query, type=type, brand_system_id=brand_system_id,
        association_id=association_id, start_date=start_date, end_date=end_date,
        available_only=available_only, group_similar=group_similar
    )
    # ✅ Возвращаем ответ в новом формате
    return EquipmentListResponse(items=items, total=total, availableFilters=available_filters)


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

@router.get("/tree", response_model=EquipmentTreeListResponse)
@inject
async def get_equipment_tree(
        skip: int = Query(0, ge=0),
        limit: int = Query(10, ge=1, le=100),
        equipment_repo: EquipmentRepository = Depends(Provide[Container.equipment_repo])
):
    """Возвращает оборудование, сгруппированное в виде дерева по типу и бренду с пагинацией."""
    all_equipment = await equipment_repo.get_all()
    grouped: dict[str, dict[str, list[Equipment]]] = defaultdict(lambda: defaultdict(list))
    for eq in all_equipment:
        grouped[eq.equipment_type][eq.brand].append(eq)

    result = []
    for eq_type, brands in grouped.items():
        type_node = EquipmentTreeItem(label=eq_type, children=[])
        for brand, items in brands.items():
            brand_node = EquipmentTreeItem(label=brand, children=[
                EquipmentTreeItem(label=item.name, value=item.id) for item in items
            ])
            type_node.children.append(brand_node)
        result.append(type_node)

    total_items = len(result)
    paginated_result = result[skip:skip + limit]

    return EquipmentTreeListResponse(
        items=paginated_result,
        total=total_items
    )


@router.put("/{equipment_id}", response_model=EquipmentOut)
@inject
async def update_single_equipment_details_route(
        equipment_id: int,
        equipment_data: EquipmentUpdateExtended,
        equipment_crud_service: EquipmentCRUDService = Depends(Provide[Container.equipment_crud_service]),
        _current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Обновляет детали указанного оборудования."""
    return await equipment_crud_service.update_equipment_details(equipment_id, equipment_data)


@router.post("/", response_model=EquipmentCreateOut, status_code=201)
@inject
async def create_equipment(
        equipment_data: EquipmentCreate,
        equipment_crud_service: EquipmentCRUDService = Depends(Provide[Container.equipment_crud_service]),
        _current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Создает новое оборудование."""
    return await equipment_crud_service.create_equipment(equipment_data)


@router.post("/{equipment_id}/copy", response_model=EquipmentOut, status_code=201)
@inject
async def copy_equipment(
        equipment_id: int,
        copy_data: EquipmentCopyRequest,
        equipment_crud_service: EquipmentCRUDService = Depends(Provide[Container.equipment_crud_service]),
        _current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Копирует оборудование с возможностью изменения полей"""
    return await equipment_crud_service.copy_equipment(equipment_id, copy_data)


@router.delete("/{equipment_id}", status_code=204)
@inject
async def delete_equipment(
        equipment_id: int,
        equipment_crud_service: EquipmentCRUDService = Depends(Provide[Container.equipment_crud_service]),
        _current_user: User = Depends(require_manager),
        _csrf: None = Depends(validate_csrf_dependency)
):
    """Удаляет оборудование."""
    await equipment_crud_service.delete_equipment(equipment_id)


@router.get("/{equipment_id}", response_model=EquipmentOut)
@inject
async def get_equipment_by_id(
        equipment_id: int,
        repo: EquipmentRepository = Depends(Provide[Container.equipment_repo])
):
    """Получить оборудование по ID."""
    equipment = await repo.get_by_id_with_details(equipment_id)
    if not equipment:
        raise HTTPException(status_code=404, detail="Оборудование не найдено")
    return equipment


@router.get("/{equipment_id}/availability", response_model=EquipmentAvailabilityStatus)
@inject
async def get_equipment_availability_status(
        equipment_id: int,
        equipment_crud_service: EquipmentCRUDService = Depends(Provide[Container.equipment_crud_service]),
        _current_user: User = Depends(require_manager)
):
    """
    Проверяет, участвует ли оборудование в НЕЗАВЕРШЕННЫХ резервах или арендах.
    """
    await equipment_crud_service.get_equipment_by_id(equipment_id)

    active_reservations_count, active_rentals_count = (
        await equipment_crud_service.count_active_links(equipment_id)
    )

    return EquipmentAvailabilityStatus(
        has_active_reservations=active_reservations_count > 0,
        has_active_rentals=active_rentals_count > 0,
        active_reservations_count=active_reservations_count,
        active_rentals_count=active_rentals_count,
    )