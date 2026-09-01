# tests/services/test_pack_service_fixed.py
"""
Исправленные тесты для PackService под новую архитектуру.
Использует правильное мокирование репозиториев вместо прямого обращения к БД.
"""

import pytest
from unittest.mock import AsyncMock, Mock
from datetime import date, datetime
from typing import List

from api.services.pack_service import PackService
from api.models.pack import Pack
from api.models.equipment import Equipment
from shared.schemas.pack_schema import PackCreate, PackUpdate, PackOut, PublicPackOut
from shared.schemas.equipment_schema import EquipmentOut
from fastapi import HTTPException


class TestPackServiceFixed:
    """Исправленные тесты для PackService"""

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        session = AsyncMock()
        return session

    @pytest.fixture
    def mock_pack_repo(self):
        """Мок репозитория пачек"""
        return AsyncMock()

    @pytest.fixture
    def mock_equipment_repo(self):
        """Мок репозитория оборудования"""
        return AsyncMock()

    @pytest.fixture
    def mock_availability_service(self):
        """Мок сервиса доступности"""
        service = Mock()
        return service

    @pytest.fixture
    def pack_service(self, mock_db_session, mock_pack_repo, mock_equipment_repo, mock_availability_service):
        """Создает экземпляр PackService с мок-зависимостями"""
        return PackService(mock_db_session, mock_pack_repo, mock_equipment_repo, mock_availability_service)

    @pytest.fixture
    def sample_equipment(self):
        """Образец оборудования для тестирования"""
        equipment = Equipment(
            id=1,
            name="Test Equipment",
            brand="Test Brand",
            equipment_type="Test Type",
            condition="Good",
            daily_rate=100.0
        )
        return equipment

    @pytest.fixture
    def sample_pack(self):
        """Образец пачки для тестирования"""
        pack = Pack(
            id=1,
            name="Test Pack",
            description="Test Description",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        return pack

    # Тесты инициализации
    def test_service_initialization(self, mock_db_session, mock_pack_repo, mock_equipment_repo, mock_availability_service):
        """Тест инициализации сервиса"""
        service = PackService(mock_db_session, mock_pack_repo, mock_equipment_repo, mock_availability_service)
        assert service.db == mock_db_session
        assert service.pack_repo == mock_pack_repo
        assert service.equipment_repo == mock_equipment_repo
        assert service.availability_service == mock_availability_service

    # Тесты для create_pack
    @pytest.mark.asyncio
    async def test_create_pack_success(self, pack_service, mock_equipment_repo, mock_pack_repo, sample_equipment):
        """Тест успешного создания пачки"""
        # Создаем данные для создания пачки
        pack_data = PackCreate(
            name="Test Pack",
            description="Test Description",
            equipment_ids=[1, 2]
        )
        
        # Настраиваем мок для поиска оборудования
        equipment2 = Equipment(id=2, name="Equipment 2", equipment_type="Test Type", brand="Test Brand", condition="Good", daily_rate=100.0)
        mock_equipment_repo.get_by_ids.return_value = [sample_equipment, equipment2]
        
        # Настраиваем мок для создания пачки
        pack_with_equipment = Pack(
            id=1,
            name="Test Pack",
            description="Test Description",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        pack_with_equipment.equipment = [sample_equipment, equipment2]
        mock_pack_repo.create_with_equipment.return_value = pack_with_equipment
        
        # Выполняем тест
        result = await pack_service.create_pack(pack_data)
        
        # Проверяем результат
        assert result.name == "Test Pack"
        assert result.description == "Test Description"
        mock_equipment_repo.get_by_ids.assert_called_once_with([1, 2])
        mock_pack_repo.create_with_equipment.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_pack_equipment_not_found(self, pack_service, mock_equipment_repo):
        """Тест создания пачки с несуществующим оборудованием"""
        # Создаем данные для создания пачки
        pack_data = PackCreate(
            name="Test Pack",
            description="Test Description",
            equipment_ids=[999]
        )
        
        # Настраиваем мок для поиска оборудования (не найдено)
        mock_equipment_repo.get_by_ids.return_value = []
        
        # Проверяем, что выбрасывается исключение 404
        with pytest.raises(HTTPException) as exc_info:
            await pack_service.create_pack(pack_data)
        
        assert exc_info.value.status_code == 404
        assert "Оборудование с ID [999] не найдено" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_create_pack_partial_equipment_found(self, pack_service, mock_equipment_repo, sample_equipment):
        """Тест создания пачки с частично найденным оборудованием"""
        # Создаем данные для создания пачки
        pack_data = PackCreate(
            name="Test Pack",
            description="Test Description",
            equipment_ids=[1, 999]
        )
        
        # Настраиваем мок для поиска оборудования (только одно найдено)
        mock_equipment_repo.get_by_ids.return_value = [sample_equipment]
        
        # Проверяем, что выбрасывается исключение 404
        with pytest.raises(HTTPException) as exc_info:
            await pack_service.create_pack(pack_data)
        
        assert exc_info.value.status_code == 404
        assert "Оборудование с ID [999] не найдено" in str(exc_info.value.detail)

    # Тесты для get_pack_by_id
    @pytest.mark.asyncio
    async def test_get_pack_by_id_success(self, pack_service, mock_pack_repo, sample_pack):
        """Тест успешного получения пачки по ID"""
        # Настраиваем мок
        mock_pack_repo.get_by_id_with_equipment.return_value = sample_pack
        
        # Выполняем тест
        result = await pack_service.get_pack_by_id(1)
        
        # Проверяем результат
        assert result.id == 1
        assert result.name == "Test Pack"
        mock_pack_repo.get_by_id_with_equipment.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_get_pack_by_id_not_found(self, pack_service, mock_pack_repo):
        """Тест получения несуществующей пачки"""
        # Настраиваем мок
        mock_pack_repo.get_by_id_with_equipment.return_value = None
        
        # Выполняем тест
        result = await pack_service.get_pack_by_id(999)
        
        # Проверяем результат
        assert result is None
        mock_pack_repo.get_by_id_with_equipment.assert_called_once_with(999)

    # Тесты для get_all_packs
    @pytest.mark.asyncio
    async def test_get_all_packs_success(self, pack_service, mock_pack_repo, sample_pack):
        """Тест успешного получения всех пачек"""
        # Создаем вторую пачку
        pack2 = Pack(
            id=2,
            name="Test Pack 2",
            description="Test Description 2",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Настраиваем мок
        mock_pack_repo.get_all_with_equipment.return_value = [sample_pack, pack2]
        
        # Выполняем тест
        result = await pack_service.get_all_packs()
        
        # Проверяем результат
        assert len(result) == 2
        assert result[0].name == "Test Pack"
        assert result[1].name == "Test Pack 2"
        mock_pack_repo.get_all_with_equipment.assert_called_once()

    # Тесты для update_pack
    @pytest.mark.asyncio
    async def test_update_pack_success(self, pack_service, mock_pack_repo, mock_equipment_repo, sample_pack):
        """Тест успешного обновления пачки"""
        # Создаем данные для обновления
        update_data = PackUpdate(
            name="Updated Pack",
            description="Updated Description"
        )
        
        # Настраиваем мок для получения пачки
        mock_pack_repo.get_by_id_with_equipment.return_value = sample_pack
        
        # Настраиваем мок для обновления
        updated_pack = Pack(
            id=1,
            name="Updated Pack",
            description="Updated Description",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        mock_pack_repo.update_with_equipment.return_value = updated_pack
        
        # Выполняем тест
        result = await pack_service.update_pack(1, update_data)
        
        # Проверяем результат
        assert result.name == "Updated Pack"
        assert result.description == "Updated Description"
        mock_pack_repo.get_by_id_with_equipment.assert_called_once_with(1)
        mock_pack_repo.update_with_equipment.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_pack_not_found(self, pack_service, mock_pack_repo):
        """Тест обновления несуществующей пачки"""
        # Создаем данные для обновления
        update_data = PackUpdate(name="Updated Pack")
        
        # Настраиваем мок
        mock_pack_repo.get_by_id_with_equipment.return_value = None
        
        # Выполняем тест
        result = await pack_service.update_pack(999, update_data)
        
        # Проверяем результат
        assert result is None
        mock_pack_repo.get_by_id_with_equipment.assert_called_once_with(999)

    # Тесты для delete_pack
    @pytest.mark.asyncio
    async def test_delete_pack_success(self, pack_service, mock_pack_repo):
        """Тест успешного удаления пачки"""
        # Настраиваем мок
        mock_pack_repo.delete.return_value = True
        
        # Выполняем тест
        result = await pack_service.delete_pack(1)
        
        # Проверяем результат
        assert result is True
        mock_pack_repo.delete.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_delete_pack_not_found(self, pack_service, mock_pack_repo):
        """Тест удаления несуществующей пачки"""
        # Настраиваем мок
        mock_pack_repo.delete.return_value = False
        
        # Выполняем тест
        result = await pack_service.delete_pack(999)
        
        # Проверяем результат
        assert result is False
        mock_pack_repo.delete.assert_called_once_with(999)

    # Тесты для suggest_equipment_for_pack
    @pytest.mark.asyncio
    async def test_suggest_equipment_for_pack_success(self, pack_service, mock_equipment_repo, sample_equipment):
        """Тест успешного предложения оборудования для пачки"""
        # Создаем похожее оборудование
        similar_equipment = [
            Equipment(id=2, name="Similar Equipment 1", equipment_type="Test Type", brand="Test Brand", condition="Good", daily_rate=100.0),
            Equipment(id=3, name="Similar Equipment 2", equipment_type="Test Type", brand="Test Brand", condition="Good", daily_rate=100.0)
        ]
        
        # Настраиваем мок
        mock_equipment_repo.get_by_id.return_value = sample_equipment
        mock_equipment_repo.get_similar_equipment.return_value = similar_equipment
        
        # Выполняем тест
        result = await pack_service.suggest_equipment_for_pack(1)
        
        # Проверяем результат
        assert result == [2, 3]
        mock_equipment_repo.get_by_id.assert_called_once_with(1)
        mock_equipment_repo.get_similar_equipment.assert_called_once_with(
            "Test Type", "Test Brand", "Test Equipment", exclude_id=1
        )

    @pytest.mark.asyncio
    async def test_suggest_equipment_for_pack_reference_not_found(self, pack_service, mock_equipment_repo):
        """Тест предложения оборудования для несуществующего эталона"""
        # Настраиваем мок
        mock_equipment_repo.get_by_id.return_value = None
        
        # Проверяем, что выбрасывается исключение
        with pytest.raises(HTTPException) as exc_info:
            await pack_service.suggest_equipment_for_pack(999)
        
        assert exc_info.value.status_code == 404
        assert "Эталонное оборудование не найдено" in str(exc_info.value.detail)

    # Тесты для get_public_packs_for_catalog
    @pytest.mark.asyncio
    async def test_get_public_packs_for_catalog_success(self, pack_service, mock_pack_repo, mock_availability_service, sample_equipment):
        """Тест успешного получения пачек для каталога"""
        # Создаем пачку с оборудованием
        pack_with_equipment = Pack(
            id=1,
            name="Test Pack",
            description="Test Description",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        pack_with_equipment.equipment = [sample_equipment]
        
        # Настраиваем мок
        mock_pack_repo.get_all_with_equipment.return_value = [pack_with_equipment]
        mock_availability_service.get_conflicting_equipment_ids.return_value = []
        
        # Выполняем тест
        result = await pack_service.get_public_packs_for_catalog()
        
        # Проверяем результат
        assert len(result) == 1
        assert result[0].name == "Test Pack"
        assert result[0].total_count == 1
        assert result[0].available_count == 1
        mock_pack_repo.get_all_with_equipment.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_public_packs_for_catalog_with_dates(self, pack_service, mock_pack_repo, mock_availability_service, sample_equipment):
        """Тест получения пачек для каталога с датами"""
        # Создаем пачку с оборудованием
        pack_with_equipment = Pack(
            id=1,
            name="Test Pack",
            description="Test Description",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        pack_with_equipment.equipment = [sample_equipment]
        
        # Настраиваем мок
        mock_pack_repo.get_all_with_equipment.return_value = [pack_with_equipment]
        mock_availability_service.get_conflicting_equipment_ids = AsyncMock(return_value=[])
        
        # Выполняем тест
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 7)
        result = await pack_service.get_public_packs_for_catalog(start_date, end_date)
        
        # Проверяем результат
        assert len(result) == 1
        assert result[0].name == "Test Pack"
        mock_availability_service.get_conflicting_equipment_ids.assert_called_once_with([1], start_date, end_date)

    @pytest.mark.asyncio
    async def test_get_public_packs_for_catalog_no_availability_service(self, pack_service, mock_pack_repo):
        """Тест получения пачек для каталога без availability_service"""
        # Создаем сервис без availability_service
        service_without_availability = PackService(
            pack_service.db, 
            mock_pack_repo, 
            pack_service.equipment_repo, 
            None
        )
        
        # Проверяем, что выбрасывается исключение
        with pytest.raises(HTTPException) as exc_info:
            await service_without_availability.get_public_packs_for_catalog()
        
        assert exc_info.value.status_code == 500
        assert "AvailabilityService не инициализирован" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_public_packs_for_catalog_empty_pack(self, pack_service, mock_pack_repo):
        """Тест получения пачек для каталога с пустой пачкой"""
        # Создаем пачку без оборудования
        empty_pack = Pack(
            id=1,
            name="Empty Pack",
            description="Empty Description",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        empty_pack.equipment = []
        
        # Настраиваем мок
        mock_pack_repo.get_all_with_equipment.return_value = [empty_pack]
        
        # Выполняем тест
        result = await pack_service.get_public_packs_for_catalog()
        
        # Проверяем результат (пустая пачка должна быть пропущена)
        assert len(result) == 0
        mock_pack_repo.get_all_with_equipment.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_public_packs_for_catalog_multiple_equipment(self, pack_service, mock_pack_repo, mock_availability_service):
        """Тест получения пачек для каталога с несколькими единицами оборудования"""
        # Создаем оборудование
        equipment1 = Equipment(id=1, name="Equipment 1", equipment_type="Camera", brand="Canon", condition="Good", daily_rate=100.0)
        equipment2 = Equipment(id=2, name="Equipment 2", equipment_type="Camera", brand="Canon", condition="Good", daily_rate=150.0)
        
        # Создаем пачку с несколькими единицами оборудования
        pack_with_equipment = Pack(
            id=1,
            name="Multi Equipment Pack",
            description="Pack with multiple equipment",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        pack_with_equipment.equipment = [equipment1, equipment2]
        
        # Настраиваем мок
        mock_pack_repo.get_all_with_equipment.return_value = [pack_with_equipment]
        mock_availability_service.get_conflicting_equipment_ids.return_value = []
        
        # Выполняем тест
        result = await pack_service.get_public_packs_for_catalog()
        
        # Проверяем результат
        assert len(result) == 1
        assert result[0].total_count == 2
        assert result[0].available_count == 2
        assert result[0].min_daily_rate == 100.0  # Минимальная цена
        assert result[0].cheapest_available_id == 1  # ID самого дешевого
