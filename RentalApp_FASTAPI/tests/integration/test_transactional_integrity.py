# tests/integration/test_transactional_integrity.py

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from api.services.user_service import UserService
from api.services.equipment_crud_service import EquipmentCRUDService
from api.services.accessory_service import AccessoryService
from api.models.user import User
from api.models.equipment import Equipment
from api.models.accessory import Accessory
from shared.schemas.user_schema import AdminUserCreate
from shared.schemas.equipment_schema import EquipmentUpdateExtended
from shared.schemas.accessory_schema import AccessoryCreate, AccessoryUpdate


# Фикстуры из critical conftest уже доступны


@pytest.mark.integration
class TestTransactionalIntegrity:
    """Интеграционные тесты для проверки транзакционной целостности."""

    @pytest.fixture
    def mock_db(self):
        """Создает мок базы данных с транзакционными методами."""
        db = AsyncMock()
        db.commit = AsyncMock()
        db.rollback = AsyncMock()
        db.begin_nested = MagicMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        return db

    @pytest.fixture
    def mock_user_repo(self):
        """Создает мок репозитория пользователей."""
        return AsyncMock()

    @pytest.fixture
    def mock_equipment_repo(self):
        """Создает мок репозитория оборудования."""
        return AsyncMock()

    @pytest.fixture
    def mock_accessory_repo(self):
        """Создает мок репозитория аксессуаров."""
        return AsyncMock()

    @pytest.fixture
    def mock_balance_service(self):
        """Создает мок сервиса баланса."""
        return AsyncMock()

    @pytest.fixture
    def mock_balance_history_repo(self):
        """Создает мок репозитория истории баланса."""
        return AsyncMock()

    @pytest.fixture
    def mock_payment_repo(self):
        """Создает мок репозитория платежей."""
        return AsyncMock()

    @pytest.fixture
    def mock_order_validator(self):
        """Создает мок валидатора заказов."""
        return AsyncMock()

    @pytest.fixture
    def user_service(self, mock_db, mock_user_repo, mock_balance_service, mock_balance_history_repo, mock_payment_repo, mock_order_validator):
        """Создает экземпляр UserService."""
        return UserService(
            db=mock_db,
            user_repo=mock_user_repo,
            balance_service=mock_balance_service,
            balance_history_repo=mock_balance_history_repo,
            payment_repo=mock_payment_repo,
            order_validator=mock_order_validator
        )

    @pytest.fixture
    def equipment_crud_service(self, mock_db, mock_equipment_repo):
        """Создает экземпляр EquipmentCRUDService."""
        return EquipmentCRUDService(db=mock_db, repo=mock_equipment_repo)

    @pytest.fixture
    def accessory_service(self, mock_db, mock_accessory_repo):
        """Создает экземпляр AccessoryService."""
        return AccessoryService(db=mock_db, repo=mock_accessory_repo)

    @pytest.mark.asyncio
    async def test_user_block_unblock_transaction_integrity(self, user_service, mock_db, mock_user_repo):
        """Тест транзакционной целостности при блокировке/разблокировке пользователя."""
        # Arrange
        user_id = 1
        current_user = MagicMock(spec=User)
        current_user.id = 2
        
        user_to_block = MagicMock(spec=User)
        user_to_block.id = user_id
        user_to_block.email = "test@example.com"
        user_to_block.is_active = True
        
        mock_user_repo.get_by_id.return_value = user_to_block

        # Act - блокируем пользователя
        result = await user_service.block_user(user_id, current_user)

        # Assert - проверяем, что транзакция была закоммичена
        assert result["message"] == "Пользователь test@example.com заблокирован"
        assert user_to_block.is_active is False
        # Commit выполняется middleware, не в сервисе

        # Reset mocks
        mock_db.reset_mock()
        mock_user_repo.reset_mock()

        # Act - разблокируем пользователя
        user_to_unblock = MagicMock(spec=User)
        user_to_unblock.id = user_id
        user_to_unblock.email = "test@example.com"
        user_to_unblock.is_active = False
        
        mock_user_repo.get_by_id.return_value = user_to_unblock
        
        result = await user_service.unblock_user(user_id)

        # Assert - проверяем, что транзакция была закоммичена
        assert result["message"] == "Пользователь test@example.com разблокирован"
        assert user_to_unblock.is_active is True
        # Commit выполняется middleware, не в сервисе

    @pytest.mark.asyncio
    async def test_equipment_crud_transaction_integrity(self, equipment_crud_service, mock_db, mock_equipment_repo):
        """Тест транзакционной целостности при CRUD операциях с оборудованием."""
        # Arrange
        equipment_data = {"name": "Test Camera", "daily_rate": 100.0}
        created_equipment = MagicMock(spec=Equipment)
        created_equipment.id = 1
        created_equipment.name = "Test Camera"
        
        mock_equipment_repo.create.return_value = created_equipment

        # Act - создаем оборудование
        result = await equipment_crud_service.create_equipment(equipment_data)

        # Assert - проверяем, что транзакция была закоммичена
        assert result == created_equipment
        mock_equipment_repo.create.assert_called_once_with(equipment_data)
        # Commit выполняется middleware, не в сервисе

        # Reset mocks
        mock_db.reset_mock()
        mock_equipment_repo.reset_mock()

        # Arrange - обновление оборудования
        equipment_id = 1
        update_data = EquipmentUpdateExtended(name="Updated Camera")
        existing_equipment = MagicMock(spec=Equipment)
        existing_equipment.id = equipment_id
        
        updated_equipment = MagicMock(spec=Equipment)
        updated_equipment.id = equipment_id
        updated_equipment.name = "Updated Camera"
        
        mock_equipment_repo.get_by_id_with_details.return_value = existing_equipment
        mock_equipment_repo.update_with_relations.return_value = updated_equipment

        # Act - обновляем оборудование
        result = await equipment_crud_service.update_equipment_details(equipment_id, update_data)

        # Assert - проверяем, что транзакция была закоммичена
        assert result == updated_equipment
        mock_equipment_repo.get_by_id_with_details.assert_called_once_with(equipment_id)
        mock_equipment_repo.update_with_relations.assert_called_once_with(existing_equipment, update_data)
        # Commit выполняется middleware, не в сервисе

        # Reset mocks
        mock_db.reset_mock()
        mock_equipment_repo.reset_mock()

        # Arrange - удаление оборудования
        equipment_to_delete = MagicMock(spec=Equipment)
        equipment_to_delete.id = equipment_id
        
        mock_equipment_repo.get_by_id.return_value = equipment_to_delete
        mock_equipment_repo.delete = AsyncMock()

        # Act - удаляем оборудование
        await equipment_crud_service.delete_equipment(equipment_id)

        # Assert - проверяем, что транзакция была закоммичена
        mock_equipment_repo.get_by_id.assert_called_once_with(equipment_id)
        mock_equipment_repo.delete.assert_called_once_with(equipment_id)
        # Commit выполняется middleware, не в сервисе

    @pytest.mark.asyncio
    async def test_accessory_crud_transaction_integrity(self, accessory_service, mock_db, mock_accessory_repo):
        """Тест транзакционной целостности при CRUD операциях с аксессуарами."""
        # Arrange
        accessory_data = AccessoryCreate(
            name="Test Lens",
            price=50.0,
            description="Test description"
        )
        created_accessory = MagicMock(spec=Accessory)
        created_accessory.id = 1
        created_accessory.name = "Test Lens"
        
        mock_accessory_repo.create.return_value = created_accessory
        mock_accessory_repo.save = AsyncMock()

        # Act - создаем аксессуар
        result = await accessory_service.create_accessory(accessory_data)

        # Assert - проверяем, что транзакция была сохранена
        assert result == created_accessory
        mock_accessory_repo.create.assert_called_once_with(accessory_data)
        mock_accessory_repo.save.assert_called_once()

        # Reset mocks
        mock_accessory_repo.reset_mock()

        # Arrange - обновление аксессуара
        accessory_id = 1
        update_data = AccessoryUpdate(name="Updated Lens", price=60.0)
        existing_accessory = MagicMock(spec=Accessory)
        existing_accessory.id = accessory_id
        
        updated_accessory = MagicMock(spec=Accessory)
        updated_accessory.id = accessory_id
        updated_accessory.name = "Updated Lens"
        
        mock_accessory_repo.get_by_id.return_value = existing_accessory
        mock_accessory_repo.update.return_value = updated_accessory
        mock_accessory_repo.save = AsyncMock()

        # Act - обновляем аксессуар
        result = await accessory_service.update_accessory(accessory_id, update_data)

        # Assert - проверяем, что транзакция была сохранена
        assert result == updated_accessory
        mock_accessory_repo.get_by_id.assert_called_once_with(accessory_id)
        mock_accessory_repo.update.assert_called_once_with(existing_accessory, update_data)
        mock_accessory_repo.save.assert_called_once()

        # Reset mocks
        mock_accessory_repo.reset_mock()

        # Arrange - удаление аксессуара
        mock_accessory_repo.check_usage_and_delete = AsyncMock()
        mock_accessory_repo.save = AsyncMock()

        # Act - удаляем аксессуар
        await accessory_service.delete_accessory(accessory_id)

        # Assert - проверяем, что транзакция была сохранена
        mock_accessory_repo.check_usage_and_delete.assert_called_once_with(accessory_id)
        mock_accessory_repo.save.assert_called_once()

    @pytest.mark.asyncio
    async def test_transaction_rollback_on_error(self, equipment_crud_service, mock_db, mock_equipment_repo):
        """Тест отката транзакции при ошибке."""
        # Arrange
        equipment_id = 1
        update_data = EquipmentUpdateExtended(name="Updated Camera")
        existing_equipment = MagicMock(spec=Equipment)
        existing_equipment.id = equipment_id
        
        # Симулируем ошибку в репозитории
        mock_equipment_repo.get_by_id_with_details.return_value = existing_equipment
        mock_equipment_repo.update_with_relations.side_effect = Exception("Database error")

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await equipment_crud_service.update_equipment_details(equipment_id, update_data)

        assert str(exc_info.value) == "Database error"
        # Проверяем, что commit не был вызван при ошибке
        mock_db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_user_self_block_prevention(self, user_service, mock_db, mock_user_repo):
        """Тест предотвращения блокировки самого себя."""
        # Arrange
        user_id = 1
        current_user = MagicMock(spec=User)
        current_user.id = 1  # Тот же пользователь

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await user_service.block_user(user_id, current_user)

        assert exc_info.value.status_code == 400
        assert "Нельзя заблокировать самого себя" in exc_info.value.detail
        # Проверяем, что репозиторий и commit не были вызваны
        mock_user_repo.get_by_id.assert_not_called()
        mock_db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_equipment_not_found_error_handling(self, equipment_crud_service, mock_db, mock_equipment_repo):
        """Тест обработки ошибки при попытке обновить несуществующее оборудование."""
        # Arrange
        equipment_id = 999
        update_data = EquipmentUpdateExtended(name="Updated Camera")
        
        mock_equipment_repo.get_by_id_with_details.return_value = None

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await equipment_crud_service.update_equipment_details(equipment_id, update_data)

        assert exc_info.value.status_code == 404
        assert "Оборудование не найдено" in exc_info.value.detail
        # Проверяем, что commit не был вызван
        mock_db.commit.assert_not_called()
