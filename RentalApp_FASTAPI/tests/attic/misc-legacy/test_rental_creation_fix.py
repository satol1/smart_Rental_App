#! /usr/bin/env python3
# tests/test_rental_creation_fix.py

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import date, datetime
from decimal import Decimal

from api.services.order.rental_creation_service import RentalCreationService
from api.models.user import User
from api.models.rental import Rental, RentalAccessory
from api.models.equipment import Equipment
from shared.schemas.rental_schema import RentalCreateFromScratchRequest
from shared.constants.order_status import OrderStatus


class TestRentalCreationFix:
    """Тесты для проверки исправления ошибки MissingGreenlet при создании аренды."""

    @pytest.fixture
    def mock_dependencies(self):
        """Создает моки всех зависимостей для RentalCreationService."""
        return {
            'db': AsyncMock(),
            'rental_repo': AsyncMock(),
            'reservation_repo': AsyncMock(),
            'user_repo': AsyncMock(),
            'equipment_repo': AsyncMock(),
            'system_service': AsyncMock(),
            'validator': AsyncMock(),
            'balance_service': AsyncMock(),
            'financial_service': AsyncMock(),
            'promo_code_logic': AsyncMock()
        }

    @pytest.fixture
    def rental_creation_service(self, mock_dependencies):
        """Создает экземпляр RentalCreationService с моками."""
        return RentalCreationService(**mock_dependencies)

    @pytest.fixture
    def sample_user(self):
        """Создает тестового пользователя."""
        user = User()
        user.id = 1
        user.name = "Test User"
        user.email = "test@example.com"
        return user

    @pytest.fixture
    def sample_manager(self):
        """Создает тестового менеджера."""
        manager = User()
        manager.id = 2
        manager.name = "Test Manager"
        manager.email = "manager@example.com"
        return manager

    @pytest.fixture
    def sample_equipment(self):
        """Создает тестовое оборудование."""
        equipment = Equipment()
        equipment.id = 1
        equipment.name = "Test Equipment"
        equipment.daily_rate = 100.0
        return equipment

    @pytest.fixture
    def sample_rental_request(self):
        """Создает тестовый запрос на создание аренды."""
        return RentalCreateFromScratchRequest(
            user_id=1,
            equipment_ids=[1],
            selected_accessories={1: [1, 2]},  # Оборудование 1 с аксессуарами 1 и 2
            start_date=date.today(),
            end_date=date.today(),
            deposit_amount=500.0,
            prepayment_amount=200.0,
            notes_on_issue="Test notes",
            promo_code=None,
            force_issue_on_holiday=False
        )

    @pytest.fixture
    def sample_rental(self):
        """Создает тестовую аренду."""
        rental = Rental()
        rental.id = 1
        rental.user_id = 1
        rental.created_by_id = 2
        rental.start_date = date.today()
        rental.end_date = date.today()
        rental.total_cost = 1000.0
        rental.discount_amount = 0.0
        rental.deposit_amount = 500.0
        rental.prepayment_amount = 200.0
        rental.status = OrderStatus.ACTIVE
        return rental

    @pytest.mark.asyncio
    async def test_create_rental_with_accessories_success(
        self, rental_creation_service, mock_dependencies, 
        sample_user, sample_manager, sample_equipment, 
        sample_rental_request, sample_rental
    ):
        """Тест успешного создания аренды с аксессуарами."""
        # Настройка моков
        mock_dependencies['user_repo'].get_user_by_id_or_fail.return_value = sample_user
        mock_dependencies['equipment_repo'].get_equipment_by_ids_or_fail.return_value = [sample_equipment]
        mock_dependencies['financial_service'].calculate_final_price.return_value = MagicMock(
            final_total=1000.0,
            discount_amount=0.0
        )
        mock_dependencies['rental_repo'].create_rental_instance.return_value = sample_rental
        mock_dependencies['rental_repo'].save_rental.return_value = sample_rental
        mock_dependencies['rental_repo'].get_rental_by_id_or_fail.return_value = sample_rental

        # Мок для транзакции БД
        mock_dependencies['db'].begin_nested.return_value.__aenter__.return_value = None
        mock_dependencies['db'].begin_nested.return_value.__aexit__.return_value = None

        # Выполнение теста
        result = await rental_creation_service.create_rental_from_scratch(
            sample_rental_request, sample_manager
        )

        # Проверки
        assert result == sample_rental
        mock_dependencies['user_repo'].get_user_by_id_or_fail.assert_called_once_with(1)
        mock_dependencies['equipment_repo'].get_equipment_by_ids_or_fail.assert_called_once_with([1])
        mock_dependencies['financial_service'].calculate_final_price.assert_called_once()
        mock_dependencies['rental_repo'].create_rental_instance.assert_called_once()
        mock_dependencies['rental_repo'].save_rental.assert_called_once()
        mock_dependencies['rental_repo'].get_rental_by_id_or_fail.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_add_accessories_to_rental_direct_db_approach(
        self, rental_creation_service, mock_dependencies, sample_rental
    ):
        """Тест добавления аксессуаров к аренде через прямую работу с БД."""
        # Настройка
        selected_accessories = {1: [1, 2], 2: [3]}
        mock_db = mock_dependencies['db']

        # Выполнение
        await rental_creation_service._add_accessories_to_rental(sample_rental, selected_accessories)

        # Проверки - должно быть 3 вызова db.add (1+2 аксессуара для оборудования 1, 1 аксессуар для оборудования 2)
        assert mock_db.add.call_count == 3

        # Проверяем, что создаются правильные объекты RentalAccessory
        calls = mock_db.add.call_args_list
        for call in calls:
            accessory_link = call[0][0]
            assert isinstance(accessory_link, RentalAccessory)
            assert accessory_link.rental_id == sample_rental.id
            assert accessory_link.equipment_id in [1, 2]
            assert accessory_link.accessory_id in [1, 2, 3]

    @pytest.mark.asyncio
    async def test_add_accessories_to_rental_empty_accessories(
        self, rental_creation_service, mock_dependencies, sample_rental
    ):
        """Тест добавления аксессуаров к аренде с пустым списком аксессуаров."""
        # Настройка
        selected_accessories = {}
        mock_db = mock_dependencies['db']

        # Выполнение
        await rental_creation_service._add_accessories_to_rental(sample_rental, selected_accessories)

        # Проверки - не должно быть вызовов db.add
        mock_db.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_rental_without_accessories_success(
        self, rental_creation_service, mock_dependencies,
        sample_user, sample_manager, sample_equipment, sample_rental
    ):
        """Тест успешного создания аренды без аксессуаров."""
        # Настройка запроса без аксессуаров
        request = RentalCreateFromScratchRequest(
            user_id=1,
            equipment_ids=[1],
            selected_accessories={},  # Пустые аксессуары
            start_date=date.today(),
            end_date=date.today(),
            deposit_amount=500.0,
            prepayment_amount=200.0,
            notes_on_issue="Test notes",
            promo_code=None,
            force_issue_on_holiday=False
        )

        # Настройка моков
        mock_dependencies['user_repo'].get_user_by_id_or_fail.return_value = sample_user
        mock_dependencies['equipment_repo'].get_equipment_by_ids_or_fail.return_value = [sample_equipment]
        mock_dependencies['financial_service'].calculate_final_price.return_value = MagicMock(
            final_total=1000.0,
            discount_amount=0.0
        )
        mock_dependencies['rental_repo'].create_rental_instance.return_value = sample_rental
        mock_dependencies['rental_repo'].save_rental.return_value = sample_rental
        mock_dependencies['rental_repo'].get_rental_by_id_or_fail.return_value = sample_rental

        # Мок для транзакции БД
        mock_dependencies['db'].begin_nested.return_value.__aenter__.return_value = None
        mock_dependencies['db'].begin_nested.return_value.__aexit__.return_value = None

        # Выполнение теста
        result = await rental_creation_service.create_rental_from_scratch(request, sample_manager)

        # Проверки
        assert result == sample_rental
        # Проверяем, что db.add не вызывался для аксессуаров
        mock_dependencies['db'].add.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_rental_error_handling(
        self, rental_creation_service, mock_dependencies,
        sample_manager, sample_rental_request
    ):
        """Тест обработки ошибок при создании аренды."""
        # Настройка мока для выброса исключения
        mock_dependencies['user_repo'].get_user_by_id_or_fail.side_effect = Exception("User not found")

        # Мок для транзакции БД
        mock_dependencies['db'].begin_nested.return_value.__aenter__.return_value = None
        mock_dependencies['db'].begin_nested.return_value.__aexit__.return_value = None

        # Выполнение теста и проверка исключения
        with pytest.raises(Exception, match="User not found"):
            await rental_creation_service.create_rental_from_scratch(
                sample_rental_request, sample_manager
            )

        # Проверяем, что был вызван метод логирования ошибки
        # (через notification_helper, который создается внутри сервиса)

    @pytest.mark.asyncio
    async def test_logging_during_rental_creation(
        self, rental_creation_service, mock_dependencies,
        sample_user, sample_manager, sample_equipment,
        sample_rental_request, sample_rental
    ):
        """Тест логирования во время создания аренды."""
        # Настройка моков
        mock_dependencies['user_repo'].get_user_by_id_or_fail.return_value = sample_user
        mock_dependencies['equipment_repo'].get_equipment_by_ids_or_fail.return_value = [sample_equipment]
        mock_dependencies['financial_service'].calculate_final_price.return_value = MagicMock(
            final_total=1000.0,
            discount_amount=0.0
        )
        mock_dependencies['rental_repo'].create_rental_instance.return_value = sample_rental
        mock_dependencies['rental_repo'].save_rental.return_value = sample_rental
        mock_dependencies['rental_repo'].get_rental_by_id_or_fail.return_value = sample_rental

        # Мок для транзакции БД
        mock_dependencies['db'].begin_nested.return_value.__aenter__.return_value = None
        mock_dependencies['db'].begin_nested.return_value.__aexit__.return_value = None

        # Выполнение с проверкой логирования
        with patch('api.services.order.rental_creation_service.logger') as mock_logger:
            await rental_creation_service.create_rental_from_scratch(
                sample_rental_request, sample_manager
            )

            # Проверяем, что были вызваны методы логирования
            mock_logger.info.assert_called()
            mock_logger.debug.assert_called()

            # Проверяем конкретные сообщения
            info_calls = [call[0][0] for call in mock_logger.info.call_args_list]
            assert any("Начинаем создание аренды для пользователя 1" in msg for msg in info_calls)
            assert any("Успешно создана аренда #1" in msg for msg in info_calls)

    @pytest.mark.asyncio
    async def test_balance_transactions_creation(
        self, rental_creation_service, mock_dependencies,
        sample_user, sample_manager, sample_equipment,
        sample_rental_request, sample_rental
    ):
        """Тест создания транзакций баланса."""
        # Настройка моков
        mock_dependencies['user_repo'].get_user_by_id_or_fail.return_value = sample_user
        mock_dependencies['equipment_repo'].get_equipment_by_ids_or_fail.return_value = [sample_equipment]
        mock_dependencies['financial_service'].calculate_final_price.return_value = MagicMock(
            final_total=1000.0,
            discount_amount=0.0
        )
        mock_dependencies['rental_repo'].create_rental_instance.return_value = sample_rental
        mock_dependencies['rental_repo'].save_rental.return_value = sample_rental
        mock_dependencies['rental_repo'].get_rental_by_id_or_fail.return_value = sample_rental

        # Мок для транзакции БД
        mock_dependencies['db'].begin_nested.return_value.__aenter__.return_value = None
        mock_dependencies['db'].begin_nested.return_value.__aexit__.return_value = None

        # Выполнение
        await rental_creation_service.create_rental_from_scratch(
            sample_rental_request, sample_manager
        )

        # Проверяем, что были созданы транзакции баланса
        balance_service = mock_dependencies['balance_service']
        assert balance_service.add_transaction.call_count == 2  # Предоплата + списание

        # Проверяем параметры транзакций
        calls = balance_service.add_transaction.call_args_list
        
        # Первая транзакция - предоплата
        prepayment_call = calls[0]
        assert prepayment_call[1]['user_id'] == 1
        assert prepayment_call[1]['amount'] == 200.0  # prepayment_amount
        assert prepayment_call[1]['rental_id'] == 1

        # Вторая транзакция - списание
        debit_call = calls[1]
        assert debit_call[1]['user_id'] == 1
        assert debit_call[1]['amount'] == -1000.0  # -total_cost
        assert debit_call[1]['rental_id'] == 1
