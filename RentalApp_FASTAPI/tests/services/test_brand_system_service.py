# tests/services/test_brand_system_service.py
"""
Тесты для BrandSystemService - сервиса управления системами брендов.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

from api.services.brand_system_service import BrandSystemService
from api.models.brand_system import BrandSystem
from api.models.equipment import Equipment
from shared.schemas.brand_system_schema import (
    BrandSystemCreate,
    BrandSystemUpdate,
    BrandSystemOut
)


class TestBrandSystemService:
    """Тесты для BrandSystemService."""

    @pytest.fixture
    def mock_repo(self):
        """Создает мок репозитория систем брендов."""
        repo = MagicMock()
        repo.save = AsyncMock()
        return repo

    @pytest.fixture
    def brand_system_service(self, mock_repo):
        """Создает экземпляр BrandSystemService с моком репозитория."""
        return BrandSystemService(repo=mock_repo)

    @pytest.fixture
    def sample_brand_system(self):
        """Создает образец системы бренда."""
        system = MagicMock(spec=BrandSystem)
        system.id = 1
        system.name = "Canon EOS"
        system.description = "Canon EOS System"  # Добавляем описание
        system.equipment = []
        return system

    @pytest.fixture
    def sample_equipment(self):
        """Создает образец оборудования."""
        eq = MagicMock(spec=Equipment)
        eq.id = 1
        return eq

    # === ТЕСТЫ ДЛЯ get_all_paginated ===

    @pytest.mark.asyncio
    async def test_get_all_paginated_success(self, brand_system_service, mock_repo, sample_brand_system):
        """Тест успешного получения списка систем с пагинацией."""
        # Настройка моков
        sample_brand_system.equipment = []
        mock_repo.get_all_paginated = AsyncMock(return_value=([sample_brand_system], 1))
        
        # Вызов метода
        systems, total = await brand_system_service.get_all_paginated(skip=0, limit=10)
        
        # Проверки
        assert total == 1
        assert len(systems) == 1
        assert isinstance(systems[0], BrandSystemOut)
        mock_repo.get_all_paginated.assert_called_once_with(0, 10)

    @pytest.mark.asyncio
    async def test_get_all_paginated_with_equipment(self, brand_system_service, mock_repo, sample_brand_system, sample_equipment):
        """Тест получения систем с привязанным оборудованием."""
        sample_brand_system.equipment = [sample_equipment]
        mock_repo.get_all_paginated = AsyncMock(return_value=([sample_brand_system], 1))
        
        systems, total = await brand_system_service.get_all_paginated(skip=0, limit=10)
        
        assert len(systems) == 1
        assert total == 1

    @pytest.mark.asyncio
    async def test_get_all_paginated_empty_list(self, brand_system_service, mock_repo):
        """Тест получения пустого списка систем."""
        mock_repo.get_all_paginated = AsyncMock(return_value=([], 0))
        
        systems, total = await brand_system_service.get_all_paginated(skip=0, limit=10)
        
        assert total == 0
        assert len(systems) == 0

    # === ТЕСТЫ ДЛЯ create ===

    @pytest.mark.asyncio
    async def test_create_success(self, brand_system_service, mock_repo, sample_brand_system):
        """Тест успешного создания новой системы."""
        create_data = BrandSystemCreate(
            name="Nikon F",
            equipment_ids=[1, 2]
        )
        
        sample_brand_system.name = "Nikon F"
        sample_brand_system.description = "Nikon F System"
        sample_brand_system.equipment = []
        
        mock_repo.create_with_equipment = AsyncMock(return_value=sample_brand_system)
        
        result = await brand_system_service.create(create_data)
        
        assert isinstance(result, BrandSystemOut)
        assert result.id == 1
        mock_repo.create_with_equipment.assert_called_once()
        mock_repo.save.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_with_equipment(self, brand_system_service, mock_repo, sample_brand_system, sample_equipment):
        """Тест создания системы с оборудованием."""
        create_data = BrandSystemCreate(
            name="Sony Alpha",
            equipment_ids=[1]
        )
        
        sample_brand_system.equipment = [sample_equipment]
        mock_repo.create_with_equipment = AsyncMock(return_value=sample_brand_system)
        
        result = await brand_system_service.create(create_data)
        
        assert isinstance(result, BrandSystemOut)

    # === ТЕСТЫ ДЛЯ update ===

    @pytest.mark.asyncio
    async def test_update_success(self, brand_system_service, mock_repo, sample_brand_system):
        """Тест успешного обновления системы."""
        update_data = BrandSystemUpdate(
            name="Updated System",
            equipment_ids=[2, 3]
        )
        
        updated_system = MagicMock(spec=BrandSystem)
        updated_system.id = 1
        updated_system.name = "Updated System"
        updated_system.description = "Updated Description"
        updated_system.equipment = []
        
        mock_repo.update_with_equipment = AsyncMock(return_value=updated_system)
        
        result = await brand_system_service.update(system_id=1, data=update_data)
        
        assert isinstance(result, BrandSystemOut)
        assert result.id == 1
        mock_repo.update_with_equipment.assert_called_once_with(1, update_data)
        mock_repo.save.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_partial(self, brand_system_service, mock_repo, sample_brand_system):
        """Тест частичного обновления системы."""
        update_data = BrandSystemUpdate(name="Updated Name")
        
        updated_system = MagicMock(spec=BrandSystem)
        updated_system.id = 1
        updated_system.name = "Updated Name"
        updated_system.description = "Test Description"
        updated_system.equipment = []
        
        mock_repo.update_with_equipment = AsyncMock(return_value=updated_system)
        
        result = await brand_system_service.update(system_id=1, data=update_data)
        
        assert result.name == "Updated Name"

    # === ТЕСТЫ ДЛЯ delete ===

    @pytest.mark.asyncio
    async def test_delete_success(self, brand_system_service, mock_repo):
        """Тест успешного удаления системы."""
        mock_repo.delete_by_id = AsyncMock(return_value=None)
        
        await brand_system_service.delete(system_id=1)
        
        mock_repo.delete_by_id.assert_called_once_with(1)
        mock_repo.save.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_not_found(self, brand_system_service, mock_repo):
        """Тест удаления несуществующей системы."""
        mock_repo.delete_by_id = AsyncMock(side_effect=HTTPException(status_code=404, detail="Not found"))
        
        with pytest.raises(HTTPException) as exc_info:
            await brand_system_service.delete(system_id=999)
        
        assert exc_info.value.status_code == 404

