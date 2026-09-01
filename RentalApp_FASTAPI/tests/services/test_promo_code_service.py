# tests/services/test_promo_code_service.py

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

from api.services.promo_code_service import PromoCodeService
from api.models.promo_code import PromoCode
from api.models.user import User


class TestPromoCodeService:
    """Тесты для PromoCodeService."""

    @pytest.fixture
    def mock_db(self):
        """Создает мок базы данных."""
        return AsyncMock()

    @pytest.fixture
    def mock_business_logic(self):
        """Создает мок бизнес-логики промокодов."""
        return AsyncMock()

    @pytest.fixture
    def promo_code_service(self, mock_db, mock_business_logic):
        """Создает экземпляр PromoCodeService с моками."""
        return PromoCodeService(mock_db, mock_business_logic)

    @pytest.fixture
    def sample_user(self):
        """Создает тестового пользователя."""
        user = MagicMock(spec=User)
        user.id = 1
        user.email = "test@example.com"
        user.role = "user"
        return user

    @pytest.fixture
    def sample_promo_code(self):
        """Создает тестовый промокод."""
        promo_code = MagicMock(spec=PromoCode)
        promo_code.id = 1
        promo_code.code = "TEST10"
        promo_code.discount_percentage = 10.0
        promo_code.is_active = True
        return promo_code

    @pytest.mark.asyncio
    async def test_validate_promo_code_for_use_success(self, promo_code_service, mock_business_logic, sample_user, sample_promo_code):
        """Тест успешной валидации промокода."""
        # Arrange
        code = "TEST10"
        order_amount = 1000.0
        equipment_ids = [1, 2, 3]
        mock_business_logic.validate_and_get_promo_code.return_value = sample_promo_code

        # Act
        result = await promo_code_service.validate_promo_code_for_use(
            code, order_amount, equipment_ids, sample_user
        )

        # Assert
        assert result == sample_promo_code
        mock_business_logic.validate_and_get_promo_code.assert_called_once_with(
            code, order_amount, equipment_ids, sample_user
        )

    @pytest.mark.asyncio
    async def test_validate_promo_code_for_use_without_user(self, promo_code_service, mock_business_logic, sample_promo_code):
        """Тест валидации промокода без пользователя."""
        # Arrange
        code = "TEST10"
        order_amount = 1000.0
        equipment_ids = [1, 2, 3]
        mock_business_logic.validate_and_get_promo_code.return_value = sample_promo_code

        # Act
        result = await promo_code_service.validate_promo_code_for_use(
            code, order_amount, equipment_ids, None
        )

        # Assert
        assert result == sample_promo_code
        mock_business_logic.validate_and_get_promo_code.assert_called_once_with(
            code, order_amount, equipment_ids, None
        )

    @pytest.mark.asyncio
    async def test_validate_promo_code_for_use_empty_equipment_list(self, promo_code_service, mock_business_logic, sample_user, sample_promo_code):
        """Тест валидации промокода с пустым списком оборудования."""
        # Arrange
        code = "TEST10"
        order_amount = 1000.0
        equipment_ids = []
        mock_business_logic.validate_and_get_promo_code.return_value = sample_promo_code

        # Act
        result = await promo_code_service.validate_promo_code_for_use(
            code, order_amount, equipment_ids, sample_user
        )

        # Assert
        assert result == sample_promo_code
        mock_business_logic.validate_and_get_promo_code.assert_called_once_with(
            code, order_amount, equipment_ids, sample_user
        )

    @pytest.mark.asyncio
    async def test_validate_promo_code_for_use_business_logic_error(self, promo_code_service, mock_business_logic, sample_user):
        """Тест обработки ошибки бизнес-логики."""
        # Arrange
        code = "INVALID"
        order_amount = 1000.0
        equipment_ids = [1, 2, 3]
        mock_business_logic.validate_and_get_promo_code.side_effect = HTTPException(
            status_code=400, detail="Промокод недействителен"
        )

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await promo_code_service.validate_promo_code_for_use(
                code, order_amount, equipment_ids, sample_user
            )

        assert exc_info.value.status_code == 400
        assert "Промокод недействителен" in exc_info.value.detail
        mock_business_logic.validate_and_get_promo_code.assert_called_once_with(
            code, order_amount, equipment_ids, sample_user
        )

    @pytest.mark.asyncio
    async def test_validate_promo_code_for_use_zero_amount(self, promo_code_service, mock_business_logic, sample_user, sample_promo_code):
        """Тест валидации промокода с нулевой суммой заказа."""
        # Arrange
        code = "TEST10"
        order_amount = 0.0
        equipment_ids = [1, 2, 3]
        mock_business_logic.validate_and_get_promo_code.return_value = sample_promo_code

        # Act
        result = await promo_code_service.validate_promo_code_for_use(
            code, order_amount, equipment_ids, sample_user
        )

        # Assert
        assert result == sample_promo_code
        mock_business_logic.validate_and_get_promo_code.assert_called_once_with(
            code, order_amount, equipment_ids, sample_user
        )