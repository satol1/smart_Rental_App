# tests/services/test_promo_code_business_logic_fixed.py
"""
Исправленные тесты для PromoCodeBusinessLogic.
Исправляет проблемы с мокированием __init__ методов.
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


class TestPromoCodeBusinessLogicFixed:
    """Исправленные тесты для PromoCodeBusinessLogic."""

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        from unittest.mock import MagicMock
        
        session = AsyncMock()
        # Создаем мок для асинхронного контекстного менеджера
        context_manager = MagicMock()
        context_manager.__aenter__ = AsyncMock(return_value=None)
        context_manager.__aexit__ = AsyncMock(return_value=None)
        # Делаем begin_nested синхронным, возвращающим контекстный менеджер
        session.begin_nested = MagicMock(return_value=context_manager)
        return session

    @pytest.fixture
    def mock_validator(self):
        """Мок валидатора промокодов"""
        return AsyncMock()

    @pytest.fixture
    def mock_promo_code_repo(self):
        """Мок репозитория промокодов"""
        return AsyncMock()

    @pytest.fixture
    def promo_code_logic(self, mock_db_session, mock_validator, mock_promo_code_repo):
        """Создает экземпляр PromoCodeBusinessLogic с мок-зависимостями."""
        return PromoCodeBusinessLogic(
            db=mock_db_session, 
            validator=mock_validator, 
            promo_code_repo=mock_promo_code_repo
        )

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
        promo_code.is_personal = False
        promo_code.created_by_user_id = None
        promo_code.max_uses_per_user = None
        return promo_code

    @pytest.fixture
    def sample_user(self):
        """Создает тестового пользователя."""
        user = User(
            id=1,
            email="test@example.com",
            full_name="Test User",
            phone="+1234567890"
        )
        return user

    # Тесты для validate_and_get_promo_code
    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_success(self, promo_code_logic, mock_validator, sample_promo_code):
        """Тест успешной валидации промокода"""
        # Настраиваем мок
        mock_validator.validate_complete.return_value = sample_promo_code
        
        # Выполняем тест
        result = await promo_code_logic.validate_and_get_promo_code(
            code="TEST10",
            order_amount=1000.0,
            equipment_ids=[1, 2],
            user=None
        )
        
        # Проверяем результат
        assert result == sample_promo_code
        mock_validator.validate_complete.assert_called_once_with(
            "TEST10", 1000.0, [1, 2], None, skip_usage_limits=False
        )

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_not_found(self, promo_code_logic, mock_validator):
        """Тест валидации несуществующего промокода"""
        # Настраиваем мок для выброса исключения
        mock_validator.validate_complete.side_effect = PromoCodeNotFoundError()
        
        # Проверяем, что исключение пробрасывается
        with pytest.raises(PromoCodeNotFoundError):
            await promo_code_logic.validate_and_get_promo_code(
                code="INVALID",
                order_amount=1000.0,
                equipment_ids=[1, 2],
                user=None
            )

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_inactive(self, promo_code_logic, mock_validator):
        """Тест валидации неактивного промокода"""
        # Настраиваем мок для выброса исключения
        mock_validator.validate_complete.side_effect = PromoCodeInactiveError()
        
        # Проверяем, что исключение пробрасывается
        with pytest.raises(PromoCodeInactiveError):
            await promo_code_logic.validate_and_get_promo_code(
                code="INACTIVE",
                order_amount=1000.0,
                equipment_ids=[1, 2],
                user=None
            )

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_expired(self, promo_code_logic, mock_validator):
        """Тест валидации истекшего промокода"""
        # Настраиваем мок для выброса исключения
        mock_validator.validate_complete.side_effect = PromoCodeExpiredError()
        
        # Проверяем, что исключение пробрасывается
        with pytest.raises(PromoCodeExpiredError):
            await promo_code_logic.validate_and_get_promo_code(
                code="EXPIRED",
                order_amount=1000.0,
                equipment_ids=[1, 2],
                user=None
            )

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_usage_limit_exceeded(self, promo_code_logic, mock_validator):
        """Тест валидации промокода с превышением лимита использований"""
        # Настраиваем мок для выброса исключения
        mock_validator.validate_complete.side_effect = PromoCodeUsageLimitExceededError()
        
        # Проверяем, что исключение пробрасывается
        with pytest.raises(PromoCodeUsageLimitExceededError):
            await promo_code_logic.validate_and_get_promo_code(
                code="LIMIT_EXCEEDED",
                order_amount=1000.0,
                equipment_ids=[1, 2],
                user=None
            )

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_min_order_amount(self, promo_code_logic, mock_validator):
        """Тест валидации промокода с минимальной суммой заказа"""
        # Настраиваем мок для выброса исключения
        mock_validator.validate_complete.side_effect = PromoCodeMinOrderAmountError("Минимальная сумма заказа не достигнута")
        
        # Проверяем, что исключение пробрасывается
        with pytest.raises(PromoCodeMinOrderAmountError):
            await promo_code_logic.validate_and_get_promo_code(
                code="MIN_AMOUNT",
                order_amount=100.0,  # Маленькая сумма
                equipment_ids=[1, 2],
                user=None
            )

    # Тесты для create_validation_response
    def test_create_validation_response_success(self, promo_code_logic, sample_promo_code):
        """Тест создания ответа валидации"""
        # Выполняем тест
        result = promo_code_logic.create_validation_response(sample_promo_code)
        
        # Проверяем результат
        assert isinstance(result, PromoCodeValidateResponse)
        assert result.code == "TEST10"
        assert result.discount_percentage == 10.0
        assert result.message == "Промокод успешно применен!"

    # Тесты для record_promo_code_usage
    @pytest.mark.asyncio
    async def test_record_promo_code_usage_success(self, promo_code_logic, mock_promo_code_repo, mock_db_session, sample_promo_code, sample_user):
        """Тест записи использования промокода"""
        # Настраиваем моки
        mock_promo_code_repo.increment_usage_counter = AsyncMock()
        mock_promo_code_repo.record_promo_code_usage = AsyncMock()

        # Выполняем тест
        await promo_code_logic.record_promo_code_usage(sample_promo_code, sample_user)

        # Проверяем, что методы были вызваны (коммит выполняет middleware — db.commit не вызывается)
        from unittest.mock import ANY
        mock_promo_code_repo.increment_usage_counter.assert_called_once_with(sample_promo_code.id)
        mock_promo_code_repo.record_promo_code_usage.assert_called_once_with(sample_user.id, sample_promo_code.id, ANY)

    @pytest.mark.asyncio
    async def test_record_promo_code_usage_anonymous_user(self, promo_code_logic, mock_promo_code_repo, sample_promo_code):
        """Тест записи использования промокода анонимным пользователем"""
        # Настраиваем мок
        mock_promo_code_repo.increment_usage_counter.return_value = None
        
        # Выполняем тест
        await promo_code_logic.record_promo_code_usage(sample_promo_code, None)
        
        # Проверяем, что только increment_usage_counter был вызван
        mock_promo_code_repo.increment_usage_counter.assert_called_once_with(sample_promo_code.id)
        mock_promo_code_repo.record_promo_code_usage.assert_not_called()

    @pytest.mark.asyncio
    async def test_record_promo_code_usage_existing_usage(self, promo_code_logic, mock_promo_code_repo, mock_db_session, sample_promo_code, sample_user):
        """Каждое применение промокода записывается отдельной строкой истории:
        лимит max_uses_per_user проверяет валидатор до применения, а не запись"""
        # Настраиваем моки
        mock_promo_code_repo.increment_usage_counter = AsyncMock()
        mock_promo_code_repo.record_promo_code_usage = AsyncMock()

        # Выполняем тест
        await promo_code_logic.record_promo_code_usage(sample_promo_code, sample_user)

        # Счётчик и запись об использовании создаются на каждое применение
        mock_promo_code_repo.increment_usage_counter.assert_called_once_with(sample_promo_code.id)
        mock_promo_code_repo.record_promo_code_usage.assert_called_once()

    # Тесты для calculate_discount_amount
    def test_calculate_discount_amount_normal_case(self, promo_code_logic, sample_promo_code):
        """Тест расчета суммы скидки в обычном случае"""
        # Выполняем тест
        result = promo_code_logic.calculate_discount_amount(1000.0, sample_promo_code)
        
        # Проверяем результат (10% от 1000 = 100)
        assert result == 100.0

    def test_calculate_discount_amount_zero_percentage(self, promo_code_logic, sample_promo_code):
        """Тест расчета суммы скидки с нулевым процентом"""
        # Настраиваем промокод с нулевым процентом
        sample_promo_code.discount_percentage = 0.0
        
        # Выполняем тест
        result = promo_code_logic.calculate_discount_amount(1000.0, sample_promo_code)
        
        # Проверяем результат
        assert result == 0.0

    def test_calculate_discount_amount_100_percentage(self, promo_code_logic, sample_promo_code):
        """Тест расчета суммы скидки со 100% скидкой"""
        # Настраиваем промокод со 100% скидкой
        sample_promo_code.discount_percentage = 100.0
        
        # Выполняем тест
        result = promo_code_logic.calculate_discount_amount(1000.0, sample_promo_code)
        
        # Проверяем результат
        assert result == 1000.0

    def test_calculate_discount_amount_zero_base_amount(self, promo_code_logic, sample_promo_code):
        """Тест расчета суммы скидки с нулевой базовой суммой"""
        # Выполняем тест
        result = promo_code_logic.calculate_discount_amount(0.0, sample_promo_code)
        
        # Проверяем результат
        assert result == 0.0

    # Тесты для calculate_final_amount_with_promo
    def test_calculate_final_amount_with_promo_normal_case(self, promo_code_logic, sample_promo_code):
        """Тест расчета итоговой суммы с промокодом в обычном случае"""
        # Выполняем тест
        result = promo_code_logic.calculate_final_amount_with_promo(1000.0, sample_promo_code)
        
        # Проверяем результат (1000 - 10% = 900)
        assert result == 900.0

    def test_calculate_final_amount_with_promo_full_discount(self, promo_code_logic, sample_promo_code):
        """Тест расчета итоговой суммы с полной скидкой"""
        # Настраиваем промокод со 100% скидкой
        sample_promo_code.discount_percentage = 100.0
        
        # Выполняем тест
        result = promo_code_logic.calculate_final_amount_with_promo(1000.0, sample_promo_code)
        
        # Проверяем результат
        assert result == 0.0

    # Тесты для validate_combined_discount
    def test_validate_combined_discount_within_limit(self, promo_code_logic):
        """Тест валидации комбинированной скидки в пределах лимита"""
        # Выполняем тест
        result = promo_code_logic.validate_combined_discount(10.0, 5.0)
        
        # Проверяем результат (10 + 5 = 15, что меньше 50)
        assert result == 15.0

    def test_validate_combined_discount_exceeds_limit(self, promo_code_logic):
        """Тест валидации комбинированной скидки превышающей лимит"""
        # Выполняем тест
        result = promo_code_logic.validate_combined_discount(50.0, 30.0)
        
        # Проверяем результат (50 + 30 = 80, но ограничено 75)
        assert result == 75.0

    def test_validate_combined_discount_zero_discounts(self, promo_code_logic):
        """Тест валидации комбинированной скидки с нулевыми скидками"""
        # Выполняем тест
        result = promo_code_logic.validate_combined_discount(0.0, 0.0)
        
        # Проверяем результат
        assert result == 0.0

    def test_validate_combined_discount_exactly_at_limit(self, promo_code_logic):
        """Тест валидации комбинированной скидки точно на лимите"""
        # Выполняем тест
        result = promo_code_logic.validate_combined_discount(25.0, 25.0)
        
        # Проверяем результат (25 + 25 = 50, что равно лимиту)
        assert result == 50.0

    # Тесты для get_promo_code_statistics
    def test_get_promo_code_statistics_normal_case(self, promo_code_logic, sample_promo_code):
        """Тест получения статистики промокода в обычном случае"""
        # Выполняем тест
        result = promo_code_logic.get_promo_code_statistics(sample_promo_code)
        
        # Проверяем результат
        assert result["total_uses"] == 0
        assert result["max_uses"] == 100
        assert result["remaining_uses"] == 100  # 100 - 0
        assert result["is_fully_used"] is False

    def test_get_promo_code_statistics_fully_used(self, promo_code_logic, sample_promo_code):
        """Тест получения статистики полностью использованного промокода"""
        # Настраиваем промокод как полностью использованный
        sample_promo_code.times_used = 100
        sample_promo_code.max_uses = 100
        
        # Выполняем тест
        result = promo_code_logic.get_promo_code_statistics(sample_promo_code)
        
        # Проверяем результат
        assert result["total_uses"] == 100
        assert result["remaining_uses"] == 0
        assert result["is_fully_used"] is True

    def test_get_promo_code_statistics_unlimited_uses(self, promo_code_logic, sample_promo_code):
        """Тест получения статистики промокода с неограниченным количеством использований"""
        # Настраиваем промокод с неограниченным количеством использований
        sample_promo_code.max_uses = None
        
        # Выполняем тест
        result = promo_code_logic.get_promo_code_statistics(sample_promo_code)
        
        # Проверяем результат
        assert result["total_uses"] == 0
        assert result["max_uses"] is None
        assert result["remaining_uses"] is None  # Неограниченно
        assert result["is_fully_used"] is False

    # Тесты для is_promo_code_expired
    def test_is_promo_code_expired_not_expired(self, promo_code_logic, sample_promo_code):
        """Тест проверки не истекшего промокода"""
        # Настраиваем промокод с будущей датой истечения
        sample_promo_code.expires_at = datetime.now(timezone.utc) + timedelta(days=1)
        
        # Выполняем тест
        result = promo_code_logic.is_promo_code_expired(sample_promo_code)
        
        # Проверяем результат
        assert result is False

    def test_is_promo_code_expired_expired(self, promo_code_logic, sample_promo_code):
        """Тест проверки истекшего промокода"""
        # Настраиваем промокод с прошедшей датой истечения
        sample_promo_code.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
        
        # Выполняем тест
        result = promo_code_logic.is_promo_code_expired(sample_promo_code)
        
        # Проверяем результат
        assert result is True

    def test_is_promo_code_expired_no_expiry_date(self, promo_code_logic, sample_promo_code):
        """Тест проверки промокода без даты истечения"""
        # Настраиваем промокод без даты истечения
        sample_promo_code.expires_at = None
        
        # Выполняем тест
        result = promo_code_logic.is_promo_code_expired(sample_promo_code)
        
        # Проверяем результат
        assert result is False

    # Тесты для is_promo_code_active
    def test_is_promo_code_active_fully_active(self, promo_code_logic, sample_promo_code):
        """Тест проверки полностью активного промокода"""
        # Настраиваем полностью активный промокод
        sample_promo_code.is_active = True
        sample_promo_code.valid_from = None
        sample_promo_code.expires_at = None
        
        # Выполняем тест
        result = promo_code_logic.is_promo_code_active(sample_promo_code)
        
        # Проверяем результат
        assert result is True

    def test_is_promo_code_active_inactive(self, promo_code_logic, sample_promo_code):
        """Тест проверки неактивного промокода"""
        # Настраиваем неактивный промокод
        sample_promo_code.is_active = False
        
        # Выполняем тест
        result = promo_code_logic.is_promo_code_active(sample_promo_code)
        
        # Проверяем результат
        assert result is False

    def test_is_promo_code_active_not_started(self, promo_code_logic, sample_promo_code):
        """Тест проверки промокода, который еще не начал действовать"""
        # Настраиваем промокод с будущей датой начала
        sample_promo_code.is_active = True
        sample_promo_code.valid_from = datetime.now(timezone.utc) + timedelta(days=1)
        sample_promo_code.expires_at = None
        
        # Выполняем тест
        result = promo_code_logic.is_promo_code_active(sample_promo_code)
        
        # Проверяем результат
        assert result is False

    def test_is_promo_code_active_expired(self, promo_code_logic, sample_promo_code):
        """Тест проверки истекшего промокода"""
        # Настраиваем истекший промокод
        sample_promo_code.is_active = True
        sample_promo_code.valid_from = None
        sample_promo_code.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
        
        # Выполняем тест
        result = promo_code_logic.is_promo_code_active(sample_promo_code)
        
        # Проверяем результат
        assert result is False

    def test_is_promo_code_active_in_valid_period(self, promo_code_logic, sample_promo_code):
        """Тест проверки промокода в действующем периоде"""
        # Настраиваем промокод в действующем периоде
        now = datetime.now(timezone.utc)
        sample_promo_code.is_active = True
        sample_promo_code.valid_from = now - timedelta(days=1)
        sample_promo_code.expires_at = now + timedelta(days=1)
        
        # Выполняем тест
        result = promo_code_logic.is_promo_code_active(sample_promo_code)
        
        # Проверяем результат
        assert result is True
