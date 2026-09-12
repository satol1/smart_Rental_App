# tests/services/test_rental_return_service.py
"""
Тесты для RentalReturnService - критически важного сервиса для возврата аренд.
Тестирует возврат аренд, расчет штрафов за просрочку, возврат средств за досрочный возврат.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date, timedelta
from fastapi import HTTPException

from api.services.order.rental_return_service import RentalReturnService
from api.models.user import User
from api.models.rental import Rental
from shared.schemas.rental_schema import RentalReturnRequest
from shared.constants.balance_operations import BalanceOperationType


class TestRentalReturnService:
    """Тесты для RentalReturnService."""

    @pytest.fixture
    def rental_return_service(self, mock_db_session):
        """Создает экземпляр RentalReturnService с моками."""
        from api.repositories.rental_repository import RentalRepository
        from api.services.order.order_validator import OrderValidator
        from api.services.balance_service import BalanceService
        from api.services.financial_service import FinancialService
        
        mock_rental_repo = MagicMock(spec=RentalRepository)
        mock_validator = MagicMock(spec=OrderValidator)
        mock_balance_service = MagicMock(spec=BalanceService)
        mock_financial_service = MagicMock(spec=FinancialService)
        
        return RentalReturnService(
            db=mock_db_session,
            rental_repo=mock_rental_repo,
            validator=mock_validator,
            balance_service=mock_balance_service,
            financial_service=mock_financial_service
        )

    @pytest.fixture
    def sample_rental(self):
        """Создает тестовую аренду."""
        rental = Rental()
        rental.id = 1
        rental.user_id = 1
        rental.start_date = date(2025, 1, 1)
        rental.end_date = date(2025, 1, 5)
        rental.total_cost = 1000.0
        rental.status = "active"
        rental.equipment = []
        rental.accessory_links = []
        return rental

    @pytest.fixture
    def sample_manager(self):
        """Создает тестового менеджера."""
        manager = User()
        manager.id = 2
        manager.email = "manager@example.com"
        manager.role = "admin"
        return manager

    @pytest.fixture
    def return_request_on_time(self):
        """Создает запрос на возврат в срок."""
        return RentalReturnRequest(
            actual_return_date=date(2025, 1, 5),
            accessories_returned_confirmation=True,
            notes_on_return="Возврат в срок"
        )

    @pytest.fixture
    def return_request_overdue(self):
        """Создает запрос на возврат с просрочкой."""
        return RentalReturnRequest(
            actual_return_date=date(2025, 1, 7),  # 2 дня просрочки
            accessories_returned_confirmation=True,
            notes_on_return="Возврат с просрочкой"
        )

    @pytest.fixture
    def return_request_early(self):
        """Создает запрос на досрочный возврат."""
        return RentalReturnRequest(
            actual_return_date=date(2025, 1, 3),  # 2 дня раньше
            accessories_returned_confirmation=True,
            notes_on_return="Досрочный возврат"
        )

    # === ТЕСТЫ ДЛЯ return_rental ===

    @pytest.mark.asyncio
    async def test_return_rental_success_on_time(self, rental_return_service, mock_db_session, 
                                                 sample_rental, sample_manager, return_request_on_time):
        """Тест успешного возврата аренды в срок."""
        # Arrange
        # Мокируем async context manager для begin_nested
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_return_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)
        rental_return_service.rental_repo.finalize_rental_return = MagicMock()
        rental_return_service.rental_repo.save_rental = AsyncMock()
        rental_return_service.validator.validate_accessories_returned = MagicMock()
        
        # Мокируем расчеты (в срок - нет доплат)
        rental_return_service.financial_service.get_rental_days = AsyncMock(return_value=4)
        rental_return_service.financial_service.calculate_early_return_credit = AsyncMock(return_value=0.0)
        rental_return_service.financial_service.calculate_overdue_surcharge = AsyncMock(return_value=0.0)
        
        # Мокируем получение аренды с деталями после возврата
        rental_return_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)

        # Act
        result = await rental_return_service.return_rental(1, return_request_on_time, sample_manager)

        # Assert
        assert result == sample_rental
        rental_return_service.rental_repo.get_rental_by_id_or_fail.assert_called()
        rental_return_service.validator.validate_accessories_returned.assert_called_once()
        rental_return_service.rental_repo.finalize_rental_return.assert_called_once()
        rental_return_service.rental_repo.save_rental.assert_called_once()

    @pytest.mark.asyncio
    async def test_return_rental_with_overdue_surcharge(self, rental_return_service, mock_db_session,
                                                        sample_rental, sample_manager, return_request_overdue):
        """Тест возврата аренды с просрочкой и штрафом."""
        # Arrange
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_return_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)
        rental_return_service.rental_repo.finalize_rental_return = MagicMock()
        rental_return_service.rental_repo.save_rental = AsyncMock()
        rental_return_service.validator.validate_accessories_returned = MagicMock()
        
        # Мокируем расчет штрафа за просрочку
        surcharge_amount = 200.0
        rental_return_service.financial_service.calculate_overdue_surcharge = AsyncMock(return_value=surcharge_amount)
        rental_return_service.balance_service.add_transaction = AsyncMock()

        # Act
        result = await rental_return_service.return_rental(1, return_request_overdue, sample_manager)

        # Assert
        assert result == sample_rental
        rental_return_service.financial_service.calculate_overdue_surcharge.assert_called_once()
        rental_return_service.balance_service.add_transaction.assert_called_once_with(
            user_id=sample_rental.user_id,
            amount=-surcharge_amount,
            operation_type=BalanceOperationType.OVERDUE_SURCHARGE_DEBIT,
            description=f"Списание за просрочку аренды #{sample_rental.id}",
            rental_id=sample_rental.id
        )

    @pytest.mark.asyncio
    async def test_return_rental_with_early_return_credit(self, rental_return_service, mock_db_session,
                                                         sample_rental, sample_manager, return_request_early):
        """Тест досрочного возврата аренды с возвратом средств."""
        # Arrange
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_return_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)
        rental_return_service.rental_repo.finalize_rental_return = MagicMock()
        rental_return_service.rental_repo.save_rental = AsyncMock()
        rental_return_service.validator.validate_accessories_returned = MagicMock()
        
        # Мокируем расчет возврата за досрочный возврат
        planned_days = 4
        credit_amount = 500.0
        rental_return_service.financial_service.get_rental_days = AsyncMock(return_value=planned_days)
        rental_return_service.financial_service.calculate_early_return_credit = AsyncMock(return_value=credit_amount)
        rental_return_service.balance_service.add_transaction = AsyncMock()

        # Act
        result = await rental_return_service.return_rental(1, return_request_early, sample_manager)

        # Assert
        assert result == sample_rental
        rental_return_service.financial_service.get_rental_days.assert_called_once_with(
            sample_rental.start_date, sample_rental.end_date
        )
        rental_return_service.financial_service.calculate_early_return_credit.assert_called_once()
        rental_return_service.balance_service.add_transaction.assert_called_once_with(
            user_id=sample_rental.user_id,
            amount=credit_amount,
            operation_type=BalanceOperationType.EARLY_RETURN_CREDIT,
            description=f"Возврат за досрочное завершение аренды #{sample_rental.id}",
            rental_id=sample_rental.id
        )

    @pytest.mark.asyncio
    async def test_return_rental_with_user_status_update(self, rental_return_service, mock_db_session,
                                                         sample_rental, sample_manager, return_request_on_time):
        """Тест возврата аренды с обновлением статуса пользователя."""
        # Arrange
        from api.services.user.user_status_service import UserStatusService
        
        mock_user_status_service = MagicMock(spec=UserStatusService)
        mock_user_status_service.invalidate_cache = MagicMock()
        mock_user_status_service.update_user_status_by_rentals = AsyncMock()
        rental_return_service.user_status_service = mock_user_status_service
        
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_return_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)
        rental_return_service.rental_repo.finalize_rental_return = MagicMock()
        rental_return_service.rental_repo.save_rental = AsyncMock()
        rental_return_service.validator.validate_accessories_returned = MagicMock()
        rental_return_service.financial_service.get_rental_days = AsyncMock(return_value=4)
        rental_return_service.financial_service.calculate_early_return_credit = AsyncMock(return_value=0.0)

        # Act
        result = await rental_return_service.return_rental(1, return_request_on_time, sample_manager)

        # Assert
        assert result == sample_rental
        mock_user_status_service.invalidate_cache.assert_called_once_with(sample_rental.user_id)
        mock_user_status_service.update_user_status_by_rentals.assert_called_once_with(sample_rental.user_id)

    @pytest.mark.asyncio
    async def test_return_rental_rental_not_found(self, rental_return_service, mock_db_session,
                                                  sample_manager, return_request_on_time):
        """Тест возврата несуществующей аренды."""
        # Arrange
        from fastapi import HTTPException
        
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_return_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(
            side_effect=HTTPException(status_code=404, detail="Rental not found")
        )

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await rental_return_service.return_rental(999, return_request_on_time, sample_manager)
        
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_return_rental_accessories_validation_error(self, rental_return_service, mock_db_session,
                                                              sample_rental, sample_manager, return_request_on_time):
        """Тест возврата аренды с ошибкой валидации аксессуаров."""
        # Arrange
        from fastapi import HTTPException
        
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_return_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)
        rental_return_service.validator.validate_accessories_returned = MagicMock(
            side_effect=HTTPException(status_code=400, detail="Not all accessories returned")
        )

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await rental_return_service.return_rental(1, return_request_on_time, sample_manager)
        
        assert exc_info.value.status_code == 400
        assert "accessories" in str(exc_info.value.detail).lower()

    @pytest.mark.asyncio
    async def test_return_rental_user_status_update_error_does_not_block(self, rental_return_service, mock_db_session,
                                                                         sample_rental, sample_manager, return_request_on_time):
        """Тест того, что ошибка обновления статуса пользователя не блокирует возврат."""
        # Arrange
        from api.services.user.user_status_service import UserStatusService
        
        mock_user_status_service = MagicMock(spec=UserStatusService)
        mock_user_status_service.invalidate_cache = MagicMock()
        mock_user_status_service.update_user_status_by_rentals = AsyncMock(
            side_effect=Exception("Status update error")
        )
        rental_return_service.user_status_service = mock_user_status_service
        
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_return_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)
        rental_return_service.rental_repo.finalize_rental_return = MagicMock()
        rental_return_service.rental_repo.save_rental = AsyncMock()
        rental_return_service.validator.validate_accessories_returned = MagicMock()
        rental_return_service.financial_service.get_rental_days = AsyncMock(return_value=4)
        rental_return_service.financial_service.calculate_early_return_credit = AsyncMock(return_value=0.0)

        # Act - возврат должен пройти успешно, несмотря на ошибку обновления статуса
        result = await rental_return_service.return_rental(1, return_request_on_time, sample_manager)

        # Assert
        assert result == sample_rental
        # Проверяем, что возврат все равно прошел
        rental_return_service.rental_repo.finalize_rental_return.assert_called_once()

    # === ТЕСТЫ ДЛЯ _calculate_return_adjustments ===

    @pytest.mark.asyncio
    async def test_calculate_return_adjustments_overdue(self, rental_return_service, sample_rental):
        """Тест расчета доплат при просрочке."""
        # Arrange
        actual_return_date = date(2025, 1, 7)  # 2 дня просрочки
        surcharge_amount = 200.0
        
        rental_return_service.financial_service.calculate_overdue_surcharge = AsyncMock(return_value=surcharge_amount)

        # Act
        credit, surcharge = await rental_return_service._calculate_return_adjustments(
            sample_rental, actual_return_date
        )

        # Assert
        assert credit == 0.0
        assert surcharge == surcharge_amount
        rental_return_service.financial_service.calculate_overdue_surcharge.assert_called_once_with(
            sample_rental, actual_return_date, equipment_ids=None
        )

    @pytest.mark.asyncio
    async def test_calculate_return_adjustments_early(self, rental_return_service, sample_rental):
        """Тест расчета возврата при досрочном возврате."""
        # Arrange
        actual_return_date = date(2025, 1, 3)  # 2 дня раньше
        planned_days = 4
        credit_amount = 500.0
        
        rental_return_service.financial_service.get_rental_days = AsyncMock(return_value=planned_days)
        rental_return_service.financial_service.calculate_early_return_credit = AsyncMock(return_value=credit_amount)

        # Act
        credit, surcharge = await rental_return_service._calculate_return_adjustments(
            sample_rental, actual_return_date
        )

        # Assert
        assert credit == credit_amount
        assert surcharge == 0.0
        rental_return_service.financial_service.get_rental_days.assert_called_once_with(
            sample_rental.start_date, sample_rental.end_date
        )
        rental_return_service.financial_service.calculate_early_return_credit.assert_called_once_with(
            sample_rental, actual_return_date, planned_days, equipment_ids=None
        )

    @pytest.mark.asyncio
    async def test_calculate_return_adjustments_on_time(self, rental_return_service, sample_rental):
        """Тест расчета при возврате точно в срок."""
        # Arrange
        actual_return_date = date(2025, 1, 5)  # Точно в срок
        
        rental_return_service.financial_service.get_rental_days = AsyncMock(return_value=4)
        rental_return_service.financial_service.calculate_early_return_credit = AsyncMock(return_value=0.0)

        # Act
        credit, surcharge = await rental_return_service._calculate_return_adjustments(
            sample_rental, actual_return_date
        )

        # Assert
        assert credit == 0.0
        assert surcharge == 0.0

    # === ТЕСТЫ ДЛЯ _create_return_balance_transactions ===

    @pytest.mark.asyncio
    async def test_create_return_balance_transactions_with_surcharge(self, rental_return_service, sample_rental):
        """Тест создания транзакции баланса при просрочке."""
        # Arrange
        surcharge_amount = 200.0
        credit_amount = 0.0
        
        rental_return_service.balance_service.add_transaction = AsyncMock()

        # Act
        await rental_return_service._create_return_balance_transactions(
            sample_rental, credit_amount, surcharge_amount
        )

        # Assert
        rental_return_service.balance_service.add_transaction.assert_called_once_with(
            user_id=sample_rental.user_id,
            amount=-surcharge_amount,
            operation_type=BalanceOperationType.OVERDUE_SURCHARGE_DEBIT,
            description=f"Списание за просрочку аренды #{sample_rental.id}",
            rental_id=sample_rental.id
        )

    @pytest.mark.asyncio
    async def test_create_return_balance_transactions_with_credit(self, rental_return_service, sample_rental):
        """Тест создания транзакции баланса при досрочном возврате."""
        # Arrange
        credit_amount = 500.0
        surcharge_amount = 0.0
        
        rental_return_service.balance_service.add_transaction = AsyncMock()

        # Act
        await rental_return_service._create_return_balance_transactions(
            sample_rental, credit_amount, surcharge_amount
        )

        # Assert
        rental_return_service.balance_service.add_transaction.assert_called_once_with(
            user_id=sample_rental.user_id,
            amount=credit_amount,
            operation_type=BalanceOperationType.EARLY_RETURN_CREDIT,
            description=f"Возврат за досрочное завершение аренды #{sample_rental.id}",
            rental_id=sample_rental.id
        )

    @pytest.mark.asyncio
    async def test_create_return_balance_transactions_no_adjustments(self, rental_return_service, sample_rental):
        """Тест того, что транзакции не создаются, если нет доплат."""
        # Arrange
        credit_amount = 0.0
        surcharge_amount = 0.0
        
        rental_return_service.balance_service.add_transaction = AsyncMock()

        # Act
        await rental_return_service._create_return_balance_transactions(
            sample_rental, credit_amount, surcharge_amount
        )

        # Assert
        rental_return_service.balance_service.add_transaction.assert_not_called()

