"""
Integration тесты для фильтрации по временным периодам
"""

import pytest
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from shared.services.period_service import PeriodService
from api.repositories.reservation_filter_repository import ReservationFilterRepository
from api.repositories.rental_query_repository import RentalQueryRepository
from api.models.reservation import Reservation
from api.models.rental import Rental
from api.models.user import User
from api.models.equipment import Equipment
from shared.constants.order_status import OrderStatus

# Модуль работает с реальной БД: не должен собираться в CI-прогоне без БД
pytestmark = pytest.mark.integration


class TestPeriodFiltering:
    """Тесты фильтрации по временным периодам"""

    @pytest.fixture
    async def period_service(self):
        """Фикстура для PeriodService"""
        return PeriodService()

    @pytest.fixture
    async def test_user(self, db_session: AsyncSession):
        """Создает тестового пользователя"""
        user = User(
            full_name="Test User",
            email="test@example.com",
            phone="+1234567890"
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    @pytest.fixture
    async def test_equipment(self, db_session: AsyncSession):
        """Создает тестовое оборудование"""
        # Поля модели: equipment_type/brand; is_available не существует
        equipment = Equipment(
            name="Test Equipment",
            equipment_type="camera",
            brand="Test Brand",
            daily_rate=100.0
        )
        db_session.add(equipment)
        await db_session.commit()
        await db_session.refresh(equipment)
        return equipment

    @pytest.fixture
    async def test_reservations(self, db_session: AsyncSession, test_user: User, test_equipment: Equipment):
        """Создает тестовые резервации с разными датами"""
        today = date.today()
        
        # Резервация в текущей неделе
        reservation_current_week = Reservation(
            user_id=test_user.id,
            start_date=today,
            end_date=today + timedelta(days=2),
            status=OrderStatus.ACTIVE,
            total_cost=300.0
        )
        
        # Резервация в предыдущей неделе
        reservation_prev_week = Reservation(
            user_id=test_user.id,
            start_date=today - timedelta(days=10),
            end_date=today - timedelta(days=8),
            status=OrderStatus.COMPLETED,
            total_cost=200.0
        )
        
        # Резервация в следующей неделе
        reservation_next_week = Reservation(
            user_id=test_user.id,
            start_date=today + timedelta(days=10),
            end_date=today + timedelta(days=12),
            status=OrderStatus.ACTIVE,
            total_cost=300.0
        )
        
        # Резервация в текущем месяце (но не в текущей неделе)
        reservation_current_month = Reservation(
            user_id=test_user.id,
            start_date=today + timedelta(days=15),
            end_date=today + timedelta(days=17),
            status=OrderStatus.ACTIVE,
            total_cost=300.0
        )
        
        reservations = [reservation_current_week, reservation_prev_week, 
                       reservation_next_week, reservation_current_month]
        
        for reservation in reservations:
            db_session.add(reservation)
        
        await db_session.commit()
        
        for reservation in reservations:
            await db_session.refresh(reservation)
        
        return reservations

    @pytest.fixture
    async def test_rentals(self, db_session: AsyncSession, test_user: User, test_equipment: Equipment):
        """Создает тестовые аренды с разными датами"""
        today = date.today()
        
        # Аренда в текущей неделе
        rental_current_week = Rental(
            user_id=test_user.id,
            created_by_id=test_user.id,
            start_date=today,
            end_date=today + timedelta(days=2),
            status=OrderStatus.ACTIVE,
            total_cost=300.0
        )
        
        # Аренда в предыдущей неделе
        rental_prev_week = Rental(
            user_id=test_user.id,
            created_by_id=test_user.id,
            start_date=today - timedelta(days=10),
            end_date=today - timedelta(days=8),
            status=OrderStatus.COMPLETED,
            total_cost=200.0
        )
        
        # Аренда в следующей неделе
        rental_next_week = Rental(
            user_id=test_user.id,
            created_by_id=test_user.id,
            start_date=today + timedelta(days=10),
            end_date=today + timedelta(days=12),
            status=OrderStatus.ACTIVE,
            total_cost=300.0
        )
        
        rentals = [rental_current_week, rental_prev_week, rental_next_week]
        
        for rental in rentals:
            db_session.add(rental)
        
        await db_session.commit()
        
        for rental in rentals:
            await db_session.refresh(rental)
        
        return rentals

    async def test_reservation_filter_by_current_week(self, db_session: AsyncSession, period_service: PeriodService, test_reservations):
        """Тест фильтрации резерваций по текущей неделе"""
        filter_repo = ReservationFilterRepository(db_session, period_service)
        
        # Получаем резервации текущей недели
        reservations, total = await filter_repo.get_paginated_for_admin(
            skip=0, limit=10, period_type="week", period_offset=0
        )
        
        # Должна быть только одна резервация в текущей неделе
        assert total == 1
        assert len(reservations) == 1
        assert reservations[0].status == OrderStatus.ACTIVE

    async def test_reservation_filter_by_previous_week(self, db_session: AsyncSession, period_service: PeriodService, test_reservations):
        """Тест фильтрации резерваций по предыдущей неделе"""
        filter_repo = ReservationFilterRepository(db_session, period_service)
        
        # Получаем резервации предыдущей недели
        reservations, total = await filter_repo.get_paginated_for_admin(
            skip=0, limit=10, period_type="week", period_offset=-1
        )
        
        # Должна быть одна резервация в предыдущей неделе
        assert total == 1
        assert len(reservations) == 1
        assert reservations[0].status == OrderStatus.COMPLETED

    async def test_reservation_filter_by_current_month(self, db_session: AsyncSession, period_service: PeriodService, test_reservations):
        """Тест фильтрации резерваций по текущему месяцу"""
        filter_repo = ReservationFilterRepository(db_session, period_service)
        
        # Получаем резервации текущего месяца
        reservations, total = await filter_repo.get_paginated_for_admin(
            skip=0, limit=10, period_type="month", period_offset=0
        )
        
        # Должно быть 3 резервации в текущем месяце (текущая неделя, следующая неделя, текущий месяц)
        assert total == 3
        assert len(reservations) == 3

    async def test_reservation_filter_by_quarter(self, db_session: AsyncSession, period_service: PeriodService, test_reservations):
        """Тест фильтрации резерваций по кварталу"""
        today = date.today()
        filter_repo = ReservationFilterRepository(db_session, period_service)
        
        # Получаем резервации текущего квартала
        reservations, total = await filter_repo.get_paginated_for_admin(
            skip=0, limit=10, period_type="quarter", period_offset=0
        )
        
        # Резервации текущего квартала: фиксация «3» неверна, когда previous-week
        # (today-10d) попадает в тот же квартал (например, конец августа) —
        # считаем ожидание по фактическим датам фикстуры
        def in_current_quarter(d: date) -> bool:
            return d.year == today.year and (d.month - 1) // 3 == (today.month - 1) // 3
        fixture_dates = [
            today, today - timedelta(days=10),
            today + timedelta(days=10), today + timedelta(days=15),
        ]
        expected = sum(1 for d in fixture_dates if in_current_quarter(d))
        assert total == expected
        assert len(reservations) == expected

    async def test_reservation_filter_by_year(self, db_session: AsyncSession, period_service: PeriodService, test_reservations):
        """Тест фильтрации резерваций по году"""
        filter_repo = ReservationFilterRepository(db_session, period_service)
        
        # Получаем резервации текущего года
        reservations, total = await filter_repo.get_paginated_for_admin(
            skip=0, limit=10, period_type="year", period_offset=0
        )
        
        # Должно быть 4 резервации в текущем году
        assert total == 4
        assert len(reservations) == 4

    async def test_rental_filter_by_current_week(self, db_session: AsyncSession, period_service: PeriodService, test_rentals):
        """Тест фильтрации аренд по текущей неделе"""
        query_repo = RentalQueryRepository(db_session, period_service)
        
        # Получаем аренды текущей недели
        rentals, total = await query_repo.get_paginated_for_admin(
            skip=0, limit=10, period_type="week", period_offset=0
        )
        
        # Должна быть одна аренда в текущей неделе
        assert total == 1
        assert len(rentals) == 1
        assert rentals[0].status == OrderStatus.ACTIVE

    async def test_rental_filter_by_previous_week(self, db_session: AsyncSession, period_service: PeriodService, test_rentals):
        """Тест фильтрации аренд по предыдущей неделе"""
        query_repo = RentalQueryRepository(db_session, period_service)
        
        # Получаем аренды предыдущей недели
        rentals, total = await query_repo.get_paginated_for_admin(
            skip=0, limit=10, period_type="week", period_offset=-1
        )
        
        # Должна быть одна аренда в предыдущей неделе
        assert total == 1
        assert len(rentals) == 1
        assert rentals[0].status == OrderStatus.COMPLETED

    async def test_rental_filter_by_current_month(self, db_session: AsyncSession, period_service: PeriodService, test_rentals):
        """Тест фильтрации аренд по текущему месяцу"""
        query_repo = RentalQueryRepository(db_session, period_service)
        
        # Получаем аренды текущего месяца
        rentals, total = await query_repo.get_paginated_for_admin(
            skip=0, limit=10, period_type="month", period_offset=0
        )
        
        # Должно быть 2 аренды в текущем месяце (текущая неделя, следующая неделя)
        assert total == 2
        assert len(rentals) == 2

    async def test_reservation_filter_combined_with_status(self, db_session: AsyncSession, period_service: PeriodService, test_reservations):
        """Тест комбинированной фильтрации по периоду и статусу"""
        filter_repo = ReservationFilterRepository(db_session, period_service)
        
        # Получаем только активные резервации текущей недели
        reservations, total = await filter_repo.get_paginated_for_admin(
            skip=0, limit=10, status=OrderStatus.ACTIVE, period_type="week", period_offset=0
        )
        
        # Должна быть одна активная резервация в текущей неделе
        assert total == 1
        assert len(reservations) == 1
        assert reservations[0].status == OrderStatus.ACTIVE

    async def test_reservation_filter_combined_with_search(self, db_session: AsyncSession, period_service: PeriodService, test_reservations, test_user: User):
        """Тест комбинированной фильтрации по периоду и поиску"""
        filter_repo = ReservationFilterRepository(db_session, period_service)
        
        # Получаем резервации текущего месяца с поиском по пользователю
        reservations, total = await filter_repo.get_paginated_for_admin(
            skip=0, limit=10, search_query=test_user.full_name, period_type="month", period_offset=0
        )
        
        # Должно быть 3 резервации в текущем месяце для этого пользователя
        assert total == 3
        assert len(reservations) == 3

    async def test_reservation_filter_invalid_period_type(self, db_session: AsyncSession, period_service: PeriodService, test_reservations):
        """Тест фильтрации с недопустимым типом периода"""
        filter_repo = ReservationFilterRepository(db_session, period_service)
        
        # Попытка использовать недопустимый тип периода должна не вызвать ошибку
        # но и не применить фильтрацию
        reservations, total = await filter_repo.get_paginated_for_admin(
            skip=0, limit=10, period_type="invalid", period_offset=0
        )
        
        # Должны вернуться все резервации (без фильтрации по периоду)
        assert total == 4
        assert len(reservations) == 4

    async def test_reservation_filter_no_period(self, db_session: AsyncSession, period_service: PeriodService, test_reservations):
        """Тест фильтрации без указания периода"""
        filter_repo = ReservationFilterRepository(db_session, period_service)
        
        # Получаем все резервации без фильтрации по периоду
        reservations, total = await filter_repo.get_paginated_for_admin(
            skip=0, limit=10
        )
        
        # Должны вернуться все резервации
        assert total == 4
        assert len(reservations) == 4

    async def test_period_filtering_edge_cases(self, db_session: AsyncSession, period_service: PeriodService):
        """Тест граничных случаев фильтрации по периодам"""
        filter_repo = ReservationFilterRepository(db_session, period_service)
        
        # Тест с очень большим смещением
        reservations, total = await filter_repo.get_paginated_for_admin(
            skip=0, limit=10, period_type="year", period_offset=10
        )
        
        # Должно вернуться 0 резерваций (будущий год)
        assert total == 0
        assert len(reservations) == 0

    async def test_period_filtering_pagination(self, db_session: AsyncSession, period_service: PeriodService, test_reservations):
        """Тест пагинации с фильтрацией по периодам"""
        filter_repo = ReservationFilterRepository(db_session, period_service)
        
        # Получаем первую страницу
        reservations_page1, total = await filter_repo.get_paginated_for_admin(
            skip=0, limit=2, period_type="month", period_offset=0
        )
        
        # Получаем вторую страницу
        reservations_page2, total2 = await filter_repo.get_paginated_for_admin(
            skip=2, limit=2, period_type="month", period_offset=0
        )
        
        # Общее количество должно быть одинаковым
        assert total == total2
        assert total == 3
        
        # Первая страница должна содержать 2 элемента
        assert len(reservations_page1) == 2
        
        # Вторая страница должна содержать 1 элемент
        assert len(reservations_page2) == 1
        
        # ID резерваций не должны пересекаться
        page1_ids = {r.id for r in reservations_page1}
        page2_ids = {r.id for r in reservations_page2}
        assert page1_ids.isdisjoint(page2_ids)
