# tests/services/test_association_service.py
"""
Тесты для AssociationService - сервиса управления ассоциациями оборудования.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

from api.services.association_service import AssociationService
from api.models.association import Association
from api.models.equipment import Equipment
from shared.schemas.association_schema import (
    AssociationCreate,
    AssociationUpdate,
    AssociationOut,
    AssociationListResponse
)


class TestAssociationService:
    """Тесты для AssociationService."""

    @pytest.fixture
    def mock_repo(self):
        """Создает мок репозитория ассоциаций."""
        return MagicMock()

    @pytest.fixture
    def association_service(self, mock_repo):
        """Создает экземпляр AssociationService с моком репозитория."""
        return AssociationService(repo=mock_repo)

    @pytest.fixture
    def sample_association(self):
        """Создает образец ассоциации."""
        assoc = MagicMock(spec=Association)
        assoc.id = 1
        assoc.name = "Test Association"
        assoc.description = "Test Description"
        assoc.sort_order = 1
        assoc.equipment = []
        return assoc

    @pytest.fixture
    def sample_equipment(self):
        """Создает образец оборудования."""
        eq = MagicMock(spec=Equipment)
        eq.id = 1
        return eq

    # === ТЕСТЫ ДЛЯ get_all_paginated ===

    @pytest.mark.asyncio
    async def test_get_all_paginated_success(self, association_service, mock_repo, sample_association):
        """Тест успешного получения списка ассоциаций с пагинацией."""
        # Настройка моков
        sample_association.equipment = []
        mock_repo.get_all_paginated = AsyncMock(return_value=([sample_association], 1))
        
        # Вызов метода
        result = await association_service.get_all_paginated(skip=0, limit=10)
        
        # Проверки
        assert isinstance(result, AssociationListResponse)
        assert result.total == 1
        assert len(result.items) == 1
        assert result.items[0].id == 1
        assert result.items[0].name == "Test Association"
        mock_repo.get_all_paginated.assert_called_once_with(0, 10)

    @pytest.mark.asyncio
    async def test_get_all_paginated_with_equipment(self, association_service, mock_repo, sample_association, sample_equipment):
        """Тест получения ассоциаций с привязанным оборудованием."""
        # Настройка моков
        sample_association.equipment = [sample_equipment]
        mock_repo.get_all_paginated = AsyncMock(return_value=([sample_association], 1))
        
        # Вызов метода
        result = await association_service.get_all_paginated(skip=0, limit=10)
        
        # Проверки
        assert len(result.items) == 1
        assert result.items[0].equipment_ids == [1]

    @pytest.mark.asyncio
    async def test_get_all_paginated_empty_list(self, association_service, mock_repo):
        """Тест получения пустого списка ассоциаций."""
        mock_repo.get_all_paginated = AsyncMock(return_value=([], 0))
        
        result = await association_service.get_all_paginated(skip=0, limit=10)
        
        assert result.total == 0
        assert len(result.items) == 0

    @pytest.mark.asyncio
    async def test_get_all_paginated_pagination(self, association_service, mock_repo):
        """Тест пагинации."""
        associations = [MagicMock(spec=Association) for _ in range(5)]
        for i, assoc in enumerate(associations):
            assoc.id = i + 1
            assoc.name = f"Association {i + 1}"
            assoc.description = f"Description {i + 1}"
            assoc.sort_order = i + 1
            assoc.equipment = []
        
        mock_repo.get_all_paginated = AsyncMock(return_value=(associations, 5))
        
        result = await association_service.get_all_paginated(skip=0, limit=5)
        
        assert result.total == 5
        assert len(result.items) == 5

    # === ТЕСТЫ ДЛЯ create_new_association ===

    @pytest.mark.asyncio
    async def test_create_new_association_success(self, association_service, mock_repo, sample_association):
        """Тест успешного создания новой ассоциации."""
        create_data = AssociationCreate(
            name="New Association",
            description="New Description",
            equipment_ids=[1, 2]
        )
        
        sample_association.name = "New Association"
        sample_association.description = "New Description"
        sample_association.equipment = []
        
        mock_repo.create_with_equipment = AsyncMock(return_value=sample_association)
        
        result = await association_service.create_new_association(create_data)
        
        assert isinstance(result, AssociationOut)
        assert result.id == 1
        assert result.name == "New Association"
        mock_repo.create_with_equipment.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_new_association_with_equipment(self, association_service, mock_repo, sample_association, sample_equipment):
        """Тест создания ассоциации с оборудованием."""
        create_data = AssociationCreate(
            name="New Association",
            description="New Description",
            equipment_ids=[1]
        )
        
        sample_association.equipment = [sample_equipment]
        mock_repo.create_with_equipment = AsyncMock(return_value=sample_association)
        
        result = await association_service.create_new_association(create_data)
        
        assert result.equipment_ids == [1]

    # === ТЕСТЫ ДЛЯ update_association ===

    @pytest.mark.asyncio
    async def test_update_association_success(self, association_service, mock_repo, sample_association):
        """Тест успешного обновления ассоциации."""
        update_data = AssociationUpdate(
            name="Updated Association",
            description="Updated Description",
            equipment_ids=[2, 3]
        )
        
        updated_assoc = MagicMock(spec=Association)
        updated_assoc.id = 1
        updated_assoc.name = "Updated Association"
        updated_assoc.description = "Updated Description"
        updated_assoc.sort_order = 1
        updated_assoc.equipment = []
        
        mock_repo.update_with_equipment = AsyncMock(return_value=updated_assoc)
        
        result = await association_service.update_association(assoc_id=1, data=update_data)
        
        assert isinstance(result, AssociationOut)
        assert result.name == "Updated Association"
        mock_repo.update_with_equipment.assert_called_once_with(1, update_data)

    @pytest.mark.asyncio
    async def test_update_association_partial(self, association_service, mock_repo, sample_association):
        """Тест частичного обновления ассоциации."""
        update_data = AssociationUpdate(name="Updated Name")
        
        updated_assoc = MagicMock(spec=Association)
        updated_assoc.id = 1
        updated_assoc.name = "Updated Name"
        updated_assoc.description = "Test Description"
        updated_assoc.sort_order = 1
        updated_assoc.equipment = []
        
        mock_repo.update_with_equipment = AsyncMock(return_value=updated_assoc)
        
        result = await association_service.update_association(assoc_id=1, data=update_data)
        
        assert result.name == "Updated Name"

    # === ТЕСТЫ ДЛЯ delete_association ===

    @pytest.mark.asyncio
    async def test_delete_association_success(self, association_service, mock_repo):
        """Тест успешного удаления ассоциации."""
        mock_repo.delete_by_id = AsyncMock(return_value=None)
        
        await association_service.delete_association(assoc_id=1)
        
        mock_repo.delete_by_id.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_delete_association_not_found(self, association_service, mock_repo):
        """Тест удаления несуществующей ассоциации."""
        mock_repo.delete_by_id = AsyncMock(side_effect=HTTPException(status_code=404, detail="Not found"))
        
        with pytest.raises(HTTPException) as exc_info:
            await association_service.delete_association(assoc_id=999)
        
        assert exc_info.value.status_code == 404



