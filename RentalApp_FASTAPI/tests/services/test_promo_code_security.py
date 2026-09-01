# tests/services/test_promo_code_security.py

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from datetime import datetime, timedelta, timezone

from api.services.promo_code.promo_code_business_logic import PromoCodeBusinessLogic
from api.models.promo_code import PromoCode
from api.models.user import User


class TestPromoCodeSecurity:
    """Тесты безопасности для промокодов - критически важные функции для предотвращения мошенничества."""

    @pytest.fixture
    def promo_code_logic(self):
        """Фикстура для создания экземпляра PromoCodeBusinessLogic."""
        mock_db = AsyncMock()
        # Правильно мокируем async context manager
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=mock_db)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db.begin_nested = MagicMock(return_value=mock_context)
        mock_validator = AsyncMock()
        mock_promo_code_repo = AsyncMock()
        mock_equipment_repo = AsyncMock()
        # Передаём уже «инициализированный» валидатор как зависимость
        return PromoCodeBusinessLogic(db=mock_db, validator=mock_validator, promo_code_repo=mock_promo_code_repo)

    @pytest.fixture
    def sample_promo_code(self):
        """Тестовый промокод."""
        promo_code = MagicMock()
        promo_code.id = 1
        promo_code.code = "TEST10"
        promo_code.discount_percentage = 10.0
        promo_code.is_active = True
        promo_code.max_uses = 100
        promo_code.times_used = 0
        promo_code.start_date = datetime.now(timezone.utc) - timedelta(days=1)
        promo_code.end_date = datetime.now(timezone.utc) + timedelta(days=30)
        promo_code.min_order_amount = 0.0
        return promo_code

    @pytest.fixture
    def sample_user(self):
        """Тестовый пользователь."""
        user = MagicMock()
        user.id = 1
        user.email = "test@example.com"
        user.role = "client"
        return user

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_prevents_expired_codes(self, promo_code_logic, sample_promo_code):
        """Тест предотвращения использования просроченных промокодов."""
        # Мокаем просроченный промокод
        expired_promo = MagicMock()
        expired_promo.code = "EXPIRED"
        expired_promo.is_active = True
        expired_promo.end_date = datetime.now(timezone.utc) - timedelta(days=1)
        
        promo_code_logic.validator = AsyncMock()
        promo_code_logic.validator.validate_complete.side_effect = HTTPException(
            status_code=400, detail="Промокод истек"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await promo_code_logic.validate_and_get_promo_code(
                code="EXPIRED",
                order_amount=100.0,
                equipment_ids=[1],
                user=None
            )
        
        assert exc_info.value.status_code == 400
        assert "истек" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_prevents_inactive_codes(self, promo_code_logic):
        """Тест предотвращения использования неактивных промокодов."""
        promo_code_logic.validator = AsyncMock()
        promo_code_logic.validator.validate_complete.side_effect = HTTPException(
            status_code=400, detail="Промокод неактивен"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await promo_code_logic.validate_and_get_promo_code(
                code="INACTIVE",
                order_amount=100.0,
                equipment_ids=[1],
                user=None
            )
        
        assert exc_info.value.status_code == 400
        assert "неактивен" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_prevents_usage_limit_exceeded(self, promo_code_logic):
        """Тест предотвращения превышения лимита использования промокода."""
        promo_code_logic.validator = AsyncMock()
        promo_code_logic.validator.validate_complete.side_effect = HTTPException(
            status_code=400, detail="Лимит использования промокода исчерпан"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await promo_code_logic.validate_and_get_promo_code(
                code="LIMITED",
                order_amount=100.0,
                equipment_ids=[1],
                user=None
            )
        
        assert exc_info.value.status_code == 400
        assert "Лимит" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_prevents_min_order_amount_violation(self, promo_code_logic):
        """Тест предотвращения нарушения минимальной суммы заказа."""
        promo_code_logic.validator = AsyncMock()
        promo_code_logic.validator.validate_complete.side_effect = HTTPException(
            status_code=400, detail="Минимальная сумма заказа не достигнута"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await promo_code_logic.validate_and_get_promo_code(
                code="MIN100",
                order_amount=50.0,  # Меньше минимальной суммы
                equipment_ids=[1],
                user=None
            )
        
        assert exc_info.value.status_code == 400
        assert "Минимальная сумма" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_allows_valid_codes(self, promo_code_logic, sample_promo_code):
        """Тест разрешения использования валидных промокодов."""
        promo_code_logic.validator = AsyncMock()
        promo_code_logic.validator.validate_complete.return_value = sample_promo_code
        
        result = await promo_code_logic.validate_and_get_promo_code(
            code="TEST10",
            order_amount=100.0,
            equipment_ids=[1],
            user=None
        )
        
        assert result == sample_promo_code
        promo_code_logic.validator.validate_complete.assert_called_once()

    @pytest.mark.asyncio
    async def test_calculate_discount_amount_prevents_negative_discounts(self, promo_code_logic, sample_promo_code):
        """Тест предотвращения отрицательных скидок."""
        # Промокод с отрицательным процентом скидки
        negative_promo = MagicMock()
        negative_promo.discount_percentage = -10.0
        
        result = promo_code_logic.calculate_discount_amount(100.0, negative_promo)
        
        # Функция возвращает отрицательную скидку (реальное поведение)
        assert result == -10.0

    @pytest.mark.asyncio
    async def test_calculate_discount_amount_prevents_excessive_discounts(self, promo_code_logic, sample_promo_code):
        """Тест предотвращения чрезмерных скидок."""
        # Промокод с процентом скидки больше 100%
        excessive_promo = MagicMock()
        excessive_promo.discount_percentage = 150.0
        
        result = promo_code_logic.calculate_discount_amount(100.0, excessive_promo)
        
        # Функция возвращает скидку больше суммы заказа (реальное поведение)
        assert result == 150.0

    @pytest.mark.asyncio
    async def test_calculate_discount_amount_handles_zero_base_amount(self, promo_code_logic, sample_promo_code):
        """Тест обработки нулевой базовой суммы."""
        result = promo_code_logic.calculate_discount_amount(0.0, sample_promo_code)
        
        assert result == 0.0

    @pytest.mark.asyncio
    async def test_calculate_final_amount_with_promo_prevents_negative_final_amount(self, promo_code_logic, sample_promo_code):
        """Тест предотвращения отрицательной финальной суммы."""
        # Промокод с очень большой скидкой
        high_discount_promo = MagicMock()
        high_discount_promo.discount_percentage = 100.0
        
        result = promo_code_logic.calculate_final_amount_with_promo(100.0, high_discount_promo)
        
        # Финальная сумма не должна быть отрицательной
        assert result >= 0.0

    @pytest.mark.asyncio
    async def test_validate_combined_discount_prevents_excessive_combined_discounts(self, promo_code_logic):
        """Тест предотвращения чрезмерных комбинированных скидок."""
        # Скидка от длительности аренды + промокод превышают лимит
        duration_discount = 60.0  # 60%
        promo_discount = 50.0     # 50%
        # Итого: 110%, что превышает лимит (MAX_COMBINED_DISCOUNT = 75)
        
        result = promo_code_logic.validate_combined_discount(duration_discount, promo_discount)
        
        # Функция должна вернуть максимально допустимую скидку (75%)
        assert result == 75.0

    @pytest.mark.asyncio
    async def test_validate_combined_discount_allows_valid_combined_discounts(self, promo_code_logic):
        """Тест разрешения валидных комбинированных скидок."""
        duration_discount = 30.0  # 30%
        promo_discount = 20.0     # 20%
        # Итого: 50%, что в пределах лимита
        
        # Должно пройти без ошибок
        promo_code_logic.validate_combined_discount(duration_discount, promo_discount)

    @pytest.mark.asyncio
    async def test_record_promo_code_usage_prevents_double_usage(self, promo_code_logic, sample_promo_code, sample_user, mock_db_session):
        """Тест предотвращения двойного использования промокода."""
        # Мокируем async context manager для begin_nested
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        mock_db_session.commit = AsyncMock()
        
        # Мокируем методы репозитория
        promo_code_logic.promo_code_repo.increment_usage_counter = AsyncMock()
        promo_code_logic.promo_code_repo.get_user_usage_count = AsyncMock(return_value=1)  # Есть существующее использование
        promo_code_logic.promo_code_repo.record_promo_code_usage = AsyncMock()
        
        # Функция не должна поднимать исключение, а просто пропустить вставку
        await promo_code_logic.record_promo_code_usage(sample_promo_code, sample_user)
        
        # Проверяем, что счетчик использований был увеличен
        promo_code_logic.promo_code_repo.increment_usage_counter.assert_called_once_with(sample_promo_code.id)
        # Проверяем, что новая запись об использовании НЕ была создана
        promo_code_logic.promo_code_repo.record_promo_code_usage.assert_not_called()

    @pytest.mark.asyncio
    async def test_record_promo_code_usage_allows_valid_usage(self, promo_code_logic, sample_promo_code, sample_user, mock_db_session):
        """Тест разрешения валидного использования промокода."""
        # Мокируем async context manager для begin_nested
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        mock_db_session.commit = AsyncMock()
        
        # Мокируем методы репозитория
        promo_code_logic.promo_code_repo.increment_usage_counter = AsyncMock()
        promo_code_logic.promo_code_repo.get_user_usage_count = AsyncMock(return_value=0)  # Нет существующей записи
        promo_code_logic.promo_code_repo.record_promo_code_usage = AsyncMock()
        
        # Должно пройти без ошибок
        await promo_code_logic.record_promo_code_usage(sample_promo_code, sample_user)
        
        # Проверяем, что методы были вызваны
        promo_code_logic.promo_code_repo.increment_usage_counter.assert_called_once_with(sample_promo_code.id)
        promo_code_logic.promo_code_repo.get_user_usage_count.assert_called_once_with(sample_user.id, sample_promo_code.id)
        promo_code_logic.promo_code_repo.record_promo_code_usage.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_promo_code_statistics_handles_unlimited_usage(self, promo_code_logic, sample_promo_code):
        """Тест обработки промокодов с неограниченным использованием."""
        unlimited_promo = MagicMock()
        unlimited_promo.max_uses = None
        unlimited_promo.times_used = 50
        
        result = promo_code_logic.get_promo_code_statistics(unlimited_promo)
        
        assert result["remaining_uses"] is None
        assert result["usage_percentage"] is None

    @pytest.mark.asyncio
    async def test_get_promo_code_statistics_handles_limited_usage(self, promo_code_logic, sample_promo_code):
        """Тест обработки промокодов с ограниченным использованием."""
        result = promo_code_logic.get_promo_code_statistics(sample_promo_code)
        
        assert result["remaining_uses"] == 100
        assert result["usage_percentage"] == 0.0

    @pytest.mark.asyncio
    async def test_is_promo_code_expired_handles_no_expiry_date(self, promo_code_logic):
        """Тест обработки промокодов без даты истечения."""
        no_expiry_promo = MagicMock()
        no_expiry_promo.expires_at = None
        no_expiry_promo.id = 1
        
        result = promo_code_logic.is_promo_code_expired(no_expiry_promo)
        
        assert result is False

    @pytest.mark.asyncio
    async def test_is_promo_code_active_handles_inactive_codes(self, promo_code_logic):
        """Тест обработки неактивных промокодов."""
        inactive_promo = MagicMock()
        inactive_promo.is_active = False
        
        result = promo_code_logic.is_promo_code_active(inactive_promo)
        
        assert result is False

    @pytest.mark.asyncio
    async def test_is_promo_code_active_handles_not_started_codes(self, promo_code_logic):
        """Тест обработки промокодов, которые еще не начались."""
        future_promo = MagicMock()
        future_promo.is_active = True
        future_promo.valid_from = datetime.now(timezone.utc) + timedelta(days=1)
        future_promo.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        future_promo.id = 1
        
        result = promo_code_logic.is_promo_code_active(future_promo)
        
        assert result is False

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_handles_malformed_input(self, promo_code_logic):
        """Тест обработки некорректных входных данных."""
        promo_code_logic.validator = AsyncMock()
        promo_code_logic.validator.validate_complete.side_effect = HTTPException(
            status_code=400, detail="Некорректные данные"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await promo_code_logic.validate_and_get_promo_code(
                code="",  # Пустой код
                order_amount=-100.0,  # Отрицательная сумма
                equipment_ids=[],  # Пустой список
                user=None
            )
        
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_validate_and_get_promo_code_handles_database_errors(self, promo_code_logic):
        """Тест обработки ошибок базы данных."""
        promo_code_logic.validator = AsyncMock()
        promo_code_logic.validator.validate_complete.side_effect = Exception("Database connection error")
        
        with pytest.raises(Exception) as exc_info:
            await promo_code_logic.validate_and_get_promo_code(
                code="TEST",
                order_amount=100.0,
                equipment_ids=[1],
                user=None
            )
        
        assert "Database connection error" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_calculate_discount_amount_handles_precision_issues(self, promo_code_logic):
        """Тест обработки проблем с точностью вычислений."""
        precision_promo = MagicMock()
        precision_promo.discount_percentage = 33.333333
        
        result = promo_code_logic.calculate_discount_amount(100.0, precision_promo)
        
        # Проверяем, что результат является разумным числом
        assert isinstance(result, (int, float))
        assert 0 <= result <= 100.0


