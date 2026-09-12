# tests/services/test_reservation_lifecycle_service.py
"""
Тесты для ReservationLifecycleService - управления жизненным циклом резервирований.
Тестирует создание, обновление, отмену резервирований пользователями и администраторами.
"""

import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from api.services.order.reservation_service import ReservationLifecycleService


def mock_reservation_creation():
    """Универсальная функция для мокирования создания объектов Reservation."""
    with patch('api.services.order.reservation_service.Reservation') as mock_reservation_class:
        mock_reservation_instance = MagicMock()
        mock_reservation_class.return_value = mock_reservation_instance
        yield mock_reservation_instance
from api.models.user import User
from api.models.reservation import Reservation
from api.models.equipment import Equipment
from api.models.promo_code import PromoCode
from shared.schemas.reservation_schema import (
    ReservationCreateRequest,
    ReservationUpdateRequest,
    AdminReservationCreateRequest,
)
from shared.constants.order_status import OrderStatus


class TestReservationLifecycleService:
    """Тесты для ReservationLifecycleService."""

    @pytest.fixture
    def reservation_service(self, mock_db_session):
        """Создает экземпляр ReservationLifecycleService с моком БД и зависимостями."""
        from api.repositories.reservation_repository import ReservationRepository
        from api.repositories.user_repository import UserRepository
        from api.repositories.equipment_repository import EquipmentRepository
        from api.services.order.system_repository import SystemService
        
        mock_reservation_repo = MagicMock(spec=ReservationRepository)
        mock_user_repo = MagicMock(spec=UserRepository)
        mock_equipment_repo = MagicMock(spec=EquipmentRepository)
        mock_system_service = MagicMock(spec=SystemService)
        mock_validator = AsyncMock()
        mock_financial_service = AsyncMock()
        mock_promo_code_logic = AsyncMock()
        
        # Настраиваем мок для filter_cancellable_reservations (будет перезаписан в тестах)
        mock_validator.filter_cancellable_reservations = MagicMock(return_value=([], []))
        
        return ReservationLifecycleService(
            db=mock_db_session, 
            reservation_repo=mock_reservation_repo,
            user_repo=mock_user_repo,
            equipment_repo=mock_equipment_repo,
            system_service=mock_system_service,
            validator=mock_validator,
            financial_service=mock_financial_service,
            promo_code_logic=mock_promo_code_logic
        )

    @pytest.fixture
    def mock_user(self):
        """Создает реальный объект пользователя."""
        return User(
            id=1,
            email="user@example.com",
            balance=1000.0
        )

    @pytest.fixture
    def mock_equipment(self):
        """Создает реальный объект оборудования."""
        return Equipment(
            id=1,
            name="Test Camera",
            equipment_type="Camera",
            brand="Test Brand",
            condition="Good",
            daily_rate=100.0
        )

    @pytest.fixture
    def mock_promo_code(self):
        """Создает реальный объект промокода."""
        return PromoCode(
            id=1,
            code="TEST10",
            discount_percentage=10.0
        )

    @pytest.fixture
    def mock_reservation(self, mock_user, mock_equipment):
        """Создает реальный объект резерва."""
        reservation = Reservation(
            id=1,
            user_id=mock_user.id,
            user=mock_user,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 5),
            total_cost=400.0
        )
        reservation.equipment = [mock_equipment]
        reservation.accessory_links = []
        reservation.promo_code_id = None
        return reservation

    # === ТЕСТЫ ДЛЯ create_user_reservation ===

    @pytest.mark.asyncio
    async def test_create_user_reservation_success(self, reservation_service, mock_db_session, 
                                                  mock_user, mock_equipment, mock_reservation):
        """
        Тест успешного создания резервирования пользователем.
        """
        # Arrange
        request = ReservationCreateRequest(
            equipment_ids=[1],
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 5),
            selected_accessories=None,
            promo_code=None
        )
        
        # Мокаем все зависимости
        reservation_service.validator.validate_user_can_create_reservation = AsyncMock()
        reservation_service.validator.validate_dates_and_holidays = AsyncMock()
        reservation_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=[mock_equipment])
        reservation_service.validator.validate_accessories_for_equipment = MagicMock()
        reservation_service.validator.validate_equipment_availability = AsyncMock()
        
        from api.services.financial_service import PriceDetails
        price_details = PriceDetails(full_total=400.0, discount_amount=0.0, final_total=400.0)
        reservation_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        reservation_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(return_value=None)
        reservation_service.reservation_repo.save_object = AsyncMock()
        reservation_service.reservation_repo.get_by_id_with_details = AsyncMock(return_value=mock_reservation)
        
        # Мокаем транзакции БД
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)

        # Act
        result = await reservation_service.create_user_reservation(request, mock_user)

        # Assert
        assert result == mock_reservation
        
        # Проверяем, что резерв был сохранен через репозиторий
        reservation_service.reservation_repo.save_object.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_user_reservation_with_promo_code(self, reservation_service, mock_db_session, 
                                                          mock_user, mock_equipment, mock_promo_code, mock_reservation):
        """
        Тест создания резервирования с промокодом.
        """
        # Arrange
        request = ReservationCreateRequest(
            equipment_ids=[1],
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 5),
            selected_accessories=None,
            promo_code="TEST10"
        )
        
        # Мокаем все зависимости
        reservation_service.validator.validate_user_can_create_reservation = AsyncMock()
        reservation_service.validator.validate_dates_and_holidays = AsyncMock()
        reservation_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=[mock_equipment])
        reservation_service.validator.validate_accessories_for_equipment = MagicMock()
        reservation_service.validator.validate_equipment_availability = AsyncMock()
        
        from api.services.financial_service import PriceDetails
        price_details = PriceDetails(full_total=360.0, discount_amount=40.0, final_total=320.0)
        reservation_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        reservation_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(return_value=mock_promo_code)
        reservation_service.reservation_repo.save_object = AsyncMock()
        reservation_service.reservation_repo.get_by_id_with_details = AsyncMock(return_value=mock_reservation)
        
        # Мокаем транзакции БД
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)

        # Act
        result = await reservation_service.create_user_reservation(request, mock_user)

        # Assert
        assert result == mock_reservation
        
        # Проверяем, что промокод был валидирован
        reservation_service.promo_code_logic.validate_and_get_promo_code.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_user_reservation_invalid_promo_code(self, reservation_service, mock_db_session, 
                                                             mock_user, mock_equipment):
        """
        Тест создания резервирования с невалидным промокодом.
        """
        # Arrange
        request = ReservationCreateRequest(
            equipment_ids=[1],
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 5),
            selected_accessories=None,
            promo_code="INVALID"
        )
        
        # Мокаем создание объекта Reservation
        with patch('api.services.order.reservation_service.Reservation') as mock_reservation_class:
            mock_reservation_instance = MagicMock()
            mock_reservation_class.return_value = mock_reservation_instance
            
            # Мокаем создание объекта Reservation
        with patch('api.services.order.reservation_service.Reservation') as mock_reservation_class:
            mock_reservation_instance = MagicMock()
            mock_reservation_class.return_value = mock_reservation_instance
            
            # Мокаем все зависимости
            with patch.object(reservation_service.validator, 'validate_dates_and_holidays'):
                with patch.object(reservation_service.equipment_repo, 'get_equipment_by_ids_or_fail', return_value=[mock_equipment]):
                    with patch.object(reservation_service.validator, 'validate_accessories_for_equipment'):
                        with patch.object(reservation_service.validator, 'validate_equipment_availability'):
                            with patch.object(reservation_service.financial_service, 'calculate_final_price') as mock_calc_price:
                                with patch.object(reservation_service.promo_code_logic, 'validate_and_get_promo_code', side_effect=Exception("Invalid promo code")):
                                    # Act & Assert
                                    with pytest.raises(Exception, match="Invalid promo code"):
                                        await reservation_service.create_user_reservation(request, mock_user)

    @pytest.mark.asyncio
    async def test_create_user_reservation_with_accessories(self, reservation_service, mock_db_session, 
                                                           mock_user, mock_equipment, mock_reservation):
        """
        Тест создания резервирования с аксессуарами.
        """
        # Arrange
        request = ReservationCreateRequest(
            equipment_ids=[1],
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 5),
            selected_accessories={1: [1, 2]},  # Для оборудования 1 аксессуары 1 и 2
            promo_code=None
        )
        
        # Мокаем все зависимости
        reservation_service.validator.validate_user_can_create_reservation = AsyncMock()
        reservation_service.validator.validate_dates_and_holidays = AsyncMock()
        reservation_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=[mock_equipment])
        reservation_service.validator.validate_accessories_for_equipment = MagicMock()
        reservation_service.validator.validate_equipment_availability = AsyncMock()
        
        from api.services.financial_service import PriceDetails
        price_details = PriceDetails(full_total=500.0, discount_amount=0.0, final_total=500.0)
        reservation_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        reservation_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(return_value=None)
        reservation_service.reservation_repo.save_object = AsyncMock()
        reservation_service.reservation_repo.get_by_id_with_details = AsyncMock(return_value=mock_reservation)
        
        # Мокаем транзакции БД
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)

        # Act
        result = await reservation_service.create_user_reservation(request, mock_user)

        # Assert
        assert result == mock_reservation
        reservation_service.reservation_repo.save_object.assert_called_once()

    # === ТЕСТЫ ДЛЯ update_user_reservation ===

    @pytest.mark.asyncio
    async def test_update_user_reservation_success(self, reservation_service, mock_db_session, 
                                                  mock_user, mock_equipment, mock_reservation):
        """
        Тест успешного обновления резервирования пользователем.
        """
        # Arrange
        reservation_id = 1
        request = ReservationUpdateRequest(
            equipment_ids=[1],
            start_date=date(2025, 1, 2),
            end_date=date(2025, 1, 6),
            selected_accessories=None,
            promo_code=None
        )
        
        # Мокаем все зависимости
        reservation_service.reservation_repo.get_by_id_with_details = AsyncMock(side_effect=[mock_reservation, mock_reservation])
        reservation_service.validator.validate_user_can_edit_reservation = AsyncMock()
        reservation_service.validator.validate_dates_and_holidays = AsyncMock()
        reservation_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=[mock_equipment])
        reservation_service.validator.validate_accessories_for_equipment = MagicMock()
        reservation_service.validator.validate_equipment_availability = AsyncMock()
        
        from api.services.financial_service import PriceDetails
        price_details = PriceDetails(full_total=400.0, discount_amount=0.0, final_total=400.0)
        reservation_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        reservation_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(return_value=None)
        reservation_service.reservation_repo.save_object = AsyncMock()
        
        # Мокаем транзакции БД
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)

        # Act
        result = await reservation_service.update_user_reservation(
            reservation_id, request, mock_user
        )

        # Assert
        assert result == mock_reservation
        reservation_service.reservation_repo.save_object.assert_called_once()
                                        # В новой архитектуре используется db.add(), а не repo.save()

    @pytest.mark.asyncio
    async def test_update_user_reservation_with_new_promo_code(self, reservation_service, mock_db_session, 
                                                              mock_user, mock_equipment, mock_reservation, mock_promo_code):
        """
        Тест обновления резервирования с новым промокодом.
        """
        # Arrange
        reservation_id = 1
        request = ReservationUpdateRequest(
            equipment_ids=[1],
            start_date=date(2025, 1, 2),
            end_date=date(2025, 1, 6),
            selected_accessories=None,
            promo_code="NEW10"
        )
        
        # Мокаем все зависимости
        reservation_service.reservation_repo.get_by_id_with_details = AsyncMock(side_effect=[mock_reservation, mock_reservation])
        reservation_service.validator.validate_user_can_edit_reservation = AsyncMock()
        reservation_service.validator.validate_dates_and_holidays = AsyncMock()
        reservation_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=[mock_equipment])
        reservation_service.validator.validate_accessories_for_equipment = MagicMock()
        reservation_service.validator.validate_equipment_availability = AsyncMock()
        
        from api.services.financial_service import PriceDetails
        price_details = PriceDetails(full_total=360.0, discount_amount=40.0, final_total=320.0)
        reservation_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        reservation_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(return_value=mock_promo_code)
        reservation_service.reservation_repo.save_object = AsyncMock()
        
        # Мокаем транзакции БД
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)

        # Act
        result = await reservation_service.update_user_reservation(
            reservation_id, request, mock_user
        )

        # Assert
        assert result == mock_reservation
        
        # Проверяем, что новый промокод был валидирован
        reservation_service.promo_code_logic.validate_and_get_promo_code.assert_called_once()

    # === ТЕСТЫ ДЛЯ cancel_user_reservation ===

    @pytest.mark.asyncio
    async def test_cancel_user_reservation_success(self, reservation_service, mock_db_session, 
                                                  mock_user, mock_reservation):
        """
        Тест успешной отмены резервирования пользователем.
        """
        # Arrange
        reservation_id = 1
        
        # Мокаем все зависимости
        reservation_service.reservation_repo.get_by_id_with_details = AsyncMock(return_value=mock_reservation)
        reservation_service.validator.validate_user_can_cancel_reservation = AsyncMock()
        reservation_service.validator.validate_reservation_is_cancellable = MagicMock()
        reservation_service.reservation_repo.save_object = AsyncMock()
        
        # Мокаем транзакции БД
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)

        # Act
        await reservation_service.cancel_user_reservation(reservation_id, mock_user)

        # Assert
        # Проверяем, что резерв был переведен в статус CANCELLED и сохранен (soft delete)
        assert mock_reservation.status == OrderStatus.CANCELLED.value
        reservation_service.reservation_repo.save_object.assert_called_once_with(mock_reservation)

    @pytest.mark.asyncio
    async def test_cancel_user_reservation_not_cancellable(self, reservation_service, mock_db_session, 
                                                          mock_user, mock_reservation):
        """
        Тест отмены резервирования, которое нельзя отменить.
        """
        # Arrange
        reservation_id = 1
        
        # Мокаем все зависимости
        reservation_service.reservation_repo.get_by_id_with_details = AsyncMock(return_value=mock_reservation)
        reservation_service.validator.validate_user_can_cancel_reservation = AsyncMock()
        reservation_service.validator.validate_reservation_is_cancellable = MagicMock(side_effect=Exception("Cannot cancel"))
        
        # Мокаем транзакции БД
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        # Act & Assert
        with pytest.raises(Exception, match="Cannot cancel"):
            await reservation_service.cancel_user_reservation(reservation_id, mock_user)

    # === ТЕСТЫ ДЛЯ create_admin_reservation ===

    @pytest.mark.asyncio
    async def test_create_admin_reservation_success(self, reservation_service, mock_db_session, 
                                                   mock_user, mock_equipment, mock_reservation):
        """
        Тест успешного создания резервирования администратором.
        """
        # Arrange
        request = AdminReservationCreateRequest(
            user_id=1,
            equipment_ids=[1],
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 5),
            selected_accessories=None,
            promo_code=None
        )
        
        # Мокаем все зависимости
        reservation_service.user_repo.get_user_by_id_or_fail = AsyncMock(return_value=mock_user)
        reservation_service.validator.validate_dates_and_holidays = AsyncMock()
        reservation_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=[mock_equipment])
        reservation_service.validator.validate_accessories_for_equipment = MagicMock()
        reservation_service.validator.validate_equipment_availability = AsyncMock()
        
        from api.services.financial_service import PriceDetails
        price_details = PriceDetails(full_total=400.0, discount_amount=0.0, final_total=400.0)
        reservation_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        reservation_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(return_value=None)
        reservation_service.reservation_repo.save_object = AsyncMock()
        reservation_service.reservation_repo.get_by_id_with_details = AsyncMock(return_value=mock_reservation)
        
        # Мокаем транзакции БД
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        # Act
        result = await reservation_service.create_admin_reservation(request)

        # Assert
        assert result == mock_reservation
        
        # Проверяем, что был получен пользователь
        reservation_service.user_repo.get_user_by_id_or_fail.assert_called_once_with(1)

    # === ТЕСТЫ ДЛЯ update_admin_reservation ===

    @pytest.mark.asyncio
    async def test_update_admin_reservation_success(self, reservation_service, mock_db_session, 
                                                   mock_user, mock_reservation):
        """
        Тест успешного обновления резервирования администратором.
        """
        # Arrange
        reservation_id = 1
        request = ReservationUpdateRequest(
            equipment_ids=[1],
            start_date=date(2025, 1, 2),
            end_date=date(2025, 1, 6),
            selected_accessories=None,
            promo_code=None
        )
        
        # Мокаем все зависимости
        reservation_service.reservation_repo.get_by_id_with_details = AsyncMock(side_effect=[mock_reservation, mock_reservation])
        reservation_service.user_repo.get_user_by_id_or_fail = AsyncMock(return_value=mock_user)
        reservation_service.validator.validate_dates_and_holidays = AsyncMock()
        
        # Создаем реальный объект оборудования для теста
        from api.models.equipment import Equipment
        mock_equipment = Equipment(
            id=1,
            name="Test Camera",
            equipment_type="Camera",
            brand="Test Brand",
            condition="Good",
            daily_rate=100.0
        )
        reservation_service.equipment_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=[mock_equipment])
        reservation_service.validator.validate_accessories_for_equipment = MagicMock()
        reservation_service.validator.validate_equipment_availability = AsyncMock()
        
        from api.services.financial_service import PriceDetails
        price_details = PriceDetails(full_total=400.0, discount_amount=0.0, final_total=400.0)
        reservation_service.financial_service.calculate_final_price = AsyncMock(return_value=price_details)
        reservation_service.promo_code_logic.validate_and_get_promo_code = AsyncMock(return_value=None)
        reservation_service.reservation_repo.save_object = AsyncMock()
        
        # Мокаем транзакции БД
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)
        
        # Act
        result = await reservation_service.update_admin_reservation(reservation_id, request)

        # Assert
        assert result == mock_reservation
        
        # Проверяем, что был получен резерв
        assert reservation_service.reservation_repo.get_by_id_with_details.called
        
        # Проверяем, что был получен пользователь
        reservation_service.user_repo.get_user_by_id_or_fail.assert_called_once_with(mock_reservation.user_id)

    # === ТЕСТЫ ДЛЯ cancel_admin_reservation ===

    @pytest.mark.asyncio
    async def test_cancel_admin_reservation_success(self, reservation_service, mock_db_session, 
                                                   mock_reservation):
        """
        Тест успешной отмены резервирования администратором.
        """
        # Arrange
        reservation_id = 1
        
        # Мокаем все зависимости
        reservation_service.reservation_repo.get_by_id_with_details = AsyncMock(return_value=mock_reservation)
        reservation_service.validator.validate_reservation_is_cancellable = MagicMock()
        reservation_service.reservation_repo.save_object = AsyncMock()
        
        # Мокаем транзакции БД
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=None)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        mock_db_session.begin_nested = MagicMock(return_value=mock_context)

        # Act
        await reservation_service.cancel_admin_reservation(reservation_id)

        # Assert
        # Проверяем, что резерв был переведен в статус CANCELLED и сохранен
        assert mock_reservation.status == OrderStatus.CANCELLED.value
        reservation_service.reservation_repo.save_object.assert_called_once_with(mock_reservation)

    # === ТЕСТЫ ДЛЯ bulk_cancel_admin_reservations ===

    @pytest.mark.asyncio
    async def test_bulk_cancel_admin_reservations_success(self, reservation_service, mock_db_session, 
                                                         mock_reservation):
        """
        Тест успешного пакетного удаления резервирований администратором.
        """
        # Arrange
        reservation_ids = [1, 2, 3]
        cancellable_reservations = [mock_reservation]
        not_cancellable_reservations = []
        
        # Мокаем все зависимости
        with patch.object(reservation_service.reservation_repo, 'find_by_ids', return_value=[mock_reservation]):
            # Настраиваем обычный мок для filter_cancellable_reservations (не асинхронный)
            reservation_service.validator.filter_cancellable_reservations = MagicMock(return_value=(cancellable_reservations, not_cancellable_reservations))
            
            with patch.object(reservation_service.reservation_repo, 'save_object', new_callable=AsyncMock) as mock_save:
                # Мокаем транзакции БД
                mock_db_session.begin_nested.return_value.__aenter__.return_value = None
                mock_db_session.begin_nested.return_value.__aexit__.return_value = None

                # Act
                await reservation_service.bulk_cancel_admin_reservations(reservation_ids)

                # Assert
                # Проверяем, что резерв был переведен в CANCELLED и сохранен
                assert mock_reservation.status == OrderStatus.CANCELLED.value
                mock_save.assert_called_once_with(mock_reservation)

    @pytest.mark.asyncio
    async def test_bulk_cancel_admin_reservations_mixed_cancellable(self, reservation_service, mock_db_session, 
                                                                   mock_reservation):
        """
        Тест пакетного удаления резервирований с смешанными статусами.
        """
        # Arrange
        reservation_ids = [1, 2, 3]
        cancellable_reservations = [mock_reservation]
        not_cancellable_reservations = [MagicMock(id=2)]  # Нельзя отменить
        
        # Мокаем все зависимости
        with patch.object(reservation_service.reservation_repo, 'find_by_ids', return_value=[mock_reservation, MagicMock(id=2)]):
            # Настраиваем обычный мок для filter_cancellable_reservations (не асинхронный)
            reservation_service.validator.filter_cancellable_reservations = MagicMock(return_value=(cancellable_reservations, not_cancellable_reservations))
            
            with patch.object(reservation_service.reservation_repo, 'save_object', new_callable=AsyncMock) as mock_save:
                # Мокаем транзакции БД
                mock_db_session.begin_nested.return_value.__aenter__.return_value = None
                mock_db_session.begin_nested.return_value.__aexit__.return_value = None

                # Act
                await reservation_service.bulk_cancel_admin_reservations(reservation_ids)

                # Assert
                # Проверяем, что был отменен и сохранен только отменяемый резерв
                assert mock_reservation.status == OrderStatus.CANCELLED.value
                mock_save.assert_called_once_with(mock_reservation)

    @pytest.mark.asyncio
    async def test_bulk_cancel_admin_reservations_none_cancellable(self, reservation_service, mock_db_session):
        """
        Тест пакетного удаления резервирований, когда ни одно нельзя отменить.
        """
        # Arrange
        reservation_ids = [1, 2, 3]
        cancellable_reservations = []
        not_cancellable_reservations = [MagicMock(id=1), MagicMock(id=2)]
        
        # Мокаем все зависимости
        with patch.object(reservation_service.reservation_repo, 'find_by_ids', return_value=not_cancellable_reservations):
            # Настраиваем обычный мок для filter_cancellable_reservations (не асинхронный)
            reservation_service.validator.filter_cancellable_reservations = MagicMock(return_value=(cancellable_reservations, not_cancellable_reservations))
            
            with patch.object(reservation_service.reservation_repo, 'delete') as mock_delete:
                with patch.object(reservation_service.reservation_repo, 'save'):
                    # Мокаем транзакции БД
                    mock_db_session.begin_nested.return_value.__aenter__.return_value = None
                    mock_db_session.begin_nested.return_value.__aexit__.return_value = None

                    # Act
                    await reservation_service.bulk_cancel_admin_reservations(reservation_ids)

                    # Assert
                    # Проверяем, что ни один резерв не был удален
                    mock_delete.assert_not_called()

    # === ИНТЕГРАЦИОННЫЕ ТЕСТЫ ===

    @pytest.mark.asyncio
    async def test_reservation_lifecycle_complete_flow(self, reservation_service, mock_db_session, 
                                                      mock_user, mock_equipment, mock_reservation):
        """
        Тест полного жизненного цикла резервирования: создание -> обновление -> отмена.
        """
        # Arrange
        create_request = ReservationCreateRequest(
            equipment_ids=[1],
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 5),
            selected_accessories=None,
            promo_code=None
        )
        
        update_request = ReservationUpdateRequest(
            equipment_ids=[1],
            start_date=date(2025, 1, 2),
            end_date=date(2025, 1, 6),
            selected_accessories=None,
            promo_code=None
        )
        
        # Мокаем создание объекта Reservation
        with patch('api.services.order.reservation_service.Reservation') as mock_reservation_class:
            mock_reservation_instance = MagicMock()
            mock_reservation_class.return_value = mock_reservation_instance
            
            # Мокаем все зависимости для создания
            with patch.object(reservation_service.validator, 'validate_dates_and_holidays'):
                with patch.object(reservation_service.equipment_repo, 'get_equipment_by_ids_or_fail', return_value=[mock_equipment]):
                    with patch.object(reservation_service.validator, 'validate_accessories_for_equipment'):
                        with patch.object(reservation_service.validator, 'validate_equipment_availability'):
                            with patch.object(reservation_service.financial_service, 'calculate_final_price', return_value=MagicMock(final_total=400.0, discount_amount=0.0)):
                                with patch.object(reservation_service.reservation_repo, 'save'):
                                    with patch.object(reservation_service.reservation_repo, 'get_by_id_with_details', return_value=mock_reservation):
                                        # Мокаем транзакции БД
                                        mock_db_session.begin_nested.return_value.__aenter__.return_value = None
                                        mock_db_session.begin_nested.return_value.__aexit__.return_value = None
                                        mock_db_session.add.return_value = None
                                        mock_db_session.flush.return_value = None

                                        # Act 1: Создание резерва
                                        created_reservation = await reservation_service.create_user_reservation(create_request, mock_user)
                                        
                                        # Act 2: Обновление резерва
                                        with patch.object(reservation_service.reservation_repo, 'save'):
                                            updated_reservation = await reservation_service.update_user_reservation(
                                                1, update_request, mock_user
                                            )
                                        
                                        # Act 3: Отмена резерва
                                        with patch.object(reservation_service.validator, 'validate_reservation_is_cancellable'):
                                            with patch.object(reservation_service.reservation_repo, 'delete'):
                                                with patch.object(reservation_service.reservation_repo, 'save'):
                                                    await reservation_service.cancel_user_reservation(1, mock_user)

                                        # Assert
                                        assert created_reservation == mock_reservation
                                        assert updated_reservation == mock_reservation
