# tests/services/test_equipment_repository.py

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.equipment_repository import EquipmentRepository
from api.models.equipment import Equipment
from api.models.accessory import Accessory


class TestEquipmentRepository:
    """Тесты для EquipmentRepository."""

    @pytest.fixture
    def mock_db(self):
        """Создает мок базы данных."""
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def mock_query_repo(self):
        """Мок репозитория запросов оборудования"""
        return AsyncMock()
    
    @pytest.fixture
    def mock_command_repo(self):
        """Мок репозитория команд оборудования"""
        return AsyncMock()
    
    @pytest.fixture
    def mock_relations_repo(self):
        """Мок репозитория связей оборудования"""
        return AsyncMock()
    
    @pytest.fixture
    def mock_availability_service(self):
        """Мок сервиса доступности"""
        return AsyncMock()

    @pytest.fixture
    def equipment_repository(self, mock_db, mock_query_repo, mock_command_repo, mock_relations_repo, mock_availability_service):
        """Создает экземпляр EquipmentRepository с моком БД."""
        return EquipmentRepository(
            db=mock_db,
            query_repo=mock_query_repo,
            command_repo=mock_command_repo,
            relations_repo=mock_relations_repo,
            availability_service=mock_availability_service
        )

    @pytest.fixture
    def sample_equipment(self):
        """Создает тестовое оборудование."""
        equipment = MagicMock(spec=Equipment)
        equipment.id = 1
        equipment.name = "Test Camera"
        equipment.daily_rate = 100.0
        equipment.accessories = []
        equipment.associations = []
        return equipment

    @pytest.fixture
    def sample_accessory(self):
        """Создает тестовый аксессуар."""
        accessory = MagicMock(spec=Accessory)
        accessory.id = 1
        accessory.name = "Test Lens"
        accessory.price = 50.0
        return accessory

    @pytest.mark.asyncio
    async def test_get_equipment_by_ids_or_fail_success(self, equipment_repository, mock_query_repo, sample_equipment):
        """Тест успешного получения оборудования по ID."""
        # Arrange
        equipment_ids = [1]
        sample_equipment.id = 1
        equipment_repository._query_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=[sample_equipment])

        # Act
        result = await equipment_repository.get_equipment_by_ids_or_fail(equipment_ids)

        # Assert
        assert result == [sample_equipment]
        equipment_repository._query_repo.get_equipment_by_ids_or_fail.assert_called_once_with(equipment_ids)

    @pytest.mark.asyncio
    async def test_get_equipment_by_ids_or_fail_not_found(self, equipment_repository, mock_query_repo, sample_equipment):
        """Тест получения оборудования с несуществующими ID."""
        # Arrange
        equipment_ids = [1, 2, 3]
        sample_equipment.id = 1
        from fastapi import HTTPException, status
        equipment_repository._query_repo.get_equipment_by_ids_or_fail = AsyncMock(
            side_effect=HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Оборудование с ID [2, 3] не найдено")
        )

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await equipment_repository.get_equipment_by_ids_or_fail(equipment_ids)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Оборудование с ID [2, 3] не найдено" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_equipment_by_ids_or_fail_empty_list(self, equipment_repository, mock_query_repo):
        """Тест получения оборудования с пустым списком ID."""
        # Arrange
        equipment_ids = []
        equipment_repository._query_repo.get_equipment_by_ids_or_fail = AsyncMock(return_value=[])

        # Act
        result = await equipment_repository.get_equipment_by_ids_or_fail(equipment_ids)

        # Assert
        assert result == []

    @pytest.mark.asyncio
    async def test_get_accessories_by_ids_success(self, equipment_repository, mock_relations_repo, sample_accessory):
        """Тест успешного получения аксессуаров по ID."""
        # Arrange
        accessory_ids = [1, 2]
        equipment_repository._relations_repo.get_accessories_by_ids = AsyncMock(return_value=[sample_accessory])

        # Act
        result = await equipment_repository.get_accessories_by_ids(accessory_ids)

        # Assert
        assert result == [sample_accessory]
        equipment_repository._relations_repo.get_accessories_by_ids.assert_called_once_with(accessory_ids)

    @pytest.mark.asyncio
    async def test_get_accessories_by_ids_empty_list(self, equipment_repository, mock_relations_repo):
        """Тест получения аксессуаров с пустым списком ID."""
        # Arrange
        accessory_ids = []
        equipment_repository._relations_repo.get_accessories_by_ids = AsyncMock(return_value=[])

        # Act
        result = await equipment_repository.get_accessories_by_ids(accessory_ids)

        # Assert
        assert result == []
        equipment_repository._relations_repo.get_accessories_by_ids.assert_called_once_with(accessory_ids)

    @pytest.mark.asyncio
    async def test_get_accessories_by_ids_none(self, equipment_repository, mock_relations_repo):
        """Тест получения аксессуаров с None."""
        # Arrange
        accessory_ids = None
        equipment_repository._relations_repo.get_accessories_by_ids = AsyncMock(return_value=[])

        # Act
        result = await equipment_repository.get_accessories_by_ids(accessory_ids)

        # Assert
        assert result == []
        # Метод должен быть вызван даже с None
        equipment_repository._relations_repo.get_accessories_by_ids.assert_called_once_with(accessory_ids)

    @pytest.mark.asyncio
    async def test_get_equipment_by_ids_with_duplicates(self, equipment_repository, mock_query_repo, sample_equipment):
        """Тест получения оборудования с дублирующимися ID."""
        # Arrange
        equipment_ids = [1, 1, 2]  # Дублирующийся ID
        sample_equipment.id = 1
        from fastapi import HTTPException, status
        equipment_repository._query_repo.get_equipment_by_ids_or_fail = AsyncMock(
            side_effect=HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Оборудование с ID [2] не найдено")
        )

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await equipment_repository.get_equipment_by_ids_or_fail(equipment_ids)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Оборудование с ID [2] не найдено" in str(exc_info.value.detail)
