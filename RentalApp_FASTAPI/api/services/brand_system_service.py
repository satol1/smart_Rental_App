# api/services/brand_system_service.py

from api.repositories.brand_system_repository import BrandSystemRepository
from shared.schemas.brand_system_schema import BrandSystemCreate, BrandSystemUpdate, BrandSystemOut

class BrandSystemService:
    """Сервис-фасад для управления логикой Систем Бренда."""
    def __init__(self, repo: BrandSystemRepository):
        self.repo = repo

    async def get_all_paginated(self, skip: int, limit: int):
        """Получить все системы с пагинацией."""
        systems, total = await self.repo.get_all_paginated(skip, limit)
        # Преобразуем в схемы с правильными equipment_ids
        systems_out = [BrandSystemOut.from_orm_with_equipment_ids(system) for system in systems]
        return systems_out, total

    async def create(self, data: BrandSystemCreate):
        """Создать новую систему."""
        new_system = await self.repo.create_with_equipment(data)
        await self.repo.save()
        return BrandSystemOut.from_orm_with_equipment_ids(new_system)

    async def update(self, system_id: int, data: BrandSystemUpdate):
        """Обновить существующую систему."""
        updated_system = await self.repo.update_with_equipment(system_id, data)
        await self.repo.save()
        return BrandSystemOut.from_orm_with_equipment_ids(updated_system)
        
    async def delete(self, system_id: int):
        """Удалить систему."""
        await self.repo.delete_by_id(system_id)
        await self.repo.save()
