# api/services/dashboard/kpi_service.py

from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from shared.schemas.dashboard_schema import KpiData
from api.repositories.statistics_repository import StatisticsRepository
from .base import BaseDashboardService


class KpiService(BaseDashboardService):
    """Сервис для расчета KPI метрик панели управления."""
    
    def __init__(self, db: AsyncSession, statistics_repo: StatisticsRepository):
        self.db = db
        self.statistics_repo = statistics_repo
    
    async def get_total_users(self) -> int:
        """Получает общее количество пользователей."""
        return await self.statistics_repo.get_user_count()

    async def get_active_users(self) -> int:
        """Получает количество активных пользователей (с резервациями или арендами за последние 30 дней)."""
        return await self.statistics_repo.get_active_users_count()

    async def get_total_equipment(self) -> int:
        """Получает общее количество оборудования."""
        return await self.statistics_repo.get_equipment_count()

    async def get_total_reservations(self) -> int:
        """Получает общее количество резерваций."""
        return await self.statistics_repo.get_reservations_count()

    async def get_revenue_today(self) -> float:
        """Получает доход за сегодня."""
        return await self.statistics_repo.get_revenue_today()

    async def get_revenue_this_month(self) -> float:
        """Получает доход за текущий месяц."""
        return await self.statistics_repo.get_revenue_this_month()

    async def get_occupancy_rate(self) -> float:
        """Рассчитывает коэффициент загруженности оборудования."""
        return await self.statistics_repo.get_occupancy_rate()

    async def get_avg_rental_duration(self) -> float:
        """Рассчитывает среднюю продолжительность аренды в днях."""
        return await self.statistics_repo.get_avg_rental_duration()

    async def get_active_reservations(self) -> int:
        """Получает количество активных (незавершенных и непросроченных) резервов."""
        return await self.statistics_repo.get_active_reservations_count()

    async def get_total_rentals(self) -> int:
        """Получает общее количество аренд."""
        return await self.statistics_repo.get_rentals_count()

    async def get_active_rentals(self) -> int:
        """Получает количество активных (незавершенных) аренд."""
        return await self.statistics_repo.get_active_rentals_count()

    async def get_overdue_rentals_count(self) -> int:
        """Получает количество просроченных аренд."""
        return await self.statistics_repo.get_overdue_rentals_count()

    async def get_total_accessories(self) -> int:
        """Получает общее количество аксессуаров."""
        return await self.statistics_repo.get_accessories_count()

    async def get_total_associations(self) -> int:
        """Получает общее количество ассоциаций."""
        return await self.statistics_repo.get_associations_count()

    async def get_kpi_data(self) -> KpiData:
        """Получает все KPI данные параллельно."""
        # Выполняем все KPI запросы параллельно
        results = await asyncio.gather(
            self.get_total_users(),
            self.get_active_users(),
            self.get_total_equipment(),
            self.get_total_reservations(),
            self.get_revenue_today(),
            self.get_revenue_this_month(),
            self.get_occupancy_rate(),
            self.get_avg_rental_duration(),
            # +++ Добавляем вызовы новых методов +++
            self.get_active_reservations(),
            self.get_total_rentals(),
            self.get_active_rentals(),
            self.get_overdue_rentals_count(),
            self.get_total_accessories(),
            self.get_total_associations()
        )
        
        return KpiData(
            total_users=results[0],
            active_users=results[1],
            total_equipment=results[2],
            total_reservations=results[3],
            revenue_today=results[4],
            revenue_this_month=results[5],
            occupancy_rate=results[6],
            avg_rental_duration=results[7],
            # +++ Добавляем новые поля в ответ +++
            active_reservations=results[8],
            total_rentals=results[9],
            active_rentals=results[10],
            overdue_rentals=results[11],
            total_accessories=results[12],
            total_associations=results[13]
        )
