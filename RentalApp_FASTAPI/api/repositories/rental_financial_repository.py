# api/repositories/rental_financial_repository.py

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
import logging
from typing import TYPE_CHECKING

from .rental_base_repository import RentalBaseRepository
from api.models.rental import Rental

if TYPE_CHECKING:
    from api.services.financial_service import FinancialService

logger = logging.getLogger(__name__)


class RentalFinancialRepository(RentalBaseRepository):
    """
    Репозиторий для финансовых расчетов аренд.
    Содержит методы для расчета кредитов, штрафов и других финансовых операций.
    """

    def __init__(self, db: AsyncSession, financial_service: "FinancialService"):
        super().__init__(db)
        self.financial_service = financial_service

    async def calculate_early_return_credit(self, rental: Rental, actual_return_date: date, planned_days: int) -> float:
        """
        Рассчитывает кредит за досрочный возврат аренды.
        
        Args:
            rental: Объект аренды
            actual_return_date: Фактическая дата возврата
            planned_days: Запланированное количество дней
            
        Returns:
            Сумма кредита
        """
        return await self.financial_service.calculate_early_return_credit(rental, actual_return_date, planned_days)

    async def calculate_overdue_surcharge(self, rental: Rental, actual_return_date: date) -> float:
        """
        Рассчитывает штраф за просроченные дни аренды.
        
        Args:
            rental: Объект аренды
            actual_return_date: Фактическая дата возврата
            
        Returns:
            Сумма штрафа
        """
        return await self.financial_service.calculate_overdue_surcharge(rental, actual_return_date)
