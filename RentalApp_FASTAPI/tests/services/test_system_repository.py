# tests/services/test_system_repository.py
"""
Тесты для SystemService - сервиса работы с системными данными (праздники, промокоды, настройки).
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date

from api.services.order.system_repository import SystemService
from api.models.holiday import Holiday
from api.models.promo_code import PromoCode
from api.models.setting import Setting


class TestSystemService:
    """Тесты для SystemService."""

    @pytest.fixture
    def mock_system_repo(self):
        """Создает мок репозитория системных данных."""
        return MagicMock()

    @pytest.fixture
    def system_service(self, mock_system_repo):
        """Создает экземпляр SystemService с моком репозитория."""
        return SystemService(system_repo=mock_system_repo)

    # === ТЕСТЫ ДЛЯ is_holiday ===

    @pytest.mark.asyncio
    async def test_is_holiday_true(self, system_service, mock_system_repo):
        """Тест проверки праздника - дата является праздником."""
        check_date = date(2024, 1, 1)
        mock_system_repo.is_holiday = AsyncMock(return_value=True)
        
        result = await system_service.is_holiday(check_date)
        
        assert result is True
        mock_system_repo.is_holiday.assert_called_once_with(check_date)

    @pytest.mark.asyncio
    async def test_is_holiday_false(self, system_service, mock_system_repo):
        """Тест проверки праздника - дата не является праздником."""
        check_date = date(2024, 1, 2)
        mock_system_repo.is_holiday = AsyncMock(return_value=False)
        
        result = await system_service.is_holiday(check_date)
        
        assert result is False

    # === ТЕСТЫ ДЛЯ get_holidays_in_date_range ===

    @pytest.mark.asyncio
    async def test_get_holidays_in_date_range(self, system_service, mock_system_repo):
        """Тест получения праздников в диапазоне дат."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 31)
        
        holiday1 = MagicMock(spec=Holiday)
        holiday1.id = 1
        holiday1.date = date(2024, 1, 1)
        holiday1.name = "New Year"
        
        holiday2 = MagicMock(spec=Holiday)
        holiday2.id = 2
        holiday2.date = date(2024, 1, 7)
        holiday2.name = "Christmas"
        
        mock_system_repo.get_holidays_in_date_range = AsyncMock(return_value=[holiday1, holiday2])
        
        result = await system_service.get_holidays_in_date_range(start_date, end_date)
        
        assert len(result) == 2
        assert result[0].id == 1
        assert result[1].id == 2
        mock_system_repo.get_holidays_in_date_range.assert_called_once_with(start_date, end_date)

    @pytest.mark.asyncio
    async def test_get_holidays_in_date_range_empty(self, system_service, mock_system_repo):
        """Тест получения пустого списка праздников."""
        start_date = date(2024, 2, 1)
        end_date = date(2024, 2, 28)
        
        mock_system_repo.get_holidays_in_date_range = AsyncMock(return_value=[])
        
        result = await system_service.get_holidays_in_date_range(start_date, end_date)
        
        assert len(result) == 0

    # === ТЕСТЫ ДЛЯ count_holidays_in_date_range ===

    @pytest.mark.asyncio
    async def test_count_holidays_in_date_range(self, system_service, mock_system_repo):
        """Тест подсчета праздников в диапазоне дат."""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 31)
        
        mock_system_repo.count_holidays_in_date_range = AsyncMock(return_value=2)
        
        result = await system_service.count_holidays_in_date_range(start_date, end_date)
        
        assert result == 2
        mock_system_repo.count_holidays_in_date_range.assert_called_once_with(start_date, end_date)

    @pytest.mark.asyncio
    async def test_count_holidays_in_date_range_zero(self, system_service, mock_system_repo):
        """Тест подсчета праздников - ноль праздников."""
        start_date = date(2024, 2, 1)
        end_date = date(2024, 2, 28)
        
        mock_system_repo.count_holidays_in_date_range = AsyncMock(return_value=0)
        
        result = await system_service.count_holidays_in_date_range(start_date, end_date)
        
        assert result == 0

    # === ТЕСТЫ ДЛЯ get_promo_code_by_name ===

    @pytest.mark.asyncio
    async def test_get_promo_code_by_name_success(self, system_service, mock_system_repo):
        """Тест получения промокода по названию - успех."""
        promo_code = MagicMock(spec=PromoCode)
        promo_code.id = 1
        promo_code.code = "DISCOUNT10"
        promo_code.discount_percentage = 10.0
        
        mock_system_repo.get_promo_code_by_name = AsyncMock(return_value=promo_code)
        
        result = await system_service.get_promo_code_by_name("DISCOUNT10")
        
        assert result is not None
        assert result.id == 1
        assert result.code == "DISCOUNT10"
        mock_system_repo.get_promo_code_by_name.assert_called_once_with("DISCOUNT10")

    @pytest.mark.asyncio
    async def test_get_promo_code_by_name_not_found(self, system_service, mock_system_repo):
        """Тест получения промокода по названию - не найден."""
        mock_system_repo.get_promo_code_by_name = AsyncMock(return_value=None)
        
        result = await system_service.get_promo_code_by_name("INVALID")
        
        assert result is None

    # === ТЕСТЫ ДЛЯ get_promo_code_by_id ===

    @pytest.mark.asyncio
    async def test_get_promo_code_by_id_success(self, system_service, mock_system_repo):
        """Тест получения промокода по ID - успех."""
        promo_code = MagicMock(spec=PromoCode)
        promo_code.id = 1
        promo_code.code = "DISCOUNT10"
        
        mock_system_repo.get_promo_code_by_id = AsyncMock(return_value=promo_code)
        
        result = await system_service.get_promo_code_by_id(1)
        
        assert result is not None
        assert result.id == 1
        mock_system_repo.get_promo_code_by_id.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_get_promo_code_by_id_not_found(self, system_service, mock_system_repo):
        """Тест получения промокода по ID - не найден."""
        mock_system_repo.get_promo_code_by_id = AsyncMock(return_value=None)
        
        result = await system_service.get_promo_code_by_id(999)
        
        assert result is None

    # === ТЕСТЫ ДЛЯ get_all_settings ===

    @pytest.mark.asyncio
    async def test_get_all_settings(self, system_service, mock_system_repo):
        """Тест получения всех настроек."""
        setting1 = MagicMock(spec=Setting)
        setting1.id = 1
        setting1.key = "max_rental_days"
        setting1.value = "30"
        
        setting2 = MagicMock(spec=Setting)
        setting2.id = 2
        setting2.key = "min_rental_days"
        setting2.value = "1"
        
        mock_system_repo.get_all_settings = AsyncMock(return_value=[setting1, setting2])
        
        result = await system_service.get_all_settings()
        
        assert len(result) == 2
        assert result[0].key == "max_rental_days"
        assert result[1].key == "min_rental_days"
        mock_system_repo.get_all_settings.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_all_settings_empty(self, system_service, mock_system_repo):
        """Тест получения пустого списка настроек."""
        mock_system_repo.get_all_settings = AsyncMock(return_value=[])
        
        result = await system_service.get_all_settings()
        
        assert len(result) == 0

    # === ТЕСТЫ ДЛЯ upsert_settings ===

    @pytest.mark.asyncio
    async def test_upsert_settings(self, system_service, mock_system_repo):
        """Тест обновления или создания настроек."""
        settings_data = [
            {"key": "max_rental_days", "value": "30"},
            {"key": "min_rental_days", "value": "1"}
        ]
        
        mock_system_repo.upsert_settings = AsyncMock(return_value=None)
        
        await system_service.upsert_settings(settings_data)
        
        mock_system_repo.upsert_settings.assert_called_once_with(settings_data)

    @pytest.mark.asyncio
    async def test_upsert_settings_empty_list(self, system_service, mock_system_repo):
        """Тест обновления настроек с пустым списком."""
        mock_system_repo.upsert_settings = AsyncMock(return_value=None)
        
        await system_service.upsert_settings([])
        
        mock_system_repo.upsert_settings.assert_called_once_with([])



