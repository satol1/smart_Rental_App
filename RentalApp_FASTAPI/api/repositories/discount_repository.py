# api/repositories/discount_repository.py

from typing import List, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from fastapi import HTTPException

from api.models.discount import DurationDiscount
from shared.schemas.discount_schema import DiscountCreate, DiscountUpdate
from .base_repository import BaseRepository


class DiscountRepository(BaseRepository[DurationDiscount, DiscountCreate, DiscountUpdate]):
    """
    Репозиторий для работы со скидками за длительность.
    Наследует базовые CRUD операции от BaseRepository.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Инициализация репозитория скидок.
        
        Args:
            db: Асинхронная сессия базы данных
        """
        super().__init__(db, model=DurationDiscount)
    
    async def get_all_paginated(self, skip: int, limit: int) -> Tuple[List[DurationDiscount], int]:
        """
        Получение всех скидок с пагинацией.
        
        Выполняет два асинхронных запроса:
        1. Подсчет общего количества скидок
        2. Получение страницы скидок с offset и limit
        
        Args:
            skip: Количество записей для пропуска (offset)
            limit: Максимальное количество записей для возврата
            
        Returns:
            Кортеж, содержащий список объектов DurationDiscount и общее количество
        """
        # Первый запрос: подсчет общего количества скидок
        count_result = await self.db.execute(
            select(func.count(DurationDiscount.id))
        )
        total_count = count_result.scalar_one()
        
        # Второй запрос: получение страницы скидок с сортировкой по min_days
        discounts_result = await self.db.execute(
            select(DurationDiscount)
            .order_by(DurationDiscount.min_days)
            .offset(skip)
            .limit(limit)
        )
        discounts = discounts_result.scalars().all()
        
        return discounts, total_count
    
    async def find_by_min_days(self, min_days: int) -> Optional[DurationDiscount]:
        """
        Поиск скидки по минимальному количеству дней.
        
        Args:
            min_days: Минимальное количество дней для поиска
            
        Returns:
            Объект DurationDiscount или None, если не найден
        """
        result = await self.db.execute(
            select(DurationDiscount).filter(DurationDiscount.min_days == min_days)
        )
        return result.scalars().first()
    
    async def create(self, data: DiscountCreate) -> DurationDiscount:
        """
        Создание новой скидки с проверкой уникальности min_days.
        
        Args:
            data: Данные для создания скидки
            
        Returns:
            Созданный объект DurationDiscount
            
        Raises:
            HTTPException: 409 если скидка с таким min_days уже существует
        """
        # Проверяем уникальность min_days
        existing = await self.find_by_min_days(data.min_days)
        if existing:
            raise HTTPException(
                status_code=409, 
                detail=f"Скидка для {data.min_days} дней уже существует."
            )
        
        # Создаем новую скидку через базовый метод
        return await super().create(data)
    
    async def update(self, db_obj: DurationDiscount, update_data: DiscountUpdate) -> DurationDiscount:
        """
        Обновление существующей скидки с проверкой уникальности min_days.
        
        Args:
            db_obj: Существующий объект скидки
            update_data: Данные для обновления
            
        Returns:
            Обновленный объект DurationDiscount
            
        Raises:
            HTTPException: 409 если скидка с таким min_days уже существует (исключая текущую)
        """
        # Проверяем уникальность min_days (исключая обновляемую запись)
        if update_data.min_days != db_obj.min_days:
            existing = await self.find_by_min_days(update_data.min_days)
            if existing and existing.id != db_obj.id:
                raise HTTPException(
                    status_code=409, 
                    detail=f"Скидка для {update_data.min_days} дней уже существует."
                )
        
        # Обновляем скидку через базовый метод
        return await super().update(db_obj, update_data)
    
    async def find_for_days(self, days: int) -> Optional[DurationDiscount]:
        """
        Находит наиболее подходящую скидку для заданного количества дней.
        
        Ищет скидку, где min_days не превышает количество дней аренды.
        Сортирует по убыванию, чтобы найти самую большую подходящую скидку.
        
        Args:
            days: Количество дней аренды
            
        Returns:
            Объект DurationDiscount или None, если подходящая скидка не найдена
        """
        if days <= 0:
            return None
        
        result = await self.db.execute(
            select(DurationDiscount)
            .filter(DurationDiscount.min_days <= days)
            .order_by(desc(DurationDiscount.min_days))
        )
        return result.scalars().first()
    
    async def delete(self, discount_id: int) -> None:
        """
        Удаление скидки по ID.
        
        Args:
            discount_id: ID скидки для удаления
        """
        discount = await self.get_by_id(discount_id)
        if discount:
            await self.db.delete(discount)
            await self.db.flush()