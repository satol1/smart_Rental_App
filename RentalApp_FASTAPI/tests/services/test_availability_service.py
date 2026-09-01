# tests/services/test_availability_service.py
"""
Тесты для AvailabilityService - ядра функциональности проверки доступности оборудования.
Тестирует поиск конфликтов, определение статусов и работу с календарем.
"""

import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from api.services.availability.availability_service import AvailabilityService
from api.models.equipment import Equipment
from api.models.rental import Rental
from api.models.reservation import Reservation
from api.models.user import User


class TestAvailabilityService:
    """Тесты для AvailabilityService."""

    @pytest.fixture
    def availability_service(self, mock_db_session):
        """Создает экземпляр AvailabilityService с моком БД и зависимостями."""
        # Создаем моки для всех зависимостей
        mock_conflicts_service = AsyncMock()
        mock_status_service = AsyncMock()
        mock_calendar_service = AsyncMock()
        mock_query_service = AsyncMock()
        
        return AvailabilityService(
            db=mock_db_session,
            conflicts_service=mock_conflicts_service,
            status_service=mock_status_service,
            calendar_service=mock_calendar_service,
            query_service=mock_query_service
        )

    @pytest.fixture
    def sample_equipment(self):
        """Создает тестовое оборудование."""
        equipment = MagicMock(spec=Equipment)
        equipment.id = 1
        equipment.name = "Test Camera"
        equipment.is_available = True
        return equipment

    @pytest.fixture
    def sample_user(self):
        """Создает тестового пользователя."""
        user = MagicMock(spec=User)
        user.id = 1
        user.email = "test@example.com"
        return user

    @pytest.fixture
    def sample_rental(self, sample_user, sample_equipment):
        """Создает тестовую аренду."""
        rental = MagicMock(spec=Rental)
        rental.id = 1
        rental.user_id = sample_user.id
        rental.user = sample_user
        rental.start_date = date(2025, 1, 1)
        rental.end_date = date(2025, 1, 5)
        rental.equipment = [sample_equipment]
        return rental

    @pytest.fixture
    def sample_reservation(self, sample_user, sample_equipment):
        """Создает тестовый резерв."""
        reservation = MagicMock(spec=Reservation)
        reservation.id = 1
        reservation.user_id = sample_user.id
        reservation.user = sample_user
        reservation.start_date = date(2025, 1, 3)
        reservation.end_date = date(2025, 1, 7)
        reservation.equipment = [sample_equipment]
        return reservation

    # === ТЕСТЫ ДЛЯ get_conflicts ===

    @pytest.mark.asyncio
    async def test_get_conflicts_no_conflicts(self, availability_service, sample_equipment_ids, sample_dates):
        """
        Тест получения конфликтов при их отсутствии.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        
        # Настраиваем мок для возврата пустого словаря
        availability_service._conflicts_service.get_conflicts = AsyncMock(return_value={})
        
        # Act
        conflicts = await availability_service.get_conflicts(
            equipment_ids, start_date, end_date
        )

        # Assert
        assert conflicts == {}

    @pytest.mark.asyncio
    async def test_get_conflicts_with_rental_conflict(self, availability_service, sample_rental, sample_equipment_ids, sample_dates):
        """
        Тест получения конфликтов с арендой.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        
        # Настраиваем мок для возврата конфликтов с арендой
        expected_conflicts = {
            1: [{
                'type': 'rental',
                'id': sample_rental.id,
                'start_date': sample_rental.start_date,
                'end_date': sample_rental.end_date,
                'user_id': sample_rental.user_id
            }]
        }
        availability_service._conflicts_service.get_conflicts = AsyncMock(return_value=expected_conflicts)
        
        # Act
        conflicts = await availability_service.get_conflicts(
            equipment_ids, start_date, end_date
        )

        # Assert
        assert len(conflicts) == 1
        assert 1 in conflicts  # ID оборудования
        assert len(conflicts[1]) == 1
        
        conflict = conflicts[1][0]
        assert conflict['type'] == 'rental'
        assert conflict['id'] == sample_rental.id
        assert conflict['start_date'] == sample_rental.start_date
        assert conflict['end_date'] == sample_rental.end_date
        assert conflict['user_id'] == sample_rental.user_id

    @pytest.mark.asyncio
    async def test_get_conflicts_with_reservation_conflict(self, availability_service, sample_reservation, sample_equipment_ids, sample_dates):
        """
        Тест получения конфликтов с резервированием.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        
        # Настраиваем мок для возврата конфликтов с резервированием
        expected_conflicts = {
            1: [{
                'type': 'reservation',
                'id': sample_reservation.id,
                'start_date': sample_reservation.start_date,
                'end_date': sample_reservation.end_date,
                'user_id': sample_reservation.user_id
            }]
        }
        availability_service._conflicts_service.get_conflicts = AsyncMock(return_value=expected_conflicts)
        
        # Act
        conflicts = await availability_service.get_conflicts(
            equipment_ids, start_date, end_date
        )

        # Assert
        assert len(conflicts) == 1
        assert 1 in conflicts  # ID оборудования
        assert len(conflicts[1]) == 1
        
        conflict = conflicts[1][0]
        assert conflict['type'] == 'reservation'
        assert conflict['id'] == sample_reservation.id
        assert conflict['start_date'] == sample_reservation.start_date
        assert conflict['end_date'] == sample_reservation.end_date
        assert conflict['user_id'] == sample_reservation.user_id

    @pytest.mark.asyncio
    async def test_get_conflicts_with_exclude_reservation_id(self, availability_service, sample_reservation, sample_equipment_ids, sample_dates):
        """
        Тест получения конфликтов с исключением резервирования.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        exclude_reservation_id = 1
        
        # Настраиваем мок для возврата пустого словаря (резерв исключен)
        availability_service._conflicts_service.get_conflicts = AsyncMock(return_value={})
        
        # Act
        conflicts = await availability_service.get_conflicts(
            equipment_ids, start_date, end_date, exclude_reservation_id=exclude_reservation_id
        )

        # Assert
        assert conflicts == {}

    @pytest.mark.asyncio
    async def test_get_conflicts_with_exclude_rental_id(self, availability_service, sample_rental, sample_equipment_ids, sample_dates):
        """
        Тест получения конфликтов с исключением аренды.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        exclude_rental_id = 1
        
        # Настраиваем мок для возврата пустого словаря (аренда исключена)
        availability_service._conflicts_service.get_conflicts = AsyncMock(return_value={})
        
        # Act
        conflicts = await availability_service.get_conflicts(
            equipment_ids, start_date, end_date, exclude_rental_id=exclude_rental_id
        )

        # Assert
        assert conflicts == {}

    @pytest.mark.asyncio
    async def test_get_conflicts_multiple_equipment(self, availability_service, sample_rental, sample_reservation):
        """
        Тест получения конфликтов для нескольких единиц оборудования.
        """
        # Arrange
        equipment_ids = [1, 2, 3]
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 10)
        
        # Создаем дополнительное оборудование для резерва
        equipment2 = MagicMock(spec=Equipment)
        equipment2.id = 2
        equipment2.name = "Test Lens"
        sample_reservation.equipment = [equipment2]
        
        # Настраиваем мок для возврата конфликтов для нескольких единиц оборудования
        expected_conflicts = {
            1: [{
                'type': 'rental',
                'id': sample_rental.id,
                'start_date': sample_rental.start_date,
                'end_date': sample_rental.end_date,
                'user_id': sample_rental.user_id
            }],
            2: [{
                'type': 'reservation',
                'id': sample_reservation.id,
                'start_date': sample_reservation.start_date,
                'end_date': sample_reservation.end_date,
                'user_id': sample_reservation.user_id
            }]
        }
        availability_service._conflicts_service.get_conflicts = AsyncMock(return_value=expected_conflicts)
        
        # Act
        conflicts = await availability_service.get_conflicts(
            equipment_ids, start_date, end_date
        )

        # Assert
        assert len(conflicts) == 2
        assert 1 in conflicts  # Аренда
        assert 2 in conflicts  # Резерв
        assert 3 not in conflicts  # Нет конфликтов

    @pytest.mark.asyncio
    async def test_get_conflicts_empty_equipment_list(self, availability_service, sample_dates):
        """
        Тест получения конфликтов с пустым списком оборудования.
        """
        # Arrange
        equipment_ids = []
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        
        # Настраиваем мок для возврата пустого словаря
        availability_service._conflicts_service.get_conflicts = AsyncMock(return_value={})

        # Act
        conflicts = await availability_service.get_conflicts(
            equipment_ids, start_date, end_date
        )

        # Assert
        assert conflicts == {}

    # === ТЕСТЫ ДЛЯ get_conflicting_equipment_ids ===

    @pytest.mark.asyncio
    async def test_get_conflicting_equipment_ids_with_conflicts(self, availability_service, sample_rental, sample_equipment_ids, sample_dates):
        """
        Тест получения ID оборудования с конфликтами.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        
        # Настраиваем мок для возврата ID оборудования с конфликтами
        availability_service._conflicts_service.get_conflicting_equipment_ids = AsyncMock(return_value=[1])
        
        # Act
        conflicting_ids = await availability_service.get_conflicting_equipment_ids(
            equipment_ids, start_date, end_date
        )

        # Assert
        assert conflicting_ids == [1]  # ID оборудования с конфликтом

    @pytest.mark.asyncio
    async def test_get_conflicting_equipment_ids_no_conflicts(self, availability_service, sample_equipment_ids, sample_dates):
        """
        Тест получения ID оборудования без конфликтов.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        
        # Настраиваем мок для возврата пустого списка (нет конфликтов)
        availability_service._conflicts_service.get_conflicting_equipment_ids = AsyncMock(return_value=[])
        
        # Act
        conflicting_ids = await availability_service.get_conflicting_equipment_ids(
            equipment_ids, start_date, end_date
        )

        # Assert
        assert conflicting_ids == []

    # === ТЕСТЫ ДЛЯ get_availability_statuses ===

    @pytest.mark.asyncio
    async def test_get_availability_statuses_available(self, availability_service, sample_equipment_ids, sample_dates):
        """
        Тест получения статусов доступности для доступного оборудования.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        
        # Настраиваем мок для возврата статусов доступного оборудования
        expected_statuses = {
            1: {"status": "available", "details": "Доступно"},
            2: {"status": "available", "details": "Доступно"},
            3: {"status": "available", "details": "Доступно"}
        }
        availability_service._status_service.get_availability_statuses = AsyncMock(return_value=expected_statuses)
        
        # Act
        statuses = await availability_service.get_availability_statuses(
            equipment_ids, start_date, end_date
        )

        # Assert
        assert len(statuses) == 3
        for eq_id in equipment_ids:
            assert eq_id in statuses
            assert statuses[eq_id]['status'] == 'available'
            assert statuses[eq_id]['details'] == 'Доступно'

    @pytest.mark.asyncio
    async def test_get_availability_statuses_rented(self, availability_service, sample_rental, sample_equipment_ids, sample_dates):
        """
        Тест получения статусов доступности для арендованного оборудования.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        
        # Настраиваем мок для возврата статусов арендованного оборудования
        expected_statuses = {
            1: {
                "status": "rented", 
                "details": "В аренде до 2025-01-10",
                "start_date": sample_rental.start_date,
                "end_date": sample_rental.end_date
            },
            2: {"status": "available", "details": "Доступно"},
            3: {"status": "available", "details": "Доступно"}
        }
        availability_service._status_service.get_availability_statuses = AsyncMock(return_value=expected_statuses)
        
        # Act
        statuses = await availability_service.get_availability_statuses(
            equipment_ids, start_date, end_date
        )

        # Assert
        assert statuses[1]['status'] == 'rented'
        assert 'В аренде до' in statuses[1]['details']
        assert statuses[1]['start_date'] == sample_rental.start_date
        assert statuses[1]['end_date'] == sample_rental.end_date

    @pytest.mark.asyncio
    async def test_get_availability_statuses_reserved(self, availability_service, sample_reservation, sample_equipment_ids, sample_dates):
        """
        Тест получения статусов доступности для зарезервированного оборудования.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        
        # Настраиваем мок для возврата статусов зарезервированного оборудования
        expected_statuses = {
            1: {
                "status": "reserved", 
                "details": "Зарезервировано до 2025-01-10",
                "start_date": sample_reservation.start_date,
                "end_date": sample_reservation.end_date
            },
            2: {"status": "available", "details": "Доступно"},
            3: {"status": "available", "details": "Доступно"}
        }
        availability_service._status_service.get_availability_statuses = AsyncMock(return_value=expected_statuses)
        
        # Act
        statuses = await availability_service.get_availability_statuses(
            equipment_ids, start_date, end_date
        )

        # Assert
        assert statuses[1]['status'] == 'reserved'
        assert 'Зарезервировано до' in statuses[1]['details']
        assert statuses[1]['start_date'] == sample_reservation.start_date
        assert statuses[1]['end_date'] == sample_reservation.end_date

    # === ТЕСТЫ ДЛЯ get_daily_statuses ===

    @pytest.mark.asyncio
    async def test_get_daily_statuses_available_period(self, availability_service, sample_equipment_ids, sample_dates):
        """
        Тест получения статусов по дням для доступного периода.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        
        # Настраиваем мок для возврата ежедневных статусов
        from shared.schemas.calendar_schema import DayStatusItem
        expected_daily_statuses = {
            1: {"01.01.2025": DayStatusItem(status="available")},
            2: {"01.01.2025": DayStatusItem(status="available")},
            3: {"01.01.2025": DayStatusItem(status="available")}
        }
        availability_service._status_service.get_daily_statuses = AsyncMock(return_value=expected_daily_statuses)
        
        # Act
        daily_statuses = await availability_service.get_daily_statuses(
            equipment_ids, start_date, end_date
        )

        # Assert
        assert len(daily_statuses) == 3
        for eq_id in equipment_ids:
            assert eq_id in daily_statuses
            # Проверяем, что все дни помечены как доступные
            for day_str, status_item in daily_statuses[eq_id].items():
                assert status_item.status == 'available'

    @pytest.mark.asyncio
    async def test_get_daily_statuses_with_rental_conflict(self, availability_service, sample_rental, sample_equipment_ids, sample_dates):
        """
        Тест получения статусов по дням с конфликтом аренды.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        
        # Настраиваем мок для возврата ежедневных статусов с конфликтом аренды
        from shared.schemas.calendar_schema import DayStatusItem
        expected_daily_statuses = {
            1: {"01.01.2025": DayStatusItem(status="rented", group_id="rental-1", order_type="rental")},
            2: {"01.01.2025": DayStatusItem(status="available")},
            3: {"01.01.2025": DayStatusItem(status="available")}
        }
        availability_service._status_service.get_daily_statuses = AsyncMock(return_value=expected_daily_statuses)
        
        # Act
        daily_statuses = await availability_service.get_daily_statuses(
            equipment_ids, start_date, end_date
        )

        # Assert
        assert 1 in daily_statuses
        # Проверяем, что дни аренды помечены как 'rented'
        rental_days = daily_statuses[1]
        for day_str, status_item in rental_days.items():
            if status_item.status == 'rented':
                assert status_item.group_id == 'rental-1'
                assert status_item.order_type == 'rental'

    @pytest.mark.asyncio
    async def test_get_daily_statuses_with_user_reservation(self, availability_service, sample_reservation, sample_equipment_ids, sample_dates):
        """
        Тест получения статусов по дням с резервированием текущего пользователя.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        current_user_id = 1  # Тот же пользователь, что и в резерве
        
        # Настраиваем мок для возврата ежедневных статусов с резервированием пользователя
        from shared.schemas.calendar_schema import DayStatusItem
        expected_daily_statuses = {
            1: {"01.01.2025": DayStatusItem(status="reserved", is_user_reservation=True, user_id=1)},
            2: {"01.01.2025": DayStatusItem(status="available")},
            3: {"01.01.2025": DayStatusItem(status="available")}
        }
        availability_service._status_service.get_daily_statuses = AsyncMock(return_value=expected_daily_statuses)
        
        # Act
        daily_statuses = await availability_service.get_daily_statuses(
            equipment_ids, start_date, end_date, current_user_id=current_user_id
        )

        # Assert
        assert 1 in daily_statuses
        # Проверяем, что резервирование пользователя помечено соответствующим образом
        reservation_days = daily_statuses[1]
        for day_str, status_item in reservation_days.items():
            if status_item.status == 'reserved':
                assert status_item.is_user_reservation == True
                assert status_item.user_id == 1

    # === ТЕСТЫ ДЛЯ get_calendar_events ===

    @pytest.mark.asyncio
    async def test_get_calendar_events_no_events(self, availability_service, sample_equipment_ids, sample_dates):
        """
        Тест получения событий календаря при их отсутствии.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        
        # Мокаем пустой результат
        with patch.object(availability_service._calendar_service, 'get_calendar_events', return_value=[]):
            # Act
            events = await availability_service.get_calendar_events(
                equipment_ids, start_date, end_date
            )

            # Assert
            assert events == []

    @pytest.mark.asyncio
    async def test_get_calendar_events_with_events(self, availability_service, sample_equipment_ids, sample_dates):
        """
        Тест получения событий календаря.
        """
        # Arrange
        equipment_ids = sample_equipment_ids
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        
        # Мокаем события календаря
        mock_events = [
            {
                'id': 'rental-1',
                'title': 'Test Camera - Аренда',
                'start': '2025-01-01',
                'end': '2025-01-05',
                'type': 'rental'
            }
        ]
        with patch.object(availability_service._calendar_service, 'get_calendar_events', return_value=mock_events):
            # Act
            events = await availability_service.get_calendar_events(
                equipment_ids, start_date, end_date
            )

            # Assert
            assert len(events) == 1
            assert events[0]['id'] == 'rental-1'
            assert events[0]['type'] == 'rental'

    # === ТЕСТЫ ДЛЯ get_sqlalchemy_filter_for_available_equipment ===

    def test_get_sqlalchemy_filter_for_available_equipment(self, availability_service, sample_dates):
        """
        Тест получения SQLAlchemy фильтра для доступного оборудования.
        """
        # Arrange
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        
        # Настраиваем мок для возврата SQLAlchemy фильтра
        mock_filter = MagicMock()
        availability_service._query_service.get_sqlalchemy_filter_for_available_equipment = MagicMock(return_value=mock_filter)
        
        # Act
        result_filter = availability_service.get_sqlalchemy_filter_for_available_equipment(
            start_date, end_date
        )

        # Assert
        assert result_filter == mock_filter

    def test_get_sqlalchemy_filter_with_exclusions(self, availability_service, sample_dates):
        """
        Тест получения SQLAlchemy фильтра с исключениями.
        """
        # Arrange
        start_date = sample_dates['start_date']
        end_date = sample_dates['end_date']
        exclude_reservation_id = 1
        exclude_rental_id = 2
        
        # Настраиваем мок для возврата SQLAlchemy фильтра с исключениями
        mock_filter = MagicMock()
        availability_service._query_service.get_sqlalchemy_filter_for_available_equipment = MagicMock(return_value=mock_filter)
        
        # Act
        result_filter = availability_service.get_sqlalchemy_filter_for_available_equipment(
            start_date, end_date, exclude_reservation_id, exclude_rental_id
        )

        # Assert
        assert result_filter == mock_filter
