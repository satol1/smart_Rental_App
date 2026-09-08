import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.equipment_command_repository import EquipmentCommandRepository
from api.services.equipment_crud_service import EquipmentCRUDService
from shared.schemas.equipment_schema import EquipmentCopyRequest
from api.models.equipment import Equipment


class TestEquipmentCopy:
    """Тесты для функционала копирования оборудования"""

    @staticmethod
    def _arrange_refetch_returns(mock_db, equipment):
        """Репозиторий после create перечитывает объект из БД (select + scalars().first())."""
        execute_result = MagicMock()
        execute_result.scalars.return_value.first.return_value = equipment
        mock_db.execute = AsyncMock(return_value=execute_result)

    @pytest.fixture
    def mock_db(self):
        db = AsyncMock(spec=AsyncSession)
        # AsyncMock(spec=AsyncSession).execute(...) после await возвращает AsyncMock,
        # у которого .scalars() — корутина; результат execute должен быть sync-моком
        db.execute = AsyncMock(return_value=MagicMock())
        db.refresh = AsyncMock(return_value=None)
        return db

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

    async def test_copy_equipment_basic(self, service, mock_repo, mock_db, source_equipment):
        """Тест базового копирования оборудования"""
        # Arrange
        mock_repo.get_by_id_with_details.return_value = source_equipment
        created_equipment = MagicMock(spec=Equipment)
        created_equipment.id = 2
        mock_repo.create.return_value = created_equipment
        self._arrange_refetch_returns(mock_db, created_equipment)
        
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

    async def test_copy_equipment_with_relations(self, service, mock_repo, mock_db, source_equipment):
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
        # Связи копируются SQL-вставками и рефасетчем из БД: проверяем сами вставки
        execute_calls = [str(c.args[0]) for c in mock_db.execute.call_args_list if c.args]
        assert any('equipment_accessories' in c for c in execute_calls)
        assert any('association_equipment_association' in c for c in execute_calls)

    async def test_copy_equipment_source_not_found(self, service, mock_repo):
        """Тест копирования несуществующего оборудования"""
        # Arrange
        mock_repo.get_by_id_with_details.return_value = None
        copy_data = EquipmentCopyRequest()

        # Act & Assert
        with pytest.raises(ValueError, match="Оборудование с ID 1 не найдено"):
            await service.copy_equipment(1, copy_data)

    async def test_copy_equipment_brand_system_creation(self, service, mock_repo, mock_db, source_equipment):
        """Тест создания системы бренда при копировании"""
        # Arrange
        mock_repo.get_by_id_with_details.return_value = source_equipment
        created_equipment = MagicMock(spec=Equipment)
        mock_repo.create.return_value = created_equipment
        self._arrange_refetch_returns(mock_db, created_equipment)
        
        copy_data = EquipmentCopyRequest()

        # Act
        result = await service.copy_equipment(1, copy_data)

        # Assert
        # Проверяем, что create был вызван (внутри него создается система бренда)
        mock_repo.create.assert_called_once()
        assert result == created_equipment
