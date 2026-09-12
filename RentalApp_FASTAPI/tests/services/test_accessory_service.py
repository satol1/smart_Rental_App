# tests/services/test_accessory_service.py

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

from api.services.accessory_service import AccessoryService
from api.models.accessory import Accessory
from shared.schemas.accessory_schema import AccessoryCreate, AccessoryUpdate, AccessoryOut, AccessoryListResponse


class TestAccessoryService:
    """Тесты для AccessoryService."""

    @pytest.fixture
    def mock_db(self):
        """Создает мок базы данных."""
        return AsyncMock()

    @pytest.fixture
    def mock_repo(self):
        """Создает мок репозитория."""
        return AsyncMock()

    @pytest.fixture
    def accessory_service(self, mock_db, mock_repo):
        """Создает экземпляр AccessoryService с моками."""
        return AccessoryService(mock_db, mock_repo)

    @pytest.fixture
    def sample_accessory(self):
        """Создает тестовый аксессуар."""
        accessory = MagicMock(spec=Accessory)
        accessory.id = 1
        accessory.name = "Test Lens"
        accessory.price = 50.0
        accessory.description = "Test description"
        accessory.accessory_type = "lens"
        accessory.brand = "Canon"
        accessory.model = "EF 50mm"
        accessory.condition = "Отлично"
        accessory.is_available = True
        return accessory

    @pytest.fixture
    def sample_accessory_create(self):
        """Создает тестовые данные для создания аксессуара."""
        return AccessoryCreate(
            name="New Lens",
            price=75.0,
            description="New test description"
        )

    @pytest.fixture
    def sample_accessory_update(self):
        """Создает тестовые данные для обновления аксессуара."""
        return AccessoryUpdate(
            name="Updated Lens",
            price=80.0,
            description="Updated description"
        )

    @pytest.mark.asyncio
    async def test_create_accessory_success(self, accessory_service, mock_repo, sample_accessory_create, sample_accessory):
        """Тест успешного создания аксессуара."""
        # Arrange
        mock_repo.create.return_value = sample_accessory
        mock_repo.save = AsyncMock()

        # Act
        result = await accessory_service.create_accessory(sample_accessory_create)

        # Assert
        assert result == sample_accessory
        mock_repo.create.assert_called_once_with(sample_accessory_create)
        mock_repo.save.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_all_accessories_paginated_success(self, accessory_service, mock_repo, sample_accessory):
        """Тест успешного получения списка аксессуаров с пагинацией."""
        # Arrange
        skip = 0
        limit = 10
        accessories = [sample_accessory]
        total_count = 1
        
        mock_repo.get_all_paginated.return_value = (accessories, total_count)

        # Act
        result = await accessory_service.get_all_accessories_paginated(skip, limit)

        # Assert
        assert isinstance(result, AccessoryListResponse)
        assert len(result.items) == 1
        assert result.items[0].id == 1
        assert result.items[0].name == "Test Lens"
        assert result.total == total_count
        mock_repo.get_all_paginated.assert_called_once_with(skip, limit, search=None, sort_by='name', sort_order='asc')

    @pytest.mark.asyncio
    async def test_get_accessory_by_id_success(self, accessory_service, mock_repo, sample_accessory):
        """Тест успешного получения аксессуара по ID."""
        # Arrange
        accessory_id = 1
        mock_repo.get_by_id.return_value = sample_accessory

        # Act
        result = await accessory_service.get_accessory_by_id(accessory_id)

        # Assert
        assert result == sample_accessory
        mock_repo.get_by_id.assert_called_once_with(accessory_id)

    @pytest.mark.asyncio
    async def test_get_accessory_by_id_not_found(self, accessory_service, mock_repo):
        """Тест получения несуществующего аксессуара."""
        # Arrange
        accessory_id = 999
        mock_repo.get_by_id.return_value = None

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await accessory_service.get_accessory_by_id(accessory_id)

        assert exc_info.value.status_code == 404
        assert "Аксессуар не найден" in exc_info.value.detail
        mock_repo.get_by_id.assert_called_once_with(accessory_id)

    @pytest.mark.asyncio
    async def test_update_accessory_success(self, accessory_service, mock_repo, sample_accessory, sample_accessory_update):
        """Тест успешного обновления аксессуара."""
        # Arrange
        accessory_id = 1
        updated_accessory = MagicMock(spec=Accessory)
        updated_accessory.id = accessory_id
        updated_accessory.name = "Updated Lens"
        
        mock_repo.get_by_id.return_value = sample_accessory
        mock_repo.update.return_value = updated_accessory
        mock_repo.save = AsyncMock()

        # Act
        result = await accessory_service.update_accessory(accessory_id, sample_accessory_update)

        # Assert
        assert result == updated_accessory
        mock_repo.get_by_id.assert_called_once_with(accessory_id)
        mock_repo.update.assert_called_once_with(sample_accessory, sample_accessory_update)
        mock_repo.save.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_accessory_not_found(self, accessory_service, mock_repo, sample_accessory_update):
        """Тест обновления несуществующего аксессуара."""
        # Arrange
        accessory_id = 999
        mock_repo.get_by_id.return_value = None

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await accessory_service.update_accessory(accessory_id, sample_accessory_update)

        assert exc_info.value.status_code == 404
        assert "Аксессуар не найден" in exc_info.value.detail
        mock_repo.get_by_id.assert_called_once_with(accessory_id)
        mock_repo.update.assert_not_called()
        mock_repo.save.assert_not_called()

    @pytest.mark.asyncio
    async def test_delete_accessory_success(self, accessory_service, mock_repo):
        """Тест успешного удаления аксессуара."""
        # Arrange
        accessory_id = 1
        mock_repo.check_usage_and_delete = AsyncMock()
        mock_repo.save = AsyncMock()

        # Act
        await accessory_service.delete_accessory(accessory_id)

        # Assert
        mock_repo.check_usage_and_delete.assert_called_once_with(accessory_id)
        mock_repo.save.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_accessory_with_usage_error(self, accessory_service, mock_repo):
        """Тест удаления аксессуара, который используется."""
        # Arrange
        accessory_id = 1
        mock_repo.check_usage_and_delete = AsyncMock(side_effect=HTTPException(
            status_code=400, detail="Аксессуар используется в оборудовании"
        ))

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await accessory_service.delete_accessory(accessory_id)

        assert exc_info.value.status_code == 400
        assert "Аксессуар используется в оборудовании" in exc_info.value.detail
        mock_repo.check_usage_and_delete.assert_called_once_with(accessory_id)
        mock_repo.save.assert_not_called()
