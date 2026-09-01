# tests/services/test_availability_conflicts_service.py
"""
Тесты для AvailabilityConflictsService.
Цель: повысить покрытие с 21% до 80%+
"""

import pytest
from unittest.mock import AsyncMock, Mock
from datetime import date
from typing import List, Dict, Any

from api.services.availability.conflicts import AvailabilityConflictsService


class TestAvailabilityConflictsService:
    """Тесты для AvailabilityConflictsService"""

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        session = AsyncMock()
        return session

    @pytest.fixture
    def mock_reservation_repo(self):
        """Мок репозитория резервирований"""
        return AsyncMock()

    @pytest.fixture
    def mock_rental_repo(self):
        """Мок репозитория аренд"""
        return AsyncMock()

    @pytest.fixture
    def availability_conflicts_service(self, mock_db_session, mock_reservation_repo, mock_rental_repo):
        """Создает экземпляр AvailabilityConflictsService с мок-сессией"""
        return AvailabilityConflictsService(mock_db_session, mock_reservation_repo, mock_rental_repo)

    @pytest.fixture
    def sample_reservation(self):
        """Образец резервирования для тестирования"""
        reservation = Mock()
        reservation.id = 1
        reservation.start_date = date(2024, 1, 1)
        reservation.end_date = date(2024, 1, 5)
        reservation.user_id = 1
        
        equipment = Mock()
        equipment.id = 1
        reservation.equipment = [equipment]
        
        return reservation

    @pytest.fixture
    def sample_rental(self):
        """Образец аренды для тестирования"""
        rental = Mock()
        rental.id = 1
        rental.start_date = date(2024, 1, 3)
        rental.end_date = date(2024, 1, 7)
        rental.user_id = 2
        
        equipment = Mock()
        equipment.id = 1
        rental.equipment = [equipment]
        
        return rental

    # Тесты инициализации
    @pytest.mark.asyncio
    async def test_service_initialization(self, mock_db_session, mock_reservation_repo, mock_rental_repo):
        """Тест инициализации сервиса"""
        service = AvailabilityConflictsService(mock_db_session, mock_reservation_repo, mock_rental_repo)
        assert service.db == mock_db_session
        assert service.reservation_repo == mock_reservation_repo
        assert service.rental_repo == mock_rental_repo

    # Тесты для get_conflicts
    @pytest.mark.asyncio
    async def test_get_conflicts_empty_equipment_list(self, availability_conflicts_service):
        """Тест получения конфликтов для пустого списка оборудования"""
        result = await availability_conflicts_service.get_conflicts(
            equipment_ids=[],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        assert result == {}

    @pytest.mark.asyncio
    async def test_get_conflicts_no_conflicts(self, availability_conflicts_service):
        """Тест получения конфликтов когда их нет"""
        # Настраиваем моки для методов получения пересечений
        availability_conflicts_service._get_overlapping_reservations = AsyncMock(return_value=[])
        availability_conflicts_service._get_overlapping_rentals = AsyncMock(return_value=[])
        
        result = await availability_conflicts_service.get_conflicts(
            equipment_ids=[1, 2, 3],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        assert result == {}

    @pytest.mark.asyncio
    async def test_get_conflicts_with_reservations(self, availability_conflicts_service, sample_reservation):
        """Тест получения конфликтов с резервированиями"""
        # Настраиваем моки
        availability_conflicts_service._get_overlapping_reservations = AsyncMock(return_value=[sample_reservation])
        availability_conflicts_service._get_overlapping_rentals = AsyncMock(return_value=[])
        
        result = await availability_conflicts_service.get_conflicts(
            equipment_ids=[1],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        assert 1 in result
        assert len(result[1]) == 1
        assert result[1][0]['type'] == 'reservation'
        assert result[1][0]['id'] == 1
        assert result[1][0]['user_id'] == 1

    @pytest.mark.asyncio
    async def test_get_conflicts_with_rentals(self, availability_conflicts_service, sample_rental):
        """Тест получения конфликтов с арендами"""
        # Настраиваем моки
        availability_conflicts_service._get_overlapping_reservations = AsyncMock(return_value=[])
        availability_conflicts_service._get_overlapping_rentals = AsyncMock(return_value=[sample_rental])
        
        result = await availability_conflicts_service.get_conflicts(
            equipment_ids=[1],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        assert 1 in result
        assert len(result[1]) == 1
        assert result[1][0]['type'] == 'rental'
        assert result[1][0]['id'] == 1
        assert result[1][0]['user_id'] == 2

    @pytest.mark.asyncio
    async def test_get_conflicts_with_both_types(self, availability_conflicts_service, sample_reservation, sample_rental):
        """Тест получения конфликтов с резервированиями и арендами"""
        # Настраиваем моки
        availability_conflicts_service._get_overlapping_reservations = AsyncMock(return_value=[sample_reservation])
        availability_conflicts_service._get_overlapping_rentals = AsyncMock(return_value=[sample_rental])
        
        result = await availability_conflicts_service.get_conflicts(
            equipment_ids=[1],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        assert 1 in result
        assert len(result[1]) == 2
        
        # Проверяем, что есть оба типа конфликтов
        types = [conflict['type'] for conflict in result[1]]
        assert 'reservation' in types
        assert 'rental' in types

    @pytest.mark.asyncio
    async def test_get_conflicts_with_exclusions(self, availability_conflicts_service):
        """Тест получения конфликтов с исключениями"""
        # Настраиваем моки
        availability_conflicts_service._get_overlapping_reservations = AsyncMock(return_value=[])
        availability_conflicts_service._get_overlapping_rentals = AsyncMock(return_value=[])
        
        await availability_conflicts_service.get_conflicts(
            equipment_ids=[1],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            exclude_reservation_id=1,
            exclude_rental_id=2
        )
        
        # Проверяем, что методы были вызваны с правильными параметрами
        availability_conflicts_service._get_overlapping_reservations.assert_called_once_with(
            [1], date(2024, 1, 1), date(2024, 1, 31), 1
        )
        availability_conflicts_service._get_overlapping_rentals.assert_called_once_with(
            [1], date(2024, 1, 1), date(2024, 1, 31), 2
        )

    @pytest.mark.asyncio
    async def test_get_conflicts_multiple_equipment(self, availability_conflicts_service):
        """Тест получения конфликтов для нескольких единиц оборудования"""
        # Создаем резервирование для оборудования 1
        reservation1 = Mock()
        reservation1.id = 1
        reservation1.start_date = date(2024, 1, 1)
        reservation1.end_date = date(2024, 1, 5)
        reservation1.user_id = 1
        
        equipment1 = Mock()
        equipment1.id = 1
        reservation1.equipment = [equipment1]
        
        # Создаем резервирование для оборудования 2
        reservation2 = Mock()
        reservation2.id = 2
        reservation2.start_date = date(2024, 1, 3)
        reservation2.end_date = date(2024, 1, 7)
        reservation2.user_id = 2
        
        equipment2 = Mock()
        equipment2.id = 2
        reservation2.equipment = [equipment2]
        
        # Настраиваем моки
        availability_conflicts_service._get_overlapping_reservations = AsyncMock(return_value=[reservation1, reservation2])
        availability_conflicts_service._get_overlapping_rentals = AsyncMock(return_value=[])
        
        result = await availability_conflicts_service.get_conflicts(
            equipment_ids=[1, 2],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        assert len(result) == 2
        assert 1 in result
        assert 2 in result
        assert len(result[1]) == 1
        assert len(result[2]) == 1

    # Тесты для get_conflicting_equipment_ids
    @pytest.mark.asyncio
    async def test_get_conflicting_equipment_ids_no_conflicts(self, availability_conflicts_service):
        """Тест получения ID оборудования с конфликтами когда их нет"""
        availability_conflicts_service.get_conflicts = AsyncMock(return_value={})
        
        result = await availability_conflicts_service.get_conflicting_equipment_ids(
            equipment_ids=[1, 2, 3],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        assert result == []

    @pytest.mark.asyncio
    async def test_get_conflicting_equipment_ids_with_conflicts(self, availability_conflicts_service):
        """Тест получения ID оборудования с конфликтами"""
        availability_conflicts_service.get_conflicts = AsyncMock(return_value={
            1: [{'type': 'reservation', 'id': 1}],
            3: [{'type': 'rental', 'id': 1}]
        })
        
        result = await availability_conflicts_service.get_conflicting_equipment_ids(
            equipment_ids=[1, 2, 3],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        assert result == [1, 3]

    # Тесты для _get_most_critical_conflict
    def test_get_most_critical_conflict_empty_list(self, availability_conflicts_service):
        """Тест получения наиболее критичного конфликта из пустого списка"""
        result = availability_conflicts_service._get_most_critical_conflict([])
        assert result is None

    def test_get_most_critical_conflict_single_reservation(self, availability_conflicts_service):
        """Тест получения наиболее критичного конфликта - одна резервация"""
        conflicts = [
            {'type': 'reservation', 'id': 1, 'start_date': date(2024, 1, 1), 'end_date': date(2024, 1, 5)}
        ]
        
        result = availability_conflicts_service._get_most_critical_conflict(conflicts)
        
        assert result == conflicts[0]

    def test_get_most_critical_conflict_single_rental(self, availability_conflicts_service):
        """Тест получения наиболее критичного конфликта - одна аренда"""
        conflicts = [
            {'type': 'rental', 'id': 1, 'start_date': date(2024, 1, 1), 'end_date': date(2024, 1, 5)}
        ]
        
        result = availability_conflicts_service._get_most_critical_conflict(conflicts)
        
        assert result == conflicts[0]

    def test_get_most_critical_conflict_rental_priority(self, availability_conflicts_service):
        """Тест приоритета аренды над резервированием"""
        conflicts = [
            {'type': 'reservation', 'id': 1, 'start_date': date(2024, 1, 1), 'end_date': date(2024, 1, 5)},
            {'type': 'rental', 'id': 2, 'start_date': date(2024, 1, 3), 'end_date': date(2024, 1, 7)}
        ]
        
        result = availability_conflicts_service._get_most_critical_conflict(conflicts)
        
        assert result['type'] == 'rental'
        assert result['id'] == 2

    def test_get_most_critical_conflict_multiple_reservations(self, availability_conflicts_service):
        """Тест получения наиболее критичного конфликта - несколько резервирований"""
        conflicts = [
            {'type': 'reservation', 'id': 2, 'start_date': date(2024, 1, 3), 'end_date': date(2024, 1, 7)},
            {'type': 'reservation', 'id': 1, 'start_date': date(2024, 1, 1), 'end_date': date(2024, 1, 5)}
        ]
        
        result = availability_conflicts_service._get_most_critical_conflict(conflicts)
        
        # Должен вернуться первый в отсортированном списке
        assert result['type'] == 'reservation'

    def test_get_most_critical_conflict_multiple_rentals(self, availability_conflicts_service):
        """Тест получения наиболее критичного конфликта - несколько аренд"""
        conflicts = [
            {'type': 'rental', 'id': 2, 'start_date': date(2024, 1, 3), 'end_date': date(2024, 1, 7)},
            {'type': 'rental', 'id': 1, 'start_date': date(2024, 1, 1), 'end_date': date(2024, 1, 5)}
        ]
        
        result = availability_conflicts_service._get_most_critical_conflict(conflicts)
        
        # Должен вернуться первый в отсортированном списке
        assert result['type'] == 'rental'

    # Дополнительные тесты для edge cases
    @pytest.mark.asyncio
    async def test_get_conflicts_equipment_not_in_list(self, availability_conflicts_service):
        """Тест получения конфликтов для оборудования не в списке"""
        reservation = Mock()
        reservation.id = 1
        reservation.start_date = date(2024, 1, 1)
        reservation.end_date = date(2024, 1, 5)
        reservation.user_id = 1
        
        equipment = Mock()
        equipment.id = 999  # Не в списке equipment_ids
        reservation.equipment = [equipment]
        
        availability_conflicts_service._get_overlapping_reservations = AsyncMock(return_value=[reservation])
        availability_conflicts_service._get_overlapping_rentals = AsyncMock(return_value=[])
        
        result = await availability_conflicts_service.get_conflicts(
            equipment_ids=[1, 2, 3],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        # Оборудование 999 не должно быть в результате
        assert result == {}

    @pytest.mark.asyncio
    async def test_get_conflicts_multiple_equipment_per_reservation(self, availability_conflicts_service):
        """Тест получения конфликтов для резервирования с несколькими единицами оборудования"""
        reservation = Mock()
        reservation.id = 1
        reservation.start_date = date(2024, 1, 1)
        reservation.end_date = date(2024, 1, 5)
        reservation.user_id = 1
        
        equipment1 = Mock()
        equipment1.id = 1
        equipment2 = Mock()
        equipment2.id = 2
        reservation.equipment = [equipment1, equipment2]
        
        availability_conflicts_service._get_overlapping_reservations = AsyncMock(return_value=[reservation])
        availability_conflicts_service._get_overlapping_rentals = AsyncMock(return_value=[])
        
        result = await availability_conflicts_service.get_conflicts(
            equipment_ids=[1, 2],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        assert len(result) == 2
        assert 1 in result
        assert 2 in result
        assert len(result[1]) == 1
        assert len(result[2]) == 1
        assert result[1][0]['id'] == 1
        assert result[2][0]['id'] == 1

    @pytest.mark.asyncio
    async def test_get_conflicts_error_handling(self, availability_conflicts_service):
        """Тест обработки ошибок в get_conflicts"""
        availability_conflicts_service._get_overlapping_reservations = AsyncMock(side_effect=Exception("Database error"))
        
        with pytest.raises(Exception, match="Database error"):
            await availability_conflicts_service.get_conflicts(
                equipment_ids=[1],
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31)
            )

    @pytest.mark.asyncio
    async def test_get_conflicting_equipment_ids_error_handling(self, availability_conflicts_service):
        """Тест обработки ошибок в get_conflicting_equipment_ids"""
        availability_conflicts_service.get_conflicts = AsyncMock(side_effect=Exception("Database error"))
        
        with pytest.raises(Exception, match="Database error"):
            await availability_conflicts_service.get_conflicting_equipment_ids(
                equipment_ids=[1],
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31)
            )
