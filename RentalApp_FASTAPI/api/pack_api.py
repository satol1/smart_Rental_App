# api/pack_api.py

from fastapi import APIRouter, Depends, HTTPException, Query
from api.csrf import validate_csrf_dependency
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import logging

from dependency_injector.wiring import inject, Provide
from containers import Container
from api.permissions import require_manager
from api.services.pack_service import PackService
from shared.schemas.pack_schema import PackCreate, PackUpdate, PackOut
# Удален импорт get_db_session

logger = logging.getLogger(__name__)


# Анти-паттерны get_*_service() удалены - теперь используется Depends(Provide[...])

router = APIRouter(prefix="/admin/packs", tags=["Администрирование Пачек"])

# Dependency providers
@router.post("/", response_model=PackOut)
@inject
async def create_pack(
    pack_data: PackCreate,
    current_user = Depends(require_manager),
    _csrf: None = Depends(validate_csrf_dependency),
    pack_service: PackService = Depends(Provide[Container.pack_service])
):
    """Создание новой пачки."""
    logger.info(f"API: Получен запрос на создание пачки от пользователя {current_user.id}")
    logger.info(f"API: Данные пачки: {pack_data}")
    
    try:
        result = await pack_service.create_pack(pack_data)
        logger.info(f"API: Пачка успешно создана: {result}")
        return result
    except Exception as e:
        logger.error(f"API: Ошибка при создании пачки: {e}", exc_info=True)
        raise


@router.get("/", response_model=List[PackOut])
@inject
async def get_all_packs(
    current_user = Depends(require_manager),
    pack_service: PackService = Depends(Provide[Container.pack_service])
):
    """Получение списка всех пачек."""
    return await pack_service.get_all_packs()


@router.get("/{pack_id}", response_model=PackOut)
@inject
async def get_pack_by_id(
    pack_id: int,
    current_user = Depends(require_manager),
    pack_service: PackService = Depends(Provide[Container.pack_service])
):
    """Получение пачки по ID."""
    pack = await pack_service.get_pack_by_id(pack_id)
    
    if not pack:
        raise HTTPException(status_code=404, detail="Пачка не найдена")
    
    return pack


@router.put("/{pack_id}", response_model=PackOut)
@inject
async def update_pack(
    pack_id: int,
    pack_data: PackUpdate,
    current_user = Depends(require_manager),
    _csrf: None = Depends(validate_csrf_dependency),
    pack_service: PackService = Depends(Provide[Container.pack_service])
):
    """Обновление пачки."""
    pack = await pack_service.update_pack(pack_id, pack_data)
    
    if not pack:
        raise HTTPException(status_code=404, detail="Пачка не найдена")
    
    return pack


@router.delete("/{pack_id}")
@inject
async def delete_pack(
    pack_id: int,
    current_user = Depends(require_manager),
    _csrf: None = Depends(validate_csrf_dependency),
    pack_service: PackService = Depends(Provide[Container.pack_service])
):
    """Удаление пачки."""
    success = await pack_service.delete_pack(pack_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Пачка не найдена")
    
    return {"message": "Пачка успешно удалена"}


@router.get("/suggestions/equipment", response_model=List[int])
@inject
async def get_equipment_suggestions(
    equipment_id: int = Query(..., description="ID эталонного оборудования"),
    current_user = Depends(require_manager),
    pack_service: PackService = Depends(Provide[Container.pack_service])
):
    """Получение предложений оборудования для пачки на основе эталонного оборудования."""
    return await pack_service.suggest_equipment_for_pack(equipment_id)
