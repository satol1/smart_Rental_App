# api/services/accessory_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from api.repositories.accessory_repository import AccessoryRepository
from shared.schemas.accessory_schema import AccessoryCreate, AccessoryUpdate, AccessoryOut, AccessoryListResponse


class AccessoryService:
    """Сервис для управления аксессуарами."""
    
    def __init__(self, db: AsyncSession, repo: AccessoryRepository):
        self.db = db
        self.repo = repo

    async def create_accessory(self, accessory_in: AccessoryCreate) -> AccessoryOut:
        """Создает новый аксессуар."""
        new_accessory = await self.repo.create(accessory_in)
        await self.repo.save()
        return new_accessory

    async def get_all_accessories_paginated(self, skip: int, limit: int) -> AccessoryListResponse:
        """Получает список всех аксессуаров с пагинацией."""
        accessories, total_count = await self.repo.get_all_paginated(skip, limit)
        return AccessoryListResponse(
            items=accessories,
            total=total_count
        )

    async def get_accessory_by_id(self, accessory_id: int) -> AccessoryOut:
        """Получает аксессуар по ID."""
        accessory = await self.repo.get_by_id(accessory_id)
        if not accessory:
            raise HTTPException(status_code=404, detail="Аксессуар не найден")
        return accessory

    async def update_accessory(self, accessory_id: int, accessory_in: AccessoryUpdate) -> AccessoryOut:
        """Обновляет аксессуар."""
        # Находим аксессуар по ID
        accessory = await self.repo.get_by_id(accessory_id)
        if not accessory:
            raise HTTPException(status_code=404, detail="Аксессуар не найден")

        # Обновляем аксессуар через репозиторий
        updated_accessory = await self.repo.update(accessory, accessory_in)
        await self.repo.save()
        return updated_accessory

    async def delete_accessory(self, accessory_id: int) -> None:
        """Удаляет аксессуар."""
        # Используем метод репозитория для проверки зависимостей и удаления
        await self.repo.check_usage_and_delete(accessory_id)
        await self.repo.save()
