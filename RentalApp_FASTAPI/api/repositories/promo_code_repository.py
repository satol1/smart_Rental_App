# api/repositories/promo_code_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from api.models.promo_code import PromoCode, PromoCodeApplicableType
from api.models.equipment import Equipment
from shared.schemas.promo_code_schema import PromoCodeCreate, PromoCodeUpdate
from .base_repository import BaseRepository


class PromoCodeRepository(BaseRepository[PromoCode, PromoCodeCreate, PromoCodeUpdate]):
    """Репозиторий для работы с промокодами"""
    
    def __init__(self, db: AsyncSession):
        super().__init__(db, PromoCode)
    
    async def get_by_code(self, code: str) -> Optional[PromoCode]:
        """Получает промокод по коду"""
        result = await self.db.execute(select(PromoCode).filter(PromoCode.code == code))
        return result.scalar_one_or_none()
    
    async def get_all_with_creator(self) -> List[PromoCode]:
        """Получает все промокоды с загрузкой создателя и применимости"""
        result = await self.db.execute(
            select(PromoCode)
            .options(
                joinedload(PromoCode.creator),
                selectinload(PromoCode.applicable_equipment),
                selectinload(PromoCode.applicable_types),
            )
            .order_by(PromoCode.created_at.desc())
        )
        return result.unique().scalars().all()
    
    async def get_by_id_with_creator(self, promo_code_id: int) -> Optional[PromoCode]:
        """Получает промокод по ID с загрузкой создателя и применимости"""
        result = await self.db.execute(
            select(PromoCode)
            .filter(PromoCode.id == promo_code_id)
            .options(
                joinedload(PromoCode.creator),
                selectinload(PromoCode.applicable_equipment),
                selectinload(PromoCode.applicable_types),
            )
        )
        return result.unique().scalars().first()
    
    async def create_with_relations(
        self, 
        promo_data: PromoCodeCreate, 
        creator_id: int
    ) -> PromoCode:
        """Создает промокод с установкой связей"""
        # Создание основного объекта без связей
        promo_dict = promo_data.model_dump(exclude={'applicable_to_equipment_ids', 'applicable_to_equipment_types'})
        new_promo_code = PromoCode(**promo_dict, created_by_id=creator_id)
        
        # Добавляем объект в сессию
        self.db.add(new_promo_code)
        # Транзакция коммитится middleware
        await self.db.flush()
        await self.db.refresh(new_promo_code)
        
        # Устанавливаем связи с оборудованием. Присваиваем коллекции безусловно
        # (в т.ч. пустые): неприсвоенное отношение на persistent-объекте при
        # сериализации PromoCodeOut уходит в синхронный lazy load -> MissingGreenlet
        if promo_data.applicable_to_equipment_ids:
            equipment_result = await self.db.execute(
                select(Equipment).filter(Equipment.id.in_(promo_data.applicable_to_equipment_ids))
            )
            equipment = equipment_result.unique().scalars().all()
            if len(equipment) != len(promo_data.applicable_to_equipment_ids):
                raise ValueError("Некоторые виды оборудования не найдены")
            new_promo_code.applicable_equipment = equipment
        else:
            new_promo_code.applicable_equipment = []

        # Устанавливаем связи с типами оборудования
        if promo_data.applicable_to_equipment_types:
            new_promo_code.applicable_types = [
                PromoCodeApplicableType(type_name=t) for t in promo_data.applicable_to_equipment_types
            ]
        else:
            new_promo_code.applicable_types = []
        
        # Возвращаем объект без дополнительной загрузки
        return new_promo_code
    
    async def get_applicable_equipment_ids(self, promo_code_id: int) -> List[int]:
        """Получает ID оборудования, к которому применим промокод"""
        from api.models.promo_code import promo_code_equipment_association
        
        result = await self.db.execute(
            select(promo_code_equipment_association.c.equipment_id)
            .filter(promo_code_equipment_association.c.promo_code_id == promo_code_id)
        )
        return [row[0] for row in result.fetchall()]
    
    async def get_applicable_equipment_types(self, promo_code_id: int) -> List[str]:
        """Получает типы оборудования, к которым применим промокод"""
        result = await self.db.execute(
            select(PromoCodeApplicableType.type_name)
            .filter(PromoCodeApplicableType.promo_code_id == promo_code_id)
        )
        return [row[0] for row in result.fetchall()]
    
    async def update_with_relations(
        self, 
        promo_code_id: int, 
        update_data: PromoCodeUpdate
    ) -> Optional[PromoCode]:
        """Обновляет промокод с обновлением связей"""
        promo_code = await self.get_by_id(promo_code_id)
        if not promo_code:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        # Обработка обновления связей с оборудованием
        if 'applicable_to_equipment_ids' in update_dict:
            equipment_ids = update_dict.pop('applicable_to_equipment_ids')
            if equipment_ids:
                equipment_result = await self.db.execute(
                    select(Equipment).filter(Equipment.id.in_(equipment_ids))
                )
                equipment = equipment_result.unique().scalars().all()
                if len(equipment) != len(equipment_ids):
                    raise ValueError("Некоторые виды оборудования не найдены")
                promo_code.applicable_equipment = equipment
            else:
                promo_code.applicable_equipment = []
        
        # Обработка обновления связей с типами оборудования
        if 'applicable_to_equipment_types' in update_dict:
            equipment_types = update_dict.pop('applicable_to_equipment_types')
            if equipment_types:
                promo_code.applicable_types = [
                    PromoCodeApplicableType(type_name=t) for t in equipment_types
                ]
            else:
                promo_code.applicable_types = []
        
        # Обновление остальных полей
        for key, value in update_dict.items():
            setattr(promo_code, key, value)
        
        # Сохраняем изменения
        await self.db.flush()
        
        # Загружаем объект с предзагруженными связями
        result = await self.db.execute(
            select(PromoCode)
            .filter(PromoCode.id == promo_code.id)
            .options(
                joinedload(PromoCode.creator),
                selectinload(PromoCode.applicable_equipment),
                selectinload(PromoCode.applicable_types),
            )
        )
        return result.unique().scalars().first()
    
    async def get_user_usage_count(self, user_id: int, promo_code_id: int) -> int:
        """Количество использований промокода пользователем (счётчик в строке usages)"""
        from api.models.promo_code import promo_code_usages

        result = await self.db.execute(
            select(promo_code_usages.c.usage_count)
            .where(
                promo_code_usages.c.user_id == user_id,
                promo_code_usages.c.promo_code_id == promo_code_id,
            )
        )
        return result.scalar() or 0
    
    async def record_promo_code_usage(
        self,
        user_id: int,
        promo_code_id: int,
        used_at: datetime,
        max_uses_per_user: Optional[int] = None,
    ) -> None:
        """Записывает использование промокода пользователем.

        Upsert по PK (user_id, promo_code_id): первая запись создаёт строку,
        повторные использования инкрементируют счётчик usage_count — так
        max_uses_per_user > 1 физически возможен. Инкремент условный:
        при исчерпанном лимите строка не меняется, RETURNING пуст — бросаем
        PromoCodeUserUsageLimitError (защита от гонки мимо валидатора).
        """
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        from api.models.promo_code import promo_code_usages
        from api.services.promo_code.exceptions import PromoCodeUserUsageLimitError

        stmt = pg_insert(promo_code_usages).values(
            user_id=user_id,
            promo_code_id=promo_code_id,
            usage_count=1,
            used_at=used_at,
        ).returning(promo_code_usages.c.usage_count)

        conflict_where = (
            promo_code_usages.c.usage_count < max_uses_per_user
            if max_uses_per_user is not None
            else None
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[promo_code_usages.c.user_id, promo_code_usages.c.promo_code_id],
            set_={
                "usage_count": promo_code_usages.c.usage_count + 1,
                "used_at": used_at,
            },
            where=conflict_where,
        )

        result = await self.db.execute(stmt)
        if result.first() is None:
            raise PromoCodeUserUsageLimitError()
    
    async def increment_usage_counter(self, promo_code_id: int) -> bool:
        """Увеличивает счетчик использований промокода (атомарно на стороне БД).

        Инкремент условный: не выходит за max_uses. Возвращает False, если
        лимит исчерпан (параллельные заказы больше не могут «протолкнуться»
        мимо предварительной валидации).
        """
        from sqlalchemy import update
        from api.models.promo_code import PromoCode

        result = await self.db.execute(
            update(PromoCode)
            .where(
                PromoCode.id == promo_code_id,
                (PromoCode.max_uses.is_(None)) | (PromoCode.times_used < PromoCode.max_uses),
            )
            .values(times_used=PromoCode.times_used + 1)
        )
        return (result.rowcount or 0) > 0

    async def decrement_usage_counter(self, promo_code_id: int) -> None:
        """Уменьшает счетчик использований промокода (не ниже нуля, атомарно).

        Используется при отмене резерва/удалении аренды, чтобы освобождать
        лимит промокода.
        """
        from sqlalchemy import update
        from api.models.promo_code import PromoCode

        await self.db.execute(
            update(PromoCode)
            .where(PromoCode.id == promo_code_id, PromoCode.times_used > 0)
            .values(times_used=PromoCode.times_used - 1)
        )

    async def remove_latest_promo_code_usage(self, user_id: int, promo_code_id: int) -> None:
        """Освобождает одно использование промокода пользователем.

        Счётчик usage_count уменьшается; строка удаляется, когда счётчик
        достигает нуля. UPDATE по несуществующей строке даёт rowcount=0 —
        в этом случае DELETE просто no-op.
        """
        from sqlalchemy import update
        from api.models.promo_code import promo_code_usages

        result = await self.db.execute(
            update(promo_code_usages)
            .where(
                promo_code_usages.c.user_id == user_id,
                promo_code_usages.c.promo_code_id == promo_code_id,
                promo_code_usages.c.usage_count > 1,
            )
            .values(usage_count=promo_code_usages.c.usage_count - 1)
        )
        if (result.rowcount or 0) == 0:
            await self.db.execute(
                promo_code_usages.delete().where(
                    promo_code_usages.c.user_id == user_id,
                    promo_code_usages.c.promo_code_id == promo_code_id,
                )
            )

    async def delete(self, promo_code_id: int) -> bool:
        """
        Удаление промокода по ID.
        
        Args:
            promo_code_id: ID промокода для удаления
            
        Returns:
            True, если промокод был удален, False, если не найден
        """
        import logging
        logging.info(f"🗑️ [PromoCodeRepository.delete] Удаляем промокод с ID {promo_code_id}")
        
        # Получаем промокод
        promo_code = await self.get_by_id(promo_code_id)
        if not promo_code:
            logging.warning(f"❌ [PromoCodeRepository.delete] Промокод с ID {promo_code_id} не найден")
            return False
        
        # Удаляем промокод
        await self.db.delete(promo_code)
        await self.db.flush()  # Применяем удаление без коммита
        
        logging.info(f"✅ [PromoCodeRepository.delete] Промокод с ID {promo_code_id} удален")
        return True
