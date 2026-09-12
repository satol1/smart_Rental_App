# api/repositories/accessory_repository.py

from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from fastapi import HTTPException
from api.models.accessory import Accessory
from api.models.reservation import ReservationAccessory, Reservation
from api.models.rental import RentalAccessory, Rental
from shared.schemas.accessory_schema import AccessoryCreate, AccessoryUpdate
from .base_repository import BaseRepository

class AccessoryRepository(BaseRepository[Accessory, AccessoryCreate, AccessoryUpdate]):
    """
    Репозиторий для работы с аксессуарами.
    Наследует базовые CRUD операции от BaseRepository.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Инициализация репозитория аксессуаров.
        
        Args:
            db: Асинхронная сессия базы данных
        """
        super().__init__(db, model=Accessory)
    
    # Белый список колонок сортировки списка аксессуаров
    SORT_COLUMNS = {
        "id": Accessory.id,
        "name": Accessory.name,
        "type": Accessory.accessory_type,
        "price": Accessory.price,
    }

    async def get_all_paginated(
        self,
        skip: int,
        limit: int,
        search: str | None = None,
        sort_by: str = "name",
        sort_order: str = "asc",
    ) -> Tuple[List[Accessory], int]:
        """
        Получение всех аксессуаров с пагинацией и опциональным поиском.

        Выполняет два асинхронных запроса:
        1. Подсчет общего количества аксессуаров (с учётом фильтра)
        2. Получение страницы аксессуаров с offset и limit

        Args:
            skip: Количество записей для пропуска (offset)
            limit: Максимальное количество записей для возврата
            search: Подстрока для поиска по названию/типу (регистронезависимо)

        Returns:
            Кортеж, содержащий список объектов Accessory и общее количество
        """
        search_filter = None
        # Пустая/пробельная строка после strip не должна превращаться в шаблон "%%"
        # (он отсекал бы строки с NULL в accessory_type)
        if search and search.strip():
            pattern = f"%{search.strip()}%"
            search_filter = or_(
                Accessory.name.ilike(pattern),
                Accessory.accessory_type.ilike(pattern),
            )

        count_query = select(func.count(Accessory.id))
        sort_column = self.SORT_COLUMNS.get(sort_by, Accessory.name)
        order_expr = sort_column.desc() if sort_order == "desc" else sort_column.asc()
        # id — tie-breaker для стабильной пагинации
        page_query = select(Accessory).order_by(order_expr, Accessory.id)
        if search_filter is not None:
            count_query = count_query.where(search_filter)
            page_query = page_query.where(search_filter)

        count_result = await self.db.execute(count_query)
        total_count = count_result.scalar()

        accessories_result = await self.db.execute(
            page_query
            .offset(skip)
            .limit(limit)
        )
        accessories = accessories_result.scalars().all()

        return accessories, total_count
    
    async def get_by_ids(self, accessory_ids: List[int]) -> List[Accessory]:
        """Получает аксессуары по списку ID."""
        if not accessory_ids:
            return []
        
        result = await self.db.execute(
            select(Accessory).filter(Accessory.id.in_(accessory_ids))
        )
        return result.scalars().all()
    
    async def check_usage_and_delete(self, accessory_id: int) -> None:
        """
        Проверяет использование аксессуара в активных резервах и арендах,
        и удаляет его, если нет конфликтов.
        
        Args:
            accessory_id: ID аксессуара для удаления
            
        Raises:
            HTTPException: 404 если аксессуар не найден
            HTTPException: 409 если аксессуар используется в активных резервах/арендах
        """
        # Находим аксессуар по ID
        accessory = await self.get_by_id(accessory_id)
        if not accessory:
            raise HTTPException(status_code=404, detail="Аксессуар не найден")

        # Проверяем активные резервы
        active_reservations_query = (
            select(func.count(Reservation.id))
            .join(ReservationAccessory, Reservation.id == ReservationAccessory.reservation_id)
            .where(ReservationAccessory.accessory_id == accessory_id)
            .where(Reservation.status == 'active')
        )
        active_reservations_count = (await self.db.execute(active_reservations_query)).scalar_one()

        # Проверяем активные аренды
        active_rentals_query = (
            select(func.count(Rental.id))
            .join(RentalAccessory, Rental.id == RentalAccessory.rental_id)
            .where(RentalAccessory.accessory_id == accessory_id)
            .where(or_(Rental.status == 'active', Rental.status == 'overdue'))
        )
        active_rentals_count = (await self.db.execute(active_rentals_query)).scalar_one()

        # Если есть конфликты, выбрасываем ошибку
        if active_reservations_count > 0 or active_rentals_count > 0:
            error_detail = (
                f"Невозможно удалить аксессуар. Он используется в "
                f"{active_reservations_count} активных резервах и "
                f"{active_rentals_count} активных арендах."
            )
            raise HTTPException(status_code=409, detail=error_detail)

        # Если конфликтов нет, удаляем аксессуар
        await self.db.delete(accessory)
