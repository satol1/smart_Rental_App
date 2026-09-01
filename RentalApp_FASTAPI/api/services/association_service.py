# api/services/association_service.py

from api.repositories.association_repository import AssociationRepository
from shared.schemas.association_schema import AssociationCreate, AssociationUpdate, AssociationOut, AssociationListResponse
from api.models.association import Association
from typing import List, Tuple


class AssociationService:
    """
    Сервис для работы с ассоциациями.
    Инкапсулирует бизнес-логику работы с ассоциациями и управление транзакциями.
    """
    
    def __init__(self, repo: AssociationRepository):
        self._repo = repo

    async def get_all_paginated(self, skip: int, limit: int) -> AssociationListResponse:
        """
        Получить список всех ассоциаций с пагинацией.
        """
        associations_orm, total_associations = await self._repo.get_all_paginated(skip, limit)

        # Формируем и возвращаем новый объект ответа
        # Загружаем связанное оборудование для каждой ассоциации
        associations_with_equipment = []
        for assoc in associations_orm:
            # Принудительно загружаем связанное оборудование
            equipment_ids = [eq.id for eq in assoc.equipment] if assoc.equipment else []
            associations_with_equipment.append({
                "id": assoc.id,
                "name": assoc.name,
                "description": assoc.description,
                "sort_order": assoc.sort_order,
                "equipment_ids": equipment_ids
            })
        
        return AssociationListResponse(
            items=[AssociationOut(**assoc_data) for assoc_data in associations_with_equipment],
            total=total_associations
        )

    async def create_new_association(self, data: AssociationCreate) -> AssociationOut:
        """
        Создать новую ассоциацию.
        """
        new_assoc = await self._repo.create_with_equipment(data)
        # Убираем ручной коммит - middleware автоматически коммитит транзакцию
        
        # Получаем equipment_ids напрямую из связанных объектов
        equipment_ids = [eq.id for eq in new_assoc.equipment] if new_assoc.equipment else []
        return AssociationOut(
            id=new_assoc.id,
            name=new_assoc.name,
            description=new_assoc.description,
            sort_order=new_assoc.sort_order,
            equipment_ids=equipment_ids
        )

    async def update_association(self, assoc_id: int, data: AssociationUpdate) -> AssociationOut:
        """
        Обновить существующую ассоциацию.
        """
        updated_assoc = await self._repo.update_with_equipment(assoc_id, data)
        # Убираем ручной коммит - middleware автоматически коммитит транзакцию
        
        # Получаем equipment_ids напрямую из связанных объектов
        equipment_ids = [eq.id for eq in updated_assoc.equipment] if updated_assoc.equipment else []
        return AssociationOut(
            id=updated_assoc.id,
            name=updated_assoc.name,
            description=updated_assoc.description,
            sort_order=updated_assoc.sort_order,
            equipment_ids=equipment_ids
        )

    async def delete_association(self, assoc_id: int) -> None:
        """
        Удалить ассоциацию.
        """
        await self._repo.delete_by_id(assoc_id)
        # Убираем ручной коммит - middleware автоматически коммитит транзакцию
