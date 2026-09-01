# tests/services/test_holiday_service.py
"""
Тесты для HolidayService.
Цель: повысить покрытие с 26% до 80%+
"""

import pytest
from unittest.mock import AsyncMock, Mock
from datetime import date, datetime
from typing import List

from api.services.holiday_service import HolidayService
from api.models.holiday import Holiday, HolidayRule
from api.models.user import User
from api.repositories.holiday_repository import HolidayRepository
from shared.schemas.holiday_schema import HolidayCreate, RecurringHolidayRuleCreate, HolidayListResponse, HolidayRuleListResponse
from fastapi import HTTPException


class TestHolidayService:
    """Тесты для HolidayService"""

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        session = AsyncMock()
        return session

    @pytest.fixture
    def mock_holiday_repo(self):
        """Мок репозитория выходных дней"""
        repo = Mock(spec=HolidayRepository)
        return repo

    @pytest.fixture
    def holiday_service(self, mock_db_session, mock_holiday_repo):
        """Создает экземпляр HolidayService с мок-зависимостями"""
        return HolidayService(mock_db_session, mock_holiday_repo)

    @pytest.fixture
    def sample_user(self):
        """Образец пользователя для тестирования"""
        user = User(
            id=1,
            email="test@example.com",
            full_name="Test User",
            is_active=True
        )
        return user

    @pytest.fixture
    def sample_holiday(self):
        """Образец выходного дня для тестирования"""
        holiday = Holiday(
            date=date(2024, 1, 1),
            description="New Year",
            created_by_id=1
        )
        return holiday

    @pytest.fixture
    def sample_holiday_rule(self):
        """Образец правила выходного дня для тестирования"""
        rule = HolidayRule(
            id=1,
            rule_type="weekly",
            parameters={"day_of_week": 6},
            description="Weekly Sunday",
            created_by_id=1
        )
        return rule

    # Тесты инициализации
    def test_service_initialization(self, mock_db_session, mock_holiday_repo):
        """Тест инициализации сервиса"""
        service = HolidayService(mock_db_session, mock_holiday_repo)
        assert service.db == mock_db_session
        assert service.repo == mock_holiday_repo

    # Тесты для get_holidays
    @pytest.mark.asyncio
    async def test_get_holidays_success(self, holiday_service, mock_holiday_repo, sample_holiday):
        """Тест успешного получения выходных дней"""
        # Настраиваем мок
        mock_holiday_repo.get_holidays_paginated = AsyncMock(return_value=([sample_holiday], 1))
        
        # Выполняем тест
        result = await holiday_service.get_holidays(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            skip=0,
            limit=10
        )
        
        # Проверяем результат
        assert isinstance(result, HolidayListResponse)
        assert len(result.items) == 1
        assert result.total == 1
        assert result.items[0].date == date(2024, 1, 1)

    @pytest.mark.asyncio
    async def test_get_holidays_empty_result(self, holiday_service, mock_holiday_repo):
        """Тест получения пустого результата"""
        # Настраиваем мок
        mock_holiday_repo.get_holidays_paginated = AsyncMock(return_value=([], 0))
        
        # Выполняем тест
        result = await holiday_service.get_holidays(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            skip=0,
            limit=10
        )
        
        # Проверяем результат
        assert isinstance(result, HolidayListResponse)
        assert len(result.items) == 0
        assert result.total == 0

    @pytest.mark.asyncio
    async def test_get_holidays_with_pagination(self, holiday_service, mock_holiday_repo):
        """Тест получения выходных дней с пагинацией"""
        # Создаем несколько выходных дней
        holidays = [
            Holiday(date=date(2024, 1, 1), description="New Year", created_by_id=1),
            Holiday(date=date(2024, 1, 7), description="Christmas", created_by_id=1)
        ]
        
        # Настраиваем мок
        mock_holiday_repo.get_holidays_paginated = AsyncMock(return_value=(holidays, 2))
        
        # Выполняем тест
        result = await holiday_service.get_holidays(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            skip=0,
            limit=2
        )
        
        # Проверяем результат
        assert len(result.items) == 2
        assert result.total == 2

    # Тесты для create_single_holiday
    @pytest.mark.asyncio
    async def test_create_single_holiday_success(self, holiday_service, mock_holiday_repo, sample_user, sample_holiday):
        """Тест успешного создания выходного дня"""
        # Создаем данные для создания выходного дня
        holiday_data = HolidayCreate(
            date=date(2024, 1, 1),
            description="New Year"
        )
        
        # Настраиваем мок
        mock_holiday_repo.check_conflicting_reservations = AsyncMock(return_value=[])
        mock_holiday_repo.find_holiday_by_date = AsyncMock(return_value=None)
        mock_holiday_repo.save_holiday = AsyncMock(return_value=sample_holiday)
        
        # Выполняем тест
        result = await holiday_service.create_single_holiday(holiday_data, sample_user)
        
        # Проверяем результат
        assert result["message"] == "Выходной день успешно добавлен"
        assert result["date"] == date(2024, 1, 1)

    @pytest.mark.asyncio
    async def test_create_single_holiday_with_conflicts(self, holiday_service, mock_holiday_repo, sample_user):
        """Тест создания выходного дня с конфликтами"""
        # Создаем данные для создания выходного дня
        holiday_data = HolidayCreate(
            date=date(2024, 1, 1),
            description="New Year",
            force=False
        )
        
        # Настраиваем мок для конфликтов
        mock_holiday_repo.check_conflicting_reservations = AsyncMock(return_value=[1, 2, 3])
        
        # Проверяем, что выбрасывается исключение
        with pytest.raises(HTTPException) as exc_info:
            await holiday_service.create_single_holiday(holiday_data, sample_user)
        
        assert exc_info.value.status_code == 409

    @pytest.mark.asyncio
    async def test_create_single_holiday_force_creation(self, holiday_service, mock_holiday_repo, sample_user, sample_holiday):
        """Тест принудительного создания выходного дня с конфликтами"""
        # Создаем данные для создания выходного дня
        holiday_data = HolidayCreate(
            date=date(2024, 1, 1),
            description="New Year",
            force=True
        )
        
        # Настраиваем мок
        mock_holiday_repo.check_conflicting_reservations = AsyncMock(return_value=[1, 2, 3])
        mock_holiday_repo.find_holiday_by_date = AsyncMock(return_value=None)
        mock_holiday_repo.save_holiday = AsyncMock(return_value=sample_holiday)
        
        # Выполняем тест
        result = await holiday_service.create_single_holiday(holiday_data, sample_user)
        
        # Проверяем результат
        assert result["message"] == "Выходной день успешно добавлен"
        assert result["date"] == date(2024, 1, 1)

    # Тесты для create_weekly_recurring_holidays
    @pytest.mark.asyncio
    async def test_create_weekly_recurring_holidays_success(self, holiday_service, mock_holiday_repo, sample_user, sample_holiday_rule):
        """Тест успешного создания еженедельных выходных"""
        # Создаем данные для создания правила
        rule_data = RecurringHolidayRuleCreate(
            day_of_week=6,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            description="Weekly Sunday"
        )
        
        # Настраиваем мок
        mock_holiday_repo.save_rule = AsyncMock(return_value=sample_holiday_rule)
        mock_holiday_repo.save_holiday = AsyncMock()
        
        # Выполняем тест
        result = await holiday_service.create_weekly_recurring_holidays(rule_data, sample_user)
        
        # Проверяем результат
        assert result["message"] == "Правило создано. Добавлено 0 новых выходных."

    # Тесты для delete_holiday
    @pytest.mark.asyncio
    async def test_delete_holiday_success(self, holiday_service, mock_holiday_repo, sample_holiday):
        """Тест успешного удаления выходного дня"""
        # Настраиваем мок
        mock_holiday_repo.find_holiday_by_date = AsyncMock(return_value=sample_holiday)
        mock_holiday_repo.delete_holiday = AsyncMock()
        
        # Выполняем тест
        result = await holiday_service.delete_holiday(date(2024, 1, 1))
        
        # Проверяем результат (метод не возвращает значение)
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_holiday_not_found(self, holiday_service, mock_holiday_repo):
        """Тест удаления несуществующего выходного дня"""
        # Настраиваем мок
        mock_holiday_repo.find_holiday_by_date = AsyncMock(return_value=None)
        
        # Проверяем, что выбрасывается исключение
        with pytest.raises(HTTPException) as exc_info:
            await holiday_service.delete_holiday(date(2024, 1, 1))
        
        assert exc_info.value.status_code == 404


    # Дополнительные тесты для edge cases
    @pytest.mark.asyncio
    async def test_get_holidays_repository_error(self, holiday_service, mock_holiday_repo):
        """Тест обработки ошибки репозитория в get_holidays"""
        # Настраиваем мок для выброса исключения
        mock_holiday_repo.get_holidays_paginated = AsyncMock(side_effect=Exception("Database error"))
        
        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database error"):
            await holiday_service.get_holidays(
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
                skip=0,
                limit=10
            )

    @pytest.mark.asyncio
    async def test_create_single_holiday_repository_error(self, holiday_service, mock_holiday_repo, sample_user):
        """Тест обработки ошибки репозитория в create_single_holiday"""
        # Создаем данные для создания выходного дня
        holiday_data = HolidayCreate(
            date=date(2024, 1, 1),
            description="New Year"
        )
        
        # Настраиваем мок для выброса исключения
        mock_holiday_repo.check_conflicting_reservations = AsyncMock(return_value=[])
        mock_holiday_repo.find_holiday_by_date = AsyncMock(return_value=None)
        mock_holiday_repo.save_holiday = AsyncMock(side_effect=Exception("Database error"))
        
        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database error"):
            await holiday_service.create_single_holiday(holiday_data, sample_user)

    @pytest.mark.asyncio
    async def test_create_weekly_recurring_holidays_repository_error(self, holiday_service, mock_holiday_repo, sample_user):
        """Тест обработки ошибки репозитория в create_weekly_recurring_holidays"""
        # Создаем данные для создания правила
        rule_data = RecurringHolidayRuleCreate(
            day_of_week=6,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            description="Weekly Sunday"
        )
        
        # Настраиваем мок для выброса исключения
        mock_holiday_repo.save_rule = AsyncMock(side_effect=Exception("Database error"))
        
        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database error"):
            await holiday_service.create_weekly_recurring_holidays(rule_data, sample_user)

    @pytest.mark.asyncio
    async def test_delete_holiday_repository_error(self, holiday_service, mock_holiday_repo, sample_holiday):
        """Тест обработки ошибки репозитория в delete_holiday"""
        # Настраиваем мок для выброса исключения
        mock_holiday_repo.find_holiday_by_date = AsyncMock(return_value=sample_holiday)
        mock_holiday_repo.delete_holiday = AsyncMock(side_effect=Exception("Database error"))
        
        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database error"):
            await holiday_service.delete_holiday(date(2024, 1, 1))

    # Тесты для граничных случаев
    @pytest.mark.asyncio
    async def test_get_holidays_large_date_range(self, holiday_service, mock_holiday_repo):
        """Тест получения выходных дней для большого диапазона дат"""
        # Настраиваем мок
        mock_holiday_repo.get_holidays_paginated = AsyncMock(return_value=([], 0))
        
        # Выполняем тест
        result = await holiday_service.get_holidays(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            skip=0,
            limit=100
        )
        
        # Проверяем результат
        assert isinstance(result, HolidayListResponse)
        assert result.total == 0

    @pytest.mark.asyncio
    async def test_get_holidays_zero_limit(self, holiday_service, mock_holiday_repo):
        """Тест получения выходных дней с нулевым лимитом"""
        # Настраиваем мок
        mock_holiday_repo.get_holidays_paginated = AsyncMock(return_value=([], 0))
        
        # Выполняем тест
        result = await holiday_service.get_holidays(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            skip=0,
            limit=0
        )
        
        # Проверяем результат
        assert isinstance(result, HolidayListResponse)
        assert result.total == 0

    @pytest.mark.asyncio
    async def test_create_single_holiday_same_date(self, holiday_service, mock_holiday_repo, sample_user, sample_holiday):
        """Тест создания выходного дня на ту же дату"""
        # Создаем данные для создания выходного дня
        holiday_data = HolidayCreate(
            date=date(2024, 1, 1),
            description="New Year"
        )
        
        # Настраиваем мок
        mock_holiday_repo.check_conflicting_reservations = AsyncMock(return_value=[])
        mock_holiday_repo.find_holiday_by_date = AsyncMock(return_value=None)
        mock_holiday_repo.save_holiday = AsyncMock(return_value=sample_holiday)
        
        # Выполняем тест
        result = await holiday_service.create_single_holiday(holiday_data, sample_user)
        
        # Проверяем результат
        assert result["message"] == "Выходной день успешно добавлен"
        assert result["date"] == date(2024, 1, 1)
