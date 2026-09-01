# tests/services/test_equipment_crud_service_fixed.py

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from api.services.equipment_crud_service import EquipmentCRUDService
from api.models.equipment import Equipment
from api.models.accessory import Accessory
from api.models.association import Association
from shared.schemas.equipment_schema import EquipmentUpdateExtended


@pytest.mark.unit
@pytest.mark.equipment
class TestEquipmentCRUDService:
    """Тесты для EquipmentCRUDService."""

    @pytest.fixture
    def mock_db(self):
        """Создает мок базы данных."""
        db = AsyncMock(spec=AsyncSession)
        # Настраиваем мок для правильной работы с commit
        db.commit = AsyncMock()
        db.rollback = AsyncMock()
        db.flush = AsyncMock()
        return db

    @pytest.fixture
    def mock_repo(self):
        """Создает мок репозитория."""
        return AsyncMock()

    @pytest.fixture
    def equipment_crud_service(self, mock_db, mock_repo):
        """Создает экземпляр EquipmentCRUDService с моком БД и репозитория."""
        service = EquipmentCRUDService(mock_db, mock_repo)
        return service

    @pytest.fixture
    def sample_equipment(self):
        """Создает тестовое оборудование."""
        equipment = MagicMock(spec=Equipment)
        equipment.id = 1
        equipment.name = "Test Camera"
        equipment.equipment_type = "Camera"
        equipment.brand = "Canon"
        equipment.daily_rate = 100.0
        equipment.condition = "Великолепно"
        equipment.accessories = []
        equipment.associations = []
        return equipment

    @pytest.fixture
    def sample_accessory(self):
        """Создает тестовый аксессуар."""
        accessory = MagicMock(spec=Accessory)
        accessory.id = 1
        accessory.name = "Test Lens"
        accessory.accessory_type = "Lens"
        accessory.brand = "Canon"
        accessory.daily_rate = 50.0
        return accessory

    @pytest.fixture
    def sample_association(self):
        """Создает тестовую ассоциацию."""
        association = MagicMock(spec=Association)
        association.id = 1
        association.name = "Test Association"
        association.description = "Test Description"
        return association

    async def test_update_equipment_details_success(self, equipment_crud_service, mock_db, mock_repo, sample_equipment):
        """Тест успешного обновления деталей оборудования."""
        # Arrange
        equipment_id = 1
        update_data = EquipmentUpdateExtended(
            name="Updated Camera",
            daily_rate=120.0,
            condition="Отлично"
        )
        
        mock_repo.get_by_id_with_details.return_value = sample_equipment
        mock_repo.update_with_relations.return_value = sample_equipment
        
        # Act
        result = await equipment_crud_service.update_equipment_details(equipment_id, update_data)
        
        # Assert
        assert result == sample_equipment
        mock_repo.get_by_id_with_details.assert_called_once_with(equipment_id)
        mock_repo.update_with_relations.assert_called_once()
        # Проверяем, что commit был вызван
        # Commit выполняется middleware, не в сервисе

    async def test_update_equipment_details_with_accessories(self, equipment_crud_service, mock_db, mock_repo, sample_equipment, sample_accessory):
        """Тест обновления оборудования с аксессуарами."""
        # Arrange
        equipment_id = 1
        update_data = EquipmentUpdateExtended(
            name="Updated Camera",
            daily_rate=120.0,
            condition="Отлично",
            accessory_ids=[1, 2]
        )
        
        sample_equipment.accessories = [sample_accessory]
        mock_repo.get_by_id_with_details.return_value = sample_equipment
        mock_repo.update_with_relations.return_value = sample_equipment
        
        # Act
        result = await equipment_crud_service.update_equipment_details(equipment_id, update_data)
        
        # Assert
        assert result == sample_equipment
        mock_repo.get_by_id_with_details.assert_called_once_with(equipment_id)
        mock_repo.update_with_relations.assert_called_once()
        # Commit выполняется middleware, не в сервисе

    async def test_update_equipment_details_with_associations(self, equipment_crud_service, mock_db, mock_repo, sample_equipment, sample_association):
        """Тест обновления оборудования с ассоциациями."""
        # Arrange
        equipment_id = 1
        update_data = EquipmentUpdateExtended(
            name="Updated Camera",
            daily_rate=120.0,
            condition="Отлично",
            association_ids=[1, 2]
        )
        
        sample_equipment.associations = [sample_association]
        mock_repo.get_by_id_with_details.return_value = sample_equipment
        mock_repo.update_with_relations.return_value = sample_equipment
        
        # Act
        result = await equipment_crud_service.update_equipment_details(equipment_id, update_data)
        
        # Assert
        assert result == sample_equipment
        mock_repo.get_by_id_with_details.assert_called_once_with(equipment_id)
        mock_repo.update_with_relations.assert_called_once()
        # Commit выполняется middleware, не в сервисе

    async def test_create_equipment_success(self, equipment_crud_service, mock_db, mock_repo, sample_equipment):
        """Тест успешного создания оборудования."""
        # Arrange
        from shared.schemas.equipment_schema import EquipmentCreate
        create_data = EquipmentCreate(
            name="New Camera",
            equipment_type="Camera",
            brand="Sony",
            model="A7R IV",
            daily_rate=150.0
        )
        
        mock_repo.create.return_value = sample_equipment
        
        # Act
        result = await equipment_crud_service.create_equipment(create_data)
        
        # Assert
        assert result == sample_equipment
        mock_repo.create.assert_called_once()
        # Commit выполняется middleware, не в сервисе

    async def test_delete_equipment_success(self, equipment_crud_service, mock_db, mock_repo, sample_equipment):
        """Тест успешного удаления оборудования."""
        # Arrange
        equipment_id = 1
        mock_repo.get_by_id.return_value = sample_equipment
        mock_repo.delete.return_value = None
        
        # Act
        await equipment_crud_service.delete_equipment(equipment_id)
        
        # Assert
        mock_repo.get_by_id.assert_called_once_with(equipment_id)
        mock_repo.delete.assert_called_once_with(equipment_id)
        # Commit выполняется middleware, не в сервисе

    async def test_update_equipment_not_found(self, equipment_crud_service, mock_db, mock_repo):
        """Тест обновления несуществующего оборудования."""
        # Arrange
        equipment_id = 999
        update_data = EquipmentUpdateExtended(name="Updated Camera")
        mock_repo.get_by_id_with_details.return_value = None
        
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await equipment_crud_service.update_equipment_details(equipment_id, update_data)
        
        assert exc_info.value.status_code == 404
        assert "не найдено" in str(exc_info.value.detail)
        mock_repo.get_by_id_with_details.assert_called_once_with(equipment_id)
        # Commit выполняется middleware, не в сервисе

    async def test_delete_equipment_not_found(self, equipment_crud_service, mock_db, mock_repo):
        """Тест удаления несуществующего оборудования."""
        # Arrange
        equipment_id = 999
        mock_repo.get_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await equipment_crud_service.delete_equipment(equipment_id)
        
        assert exc_info.value.status_code == 404
        assert "не найдено" in str(exc_info.value.detail)
        mock_repo.get_by_id.assert_called_once_with(equipment_id)
        # Commit выполняется middleware, не в сервисе

    async def test_database_error_handling(self, equipment_crud_service, mock_db, mock_repo, sample_equipment):
        """Тест обработки ошибок базы данных."""
        # Arrange
        equipment_id = 1
        update_data = EquipmentUpdateExtended(name="Updated Camera")
        mock_repo.get_by_id_with_details.return_value = sample_equipment
        mock_repo.update_with_relations.side_effect = Exception("Database error")
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await equipment_crud_service.update_equipment_details(equipment_id, update_data)
        
        assert "Database error" in str(exc_info.value)
        mock_repo.get_by_id_with_details.assert_called_once_with(equipment_id)
        # Rollback выполняется middleware, не в сервисе
