import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.equipment_command_repository import EquipmentCommandRepository
from api.services.equipment_crud_service import EquipmentCRUDService
from shared.schemas.equipment_schema import EquipmentCopyRequest
from api.models.equipment import Equipment


class TestEquipmentCopy:
    """Тесты для функционала копирования оборудования"""

    @pytest.fixture
    def mock_db(self):
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def mock_repo(self, mock_db):
        repo = EquipmentCommandRepository(mock_db)
        repo.get_by_id_with_details = AsyncMock()
        repo.create = AsyncMock()
        return repo

    @pytest.fixture
    def service(self, mock_db, mock_repo):
        return EquipmentCRUDService(mock_db, mock_repo)

    @pytest.fixture
    def source_equipment(self):
        """Исходное оборудование для копирования"""
        equipment = MagicMock(spec=Equipment)
        equipment.id = 1
        equipment.equipment_type = "Камера"
        equipment.brand = "Canon"
        equipment.name = "Canon EOS R5"
        equipment.serial_number = "SN123456"
        equipment.condition = "Великолепно"
        equipment.daily_rate = 5000.0
        equipment.notes = "Отличная камера"
        equipment.description = "Профессиональная камера"
        equipment.last_maintenance = None
        equipment.image_url = "https://example.com/image.jpg"
        equipment.image_urls = ["https://example.com/image1.jpg"]
        equipment.short_description = "Проф камера"
        equipment.accessories = []
        equipment.associations = []
        return equipment

    async def test_copy_equipment_basic(self, service, mock_repo, source_equipment):
        """Тест базового копирования оборудования"""
        # Arrange
        mock_repo.get_by_id_with_details.return_value = source_equipment
        created_equipment = MagicMock(spec=Equipment)
        created_equipment.id = 2
        mock_repo.create.return_value = created_equipment
        
        copy_data = EquipmentCopyRequest(
            name="Canon EOS R5 (копия)",
            serial_number="SN789012",
            notes="Новая копия"
        )

        # Act
        result = await service.copy_equipment(1, copy_data)

        # Assert
        mock_repo.get_by_id_with_details.assert_called_once_with(1)
        mock_repo.create.assert_called_once()
        assert result == created_equipment

        # Проверяем, что create был вызван с правильными данными
        create_call_args = mock_repo.create.call_args[0][0]
        assert create_call_args.equipment_type == "Камера"
        assert create_call_args.brand == "Canon"
        assert create_call_args.name == "Canon EOS R5 (копия)"
        assert create_call_args.serial_number == "SN789012"
        assert create_call_args.condition == "Великолепно"
        assert create_call_args.daily_rate == 5000.0
        assert create_call_args.notes == "Новая копия"

    async def test_copy_equipment_with_default_values(self, service, mock_repo, source_equipment):
        """Тест копирования с значениями по умолчанию"""
        # Arrange
        mock_repo.get_by_id_with_details.return_value = source_equipment
        created_equipment = MagicMock(spec=Equipment)
        created_equipment.id = 2
        mock_repo.create.return_value = created_equipment
        
        copy_data = EquipmentCopyRequest()  # Пустые данные

        # Act
        result = await service.copy_equipment(1, copy_data)

        # Assert
        create_call_args = mock_repo.create.call_args[0][0]
        assert create_call_args.name == "Canon EOS R5 (копия)"
        assert create_call_args.serial_number is None
        assert create_call_args.notes == "Скопировано из ID: 1"

    async def test_copy_equipment_with_relations(self, service, mock_repo, source_equipment):
        """Тест копирования с связями (аксессуары, ассоциации)"""
        # Arrange
        accessory = MagicMock()
        association = MagicMock()
        source_equipment.accessories = [accessory]
        source_equipment.associations = [association]
        
        mock_repo.get_by_id_with_details.return_value = source_equipment
        created_equipment = MagicMock(spec=Equipment)
        created_equipment.accessories = []
        created_equipment.associations = []
        mock_repo.create.return_value = created_equipment
        
        copy_data = EquipmentCopyRequest()

        # Act
        result = await service.copy_equipment(1, copy_data)

        # Assert
        assert len(created_equipment.accessories) == 1
        assert len(created_equipment.associations) == 1
        assert created_equipment.accessories[0] == accessory
        assert created_equipment.associations[0] == association

    async def test_copy_equipment_source_not_found(self, service, mock_repo):
        """Тест копирования несуществующего оборудования"""
        # Arrange
        mock_repo.get_by_id_with_details.return_value = None
        copy_data = EquipmentCopyRequest()

        # Act & Assert
        with pytest.raises(ValueError, match="Оборудование с ID 1 не найдено"):
            await service.copy_equipment(1, copy_data)

    async def test_copy_equipment_brand_system_creation(self, service, mock_repo, source_equipment):
        """Тест создания системы бренда при копировании"""
        # Arrange
        mock_repo.get_by_id_with_details.return_value = source_equipment
        created_equipment = MagicMock(spec=Equipment)
        mock_repo.create.return_value = created_equipment
        
        copy_data = EquipmentCopyRequest()

        # Act
        result = await service.copy_equipment(1, copy_data)

        # Assert
        # Проверяем, что create был вызван (внутри него создается система бренда)
        mock_repo.create.assert_called_once()
        assert result == created_equipment
