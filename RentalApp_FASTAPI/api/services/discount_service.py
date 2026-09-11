# api/services/discount_service.py

from api.repositories.discount_repository import DiscountRepository
from shared.schemas.discount_schema import DiscountCreate, DiscountUpdate, DiscountOut, DiscountListResponse
from api.models.discount import DurationDiscount
from typing import List, Tuple


class DiscountService:
    """
    Сервис для работы со скидками.
    Инкапсулирует бизнес-логику работы со скидками и управление транзакциями.
    """
    
    def __init__(self, discount_repo: DiscountRepository):
        self.discount_repo = discount_repo

    async def get_duration_discount_percentage(self, days: int) -> int:
        """
        Получает процент скидки за длительность аренды.
        Находит наиболее подходящую скидку для заданного количества дней.
        """
        discount_rule = await self.discount_repo.find_for_days(days)

        if discount_rule:
            return discount_rule.discount_percentage

        return 0

    async def get_all_paginated(self, skip: int, limit: int) -> DiscountListResponse:
        """
        Получить список всех скидок с пагинацией.
        """
        discounts, total_discounts = await self.discount_repo.get_all_paginated(skip, limit)
        
        return DiscountListResponse(
            items=[DiscountOut.model_validate(discount) for discount in discounts],
            total=total_discounts
        )

    async def create_discount(self, data: DiscountCreate) -> DurationDiscount:
        """
        Создать новую скидку.
        """
        new_discount = await self.discount_repo.create(data)
        await self.discount_repo.save()  # flush в общей транзакции; commit выполняет middleware
        return new_discount

    async def update_discount(self, discount_id: int, data: DiscountUpdate) -> DurationDiscount:
        """
        Обновить существующую скидку.
        """
        discount = await self.discount_repo.get_by_id(discount_id)
        if not discount:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Скидка не найдена.")

        updated_discount = await self.discount_repo.update(discount, data)
        await self.discount_repo.save()  # flush в общей транзакции; commit выполняет middleware
        return updated_discount

    async def delete_discount(self, discount_id: int) -> None:
        """
        Удалить скидку.
        """
        discount = await self.discount_repo.get_by_id(discount_id)
        if not discount:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Скидка не найдена.")

        await self.discount_repo.delete(discount_id)
        await self.discount_repo.save()  # flush в общей транзакции; commit выполняет middleware