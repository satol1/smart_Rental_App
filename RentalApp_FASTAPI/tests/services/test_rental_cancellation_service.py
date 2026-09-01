# tests/services/test_rental_cancellation_service.py
"""
Тесты для RentalCancellationService - критически важного сервиса для отмены аренд.
Тестирует отмену аренд, возврат средств, удаление аренд.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date, datetime, timezone, timedelta
from fastapi import HTTPException

from api.services.order.rental_cancellation_service import RentalCancellationService
from api.models.user import User
from api.models.rental import Rental
from api.models.reservation import Reservation
from shared.schemas.rental_schema import RentalRevertRequest
from shared.constants.balance_operations import BalanceOperationType


class TestRentalCancellationService:
    """Тесты для RentalCancellationService."""

    @pytest.fixture
    def rental_cancellation_service(self, mock_db_session):
        """Создает экземпляр RentalCancellationService с моками."""
        from api.repositories.rental_repository import RentalRepository
        from api.services.order.order_validator import OrderValidator
        from api.services.balance_service import BalanceService
        
        mock_rental_repo = MagicMock(spec=RentalRepository)
        mock_validator = MagicMock(spec=OrderValidator)
        mock_balance_service = MagicMock(spec=BalanceService)
        
        return RentalCancellationService(
            db=mock_db_session,
            rental_repo=mock_rental_repo,
            validator=mock_validator,
            balance_service=mock_balance_service
        )

    @pytest.fixture
    def sample_rental(self):
        """Создает тестовую аренду."""
        rental = Rental()
        rental.id = 1
        rental.user_id = 1
        rental.reservation_id = 1
        rental.start_date = date.today()
        rental.end_date = date.today() + timedelta(days=3)
        rental.total_cost = 1000.0
        rental.prepayment_amount = 200.0
        rental.status = "active"
        rental.created_at = datetime.now(timezone.utc)
        return rental

    @pytest.fixture
    def sample_rental_from_scratch(self):
        """Создает тестовую аренду, созданную с нуля."""
        rental = Rental()
        rental.id = 2
        rental.user_id = 1
        rental.reservation_id = None  # Аренда с нуля
        rental.start_date = date.today()
        rental.end_date = date.today() + timedelta(days=3)
        rental.total_cost = 1000.0
        rental.prepayment_amount = 200.0
        rental.status = "active"
        rental.created_at = datetime.now(timezone.utc) - timedelta(hours=1)  # Создана час назад
        return rental

    @pytest.fixture
    def sample_reservation(self):
        """Создает тестовый резерв."""
        reservation = Reservation()
        reservation.id = 1
        reservation.user_id = 1
        reservation.status = "active"
        return reservation

    @pytest.fixture
    def sample_manager(self):
        """Создает тестового менеджера."""
        manager = User()
        manager.id = 2
        manager.email = "manager@example.com"
        manager.role = "admin"
        return manager

    @pytest.fixture
    def revert_request_with_refund(self):
        """Создает запрос на отмену с возвратом аванса."""
        return RentalRevertRequest(refund_prepayment=True)

    @pytest.fixture
    def revert_request_without_refund(self):
        """Создает запрос на отмену без возврата аванса."""
        return RentalRevertRequest(refund_prepayment=False)

    # === ТЕСТЫ ДЛЯ revert_rental_to_reservation ===

    @pytest.mark.asyncio
    async def test_revert_rental_to_reservation_success(self, rental_cancellation_service, mock_db_session,
                                                        sample_rental, sample_reservation, sample_manager,
                                                        revert_request_without_refund):
        """Тест успешной отмены аренды и возврата к резерву."""
        # Arrange
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_cancellation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)
        rental_cancellation_service.validator.validate_rental_for_revert = MagicMock()
        rental_cancellation_service.rental_repo.revert_rental_status_to_active = MagicMock(return_value=sample_reservation)
        rental_cancellation_service.balance_service.add_transaction = AsyncMock()
        rental_cancellation_service.rental_repo.delete_rental = AsyncMock()

        # Act
        await rental_cancellation_service.revert_rental_to_reservation(
            1, sample_manager, revert_request_without_refund
        )

        # Assert
        rental_cancellation_service.rental_repo.get_rental_by_id_or_fail.assert_called_once_with(1)
        rental_cancellation_service.validator.validate_rental_for_revert.assert_called_once_with(sample_rental)
        rental_cancellation_service.rental_repo.revert_rental_status_to_active.assert_called_once_with(sample_rental)
        rental_cancellation_service.balance_service.add_transaction.assert_called()
        rental_cancellation_service.rental_repo.delete_rental.assert_called_once_with(sample_rental)

    @pytest.mark.asyncio
    async def test_revert_rental_to_reservation_with_prepayment_refund(self, rental_cancellation_service, mock_db_session,
                                                                       sample_rental, sample_reservation, sample_manager,
                                                                       revert_request_with_refund):
        """Тест отмены аренды с возвратом аванса."""
        # Arrange
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_cancellation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)
        rental_cancellation_service.validator.validate_rental_for_revert = MagicMock()
        rental_cancellation_service.rental_repo.revert_rental_status_to_active = MagicMock(return_value=sample_reservation)
        rental_cancellation_service.balance_service.add_transaction = AsyncMock()
        rental_cancellation_service.rental_repo.delete_rental = AsyncMock()

        # Act
        await rental_cancellation_service.revert_rental_to_reservation(
            1, sample_manager, revert_request_with_refund
        )

        # Assert
        # Проверяем, что была создана транзакция возврата аванса
        prepayment_refund_calls = [call for call in rental_cancellation_service.balance_service.add_transaction.call_args_list
                                  if call[1]['operation_type'] == BalanceOperationType.PREPAYMENT_REFUND_ON_REVERT]
        assert len(prepayment_refund_calls) > 0

    @pytest.mark.asyncio
    async def test_revert_rental_to_reservation_rental_not_found(self, rental_cancellation_service, mock_db_session,
                                                                sample_manager, revert_request_without_refund):
        """Тест отмены несуществующей аренды."""
        # Arrange
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_cancellation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(
            side_effect=HTTPException(status_code=404, detail="Rental not found")
        )

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await rental_cancellation_service.revert_rental_to_reservation(
                999, sample_manager, revert_request_without_refund
            )
        
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_revert_rental_to_reservation_validation_error(self, rental_cancellation_service, mock_db_session,
                                                                sample_rental, sample_manager, revert_request_without_refund):
        """Тест отмены аренды с ошибкой валидации."""
        # Arrange
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_cancellation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)
        rental_cancellation_service.validator.validate_rental_for_revert = MagicMock(
            side_effect=HTTPException(status_code=400, detail="Cannot revert rental")
        )

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await rental_cancellation_service.revert_rental_to_reservation(
                1, sample_manager, revert_request_without_refund
            )
        
        assert exc_info.value.status_code == 400

    # === ТЕСТЫ ДЛЯ delete_rental_by_admin ===

    @pytest.mark.asyncio
    async def test_delete_rental_by_admin_from_reservation(self, rental_cancellation_service, mock_db_session,
                                                          sample_rental):
        """Тест удаления аренды, созданной из резерва."""
        # Arrange
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_cancellation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental)
        rental_cancellation_service.rental_repo.delete_rental = AsyncMock()

        # Act
        await rental_cancellation_service.delete_rental_by_admin(1)

        # Assert
        rental_cancellation_service.rental_repo.get_rental_by_id_or_fail.assert_called_once_with(1)
        rental_cancellation_service.rental_repo.delete_rental.assert_called_once_with(sample_rental)

    @pytest.mark.asyncio
    async def test_delete_rental_by_admin_from_scratch_recent(self, rental_cancellation_service, mock_db_session,
                                                             sample_rental_from_scratch):
        """Тест удаления недавно созданной аренды с нуля."""
        # Arrange
        # Устанавливаем время создания менее 24 часов назад
        sample_rental_from_scratch.created_at = datetime.now(timezone.utc) - timedelta(hours=12)
        
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_cancellation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental_from_scratch)
        rental_cancellation_service.balance_service.add_transaction = AsyncMock()
        rental_cancellation_service.rental_repo.delete_rental = AsyncMock()

        # Act
        await rental_cancellation_service.delete_rental_by_admin(2)

        # Assert
        rental_cancellation_service.rental_repo.get_rental_by_id_or_fail.assert_called_once_with(2)
        # Проверяем, что были созданы транзакции возврата
        rental_cancellation_service.balance_service.add_transaction.assert_called()
        rental_cancellation_service.rental_repo.delete_rental.assert_called_once_with(sample_rental_from_scratch)

    @pytest.mark.asyncio
    async def test_delete_rental_by_admin_from_scratch_old(self, rental_cancellation_service, mock_db_session,
                                                          sample_rental_from_scratch):
        """Тест удаления старой аренды с нуля (более 24 часов)."""
        # Arrange
        # Устанавливаем время создания более 24 часов назад
        sample_rental_from_scratch.created_at = datetime.now(timezone.utc) - timedelta(days=2)
        
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_cancellation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental_from_scratch)

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await rental_cancellation_service.delete_rental_by_admin(2)
        
        assert exc_info.value.status_code == 403
        assert "день создания" in str(exc_info.value.detail) or "24" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_delete_rental_by_admin_with_prepayment(self, rental_cancellation_service, mock_db_session,
                                                         sample_rental_from_scratch):
        """Тест удаления аренды с авансом."""
        # Arrange
        sample_rental_from_scratch.created_at = datetime.now(timezone.utc) - timedelta(hours=12)
        sample_rental_from_scratch.prepayment_amount = 200.0
        
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        rental_cancellation_service.rental_repo.get_rental_by_id_or_fail = AsyncMock(return_value=sample_rental_from_scratch)
        rental_cancellation_service.balance_service.add_transaction = AsyncMock()
        rental_cancellation_service.rental_repo.delete_rental = AsyncMock()

        # Act
        await rental_cancellation_service.delete_rental_by_admin(2)

        # Assert
        # Проверяем, что была создана транзакция возврата аванса
        prepayment_refund_calls = [call for call in rental_cancellation_service.balance_service.add_transaction.call_args_list
                                  if call[1]['operation_type'] == BalanceOperationType.PREPAYMENT_REFUND_ON_REVERT]
        assert len(prepayment_refund_calls) > 0

    # === ТЕСТЫ ДЛЯ _create_revert_balance_transactions ===

    @pytest.mark.asyncio
    async def test_create_revert_balance_transactions_with_refund(self, rental_cancellation_service, sample_rental,
                                                                  revert_request_with_refund):
        """Тест создания транзакций баланса с возвратом аванса."""
        # Arrange
        rental_cancellation_service.balance_service.add_transaction = AsyncMock()

        # Act
        await rental_cancellation_service._create_revert_balance_transactions(sample_rental, revert_request_with_refund)

        # Assert
        # Проверяем, что были созданы обе транзакции: возврат основной суммы и возврат аванса
        assert rental_cancellation_service.balance_service.add_transaction.call_count == 2
        
        # Проверяем транзакцию возврата основной суммы
        main_refund_call = rental_cancellation_service.balance_service.add_transaction.call_args_list[0]
        assert main_refund_call[1]['operation_type'] == BalanceOperationType.RENTAL_REVERT_CREDIT
        assert main_refund_call[1]['amount'] == sample_rental.total_cost
        
        # Проверяем транзакцию возврата аванса
        prepayment_refund_call = rental_cancellation_service.balance_service.add_transaction.call_args_list[1]
        assert prepayment_refund_call[1]['operation_type'] == BalanceOperationType.PREPAYMENT_REFUND_ON_REVERT
        assert prepayment_refund_call[1]['amount'] == -sample_rental.prepayment_amount

    @pytest.mark.asyncio
    async def test_create_revert_balance_transactions_without_refund(self, rental_cancellation_service, sample_rental,
                                                                    revert_request_without_refund):
        """Тест создания транзакций баланса без возврата аванса."""
        # Arrange
        rental_cancellation_service.balance_service.add_transaction = AsyncMock()

        # Act
        await rental_cancellation_service._create_revert_balance_transactions(sample_rental, revert_request_without_refund)

        # Assert
        # Проверяем, что была создана только одна транзакция (возврат основной суммы)
        assert rental_cancellation_service.balance_service.add_transaction.call_count == 1
        call_args = rental_cancellation_service.balance_service.add_transaction.call_args_list[0]
        assert call_args[1]['operation_type'] == BalanceOperationType.RENTAL_REVERT_CREDIT

    @pytest.mark.asyncio
    async def test_create_revert_balance_transactions_no_prepayment(self, rental_cancellation_service):
        """Тест создания транзакций баланса для аренды без аванса."""
        # Arrange
        rental = Rental()
        rental.id = 1
        rental.user_id = 1
        rental.total_cost = 1000.0
        rental.prepayment_amount = 0.0
        
        request = RentalRevertRequest(refund_prepayment=True)
        rental_cancellation_service.balance_service.add_transaction = AsyncMock()

        # Act
        await rental_cancellation_service._create_revert_balance_transactions(rental, request)

        # Assert
        # Проверяем, что была создана только одна транзакция (возврат основной суммы)
        assert rental_cancellation_service.balance_service.add_transaction.call_count == 1

    # === ТЕСТЫ ДЛЯ _handle_scratch_rental_deletion ===

    @pytest.mark.asyncio
    async def test_handle_scratch_rental_deletion_recent(self, rental_cancellation_service, sample_rental_from_scratch):
        """Тест обработки удаления недавно созданной аренды с нуля."""
        # Arrange
        sample_rental_from_scratch.created_at = datetime.now(timezone.utc) - timedelta(hours=12)
        rental_cancellation_service.balance_service.add_transaction = AsyncMock()

        # Act
        await rental_cancellation_service._handle_scratch_rental_deletion(sample_rental_from_scratch)

        # Assert
        # Проверяем, что была создана транзакция возврата
        rental_cancellation_service.balance_service.add_transaction.assert_called()

    @pytest.mark.asyncio
    async def test_handle_scratch_rental_deletion_old(self, rental_cancellation_service, sample_rental_from_scratch):
        """Тест обработки удаления старой аренды с нуля."""
        # Arrange
        sample_rental_from_scratch.created_at = datetime.now(timezone.utc) - timedelta(days=2)

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await rental_cancellation_service._handle_scratch_rental_deletion(sample_rental_from_scratch)
        
        assert exc_info.value.status_code == 403
        assert "день создания" in str(exc_info.value.detail) or "24" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_handle_scratch_rental_deletion_with_prepayment(self, rental_cancellation_service, sample_rental_from_scratch):
        """Тест обработки удаления аренды с авансом."""
        # Arrange
        sample_rental_from_scratch.created_at = datetime.now(timezone.utc) - timedelta(hours=12)
        sample_rental_from_scratch.prepayment_amount = 200.0
        rental_cancellation_service.balance_service.add_transaction = AsyncMock()

        # Act
        await rental_cancellation_service._handle_scratch_rental_deletion(sample_rental_from_scratch)

        # Assert
        # Проверяем, что были созданы обе транзакции: возврат основной суммы и возврат аванса
        assert rental_cancellation_service.balance_service.add_transaction.call_count == 2

