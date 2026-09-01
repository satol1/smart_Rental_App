# tests/repositories/test_brand_system_repository.py

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from api.repositories.brand_system_repository import BrandSystemRepository
from api.models.brand_system import BrandSystem
from shared.schemas.brand_system_schema import BrandSystemCreate, BrandSystemUpdate


class TestBrandSystemRepository:
    """Тесты для репозитория брендов и систем"""

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        session = AsyncMock(spec=AsyncSession)
        return session

    @pytest.fixture
    def repository(self, mock_db_session):
        """Экземпляр репозитория"""
        return BrandSystemRepository(mock_db_session)

    @pytest.fixture
    def sample_brand_system(self):
        """Образец бренда/системы"""
        return BrandSystem(
            id=1,
            name="Canon",
            description="Фотоаппараты Canon"
        )

    @pytest.fixture
    def brand_system_create_data(self):
        """Данные для создания бренда/системы"""
        return BrandSystemCreate(
            name="Nikon",
            description="Фотоаппараты Nikon"
        )

    @pytest.mark.asyncio
    async def test_create_brand_system_success(self, repository, mock_db_session, brand_system_create_data):
        """Тест успешного создания бренда/системы"""
        # Arrange
        expected_brand_system = BrandSystem(
            id=1,
            name="Nikon",
            description="Фотоаппараты Nikon"
        )
        mock_db_session.add.return_value = None
        mock_db_session.commit.return_value = None
        mock_db_session.refresh.return_value = None

        # Act
        result = await repository.create(brand_system_create_data)

        # Assert
        assert result.name == "Nikon"
        assert result.description == "Фотоаппараты Nikon"
        mock_db_session.add.assert_called_once()
        mock_db_session.flush.assert_called_once()
        mock_db_session.refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_brand_system_duplicate_name(self, repository, mock_db_session, brand_system_create_data):
        """Тест создания бренда/системы с дублирующимся именем"""
        # Arrange
        mock_db_session.add.side_effect = IntegrityError("UNIQUE constraint failed", None, None)

        # Act & Assert
        with pytest.raises(IntegrityError):
            await repository.create(brand_system_create_data)

    @pytest.mark.asyncio
    async def test_get_by_id_success(self, repository, mock_db_session, sample_brand_system):
        """Тест успешного получения бренда/системы по ID"""
        # Arrange
        mock_db_session.get.return_value = sample_brand_system

        # Act
        result = await repository.get_by_id(1)

        # Assert
        assert result is not None
        assert result.id == 1
        assert result.name == "Canon"
        assert result.description == "Фотоаппараты Canon"
        mock_db_session.get.assert_called_once_with(BrandSystem, 1)

    @pytest.mark.asyncio
    async def test_get_by_id_not_found(self, repository, mock_db_session):
        """Тест получения несуществующего бренда/системы по ID"""
        # Arrange
        mock_db_session.get.return_value = None

        # Act
        result = await repository.get_by_id(999)

        # Assert
        assert result is None
        mock_db_session.get.assert_called_once_with(BrandSystem, 999)

    @pytest.mark.asyncio
    async def test_get_all_success(self, repository, mock_db_session):
        """Тест успешного получения всех брендов/систем"""
        # Arrange
        sample_brands = [
            BrandSystem(id=1, name="Canon", description="Canon cameras"),
            BrandSystem(id=2, name="Nikon", description="Nikon cameras"),
            BrandSystem(id=3, name="Sony", description="Sony cameras")
        ]
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = sample_brands
        mock_result.scalars.return_value = mock_scalars
        mock_db_session.execute.return_value = mock_result

        # Act
        result = await repository.get_all()

        # Assert
        assert len(result) == 3
        assert result[0].name == "Canon"
        assert result[1].name == "Nikon"
        assert result[2].name == "Sony"
        mock_db_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_all_empty(self, repository, mock_db_session):
        """Тест получения пустого списка брендов/систем"""
        # Arrange
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_result.scalars.return_value = mock_scalars
        mock_db_session.execute.return_value = mock_result

        # Act
        result = await repository.get_all()

        # Assert
        assert len(result) == 0
        mock_db_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_success(self, repository, mock_db_session, sample_brand_system):
        """Тест успешного обновления бренда/системы"""
        # Arrange
        update_data = BrandSystemUpdate(
            name="Canon Updated",
            description="Обновленное описание Canon"
        )
        mock_db_session.add.return_value = None
        mock_db_session.flush.return_value = None
        mock_db_session.refresh.return_value = None

        # Act
        result = await repository.update(sample_brand_system, update_data)

        # Assert
        assert result.name == "Canon Updated"
        assert result.description == "Обновленное описание Canon"
        mock_db_session.add.assert_called_once_with(sample_brand_system)
        mock_db_session.flush.assert_called_once()
        mock_db_session.refresh.assert_called_once_with(sample_brand_system)

    # Тест update_not_found удален - метод update принимает объект, а не ID

    @pytest.mark.asyncio
    async def test_delete_by_id_success(self, repository, mock_db_session, sample_brand_system):
        """Тест успешного удаления бренда/системы по ID"""
        # Arrange
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.first.return_value = sample_brand_system
        mock_result.scalars.return_value = mock_scalars
        mock_db_session.execute.return_value = mock_result
        mock_db_session.delete.return_value = None
        mock_db_session.commit.return_value = None

        # Act
        await repository.delete_by_id(1)

        # Assert
        mock_db_session.execute.assert_called_once()
        mock_db_session.delete.assert_called_once_with(sample_brand_system)
        mock_db_session.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_by_id_not_found(self, repository, mock_db_session):
        """Тест удаления несуществующего бренда/системы по ID"""
        # Arrange
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.first.return_value = None
        mock_result.scalars.return_value = mock_scalars
        mock_db_session.execute.return_value = mock_result

        # Act & Assert
        with pytest.raises(HTTPException):
            await repository.delete_by_id(999)

    # Тест удален - метод get_by_system_type не существует в репозитории

    # Тесты удалены - метод get_by_name не существует в репозитории

    @pytest.mark.asyncio
    async def test_database_error_handling(self, repository, mock_db_session, brand_system_create_data):
        """Тест обработки ошибок базы данных"""
        # Arrange
        mock_db_session.add.side_effect = Exception("Database connection error")

        # Act & Assert
        with pytest.raises(Exception, match="Database connection error"):
            await repository.create(brand_system_create_data)

    @pytest.mark.asyncio
    async def test_pagination_support(self, repository, mock_db_session):
        """Тест поддержки пагинации"""
        # Arrange
        sample_brands = [
            BrandSystem(id=1, name="Brand1", description="Brand1 cameras"),
            BrandSystem(id=2, name="Brand2", description="Brand2 cameras")
        ]
        
        # Мок для первого запроса (подсчет)
        mock_count_result = MagicMock()
        mock_count_result.scalar_one.return_value = 2
        
        # Мок для второго запроса (получение данных)
        mock_systems_result = MagicMock()
        mock_unique = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = sample_brands
        mock_unique.scalars.return_value = mock_scalars
        mock_systems_result.unique.return_value = mock_unique
        
        # Настраиваем side_effect для разных вызовов
        mock_db_session.execute.side_effect = [mock_count_result, mock_systems_result]

        # Act
        result = await repository.get_all_paginated(skip=0, limit=2)

        # Assert
        assert len(result[0]) == 2  # result - это кортеж (items, total_count)
        assert result[1] == 2  # total_count
        # Проверяем, что execute был вызван дважды (для подсчета и для получения данных)
        assert mock_db_session.execute.call_count == 2

    # Тест удален - метод search_by_name не существует в репозитории
