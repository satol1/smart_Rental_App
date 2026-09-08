# tests/services/test_promo_code_business_logic.py
"""
Тесты для PromoCodeBusinessLogic - сложной логики промокодов с правилами и условиями.
Тестирует валидацию, расчет скидок, комбинированные скидки и пограничные случаи.
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from api.services.promo_code.promo_code_business_logic import PromoCodeBusinessLogic
from api.models.promo_code import PromoCode
from api.models.user import User
from api.models.equipment import Equipment
from api.services.promo_code.exceptions import (
    PromoCodeNotFoundError, PromoCodeInactiveError, PromoCodeNotStartedError,
    PromoCodeExpiredError, PromoCodeUsageLimitExceededError, PromoCodeMinOrderAmountError,
    PromoCodeInvalidEquipmentError, PromoCodeInvalidEquipmentTypeError,
    PromoCodePersonalCodeForbiddenError, PromoCodeUserUsageLimitError
)
from shared.schemas.promo_code_schema import PromoCodeValidateResponse


class TestPromoCodeBusinessLogic:
    """Тесты для PromoCodeBusinessLogic."""

    @pytest.fixture
    def promo_code_logic(self, mock_db_session):
        """Создает экземпляр PromoCodeBusinessLogic с моком БД и зависимостями."""
        mock_validator = AsyncMock()
        mock_promo_code_repo = AsyncMock()
        mock_equipment_repo = AsyncMock()
        # Передаём уже «инициализированный» валидатор как зависимость
        return PromoCodeBusinessLogic(db=mock_db_session, validator=mock_validator, promo_code_repo=mock_promo_code_repo)

    @pytest.fixture
    def sample_promo_code(self):
        """Создает тестовый промокод."""
        promo_code = MagicMock(spec=PromoCode)
        promo_code.id = 1
        promo_code.code = "TEST10"
        promo_code.discount_percentage = 10.0
        promo_code.is_active = True
        promo_code.times_used = 0
        promo_code.max_uses = 100
        promo_code.min_order_amount = None
        promo_code.valid_from = None
        promo_code.expires_at = None
        promo_code.applicable_to_equipment_ids = None
        promo_code.applicable_to_equipment_types = None
        promo_code.specific_to_user_id = None
        promo_code.max_uses_per_user = None
        return promo_code

    @pytest.fixture
    def sample_user(self):
        """Создает тестового пользователя."""
        user = MagicMock(spec=User)
        user.id = 1
        user.email = "test@example.com"
        return user

    @pytest.fixture
    def sample_equipment(self):
        """Создает тестовое оборудование."""
        equipment = MagicMock(spec=Equipment)
        equipment.id = 1
        equipment.name = "Test Camera"
        equipment.equipment_type = "camera"
        return equipment

    # === ТЕСТЫ ДЛЯ validate_and_get_promo_code ===

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_success(self, promo_code_logic, sample_promo_code, sample_user, sample_equipment_ids):
        """
        Тест успешной валидации промокода.
        """
        # Arrange
        code = "TEST10"
        order_amount = 1000.0
        equipment_ids = sample_equipment_ids
        
        # Мокаем валидатор
        with patch.object(promo_code_logic.validator, 'validate_complete', return_value=sample_promo_code):
            # Act
            result = await promo_code_logic.validate_and_get_promo_code(
                code, order_amount, equipment_ids, sample_user
            )

            # Assert
            assert result == sample_promo_code
            promo_code_logic.validator.validate_complete.assert_called_once_with(
                code, order_amount, equipment_ids, sample_user, skip_usage_limits=False
            )

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_not_found(self, promo_code_logic, sample_user, sample_equipment_ids):
        """
        Тест валидации несуществующего промокода.
        """
        # Arrange
        code = "INVALID"
        order_amount = 1000.0
        equipment_ids = sample_equipment_ids
        
        # Мокаем валидатор для выброса исключения
        with patch.object(promo_code_logic.validator, 'validate_complete', side_effect=PromoCodeNotFoundError()):
            # Act & Assert
            with pytest.raises(PromoCodeNotFoundError):
                await promo_code_logic.validate_and_get_promo_code(
                    code, order_amount, equipment_ids, sample_user
                )

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_inactive(self, promo_code_logic, sample_user, sample_equipment_ids):
        """
        Тест валидации неактивного промокода.
        """
        # Arrange
        code = "INACTIVE"
        order_amount = 1000.0
        equipment_ids = sample_equipment_ids
        
        # Мокаем валидатор для выброса исключения
        with patch.object(promo_code_logic.validator, 'validate_complete', side_effect=PromoCodeInactiveError()):
            # Act & Assert
            with pytest.raises(PromoCodeInactiveError):
                await promo_code_logic.validate_and_get_promo_code(
                    code, order_amount, equipment_ids, sample_user
                )

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_expired(self, promo_code_logic, sample_user, sample_equipment_ids):
        """
        Тест валидации истекшего промокода.
        """
        # Arrange
        code = "EXPIRED"
        order_amount = 1000.0
        equipment_ids = sample_equipment_ids
        
        # Мокаем валидатор для выброса исключения
        with patch.object(promo_code_logic.validator, 'validate_complete', side_effect=PromoCodeExpiredError()):
            # Act & Assert
            with pytest.raises(PromoCodeExpiredError):
                await promo_code_logic.validate_and_get_promo_code(
                    code, order_amount, equipment_ids, sample_user
                )

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_usage_limit_exceeded(self, promo_code_logic, sample_user, sample_equipment_ids):
        """
        Тест валидации промокода с исчерпанным лимитом использований.
        """
        # Arrange
        code = "LIMIT_EXCEEDED"
        order_amount = 1000.0
        equipment_ids = sample_equipment_ids
        
        # Мокаем валидатор для выброса исключения
        with patch.object(promo_code_logic.validator, 'validate_complete', side_effect=PromoCodeUsageLimitExceededError()):
            # Act & Assert
            with pytest.raises(PromoCodeUsageLimitExceededError):
                await promo_code_logic.validate_and_get_promo_code(
                    code, order_amount, equipment_ids, sample_user
                )

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_min_order_amount(self, promo_code_logic, sample_user, sample_equipment_ids):
        """
        Тест валидации промокода с недостаточной суммой заказа.
        """
        # Arrange
        code = "MIN_AMOUNT"
        order_amount = 100.0  # Малая сумма
        equipment_ids = sample_equipment_ids
        
        # Мокаем валидатор для выброса исключения
        with patch.object(promo_code_logic.validator, 'validate_complete', side_effect=PromoCodeMinOrderAmountError(500.0)):
            # Act & Assert
            with pytest.raises(PromoCodeMinOrderAmountError):
                await promo_code_logic.validate_and_get_promo_code(
                    code, order_amount, equipment_ids, sample_user
                )

    # === ТЕСТЫ ДЛЯ create_validation_response ===

    def test_create_validation_response_success(self, promo_code_logic, sample_promo_code):
        """
        Тест создания ответа валидации промокода.
        """
        # Act
        response = promo_code_logic.create_validation_response(sample_promo_code)

        # Assert
        assert isinstance(response, PromoCodeValidateResponse)
        assert response.code == sample_promo_code.code
        assert response.discount_percentage == sample_promo_code.discount_percentage
        assert response.message == "Промокод успешно применен!"

    # === ТЕСТЫ ДЛЯ record_promo_code_usage ===

    @pytest.mark.asyncio
    async def test_record_promo_code_usage_success(self, promo_code_logic, mock_db_session, sample_promo_code, sample_user):
        """
        Тест записи использования промокода.
        """
        # Arrange
        # Мокируем async context manager для begin_nested
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        mock_db_session.commit = AsyncMock()
        
        # Мокируем методы репозитория
        promo_code_logic.promo_code_repo.increment_usage_counter = AsyncMock()
        promo_code_logic.promo_code_repo.record_promo_code_usage = AsyncMock()

        # Act
        await promo_code_logic.record_promo_code_usage(sample_promo_code, sample_user)
        
        # Assert
        # Проверяем, что методы репозитория были вызваны (коммитит middleware)
        promo_code_logic.promo_code_repo.increment_usage_counter.assert_called_once_with(sample_promo_code.id)
        promo_code_logic.promo_code_repo.record_promo_code_usage.assert_called_once()
        mock_db_session.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_record_promo_code_usage_anonymous_user(self, promo_code_logic, mock_db_session, sample_promo_code):
        """
        Тест записи использования промокода анонимным пользователем.
        """
        # Arrange
        mock_db_session.begin_nested.return_value.__aenter__.return_value = None
        mock_db_session.begin_nested.return_value.__aexit__.return_value = None
        mock_db_session.commit.return_value = None

        # Act
        await promo_code_logic.record_promo_code_usage(sample_promo_code, None)
        
        # Assert
        # Счётчик увеличивается через репозиторий, не через изменение поля объекта
        assert sample_promo_code.times_used == 0
        
        # Коммит выполняет middleware — db.commit не вызывается
        mock_db_session.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_record_promo_code_usage_existing_usage(self, promo_code_logic, mock_db_session, sample_promo_code, sample_user):
        """
        Тест записи использования промокода при существующем использовании.
        """
        # Arrange
        # Мокируем async context manager для begin_nested
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        mock_db_session.commit = AsyncMock()
        
        # Мокируем методы репозитория
        promo_code_logic.promo_code_repo.increment_usage_counter = AsyncMock()
        promo_code_logic.promo_code_repo.record_promo_code_usage = AsyncMock()

        # Act
        await promo_code_logic.record_promo_code_usage(sample_promo_code, sample_user)
        
        # Assert
        # Каждое применение записывается: лимит на пользователя проверяет валидатор
        promo_code_logic.promo_code_repo.increment_usage_counter.assert_called_once_with(sample_promo_code.id)
        promo_code_logic.promo_code_repo.record_promo_code_usage.assert_called_once()
        mock_db_session.commit.assert_not_called()

    # === ТЕСТЫ ДЛЯ calculate_discount_amount ===

    def test_calculate_discount_amount_normal_case(self, promo_code_logic, sample_promo_code):
        """
        Тест расчета суммы скидки в нормальном случае.
        """
        # Arrange
        base_amount = 1000.0
        sample_promo_code.discount_percentage = 15.0

        # Act
        discount_amount = promo_code_logic.calculate_discount_amount(base_amount, sample_promo_code)

        # Assert
        assert discount_amount == 150.0  # 1000 * 0.15

    def test_calculate_discount_amount_zero_percentage(self, promo_code_logic, sample_promo_code):
        """
        Тест расчета суммы скидки с нулевым процентом.
        """
        # Arrange
        base_amount = 1000.0
        sample_promo_code.discount_percentage = 0.0

        # Act
        discount_amount = promo_code_logic.calculate_discount_amount(base_amount, sample_promo_code)

        # Assert
        assert discount_amount == 0.0

    def test_calculate_discount_amount_100_percentage(self, promo_code_logic, sample_promo_code):
        """
        Тест расчета суммы скидки со 100% скидкой.
        """
        # Arrange
        base_amount = 1000.0
        sample_promo_code.discount_percentage = 100.0

        # Act
        discount_amount = promo_code_logic.calculate_discount_amount(base_amount, sample_promo_code)

        # Assert
        assert discount_amount == 1000.0

    def test_calculate_discount_amount_zero_base_amount(self, promo_code_logic, sample_promo_code):
        """
        Тест расчета суммы скидки с нулевой базовой суммой.
        """
        # Arrange
        base_amount = 0.0
        sample_promo_code.discount_percentage = 10.0

        # Act
        discount_amount = promo_code_logic.calculate_discount_amount(base_amount, sample_promo_code)

        # Assert
        assert discount_amount == 0.0

    # === ТЕСТЫ ДЛЯ calculate_final_amount_with_promo ===

    def test_calculate_final_amount_with_promo_normal_case(self, promo_code_logic, sample_promo_code):
        """
        Тест расчета финальной суммы с промокодом в нормальном случае.
        """
        # Arrange
        base_amount = 1000.0
        sample_promo_code.discount_percentage = 20.0

        # Act
        final_amount = promo_code_logic.calculate_final_amount_with_promo(base_amount, sample_promo_code)

        # Assert
        assert final_amount == 800.0  # 1000 - (1000 * 0.20)

    def test_calculate_final_amount_with_promo_full_discount(self, promo_code_logic, sample_promo_code):
        """
        Тест расчета финальной суммы с полной скидкой.
        """
        # Arrange
        base_amount = 1000.0
        sample_promo_code.discount_percentage = 100.0

        # Act
        final_amount = promo_code_logic.calculate_final_amount_with_promo(base_amount, sample_promo_code)

        # Assert
        assert final_amount == 0.0

    # === ТЕСТЫ ДЛЯ validate_combined_discount ===

    def test_validate_combined_discount_within_limit(self, promo_code_logic):
        """
        Тест валидации комбинированной скидки в пределах лимита.
        """
        # Arrange
        duration_discount = 20.0
        promo_discount = 10.0

        # Act
        total_discount = promo_code_logic.validate_combined_discount(duration_discount, promo_discount)

        # Assert
        assert total_discount == 30.0  # 20 + 10

    def test_validate_combined_discount_exceeds_limit(self, promo_code_logic):
        """
        Тест валидации комбинированной скидки, превышающей лимит.
        """
        # Arrange
        duration_discount = 50.0
        promo_discount = 30.0  # Итого 80%, что превышает лимит 75%

        # Act
        total_discount = promo_code_logic.validate_combined_discount(duration_discount, promo_discount)

        # Assert
        assert total_discount == 75.0  # Максимальный лимит

    def test_validate_combined_discount_zero_discounts(self, promo_code_logic):
        """
        Тест валидации комбинированной скидки с нулевыми скидками.
        """
        # Arrange
        duration_discount = 0.0
        promo_discount = 0.0

        # Act
        total_discount = promo_code_logic.validate_combined_discount(duration_discount, promo_discount)

        # Assert
        assert total_discount == 0.0

    def test_validate_combined_discount_exactly_at_limit(self, promo_code_logic):
        """
        Тест валидации комбинированной скидки точно на лимите.
        """
        # Arrange
        duration_discount = 50.0
        promo_discount = 25.0  # Итого 75%, что равно лимиту

        # Act
        total_discount = promo_code_logic.validate_combined_discount(duration_discount, promo_discount)

        # Assert
        assert total_discount == 75.0

    # === ТЕСТЫ ДЛЯ get_promo_code_statistics ===

    def test_get_promo_code_statistics_normal_case(self, promo_code_logic, sample_promo_code):
        """
        Тест получения статистики промокода в нормальном случае.
        """
        # Arrange
        sample_promo_code.times_used = 25
        sample_promo_code.max_uses = 100

        # Act
        stats = promo_code_logic.get_promo_code_statistics(sample_promo_code)

        # Assert
        assert stats['total_uses'] == 25
        assert stats['max_uses'] == 100
        assert stats['usage_percentage'] == 25.0
        assert stats['is_fully_used'] == False
        assert stats['remaining_uses'] == 75

    def test_get_promo_code_statistics_fully_used(self, promo_code_logic, sample_promo_code):
        """
        Тест получения статистики полностью использованного промокода.
        """
        # Arrange
        sample_promo_code.times_used = 100
        sample_promo_code.max_uses = 100

        # Act
        stats = promo_code_logic.get_promo_code_statistics(sample_promo_code)

        # Assert
        assert stats['total_uses'] == 100
        assert stats['max_uses'] == 100
        assert stats['usage_percentage'] == 100.0
        assert stats['is_fully_used'] == True
        assert stats['remaining_uses'] == 0

    def test_get_promo_code_statistics_unlimited_uses(self, promo_code_logic, sample_promo_code):
        """
        Тест получения статистики промокода с неограниченным количеством использований.
        """
        # Arrange
        sample_promo_code.times_used = 50
        sample_promo_code.max_uses = None

        # Act
        stats = promo_code_logic.get_promo_code_statistics(sample_promo_code)

        # Assert
        assert stats['total_uses'] == 50
        assert stats['max_uses'] == None
        assert stats['usage_percentage'] == None
        assert stats['is_fully_used'] == False
        assert stats['remaining_uses'] == None

    # === ТЕСТЫ ДЛЯ is_promo_code_expired ===

    def test_is_promo_code_expired_not_expired(self, promo_code_logic, sample_promo_code):
        """
        Тест проверки истечения срока действия промокода (не истек).
        """
        # Arrange
        future_date = datetime.now(timezone.utc) + timedelta(days=30)
        sample_promo_code.expires_at = future_date

        # Act
        is_expired = promo_code_logic.is_promo_code_expired(sample_promo_code)

        # Assert
        assert is_expired == False

    def test_is_promo_code_expired_expired(self, promo_code_logic, sample_promo_code):
        """
        Тест проверки истечения срока действия промокода (истек).
        """
        # Arrange
        past_date = datetime.now(timezone.utc) - timedelta(days=1)
        sample_promo_code.expires_at = past_date

        # Act
        is_expired = promo_code_logic.is_promo_code_expired(sample_promo_code)

        # Assert
        assert is_expired == True

    def test_is_promo_code_expired_no_expiry_date(self, promo_code_logic, sample_promo_code):
        """
        Тест проверки истечения срока действия промокода без даты истечения.
        """
        # Arrange
        sample_promo_code.expires_at = None

        # Act
        is_expired = promo_code_logic.is_promo_code_expired(sample_promo_code)

        # Assert
        assert is_expired == False

    # === ТЕСТЫ ДЛЯ is_promo_code_active ===

    def test_is_promo_code_active_fully_active(self, promo_code_logic, sample_promo_code):
        """
        Тест проверки активности промокода (полностью активен).
        """
        # Arrange
        sample_promo_code.is_active = True
        sample_promo_code.valid_from = None
        sample_promo_code.expires_at = None

        # Act
        is_active = promo_code_logic.is_promo_code_active(sample_promo_code)

        # Assert
        assert is_active == True

    def test_is_promo_code_active_inactive(self, promo_code_logic, sample_promo_code):
        """
        Тест проверки активности неактивного промокода.
        """
        # Arrange
        sample_promo_code.is_active = False

        # Act
        is_active = promo_code_logic.is_promo_code_active(sample_promo_code)

        # Assert
        assert is_active == False

    def test_is_promo_code_active_not_started(self, promo_code_logic, sample_promo_code):
        """
        Тест проверки активности промокода, который еще не начал действовать.
        """
        # Arrange
        sample_promo_code.is_active = True
        future_date = datetime.now(timezone.utc) + timedelta(days=1)
        sample_promo_code.valid_from = future_date
        sample_promo_code.expires_at = None

        # Act
        is_active = promo_code_logic.is_promo_code_active(sample_promo_code)

        # Assert
        assert is_active == False

    def test_is_promo_code_active_expired(self, promo_code_logic, sample_promo_code):
        """
        Тест проверки активности истекшего промокода.
        """
        # Arrange
        sample_promo_code.is_active = True
        sample_promo_code.valid_from = None
        past_date = datetime.now(timezone.utc) - timedelta(days=1)
        sample_promo_code.expires_at = past_date

        # Act
        is_active = promo_code_logic.is_promo_code_active(sample_promo_code)

        # Assert
        assert is_active == False

    def test_is_promo_code_active_in_valid_period(self, promo_code_logic, sample_promo_code):
        """
        Тест проверки активности промокода в период действия.
        """
        # Arrange
        sample_promo_code.is_active = True
        past_date = datetime.now(timezone.utc) - timedelta(days=1)
        future_date = datetime.now(timezone.utc) + timedelta(days=1)
        sample_promo_code.valid_from = past_date
        sample_promo_code.expires_at = future_date

        # Act
        is_active = promo_code_logic.is_promo_code_active(sample_promo_code)

        # Assert
        assert is_active == True
