# tests/services/test_discount_service.py

import pytest
from unittest.mock import AsyncMock, MagicMock

from api.services.discount_service import DiscountService
from api.repositories.discount_repository import DiscountRepository


class TestDiscountService:
    """Тесты для DiscountService."""

    @pytest.fixture
    def mock_discount_repo(self):
        """Создает мок репозитория скидок."""
        return AsyncMock(spec=DiscountRepository)

    @pytest.fixture
    def sample_discount_rule(self):
        """Создает тестовое правило скидки."""
        discount_rule = MagicMock()
        discount_rule.discount_percentage = 15
        discount_rule.min_days = 7
        discount_rule.max_days = 14
        return discount_rule

    @pytest.fixture
    def discount_service(self, mock_discount_repo):
        """Создает экземпляр DiscountService с моком репозитория."""
        return DiscountService(mock_discount_repo)

    @pytest.mark.asyncio
    async def test_get_duration_discount_percentage_success(self, discount_service, mock_discount_repo, sample_discount_rule):
        """Тест успешного получения процента скидки за длительность."""
        # Arrange
        days = 10
        mock_discount_repo.find_for_days.return_value = sample_discount_rule

        # Act
        result = await discount_service.get_duration_discount_percentage(days)

        # Assert
        assert result == 15
        mock_discount_repo.find_for_days.assert_called_once_with(days)

    @pytest.mark.asyncio
    async def test_get_duration_discount_percentage_no_discount(self, discount_service, mock_discount_repo):
        """Тест получения скидки когда правило не найдено."""
        # Arrange
        days = 2
        mock_discount_repo.find_for_days.return_value = None

        # Act
        result = await discount_service.get_duration_discount_percentage(days)

        # Assert
        assert result == 0
        mock_discount_repo.find_for_days.assert_called_once_with(days)

    @pytest.mark.asyncio
    async def test_get_duration_discount_percentage_zero_days(self, discount_service, mock_discount_repo):
        """Тест получения скидки для нулевого количества дней."""
        # Arrange
        days = 0
        mock_discount_repo.find_for_days.return_value = None

        # Act
        result = await discount_service.get_duration_discount_percentage(days)

        # Assert
        assert result == 0
        mock_discount_repo.find_for_days.assert_called_once_with(days)

    @pytest.mark.asyncio
    async def test_get_duration_discount_percentage_negative_days(self, discount_service, mock_discount_repo):
        """Тест получения скидки для отрицательного количества дней."""
        # Arrange
        days = -5
        mock_discount_repo.find_for_days.return_value = None

        # Act
        result = await discount_service.get_duration_discount_percentage(days)

        # Assert
        assert result == 0
        mock_discount_repo.find_for_days.assert_called_once_with(days)

    @pytest.mark.asyncio
    async def test_get_duration_discount_percentage_large_days(self, discount_service, mock_discount_repo, sample_discount_rule):
        """Тест получения скидки для большого количества дней."""
        # Arrange
        days = 100
        sample_discount_rule.discount_percentage = 25
        mock_discount_repo.find_for_days.return_value = sample_discount_rule

        # Act
        result = await discount_service.get_duration_discount_percentage(days)

        # Assert
        assert result == 25
        mock_discount_repo.find_for_days.assert_called_once_with(days)

    @pytest.mark.asyncio
    async def test_get_duration_discount_percentage_zero_percentage(self, discount_service, mock_discount_repo):
        """Тест получения скидки с нулевым процентом."""
        # Arrange
        days = 5
        discount_rule = MagicMock()
        discount_rule.discount_percentage = 0
        mock_discount_repo.find_for_days.return_value = discount_rule

        # Act
        result = await discount_service.get_duration_discount_percentage(days)

        # Assert
        assert result == 0
        mock_discount_repo.find_for_days.assert_called_once_with(days)

    @pytest.mark.asyncio
    async def test_get_duration_discount_percentage_max_percentage(self, discount_service, mock_discount_repo):
        """Тест получения максимальной скидки."""
        # Arrange
        days = 30
        discount_rule = MagicMock()
        discount_rule.discount_percentage = 100
        mock_discount_repo.find_for_days.return_value = discount_rule

        # Act
        result = await discount_service.get_duration_discount_percentage(days)

        # Assert
        assert result == 100
        mock_discount_repo.find_for_days.assert_called_once_with(days)

    @pytest.mark.asyncio
    async def test_get_duration_discount_percentage_repository_error(self, discount_service, mock_discount_repo):
        """Тест обработки ошибки репозитория."""
        # Arrange
        days = 7
        mock_discount_repo.find_for_days.side_effect = Exception("Database error")

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await discount_service.get_duration_discount_percentage(days)

        assert "Database error" in str(exc_info.value)
        mock_discount_repo.find_for_days.assert_called_once_with(days)

    @pytest.mark.asyncio
    async def test_get_duration_discount_percentage_multiple_calls(self, discount_service, mock_discount_repo, sample_discount_rule):
        """Тест множественных вызовов функции."""
        # Arrange
        mock_discount_repo.find_for_days.return_value = sample_discount_rule

        # Act
        result1 = await discount_service.get_duration_discount_percentage(5)
        result2 = await discount_service.get_duration_discount_percentage(10)
        result3 = await discount_service.get_duration_discount_percentage(15)

        # Assert
        assert result1 == 15
        assert result2 == 15
        assert result3 == 15
        assert mock_discount_repo.find_for_days.call_count == 3

    @pytest.mark.asyncio
    async def test_get_duration_discount_percentage_different_rules(self, discount_service, mock_discount_repo):
        """Тест получения разных правил скидок."""
        # Arrange
        rule1 = MagicMock()
        rule1.discount_percentage = 10
        rule2 = MagicMock()
        rule2.discount_percentage = 20
        rule3 = MagicMock()
        rule3.discount_percentage = 30

        mock_discount_repo.find_for_days.side_effect = [rule1, rule2, rule3]

        # Act
        result1 = await discount_service.get_duration_discount_percentage(3)
        result2 = await discount_service.get_duration_discount_percentage(7)
        result3 = await discount_service.get_duration_discount_percentage(14)

        # Assert
        assert result1 == 10
        assert result2 == 20
        assert result3 == 30
        assert mock_discount_repo.find_for_days.call_count == 3

    @pytest.mark.asyncio
    async def test_get_duration_discount_percentage_edge_cases(self, discount_service, mock_discount_repo):
        """Тест граничных случаев."""
        # Test case 1: Exactly 1 day
        mock_discount_repo.find_for_days.return_value = None
        result = await discount_service.get_duration_discount_percentage(1)
        assert result == 0

        # Test case 2: Very large number
        discount_rule = MagicMock()
        discount_rule.discount_percentage = 50
        mock_discount_repo.find_for_days.return_value = discount_rule
        result = await discount_service.get_duration_discount_percentage(999999)
        assert result == 50

        # Test case 3: Float converted to int
        result = await discount_service.get_duration_discount_percentage(7.5)
        assert result == 50
