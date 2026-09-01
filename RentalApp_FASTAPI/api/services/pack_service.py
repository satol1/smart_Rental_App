# api/services/pack_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select, and_
from fastapi import HTTPException
from typing import List, Optional
from datetime import date
import logging

from api.models.pack import Pack
from api.models.equipment import Equipment
from api.repositories.equipment_repository import EquipmentRepository
from api.repositories.pack_repository import PackRepository
from shared.schemas.pack_schema import PackCreate, PackUpdate, PackOut, PublicPackOut
from shared.schemas.equipment_schema import EquipmentOut

logger = logging.getLogger(__name__)


class PackService:
    """Сервис для работы с пачками оборудования."""

    def __init__(self, db: AsyncSession, pack_repo: PackRepository = None, equipment_repo: EquipmentRepository = None, availability_service=None):
        self.db = db
        self.pack_repo = pack_repo or PackRepository(db)
        if not equipment_repo:
            raise ValueError("EquipmentRepository must be injected via DI container")
        self.equipment_repo = equipment_repo
        self.availability_service = availability_service

    async def create_pack(self, pack_data: PackCreate) -> PackOut:
        """Создает новую пачку с указанным оборудованием."""
        logger.info(f"Начинаем создание пачки: name='{pack_data.name}', equipment_ids={pack_data.equipment_ids}")
        
        try:
            # Проверяем существование оборудования
            equipment_list = []
            if pack_data.equipment_ids:
                logger.info(f"Проверяем существование оборудования с ID: {pack_data.equipment_ids}")
                equipment_list = await self.equipment_repo.get_by_ids(pack_data.equipment_ids)
                logger.info(f"Найдено оборудования: {len(equipment_list)} из {len(pack_data.equipment_ids)}")
                
                if len(equipment_list) != len(pack_data.equipment_ids):
                    missing_ids = set(pack_data.equipment_ids) - {eq.id for eq in equipment_list}
                    logger.error(f"Не найдено оборудование с ID: {list(missing_ids)}")
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Оборудование с ID {list(missing_ids)} не найдено"
                    )

            # Создаем пачку через репозиторий
            logger.info("Создаем пачку через репозиторий")
            new_pack = await self.pack_repo.create_with_equipment(pack_data, equipment_list)
            logger.info(f"Пачка создана через репозиторий, ID: {new_pack.id}")

            # Создаем ответ напрямую из объекта
            logger.info("Создаем ответ из объекта пачки")
            pack_out = PackOut.model_validate(new_pack)
            logger.info(f"Создание пачки завершено успешно: {pack_out}")
            return pack_out

        except HTTPException as he:
            logger.error(f"HTTPException при создании пачки: {he.detail}")
            await self.db.rollback()
            raise he
        except Exception as e:
            logger.error(f"Неожиданная ошибка при создании пачки: {e}", exc_info=True)
            await self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Ошибка при создании пачки: {str(e)}")

    async def get_pack_by_id(self, pack_id: int) -> Optional[PackOut]:
        """Получает пачку по ID с загруженным оборудованием."""
        pack = await self.pack_repo.get_by_id_with_equipment(pack_id)
        
        if not pack:
            return None
            
        return PackOut.model_validate(pack)

    async def get_all_packs(self) -> List[PackOut]:
        """Получает все пачки с загруженным оборудованием."""
        packs = await self.pack_repo.get_all_with_equipment()
        
        return [PackOut.model_validate(pack) for pack in packs]

    async def update_pack(self, pack_id: int, pack_data: PackUpdate) -> Optional[PackOut]:
        """Обновляет пачку."""
        pack = await self.pack_repo.get_by_id_with_equipment(pack_id)
        
        if not pack:
            return None

        try:
            equipment_list = None
            
            # Обновляем оборудование, если указано
            if pack_data.equipment_ids is not None:
                # Проверяем существование оборудования
                if pack_data.equipment_ids:
                    existing_equipment = await self.equipment_repo.get_by_ids(pack_data.equipment_ids)
                    
                    if len(existing_equipment) != len(pack_data.equipment_ids):
                        missing_ids = set(pack_data.equipment_ids) - {eq.id for eq in existing_equipment}
                        raise HTTPException(
                            status_code=404, 
                            detail=f"Оборудование с ID {list(missing_ids)} не найдено"
                        )
                    
                    equipment_list = existing_equipment

            # Обновляем пачку через репозиторий
            updated_pack = await self.pack_repo.update_with_equipment(pack, pack_data, equipment_list)

            return PackOut.model_validate(updated_pack)

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Ошибка при обновлении пачки {pack_id}: {e}")
            raise HTTPException(status_code=500, detail="Ошибка при обновлении пачки")

    async def delete_pack(self, pack_id: int) -> bool:
        """Удаляет пачку."""
        try:
            success = await self.pack_repo.delete(pack_id)
            return success

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Ошибка при удалении пачки {pack_id}: {e}")
            raise HTTPException(status_code=500, detail="Ошибка при удалении пачки")

    async def suggest_equipment_for_pack(self, equipment_id: int) -> List[int]:
        """
        Предлагает оборудование для пачки на основе эталонного оборудования.
        Находит все единицы оборудования с одинаковыми equipment_type, brand и name.
        """
        # Получаем эталонное оборудование
        reference_equipment = await self.equipment_repo.get_by_id(equipment_id)
        
        if not reference_equipment:
            raise HTTPException(status_code=404, detail="Эталонное оборудование не найдено")

        # Ищем похожее оборудование
        similar_equipment = await self.equipment_repo.get_similar_equipment(
            reference_equipment.equipment_type,
            reference_equipment.brand,
            reference_equipment.name,
            exclude_id=equipment_id
        )
        
        return [eq.id for eq in similar_equipment]

    async def get_public_packs_for_catalog(
        self, 
        start_date: Optional[date] = None, 
        end_date: Optional[date] = None,
        # ✅ ИЗМЕНЕНИЕ: Добавляем новый аргумент
        available_only: bool = False
    ) -> List[PublicPackOut]:
        """
        Получает пачки для публичного каталога с рассчитанными полями.
        Использует централизованный AvailabilityService для проверки доступности.
        """
        from api.services.availability.availability_service import AvailabilityService
        
        
        # Получаем все пачки с оборудованием через репозиторий
        packs = await self.pack_repo.get_all_with_equipment()
        
        public_packs = []
        
        # ✅ ИСПОЛЬЗУЕМ ПЕРЕДАННУЮ ЗАВИСИМОСТЬ
        if not self.availability_service:
            raise HTTPException(status_code=500, detail="AvailabilityService не инициализирован")
        availability_service = self.availability_service
        
        for pack in packs:
            if not pack.equipment:
                continue
                
            first_equipment = pack.equipment[0]
            image_url = first_equipment.image_url
            total_count = len(pack.equipment)
            available_count = total_count
            cheapest_available_id = None
            min_daily_rate_available = 0.0

            if start_date and end_date:
                # ✅ ИСПОЛЬЗУЕМ ЦЕНТРАЛИЗОВАННЫЙ СЕРВИС для проверки доступности
                equipment_ids = [eq.id for eq in pack.equipment]
                conflicting_ids_set = set(await availability_service.get_conflicting_equipment_ids(
                    equipment_ids, start_date, end_date
                ))
                available_equipment = [eq for eq in pack.equipment if eq.id not in conflicting_ids_set]
                available_count = len(available_equipment)
                

                if available_equipment:
                    cheapest_available_item = min(available_equipment, key=lambda x: x.daily_rate or float('inf'))
                    cheapest_available_id = cheapest_available_item.id
                    min_daily_rate_available = cheapest_available_item.daily_rate
            else:
                # ✅ ИСПРАВЛЕНИЕ: Когда даты не выбраны, показываем что все доступно
                # но cheapest_available_id должен быть самым дешевым из всех
                if pack.equipment:
                    cheapest_item = min(pack.equipment, key=lambda x: x.daily_rate or float('inf'))
                    cheapest_available_id = cheapest_item.id
                    min_daily_rate_available = cheapest_item.daily_rate
                    # available_count остается равным total_count

            # ✅ ИЗМЕНЕНИЕ: Добавляем ключевую проверку
            # Если включен фильтр "только свободное" и в пачке нет доступных единиц,
            # то мы просто пропускаем эту пачку и не добавляем ее в результат.
            if available_only and start_date and end_date and available_count == 0:
                continue  # Пропускаем эту пачку

            public_pack = PublicPackOut(
                id=pack.id,
                entity_type="pack",
                name=pack.name,
                equipment_type=first_equipment.equipment_type,
                brand=first_equipment.brand,
                image_url=image_url,
                total_count=total_count,
                available_count=available_count,
                min_daily_rate=min_daily_rate_available,
                cheapest_available_id=cheapest_available_id,
                equipment_ids=[eq.id for eq in pack.equipment]
            )
            
            public_packs.append(public_pack)
        
        return public_packs
