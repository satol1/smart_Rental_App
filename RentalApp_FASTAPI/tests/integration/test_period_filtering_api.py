"""
Integration тесты для API эндпоинтов с фильтрацией по периодам
"""

import pytest
from httpx import AsyncClient
from datetime import date, timedelta
from api.models.user import User
from api.models.reservation import Reservation
from api.models.rental import Rental
from api.models.equipment import Equipment
from shared.constants.order_status import OrderStatus


class TestPeriodFilteringAPI:
    """Тесты API эндпоинтов с фильтрацией по периодам"""

    @pytest.fixture
    async def test_user(self, db_session):
        """Создает тестового пользователя"""
        user = User(
            full_name="Test User",
            email="test@example.com",
            phone="+1234567890",
            telegram="@testuser"
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    @pytest.fixture
    async def test_equipment(self, db_session):
        """Создает тестовое оборудование"""
        equipment = Equipment(
            name="Test Equipment",
            type="camera",
            brand_system_id=1,
            daily_rate=100.0,
            is_available=True
        )
        db_session.add(equipment)
        await db_session.commit()
        await db_session.refresh(equipment)
        return equipment

    @pytest.fixture
    async def test_reservations(self, db_session, test_user: User):
        """Создает тестовые резервации"""
        today = date.today()
        
        reservations = [
            Reservation(
                user_id=test_user.id,
                start_date=today,
                end_date=today + timedelta(days=2),
                status=OrderStatus.ACTIVE,
                total_amount=300.0
            ),
            Reservation(
                user_id=test_user.id,
                start_date=today - timedelta(days=10),
                end_date=today - timedelta(days=8),
                status=OrderStatus.COMPLETED,
                total_amount=200.0
            ),
            Reservation(
                user_id=test_user.id,
                start_date=today + timedelta(days=10),
                end_date=today + timedelta(days=12),
                status=OrderStatus.ACTIVE,
                total_amount=300.0
            )
        ]
        
        for reservation in reservations:
            db_session.add(reservation)
        
        await db_session.commit()
        
        for reservation in reservations:
            await db_session.refresh(reservation)
        
        return reservations

    @pytest.fixture
    async def test_rentals(self, db_session, test_user: User):
        """Создает тестовые аренды"""
        today = date.today()
        
        rentals = [
            Rental(
                user_id=test_user.id,
                start_date=today,
                end_date=today + timedelta(days=2),
                status=OrderStatus.ACTIVE,
                total_amount=300.0
            ),
            Rental(
                user_id=test_user.id,
                start_date=today - timedelta(days=10),
                end_date=today - timedelta(days=8),
                status=OrderStatus.COMPLETED,
                total_amount=200.0
            ),
            Rental(
                user_id=test_user.id,
                start_date=today + timedelta(days=10),
                end_date=today + timedelta(days=12),
                status=OrderStatus.ACTIVE,
                total_amount=300.0
            )
        ]
        
        for rental in rentals:
            db_session.add(rental)
        
        await db_session.commit()
        
        for rental in rentals:
            await db_session.refresh(rental)
        
        return rentals

    async def test_get_reservations_with_week_filter(self, client: AsyncClient, test_reservations):
        """Тест получения резерваций с фильтром по неделе"""
        response = await client.get(
            "/admin/reservations/",
            params={"period_type": "week", "period_offset": 0}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert data["total"] == 1  # Только одна резервация в текущей неделе

    async def test_get_reservations_with_month_filter(self, client: AsyncClient, test_reservations):
        """Тест получения резерваций с фильтром по месяцу"""
        response = await client.get(
            "/admin/reservations/",
            params={"period_type": "month", "period_offset": 0}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert data["total"] == 2  # Две резервации в текущем месяце

    async def test_get_reservations_with_quarter_filter(self, client: AsyncClient, test_reservations):
        """Тест получения резерваций с фильтром по кварталу"""
        response = await client.get(
            "/admin/reservations/",
            params={"period_type": "quarter", "period_offset": 0}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert data["total"] == 2  # Две резервации в текущем квартале

    async def test_get_reservations_with_year_filter(self, client: AsyncClient, test_reservations):
        """Тест получения резерваций с фильтром по году"""
        response = await client.get(
            "/admin/reservations/",
            params={"period_type": "year", "period_offset": 0}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert data["total"] == 3  # Все три резервации в текущем году

    async def test_get_reservations_with_previous_week_filter(self, client: AsyncClient, test_reservations):
        """Тест получения резерваций с фильтром по предыдущей неделе"""
        response = await client.get(
            "/admin/reservations/",
            params={"period_type": "week", "period_offset": -1}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert data["total"] == 1  # Одна резервация в предыдущей неделе

    async def test_get_rentals_with_week_filter(self, client: AsyncClient, test_rentals):
        """Тест получения аренд с фильтром по неделе"""
        response = await client.get(
            "/admin/rentals/",
            params={"period_type": "week", "period_offset": 0}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert data["total"] == 1  # Только одна аренда в текущей неделе

    async def test_get_rentals_with_month_filter(self, client: AsyncClient, test_rentals):
        """Тест получения аренд с фильтром по месяцу"""
        response = await client.get(
            "/admin/rentals/",
            params={"period_type": "month", "period_offset": 0}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert data["total"] == 2  # Две аренды в текущем месяце

    async def test_get_reservations_combined_filters(self, client: AsyncClient, test_reservations):
        """Тест комбинированной фильтрации резерваций"""
        response = await client.get(
            "/admin/reservations/",
            params={
                "period_type": "month",
                "period_offset": 0,
                "status": "active"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert data["total"] == 1  # Одна активная резервация в текущем месяце

    async def test_get_reservations_with_search_and_period(self, client: AsyncClient, test_reservations, test_user: User):
        """Тест фильтрации резерваций по поиску и периоду"""
        response = await client.get(
            "/admin/reservations/",
            params={
                "period_type": "month",
                "period_offset": 0,
                "search": test_user.full_name
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert data["total"] == 2  # Две резервации пользователя в текущем месяце

    async def test_get_reservations_invalid_period_type(self, client: AsyncClient, test_reservations):
        """Тест с недопустимым типом периода"""
        response = await client.get(
            "/admin/reservations/",
            params={"period_type": "invalid", "period_offset": 0}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Должны вернуться все резервации (без фильтрации по периоду)
        assert "items" in data
        assert "total" in data
        assert data["total"] == 3

    async def test_get_reservations_no_period_filter(self, client: AsyncClient, test_reservations):
        """Тест без фильтра по периоду"""
        response = await client.get("/admin/reservations/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert data["total"] == 3  # Все резервации

    async def test_get_reservations_pagination_with_period(self, client: AsyncClient, test_reservations):
        """Тест пагинации с фильтром по периоду"""
        # Первая страница
        response1 = await client.get(
            "/admin/reservations/",
            params={
                "period_type": "month",
                "period_offset": 0,
                "skip": 0,
                "limit": 1
            }
        )
        
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Вторая страница
        response2 = await client.get(
            "/admin/reservations/",
            params={
                "period_type": "month",
                "period_offset": 0,
                "skip": 1,
                "limit": 1
            }
        )
        
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Общее количество должно быть одинаковым
        assert data1["total"] == data2["total"]
        assert data1["total"] == 2
        
        # Первая страница должна содержать 1 элемент
        assert len(data1["items"]) == 1
        
        # Вторая страница должна содержать 1 элемент
        assert len(data2["items"]) == 1
        
        # ID не должны пересекаться
        page1_ids = {item["id"] for item in data1["items"]}
        page2_ids = {item["id"] for item in data2["items"]}
        assert page1_ids.isdisjoint(page2_ids)

    async def test_get_rentals_combined_filters(self, client: AsyncClient, test_rentals):
        """Тест комбинированной фильтрации аренд"""
        response = await client.get(
            "/admin/rentals/",
            params={
                "period_type": "month",
                "period_offset": 0,
                "status": "active"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert data["total"] == 1  # Одна активная аренда в текущем месяце

    async def test_period_filtering_edge_cases(self, client: AsyncClient, test_reservations):
        """Тест граничных случаев фильтрации по периодам"""
        # Тест с большим смещением
        response = await client.get(
            "/admin/reservations/",
            params={"period_type": "year", "period_offset": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Должно вернуться 0 резерваций (будущий год)
        assert data["total"] == 0
        assert len(data["items"]) == 0

    async def test_period_filtering_negative_offset(self, client: AsyncClient, test_reservations):
        """Тест с отрицательным смещением"""
        response = await client.get(
            "/admin/reservations/",
            params={"period_type": "year", "period_offset": -1}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Должно вернуться 0 резерваций (прошлый год)
        assert data["total"] == 0
        assert len(data["items"]) == 0

    async def test_api_response_structure(self, client: AsyncClient, test_reservations):
        """Тест структуры ответа API"""
        response = await client.get(
            "/admin/reservations/",
            params={"period_type": "week", "period_offset": 0}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Проверяем структуру ответа
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        assert isinstance(data["total"], int)
        
        # Если есть элементы, проверяем их структуру
        if data["items"]:
            item = data["items"][0]
            assert "id" in item
            assert "start_date" in item
            assert "end_date" in item
            assert "status" in item
            assert "user" in item
