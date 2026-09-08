# tests/services/test_rental_update_service.py
"""
Тесты для RentalUpdateService - критически важного сервиса для обновления аренд.
Тестирует обновление деталей аренд, пересчет стоимости, изменение промокодов и предоплаты.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date, timedelta
from fastapi import HTTPException

from api.services.order.rental_update_service import RentalUpdateService
from api.models.user import User
from api.models.rental import Rental
from api.models.equipment import Equipment
from api.models.promo_code import PromoCode
from shared.schemas.rental_schema import AdminRentalUpdate
from shared.constants.balance_operations import BalanceOperationType
from api.services.financial_service import PriceDetails


class TestRentalUpdateService:
    """Тесты для RentalUpdateService."""

    @pytest.fixture
    def mock_validator(self):
        from api.services.order.order_validator import OrderValidator

        validator = MagicMock(spec=OrderValidator)
        validator.validate_equipment_availability = AsyncMock()
        return validator

    @pytest.fixture
    def rental_update_service(self, mock_db_session, mock_validator):
        """Создает экземпляр RentalUpdateService с моками."""
        from api.repositories.rental_repository import RentalRepository
        from api.services.order.system_repository import SystemService
        from api.services.balance_service import BalanceService
        from api.services.financial_service import FinancialService
        from api.services.promo_code import PromoCodeBusinessLogic

        mock_rental_repo = MagicMock(spec=RentalRepository)
        mock_system_service = MagicMock(spec=SystemService)
        mock_balance_service = MagicMock(spec=BalanceService)
        mock_financial_service = MagicMock(spec=FinancialService)
        mock_promo_code_logic = MagicMock(spec=PromoCodeBusinessLogic)

        return RentalUpdateService(
            db=mock_db_session,
            rental_repo=mock_rental_repo,
            system_service=mock_system_service,
            validator=mock_validator,
            balance_service=mock_balance_service,
            financial_service=mock_financial_service,
            promo_code_logic=mock_promo_code_logic
        )

    @pytest.fixture
    def sample_user(self):
        """Создает тестового пользователя."""
        user = User()
        user.id = 1
        user.email = "user@example.com"
        user.role = "client"
        return user

    @pytest.fixture
    def sample_manager(self):
        """Создает тестового менеджера."""
        manager = User()
        manager.id = 2
        manager.email = "manager@example.com"
        manager.role = "admin"
        return manager

    @pytest.fixture
    def sample_equipment(self):
        """Создает тестовое оборудование."""
        equipment = Equipment()
        equipment.id = 1
        equipment.name = "Test Camera"
        equipment.daily_rate = 100.0
        return [equipment]

    @pytest.fixture
    def active_rental(self, sample_user):
        """Создает активную аренду."""
        rental = Rental()
        rental.id = 1
        rental.user_id = sample_user.id
        rental.user = sample_user
        rental.start_date = date.today()
        rental.end_date = date.today() + timedelta(days=3)
        rental.total_cost = 1000.0
        rental.discount_amount = 0.0
        rental.prepayment_amount = 200.0
        rental.promo_code = None
        rental.reservation_id = None
        rental.status = "active"
        rental.equipment = []
        return rental

    @pytest.fixture
    def completed_rental(self, sample_user):
        """Создает завершенную аренду."""
        rental = Rental()
        rental.id = 2
        rental.user_id = sample_user.id
        rental.user = sample_user
        rental.start_date = date.today() - timedelta(days=5)
        rental.end_date = date.today() - timedelta(days=2)
        rental.total_cost = 1000.0
        rental.prepayment_amount = 200.0
        rental.status = "completed"
        rental.equipment = []
        return rental

    @pytest.fixture
    def price_details(self):
        """Создает детали цены (сумма не меняется — дельты баланса нет)."""
        return PriceDetails(
            full_total=1000.0,
            discount_amount=0.0,
            final_total=1000.0
        )

    # === ТЕСТЫ ДЛЯ update_rental_details_by_admin ===

    @pytest.mark.asyncio
    async def test_update_rental_details_by_admin_success(self, rental_update_service, mock_db_session,
                                                         active_rental, sample_manager):
        """Тест успешного обновления деталей аренды."""
        # Arrange
        update_request = AdminRentalUpdate(
            notes_on_issue="Updated notes"
        )

        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)

        rental_update_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=active_rental)
        rental_update_service.rental_repo.update_rental_instance = MagicMock()
        rental_update_service.rental_repo.save_rental = AsyncMock()

        # Act
        result = await rental_update_service.update_rental_details_by_admin(
            1, update_request, sample_manager
        )

        # Assert
        assert result == active_rental
        rental_update_service.rental_repo.get_rental_by_id_or_fail.assert_called()
        rental_update_service.rental_repo.update_rental_instance.assert_called_once()
        rental_update_service.rental_repo.save_rental.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_rental_details_by_admin_rental_not_found(self, rental_update_service, mock_db_session,
                                                                   sample_manager):
        """Тест обновления несуществующей аренды."""
        # Arrange
        update_request = AdminRentalUpdate(notes_on_issue="Test")

        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)

        rental_update_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(
            side_effect=HTTPException(status_code=404, detail="Rental not found")
        )

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await rental_update_service.update_rental_details_by_admin(
                999, update_request, sample_manager
            )

        assert exc_info.value.status_code == 404

    # === ТЕСТЫ ДЛЯ _process_active_rental_updates ===

    @pytest.mark.asyncio
    async def test_process_active_rental_updates_end_date_change(self, rental_update_service, mock_validator,
                                                                  active_rental, price_details):
        """Тест обработки изменения даты окончания активной аренды."""
        # Arrange
        new_end_date = date.today() + timedelta(days=5)
        update_data = {'end_date': new_end_date}

        rental_update_service.rental_repo.get_rental_equipment_ids = MagicMock(return_value=[1])
        rental_update_service.rental_repo.get_rental_accessories_mapping = MagicMock(return_value={})
        rental_update_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        rental_update_service.balance_service.add_transaction = AsyncMock()

        # Act
        updated_fields = await rental_update_service._process_active_rental_updates(active_rental, update_data)

        # Assert
        assert 'end_date' in updated_fields
        assert active_rental.total_cost == price_details.final_total
        # Доступность нового окна проверяется (исключая саму аренду)
        mock_validator.validate_equipment_availability.assert_awaited_once_with(
            [1], active_rental.start_date, new_end_date,
            exclude_reservation_id=active_rental.reservation_id,
            exclude_rental_id=active_rental.id,
        )
        # Стоимость не изменилась — транзакция дельты не создаётся
        rental_update_service.balance_service.add_transaction.assert_not_called()

    @pytest.mark.asyncio
    async def test_end_date_change_creates_balance_delta(self, rental_update_service, active_rental):
        """Продление аренды дороже — дельта списывается с баланса."""
        new_end_date = date.today() + timedelta(days=5)
        update_data = {'end_date': new_end_date}
        new_price = PriceDetails(full_total=1600.0, discount_amount=0.0, final_total=1600.0)

        rental_update_service.rental_repo.get_rental_equipment_ids = MagicMock(return_value=[1])
        rental_update_service.rental_repo.get_rental_accessories_mapping = MagicMock(return_value={})
        rental_update_service.financial_service.calculate_final_price = AsyncMock(return_value=new_price)
        rental_update_service.balance_service.add_transaction = AsyncMock()

        await rental_update_service._process_active_rental_updates(active_rental, update_data)

        rental_update_service.balance_service.add_transaction.assert_awaited_once_with(
            user_id=active_rental.user_id,
            amount=-600.0,
            operation_type=BalanceOperationType.RENTAL_DEBIT,
            description=f"Доплата за изменение стоимости аренды #{active_rental.id} на 600.0 ₽",
            rental_id=active_rental.id,
        )

    @pytest.mark.asyncio
    async def test_end_date_change_before_start_rejected(self, rental_update_service, active_rental):
        """Новый end_date раньше start_date отклоняется (стоимость не обнуляется)."""
        update_data = {'end_date': active_rental.start_date - timedelta(days=1)}

        rental_update_service.rental_repo.get_rental_equipment_ids = MagicMock(return_value=[1])

        with pytest.raises(HTTPException) as exc_info:
            await rental_update_service._process_active_rental_updates(active_rental, update_data)
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_end_date_and_promo_change_processed_together(self, rental_update_service, active_rental):
        """end_date и promo_code в одном запросе обрабатываются вместе (раньше elif глотал промокод)."""
        promo_code = PromoCode()
        promo_code.id = 1
        promo_code.code = "TEST10"
        promo_code.discount_percentage = 10.0

        update_data = {
            'end_date': date.today() + timedelta(days=5),
            'promo_code': 'TEST10',
        }
        price = PriceDetails(full_total=900.0, discount_amount=100.0, final_total=900.0)

        rental_update_service.rental_repo.get_rental_equipment_ids = MagicMock(return_value=[1])
        rental_update_service.rental_repo.get_rental_accessories_mapping = MagicMock(return_value={})
        rental_update_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(return_value=promo_code)
        rental_update_service.financial_service.calculate_final_price = AsyncMock(return_value=price)
        rental_update_service.balance_service.add_transaction = AsyncMock()

        updated_fields = await rental_update_service._process_active_rental_updates(active_rental, update_data)

        assert 'end_date' in updated_fields
        assert 'promo_code' in updated_fields
        assert active_rental.promo_code == "TEST10"
        # промокод валидируется по фактической предварительной сумме, не по 0
        _, kwargs = rental_update_service.promo_code_logic.validate_and_get_promo_code.await_args
        assert kwargs.get('order_amount', 0) > 0

    @pytest.mark.asyncio
    async def test_process_active_rental_updates_promo_code_change(self, rental_update_service, active_rental, price_details):
        """Тест обработки изменения промокода активной аренды."""
        # Arrange
        promo_code = PromoCode()
        promo_code.id = 1
        promo_code.code = "TEST10"
        promo_code.discount_percentage = 10.0

        update_data = {'promo_code': 'TEST10'}

        rental_update_service.rental_repo.get_rental_equipment_ids = MagicMock(return_value=[1])
        rental_update_service.rental_repo.get_rental_accessories_mapping = MagicMock(return_value={})
        rental_update_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(return_value=promo_code)
        rental_update_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)

        # Act
        updated_fields = await rental_update_service._process_active_rental_updates(active_rental, update_data)

        # Assert
        assert 'promo_code' in updated_fields
        assert active_rental.total_cost == price_details.final_total
        rental_update_service.promo_code_logic.validate_and_get_promo_code.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_active_rental_updates_prepayment_increase(self, rental_update_service, active_rental):
        """Тест обработки увеличения предоплаты."""
        # Arrange
        new_prepayment = 400.0
        update_data = {'prepayment_amount': new_prepayment}

        rental_update_service.balance_service.add_transaction = AsyncMock()

        # Act
        updated_fields = await rental_update_service._process_active_rental_updates(active_rental, update_data)

        # Assert
        assert 'prepayment_amount' in updated_fields
        assert active_rental.prepayment_amount == new_prepayment
        rental_update_service.balance_service.add_transaction.assert_awaited_once_with(
            user_id=active_rental.user_id,
            amount=200.0,  # Разница: 400 - 200
            operation_type=BalanceOperationType.PREPAYMENT,
            description=f"Увеличение предоплаты по аренде #{active_rental.id} на 200.0 ₽",
            rental_id=active_rental.id,
        )

    @pytest.mark.asyncio
    async def test_process_active_rental_updates_prepayment_decrease(self, rental_update_service, active_rental):
        """Уменьшение предоплаты списывает разницу, а не начисляет её (зеркально зачислению)."""
        # Arrange
        new_prepayment = 100.0
        update_data = {'prepayment_amount': new_prepayment}

        rental_update_service.balance_service.add_transaction = AsyncMock()

        # Act
        updated_fields = await rental_update_service._process_active_rental_updates(active_rental, update_data)

        # Assert
        assert 'prepayment_amount' in updated_fields
        assert active_rental.prepayment_amount == new_prepayment
        rental_update_service.balance_service.add_transaction.assert_awaited_once_with(
            user_id=active_rental.user_id,
            amount=-100.0,  # отрицательное списание: 100 - 200
            operation_type=BalanceOperationType.PREPAYMENT_REFUND_ON_REVERT,
            description=f"Списание уменьшенной предоплаты по аренде #{active_rental.id} на 100.0 ₽",
            rental_id=active_rental.id,
        )

    @pytest.mark.asyncio
    async def test_process_active_rental_updates_prepayment_no_change(self, rental_update_service, active_rental):
        """Тест обработки предоплаты без изменений."""
        # Arrange
        update_data = {'prepayment_amount': active_rental.prepayment_amount}

        rental_update_service.balance_service.add_transaction = AsyncMock()

        # Act
        updated_fields = await rental_update_service._process_active_rental_updates(active_rental, update_data)

        # Assert
        assert 'prepayment_amount' in updated_fields
        # Транзакция не должна быть создана, если сумма не изменилась
        rental_update_service.balance_service.add_transaction.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_active_rental_updates_removes_forbidden_fields(self, rental_update_service, active_rental, price_details):
        """Тест удаления запрещенных полей для активной аренды."""
        # Arrange
        update_data = {
            'end_date': date.today() + timedelta(days=5),
            'actual_return_date': date.today(),  # Запрещенное поле
            'notes_on_return': "Test",  # Запрещенное поле
            'status': 'completed',  # Запрещенное поле
            'final_cost': 500.0  # Запрещенное поле
        }

        rental_update_service.rental_repo.get_rental_equipment_ids = MagicMock(return_value=[1])
        rental_update_service.rental_repo.get_rental_accessories_mapping = MagicMock(return_value={})
        rental_update_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)

        # Act
        await rental_update_service._process_active_rental_updates(active_rental, update_data)

        # Assert
        # Запрещенные поля должны быть удалены
        assert 'actual_return_date' not in update_data
        assert 'notes_on_return' not in update_data
        assert 'status' not in update_data
        assert 'final_cost' not in update_data
        # Разрешенное поле должно остаться
        assert 'end_date' in update_data

    # === ТЕСТЫ ДЛЯ _process_completed_rental_updates ===

    def test_process_completed_rental_updates_allowed_fields(self, rental_update_service, completed_rental):
        """Тест обработки разрешенных полей для завершенной аренды."""
        # Arrange
        update_data = {
            'final_cost': 1200.0,
            'deposit_amount': 500.0,
            'notes_on_issue': "Updated notes",
            'notes_on_return': "Return notes"
        }

        # Act
        updated_fields = rental_update_service._process_completed_rental_updates(update_data)

        # Assert
        assert 'final_cost' in updated_fields
        assert 'deposit_amount' in updated_fields
        assert 'notes_on_issue' in updated_fields
        assert 'notes_on_return' in updated_fields

    def test_process_completed_rental_updates_removes_forbidden_fields(self, rental_update_service, completed_rental):
        """Тест удаления запрещенных полей для завершенной аренды."""
        # Arrange
        update_data = {
            'final_cost': 1200.0,
            'end_date': date.today(),  # Запрещенное поле
            'prepayment_amount': 300.0,  # Запрещенное поле
            'promo_code': 'TEST10',  # Запрещенное поле
            'actual_return_date': date.today(),  # Запрещенное поле
            'status': 'active'  # Запрещенное поле
        }

        # Act
        rental_update_service._process_completed_rental_updates(update_data)

        # Assert
        # Запрещенные поля должны быть удалены
        assert 'end_date' not in update_data
        assert 'prepayment_amount' not in update_data
        assert 'promo_code' not in update_data
        assert 'actual_return_date' not in update_data
        assert 'status' not in update_data
        # Разрешенное поле должно остаться
        assert 'final_cost' in update_data

    # === ТЕСТЫ ДЛЯ _apply_price_recalculation ===

    @pytest.mark.asyncio
    async def test_apply_price_recalculation_updates_financials(self, rental_update_service, active_rental, price_details):
        """Тест пересчета: обновляются total_cost/discount_amount/promo_code."""
        # Arrange
        new_end_date = date.today() + timedelta(days=5)
        update_data = {'end_date': new_end_date}

        rental_update_service.rental_repo.get_rental_equipment_ids = MagicMock(return_value=[1])
        rental_update_service.rental_repo.get_rental_accessories_mapping = MagicMock(return_value={})
        rental_update_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)

        # Act
        await rental_update_service._apply_price_recalculation(active_rental, update_data)

        # Assert
        assert active_rental.total_cost == price_details.final_total
        assert active_rental.discount_amount == price_details.discount_amount
        # предварительный расчет (без промокода) + финальный
        assert rental_update_service.financial_service.calculate_final_price.await_count == 2

    @pytest.mark.asyncio
    async def test_apply_price_recalculation_keeps_existing_promo(self, rental_update_service, active_rental):
        """При изменении даты действующий промокод сохраняется и перепроверяется по новой сумме."""
        # Arrange
        promo_code = PromoCode()
        promo_code.id = 1
        promo_code.code = "TEST10"

        active_rental.promo_code = "TEST10"
        new_end_date = date.today() + timedelta(days=5)
        update_data = {'end_date': new_end_date}
        price_details = PriceDetails(full_total=800.0, discount_amount=80.0, final_total=720.0)

        rental_update_service.rental_repo.get_rental_equipment_ids = MagicMock(return_value=[1])
        rental_update_service.rental_repo.get_rental_accessories_mapping = MagicMock(return_value={})
        rental_update_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(return_value=promo_code)
        rental_update_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)

        # Act
        await rental_update_service._apply_price_recalculation(active_rental, update_data)

        # Assert
        assert active_rental.promo_code == "TEST10"
        rental_update_service.promo_code_logic.validate_and_get_promo_code.assert_awaited_once()
        _, kwargs = rental_update_service.promo_code_logic.validate_and_get_promo_code.await_args
        assert kwargs.get('code') == "TEST10"
        assert kwargs.get('order_amount', 0) > 0

    # === ТЕСТЫ ДЛЯ _resolve_promo_code_for_recalculation ===

    @pytest.mark.asyncio
    async def test_resolve_promo_new_code(self, rental_update_service, active_rental):
        """Тест получения нового промокода для перерасчета."""
        promo_code = PromoCode()
        promo_code.id = 1
        promo_code.code = "NEW10"

        update_data = {'promo_code': 'NEW10'}

        rental_update_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(return_value=promo_code)

        result = await rental_update_service._resolve_promo_code_for_recalculation(
            update_data, active_rental, [1], 1000.0
        )

        assert result == promo_code
        rental_update_service.promo_code_logic.validate_and_get_promo_code.assert_awaited_once_with(
            code="NEW10", order_amount=1000.0, equipment_ids=[1], user=active_rental.user,
            skip_usage_limits=False
        )

    @pytest.mark.asyncio
    async def test_resolve_promo_existing_code(self, rental_update_service, active_rental):
        """Существующий промокод перепроверяется как код (единый путь валидации)."""
        promo_code = PromoCode()
        promo_code.id = 1
        promo_code.code = "EXISTING"

        active_rental.promo_code = "EXISTING"
        update_data = {}

        rental_update_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(return_value=promo_code)

        result = await rental_update_service._resolve_promo_code_for_recalculation(
            update_data, active_rental, [1], 1000.0
        )

        assert result == promo_code
        _, kwargs = rental_update_service.promo_code_logic.validate_and_get_promo_code.await_args
        assert kwargs.get('code') == "EXISTING"

    @pytest.mark.asyncio
    async def test_resolve_promo_invalid_code_dropped(self, rental_update_service, active_rental):
        """Невалидный промокод отбрасывается без падения изменения дат."""
        update_data = {'promo_code': 'INVALID'}

        rental_update_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(
            side_effect=Exception("Invalid promo code")
        )

        result = await rental_update_service._resolve_promo_code_for_recalculation(
            update_data, active_rental, [1], 1000.0
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_resolve_promo_no_promo_code(self, rental_update_service, active_rental):
        """Тест получения промокода, когда его нет."""
        active_rental.promo_code = None
        update_data = {}

        result = await rental_update_service._resolve_promo_code_for_recalculation(
            update_data, active_rental, [1], 1000.0
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_resolve_promo_explicit_null_clears_promo(self, rental_update_service, active_rental):
        """Явно присланный promo_code=null очищает промокод (не сохраняет старый)."""
        active_rental.promo_code = "OLD"
        update_data = {'promo_code': None}

        result = await rental_update_service._resolve_promo_code_for_recalculation(
            update_data, active_rental, [1], 1000.0
        )

        assert result is None
        rental_update_service.promo_code_logic.validate_and_get_promo_code.assert_not_called()
