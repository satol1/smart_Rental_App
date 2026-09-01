# api/repositories/pack_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from typing import List, Optional

from api.models.pack import Pack
from api.repositories.base_repository import BaseRepository
from shared.schemas.pack_schema import PackCreate, PackUpdate


class PackRepository(BaseRepository[Pack, PackCreate, PackUpdate]):
    """Репозиторий для работы с пачками оборудования."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, Pack)

    async def get_by_id_with_equipment(self, pack_id: int) -> Optional[Pack]:
        """Получает пачку по ID с загруженным оборудованием."""
        result = await self.db.execute(
            select(Pack)
            .options(selectinload(Pack.equipment))
            .filter(Pack.id == pack_id)
        )
        return result.scalars().first()

    async def get_all_with_equipment(self) -> List[Pack]:
        """Получает все пачки с загруженным оборудованием."""
        result = await self.db.execute(
            select(Pack)
            .options(selectinload(Pack.equipment))
            .order_by(Pack.created_at.desc())
        )
        return result.scalars().all()

    async def create_with_equipment(self, pack_data: PackCreate, equipment_list: List) -> Pack:
        """Создает новую пачку с указанным оборудованием."""
        new_pack = Pack(
            name=pack_data.name,
            description=pack_data.description
        )
        
        # Добавляем оборудование в пачку
        if equipment_list:
            new_pack.equipment.extend(equipment_list)
        
        self.db.add(new_pack)
        await self.db.flush()  # Используем flush для получения ID без коммита
        
        return new_pack

    async def update_with_equipment(self, pack: Pack, pack_data: PackUpdate, equipment_list: Optional[List] = None) -> Pack:
        """Обновляет пачку с возможностью изменения оборудования."""
        # Обновляем основные поля
        if pack_data.name is not None:
            pack.name = pack_data.name
        if pack_data.description is not None:
            pack.description = pack_data.description

        # Обновляем оборудование, если указано
        if equipment_list is not None:
            # Очищаем текущее оборудование
            pack.equipment.clear()
            # Добавляем новое оборудование
            if equipment_list:
                pack.equipment.extend(equipment_list)

        await self.db.flush()
        
        # Перезагружаем объект из базы данных для получения актуальных данных
        refreshed_pack = await self.get_by_id_with_equipment(pack.id)
        return refreshed_pack

    async def delete(self, pack_id: int) -> bool:
        """Удаляет пачку по ID."""
        pack = await self.get_by_id(pack_id)
        if not pack:
            return False
            
        await self.db.delete(pack)
        await self.db.flush()
        return True
