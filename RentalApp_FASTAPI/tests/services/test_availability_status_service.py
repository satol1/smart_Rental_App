# tests/services/test_availability_status_service.py
"""
Тесты для AvailabilityStatusService.
Цель: повысить покрытие с 19% до 80%+
"""

import pytest
from unittest.mock import AsyncMock, Mock
from datetime import date, timedelta
from typing import Dict, Any, List

from api.services.availability.statuses import AvailabilityStatusService
from shared.schemas.calendar_schema import DayStatusItem


class TestAvailabilityStatusService:
    """Тесты для AvailabilityStatusService"""

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
    def availability_status_service(self, mock_db_session, mock_reservation_repo, mock_rental_repo):
        """Создает экземпляр AvailabilityStatusService с мок-сессией"""
        return AvailabilityStatusService(mock_db_session, mock_reservation_repo, mock_rental_repo)

    @pytest.fixture
    def sample_conflicts(self):
        """Образец конфликтов для тестирования"""
        return {
            1: [
                {
                    'type': 'rental',
                    'id': 1,
                    'start_date': date(2024, 1, 1),
                    'end_date': date(2024, 1, 5),
                    'user_id': 1
                }
            ],
            2: [
                {
                    'type': 'reservation',
                    'id': 2,
                    'start_date': date(2024, 1, 3),
                    'end_date': date(2024, 1, 7),
                    'user_id': 2
                }
            ]
        }

    # Тесты инициализации
    @pytest.mark.asyncio
    async def test_service_initialization(self, mock_db_session, mock_reservation_repo, mock_rental_repo):
        """Тест инициализации сервиса"""
        service = AvailabilityStatusService(mock_db_session, mock_reservation_repo, mock_rental_repo)
        assert service.db == mock_db_session
        assert service.reservation_repo == mock_reservation_repo
        assert service.rental_repo == mock_rental_repo

    # Тесты для get_availability_statuses
    @pytest.mark.asyncio
    async def test_get_availability_statuses_no_conflicts(self, availability_status_service, sample_conflicts):
        """Тест получения статусов без конфликтов"""
        # Настраиваем мок для get_conflicts
        availability_status_service.get_conflicts = AsyncMock(return_value={})
        
        # Выполняем тест
        result = await availability_status_service.get_availability_statuses(
            equipment_ids=[1, 2, 3],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        # Проверяем результат
        assert len(result) == 3
        assert result[1]["status"] == "available"
        assert result[2]["status"] == "available"
        assert result[3]["status"] == "available"

    @pytest.mark.asyncio
    async def test_get_availability_statuses_with_rental_conflicts(self, availability_status_service, sample_conflicts):
        """Тест получения статусов с конфликтами аренды"""
        # Настраиваем мок для get_conflicts
        availability_status_service.get_conflicts = AsyncMock(return_value=sample_conflicts)
        
        # Выполняем тест
        result = await availability_status_service.get_availability_statuses(
            equipment_ids=[1, 2],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        # Проверяем результат
        assert len(result) == 2
        assert result[1]["status"] == "rented"
        assert "В аренде до" in result[1]["details"]
        assert result[2]["status"] == "reserved"
        assert "Зарезервировано до" in result[2]["details"]

    @pytest.mark.asyncio
    async def test_get_availability_statuses_with_exclusions(self, availability_status_service):
        """Тест получения статусов с исключениями"""
        # Настраиваем мок для get_conflicts
        availability_status_service.get_conflicts = AsyncMock(return_value={})
        
        # Выполняем тест
        result = await availability_status_service.get_availability_statuses(
            equipment_ids=[1],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            exclude_reservation_id=1,
            exclude_rental_id=2
        )
        
        # Проверяем, что get_conflicts был вызван с правильными параметрами
        availability_status_service.get_conflicts.assert_called_once_with(
            [1], date(2024, 1, 1), date(2024, 1, 31), 1, 2
        )

    # Тесты для get_daily_statuses
    @pytest.mark.asyncio
    async def test_get_daily_statuses_no_conflicts(self, availability_status_service):
        """Тест получения ежедневных статусов без конфликтов"""
        # Настраиваем мок для get_conflicts
        availability_status_service.get_conflicts = AsyncMock(return_value={})
        
        # Выполняем тест
        result = await availability_status_service.get_daily_statuses(
            equipment_ids=[1, 2],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 3)
        )
        
        # Проверяем результат
        assert len(result) == 2
        assert 1 in result
        assert 2 in result
        
        # Проверяем, что все дни имеют статус "available"
        for eq_id in [1, 2]:
            for day_str in ["01.01.2024", "02.01.2024", "03.01.2024"]:
                assert day_str in result[eq_id]
                assert result[eq_id][day_str].status == "available"

    @pytest.mark.asyncio
    async def test_get_daily_statuses_with_conflicts(self, availability_status_service, sample_conflicts):
        """Тест получения ежедневных статусов с конфликтами"""
        # Настраиваем мок для get_conflicts
        availability_status_service.get_conflicts = AsyncMock(return_value=sample_conflicts)
        
        # Выполняем тест
        result = await availability_status_service.get_daily_statuses(
            equipment_ids=[1, 2],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 10),
            current_user_id=1
        )
        
        # Проверяем результат
        assert len(result) == 2
        
        # Проверяем, что оборудование 1 имеет статус "rented" в период аренды
        assert result[1]["01.01.2024"].status == "rented"
        assert result[1]["02.01.2024"].status == "rented"
        assert result[1]["03.01.2024"].status == "rented"
        assert result[1]["04.01.2024"].status == "rented"
        
        # Проверяем, что оборудование 2 имеет статус "reserved" в период резервирования
        assert result[2]["03.01.2024"].status == "reserved"
        assert result[2]["04.01.2024"].status == "reserved"
        assert result[2]["05.01.2024"].status == "reserved"
        assert result[2]["06.01.2024"].status == "reserved"

    @pytest.mark.asyncio
    async def test_get_daily_statuses_with_user_highlighting(self, availability_status_service):
        """Тест выделения резервирований текущего пользователя"""
        conflicts = {
            1: [
                {
                    'type': 'reservation',
                    'id': 1,
                    'start_date': date(2024, 1, 1),
                    'end_date': date(2024, 1, 3),
                    'user_id': 1
                }
            ]
        }
        
        # Настраиваем мок для get_conflicts
        availability_status_service.get_conflicts = AsyncMock(return_value=conflicts)
        
        # Выполняем тест
        result = await availability_status_service.get_daily_statuses(
            equipment_ids=[1],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 3),
            current_user_id=1
        )
        
        # Проверяем, что резервирование пользователя выделено
        assert result[1]["01.01.2024"].is_user_reservation is True
        assert result[1]["02.01.2024"].is_user_reservation is True

    @pytest.mark.asyncio
    async def test_get_daily_statuses_error_handling(self, availability_status_service):
        """Тест обработки ошибок в get_daily_statuses"""
        # Настраиваем мок для выброса исключения
        availability_status_service.get_conflicts = AsyncMock(side_effect=Exception("Database error"))
        
        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database error"):
            await availability_status_service.get_daily_statuses(
                equipment_ids=[1],
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 3)
            )

    # Тесты для _format_status_from_conflict
    def test_format_status_from_conflict_rental(self, availability_status_service):
        """Тест форматирования статуса для аренды"""
        conflict = {
            'type': 'rental',
            'start_date': date(2024, 1, 1),
            'end_date': date(2024, 1, 5)
        }
        
        result = availability_status_service._format_status_from_conflict(conflict)
        
        assert result["status"] == "rented"
        assert "В аренде до" in result["details"]
        assert result["start_date"] == date(2024, 1, 1)
        assert result["end_date"] == date(2024, 1, 5)

    def test_format_status_from_conflict_reservation(self, availability_status_service):
        """Тест форматирования статуса для резервирования"""
        conflict = {
            'type': 'reservation',
            'start_date': date(2024, 1, 1),
            'end_date': date(2024, 1, 5)
        }
        
        result = availability_status_service._format_status_from_conflict(conflict)
        
        assert result["status"] == "reserved"
        assert "Зарезервировано до" in result["details"]
        assert result["start_date"] == date(2024, 1, 1)
        assert result["end_date"] == date(2024, 1, 5)

    def test_format_status_from_conflict_unknown_type(self, availability_status_service):
        """Тест форматирования статуса для неизвестного типа"""
        conflict = {
            'type': 'unknown',
            'start_date': date(2024, 1, 1),
            'end_date': date(2024, 1, 5)
        }
        
        result = availability_status_service._format_status_from_conflict(conflict)
        
        assert result["status"] == "available"
        assert result["details"] == "Доступно"

    # Тесты для _apply_conflict_to_daily_statuses
    def test_apply_conflict_to_daily_statuses_rental(self, availability_status_service):
        """Тест применения конфликта аренды к ежедневным статусам"""
        daily_statuses = {
            "01.01.2024": DayStatusItem(status="available"),
            "02.01.2024": DayStatusItem(status="available"),
            "03.01.2024": DayStatusItem(status="available")
        }
        
        conflict = {
            'type': 'rental',
            'id': 1,
            'start_date': date(2024, 1, 1),
            'end_date': date(2024, 1, 3),
            'user_id': 1
        }
        
        availability_status_service._apply_conflict_to_daily_statuses(
            daily_statuses, conflict, date(2024, 1, 1), date(2024, 1, 3), 1
        )
        
        assert daily_statuses["01.01.2024"].status == "rented"
        assert daily_statuses["02.01.2024"].status == "rented"
        assert daily_statuses["03.01.2024"].status == "available"  # end_date не включается

    def test_apply_conflict_to_daily_statuses_reservation(self, availability_status_service):
        """Тест применения конфликта резервирования к ежедневным статусам"""
        daily_statuses = {
            "01.01.2024": DayStatusItem(status="available"),
            "02.01.2024": DayStatusItem(status="available"),
            "03.01.2024": DayStatusItem(status="available")
        }
        
        conflict = {
            'type': 'reservation',
            'id': 1,
            'start_date': date(2024, 1, 1),
            'end_date': date(2024, 1, 3),
            'user_id': 2
        }
        
        availability_status_service._apply_conflict_to_daily_statuses(
            daily_statuses, conflict, date(2024, 1, 1), date(2024, 1, 3), 1
        )
        
        assert daily_statuses["01.01.2024"].status == "reserved"
        assert daily_statuses["02.01.2024"].status == "reserved"
        assert daily_statuses["03.01.2024"].status == "available"

    def test_apply_conflict_to_daily_statuses_outside_period(self, availability_status_service):
        """Тест применения конфликта вне периода"""
        daily_statuses = {
            "01.01.2024": DayStatusItem(status="available"),
            "02.01.2024": DayStatusItem(status="available")
        }
        
        conflict = {
            'type': 'rental',
            'id': 1,
            'start_date': date(2024, 1, 5),  # Вне периода
            'end_date': date(2024, 1, 7),
            'user_id': 1
        }
        
        availability_status_service._apply_conflict_to_daily_statuses(
            daily_statuses, conflict, date(2024, 1, 1), date(2024, 1, 2), 1
        )
        
        # Статусы не должны измениться
        assert daily_statuses["01.01.2024"].status == "available"
        assert daily_statuses["02.01.2024"].status == "available"

    def test_apply_conflict_to_daily_statuses_preserves_rented(self, availability_status_service):
        """Тест сохранения статуса 'rented' при применении резервирования"""
        daily_statuses = {
            "01.01.2024": DayStatusItem(status="rented"),
            "02.01.2024": DayStatusItem(status="available")
        }
        
        conflict = {
            'type': 'reservation',
            'id': 1,
            'start_date': date(2024, 1, 1),
            'end_date': date(2024, 1, 3),
            'user_id': 1
        }
        
        availability_status_service._apply_conflict_to_daily_statuses(
            daily_statuses, conflict, date(2024, 1, 1), date(2024, 1, 3), 1
        )
        
        # Статус 'rented' должен сохраниться
        assert daily_statuses["01.01.2024"].status == "rented"
        assert daily_statuses["02.01.2024"].status == "reserved"

    # Дополнительные тесты для edge cases
    @pytest.mark.asyncio
    async def test_get_availability_statuses_empty_equipment_list(self, availability_status_service):
        """Тест получения статусов для пустого списка оборудования"""
        availability_status_service.get_conflicts = AsyncMock(return_value={})
        
        result = await availability_status_service.get_availability_statuses(
            equipment_ids=[],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        assert result == {}

    @pytest.mark.asyncio
    async def test_get_daily_statuses_single_day(self, availability_status_service):
        """Тест получения ежедневных статусов для одного дня"""
        availability_status_service.get_conflicts = AsyncMock(return_value={})
        
        result = await availability_status_service.get_daily_statuses(
            equipment_ids=[1],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 1)
        )
        
        assert len(result) == 1
        assert "01.01.2024" in result[1]
        assert result[1]["01.01.2024"].status == "available"

    @pytest.mark.asyncio
    async def test_get_daily_statuses_large_period(self, availability_status_service):
        """Тест получения ежедневных статусов для большого периода"""
        availability_status_service.get_conflicts = AsyncMock(return_value={})
        
        result = await availability_status_service.get_daily_statuses(
            equipment_ids=[1],
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        assert len(result) == 1
        assert len(result[1]) == 31  # 31 день в январе
        for day_str in result[1]:
            assert result[1][day_str].status == "available"

    def test_apply_conflict_to_daily_statuses_group_id_format(self, availability_status_service):
        """Тест формата group_id в ежедневных статусах"""
        daily_statuses = {
            "01.01.2024": DayStatusItem(status="available")
        }
        
        conflict = {
            'type': 'rental',
            'id': 123,
            'start_date': date(2024, 1, 1),
            'end_date': date(2024, 1, 2),
            'user_id': 1
        }
        
        availability_status_service._apply_conflict_to_daily_statuses(
            daily_statuses, conflict, date(2024, 1, 1), date(2024, 1, 2), 1
        )
        
        assert daily_statuses["01.01.2024"].group_id == "rental-123"
        assert daily_statuses["01.01.2024"].order_type == "rental"
        assert daily_statuses["01.01.2024"].user_id == 1
