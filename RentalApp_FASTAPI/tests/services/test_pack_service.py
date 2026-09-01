# tests/services/test_pack_service.py
"""
Тесты для PackService.
Цель: повысить покрытие с 30% до 80%+
"""

import pytest
from unittest.mock import AsyncMock, Mock
from datetime import date
from typing import List

from api.services.pack_service import PackService
from api.models.pack import Pack
from api.models.equipment import Equipment
from shared.schemas.pack_schema import PackCreate, PackUpdate, PackOut, PublicPackOut
from shared.schemas.equipment_schema import EquipmentOut
from fastapi import HTTPException


class TestPackService:
    """Тесты для PackService"""

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
        from datetime import datetime
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

    def test_service_initialization_without_availability_service(self, mock_db_session, mock_pack_repo, mock_equipment_repo):
        """Тест инициализации сервиса без availability_service"""
        service = PackService(mock_db_session, mock_pack_repo, mock_equipment_repo, None)
        assert service.db == mock_db_session
        assert service.pack_repo == mock_pack_repo
        assert service.equipment_repo == mock_equipment_repo
        assert service.availability_service is None

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
        mock_equipment_repo.get_by_ids = AsyncMock(return_value=[sample_equipment, equipment2])
        
        # Настраиваем мок для создания пачки
        from api.models.pack import Pack
        from datetime import datetime
        pack_with_equipment = Pack(
            id=1,
            name="Test Pack",
            description="Test Description",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        pack_with_equipment.equipment = [sample_equipment, equipment2]
        mock_pack_repo.create_with_equipment = AsyncMock(return_value=pack_with_equipment)
        
        # Выполняем тест
        result = await pack_service.create_pack(pack_data)
        
        # Проверяем результат
        assert result.name == "Test Pack"
        assert result.description == "Test Description"
        mock_equipment_repo.get_by_ids.assert_called_once_with([1, 2])
        mock_pack_repo.create_with_equipment.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_pack_no_equipment(self, pack_service, mock_equipment_repo, mock_pack_repo, sample_equipment):
        """Тест создания пачки без оборудования"""
        # Создаем данные для создания пачки (с минимальным оборудованием, так как пустой список не разрешен)
        pack_data = PackCreate(
            name="Test Pack",
            description="Test Description",
            equipment_ids=[1]
        )
        
        # Настраиваем мок для поиска оборудования
        mock_equipment_repo.get_by_ids = AsyncMock(return_value=[sample_equipment])
        
        # Настраиваем мок для создания пачки
        from datetime import datetime
        pack_with_equipment = Pack(
            id=1,
            name="Test Pack",
            description="Test Description",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        pack_with_equipment.equipment = [sample_equipment]
        mock_pack_repo.create_with_equipment = AsyncMock(return_value=pack_with_equipment)
        
        # Выполняем тест
        result = await pack_service.create_pack(pack_data)
        
        # Проверяем результат
        assert result.name == "Test Pack"
        assert result.description == "Test Description"
        mock_equipment_repo.get_by_ids.assert_called_once_with([1])
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
        mock_equipment_repo.get_by_ids = AsyncMock(return_value=[])
        
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
        mock_equipment_repo.get_by_ids = AsyncMock(return_value=[sample_equipment])
        
        # Проверяем, что выбрасывается исключение 404 (часть оборудования не найдена)
        with pytest.raises(HTTPException) as exc_info:
            await pack_service.create_pack(pack_data)
        
        assert exc_info.value.status_code == 404
        assert "не найдено" in str(exc_info.value.detail)
        mock_equipment_repo.get_by_ids.assert_called_once_with([1, 999])

    # Тесты для get_pack_by_id
    @pytest.mark.asyncio
    async def test_get_pack_by_id_success(self, pack_service, mock_pack_repo, sample_pack):
        """Тест успешного получения пачки по ID"""
        # Настраиваем мок репозитория
        mock_pack_repo.get_by_id_with_equipment = AsyncMock(return_value=sample_pack)
        
        # Выполняем тест
        result = await pack_service.get_pack_by_id(1)
        
        # Проверяем результат
        assert result.id == 1
        assert result.name == "Test Pack"
        mock_pack_repo.get_by_id_with_equipment.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_get_pack_by_id_not_found(self, pack_service, mock_pack_repo):
        """Тест получения несуществующей пачки"""
        # Настраиваем мок репозитория
        mock_pack_repo.get_by_id_with_equipment = AsyncMock(return_value=None)
        
        # Проверяем, что возвращается None (метод не выбрасывает исключение)
        result = await pack_service.get_pack_by_id(999)
        assert result is None
        mock_pack_repo.get_by_id_with_equipment.assert_called_once_with(999)

    # Тесты для get_all_packs
    @pytest.mark.asyncio
    async def test_get_all_packs_success(self, pack_service, mock_pack_repo, sample_pack):
        """Тест успешного получения всех пачек"""
        # Создаем несколько пачек
        from datetime import datetime
        pack2 = Pack(id=2, name="Pack 2", description="Description 2", created_at=datetime.now(), updated_at=datetime.now())
        packs = [sample_pack, pack2]
        
        # Настраиваем мок репозитория
        mock_pack_repo.get_all_with_equipment = AsyncMock(return_value=packs)
        
        # Выполняем тест
        result = await pack_service.get_all_packs()
        
        # Проверяем результат
        assert len(result) == 2
        assert result[0].id == 1
        assert result[1].id == 2
        mock_pack_repo.get_all_with_equipment.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_all_packs_empty(self, pack_service, mock_pack_repo):
        """Тест получения пустого списка пачек"""
        # Настраиваем мок репозитория
        mock_pack_repo.get_all_with_equipment = AsyncMock(return_value=[])
        
        # Выполняем тест
        result = await pack_service.get_all_packs()
        
        # Проверяем результат
        assert result == []
        mock_pack_repo.get_all_with_equipment.assert_called_once()

    # Тесты для update_pack
    @pytest.mark.asyncio
    async def test_update_pack_success(self, pack_service, mock_pack_repo, sample_pack):
        """Тест успешного обновления пачки"""
        # Создаем данные для обновления
        update_data = PackUpdate(
            name="Updated Pack",
            description="Updated Description"
        )
        
        # Настраиваем мок репозитория
        updated_pack = Pack(
            id=1,
            name="Updated Pack",
            description="Updated Description",
            created_at=sample_pack.created_at,
            updated_at=sample_pack.updated_at
        )
        mock_pack_repo.get_by_id_with_equipment = AsyncMock(return_value=sample_pack)
        mock_pack_repo.update_with_equipment = AsyncMock(return_value=updated_pack)
        
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
        
        # Настраиваем мок репозитория
        mock_pack_repo.get_by_id_with_equipment = AsyncMock(return_value=None)
        
        # Проверяем, что возвращается None (метод не выбрасывает исключение)
        result = await pack_service.update_pack(999, update_data)
        assert result is None
        mock_pack_repo.get_by_id_with_equipment.assert_called_once_with(999)

    @pytest.mark.asyncio
    async def test_update_pack_with_equipment(self, pack_service, mock_pack_repo, mock_equipment_repo, sample_pack, sample_equipment):
        """Тест обновления пачки с оборудованием"""
        # Создаем данные для обновления
        update_data = PackUpdate(
            name="Updated Pack",
            equipment_ids=[1, 2]
        )
        
        # Настраиваем мок для оборудования
        equipment2 = Equipment(id=2, name="Equipment 2", equipment_type="Test Type", brand="Test Brand", condition="Good", daily_rate=100.0)
        mock_equipment_repo.get_by_ids = AsyncMock(return_value=[sample_equipment, equipment2])
        
        # Настраиваем мок репозитория
        updated_pack = Pack(
            id=1,
            name="Updated Pack",
            description=sample_pack.description,
            created_at=sample_pack.created_at,
            updated_at=sample_pack.updated_at
        )
        mock_pack_repo.get_by_id_with_equipment = AsyncMock(return_value=sample_pack)
        mock_pack_repo.update_with_equipment = AsyncMock(return_value=updated_pack)
        
        # Выполняем тест
        result = await pack_service.update_pack(1, update_data)
        
        # Проверяем результат
        assert result.name == "Updated Pack"
        mock_pack_repo.get_by_id_with_equipment.assert_called_once_with(1)
        mock_equipment_repo.get_by_ids.assert_called_once_with([1, 2])
        mock_pack_repo.update_with_equipment.assert_called_once()

    # Тесты для delete_pack
    @pytest.mark.asyncio
    async def test_delete_pack_success(self, pack_service, mock_pack_repo):
        """Тест успешного удаления пачки"""
        # Настраиваем мок репозитория
        mock_pack_repo.delete = AsyncMock(return_value=True)
        
        # Выполняем тест
        result = await pack_service.delete_pack(1)
        
        # Проверяем результат (метод возвращает True при успешном удалении)
        assert result is True
        mock_pack_repo.delete.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_delete_pack_not_found(self, pack_service, mock_pack_repo):
        """Тест удаления несуществующей пачки"""
        # Настраиваем мок репозитория
        mock_pack_repo.delete = AsyncMock(return_value=False)
        
        # Проверяем, что возвращается False (метод не выбрасывает исключение)
        result = await pack_service.delete_pack(999)
        assert result is False
        mock_pack_repo.delete.assert_called_once_with(999)

    # Тесты для get_public_packs_for_catalog
    @pytest.mark.asyncio
    async def test_get_public_packs_for_catalog_success(self, pack_service, mock_pack_repo, mock_availability_service):
        """Тест успешного получения публичных пачек для каталога"""
        # Создаем пачку с оборудованием
        from datetime import datetime
        pack_with_equipment = Pack(
            id=1,
            name="Test Pack",
            description="Test Description",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        equipment = Equipment(
            id=1,
            name="Test Equipment",
            equipment_type="Test Type",
            brand="Test Brand",
            condition="Good",
            daily_rate=100.0
        )
        pack_with_equipment.equipment = [equipment]
        
        # Настраиваем мок репозитория
        mock_pack_repo.get_all_with_equipment = AsyncMock(return_value=[pack_with_equipment])
        
        # Настраиваем мок для availability_service (не используется без дат)
        
        # Выполняем тест
        result = await pack_service.get_public_packs_for_catalog()
        
        # Проверяем результат
        assert len(result) == 1
        assert result[0].id == 1
        assert result[0].name == "Test Pack"
        mock_pack_repo.get_all_with_equipment.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_public_packs_for_catalog_with_dates(self, pack_service, mock_pack_repo, mock_availability_service):
        """Тест получения публичных пачек с диапазоном дат"""
        # Создаем пачку с оборудованием
        from datetime import datetime
        pack = Pack(id=1, name="Test Pack", description="Test", created_at=datetime.now(), updated_at=datetime.now())
        equipment = Equipment(
            id=1,
            name="Test Equipment",
            equipment_type="Test Type",
            brand="Test Brand",
            condition="Good",
            daily_rate=100.0
        )
        pack.equipment = [equipment]
        
        # Настраиваем мок репозитория
        mock_pack_repo.get_all_with_equipment = AsyncMock(return_value=[pack])
        
        # Настраиваем мок для availability_service
        mock_availability_service.get_conflicting_equipment_ids = AsyncMock(return_value=[])
        
        # Выполняем тест
        result = await pack_service.get_public_packs_for_catalog(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        # Проверяем результат
        assert len(result) == 1
        assert result[0].id == 1
        mock_pack_repo.get_all_with_equipment.assert_called_once()
        mock_availability_service.get_conflicting_equipment_ids.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_public_packs_for_catalog_empty(self, pack_service, mock_pack_repo):
        """Тест получения пустого списка публичных пачек"""
        # Настраиваем мок репозитория
        mock_pack_repo.get_all_with_equipment = AsyncMock(return_value=[])
        
        # Выполняем тест
        result = await pack_service.get_public_packs_for_catalog()
        
        # Проверяем результат
        assert result == []
        mock_pack_repo.get_all_with_equipment.assert_called_once()

    # Дополнительные тесты для edge cases
    @pytest.mark.asyncio
    async def test_create_pack_database_error(self, pack_service, mock_equipment_repo, mock_pack_repo, sample_equipment):
        """Тест обработки ошибки базы данных при создании пачки"""
        # Создаем данные для создания пачки (с минимальным оборудованием)
        pack_data = PackCreate(
            name="Test Pack",
            description="Test Description",
            equipment_ids=[1]
        )
        
        # Настраиваем мок для поиска оборудования (успешно)
        mock_equipment_repo.get_by_ids = AsyncMock(return_value=[sample_equipment])
        
        # Настраиваем мок для выброса исключения при создании пачки
        mock_pack_repo.create_with_equipment = AsyncMock(side_effect=Exception("Database error"))
        
        # Проверяем, что исключение оборачивается в HTTPException 500
        with pytest.raises(HTTPException) as exc_info:
            await pack_service.create_pack(pack_data)
        
        assert exc_info.value.status_code == 500
        assert "Ошибка при создании пачки" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_pack_by_id_database_error(self, pack_service, mock_pack_repo):
        """Тест обработки ошибки базы данных при получении пачки"""
        # Настраиваем мок для выброса исключения
        mock_pack_repo.get_by_id_with_equipment = AsyncMock(side_effect=Exception("Database error"))
        
        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database error"):
            await pack_service.get_pack_by_id(1)

    @pytest.mark.asyncio
    async def test_update_pack_database_error(self, pack_service, mock_pack_repo, sample_pack):
        """Тест обработки ошибки базы данных при обновлении пачки"""
        # Создаем данные для обновления
        update_data = PackUpdate(name="Updated Pack")
        
        # Настраиваем мок для поиска пачки (успешно)
        mock_pack_repo.get_by_id_with_equipment = AsyncMock(return_value=sample_pack)
        
        # Настраиваем мок для выброса исключения при обновлении
        mock_pack_repo.update_with_equipment = AsyncMock(side_effect=Exception("Database error"))
        
        # Проверяем, что исключение оборачивается в HTTPException 500
        with pytest.raises(HTTPException) as exc_info:
            await pack_service.update_pack(1, update_data)
        
        assert exc_info.value.status_code == 500
        assert "Ошибка при обновлении пачки" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_delete_pack_database_error(self, pack_service, mock_pack_repo):
        """Тест обработки ошибки базы данных при удалении пачки"""
        # Настраиваем мок для выброса исключения при удалении
        mock_pack_repo.delete = AsyncMock(side_effect=Exception("Database error"))
        
        # Проверяем, что исключение оборачивается в HTTPException 500
        with pytest.raises(HTTPException) as exc_info:
            await pack_service.delete_pack(1)
        
        assert exc_info.value.status_code == 500
        assert "Ошибка при удалении пачки" in str(exc_info.value.detail)

    # Тесты для граничных случаев
    @pytest.mark.asyncio
    async def test_create_pack_large_equipment_list(self, pack_service, mock_equipment_repo, mock_pack_repo):
        """Тест создания пачки с большим списком оборудования"""
        # Создаем данные для создания пачки
        large_equipment_list = list(range(1, 101))  # 100 единиц оборудования
        pack_data = PackCreate(
            name="Large Pack",
            description="Pack with many equipment",
            equipment_ids=large_equipment_list
        )
        
        # Создаем мок-оборудование
        from datetime import datetime
        mock_equipment = [Equipment(id=i, name=f"Equipment {i}", equipment_type="Test Type", brand="Test Brand", condition="Good", daily_rate=100.0) for i in range(1, 101)]
        
        # Создаем мок-пачку с правильными полями
        mock_pack = Pack(
            id=1,
            name="Large Pack",
            description="Pack with many equipment",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        mock_pack.equipment = mock_equipment
        
        # Настраиваем мок
        mock_equipment_repo.get_by_ids = AsyncMock(return_value=mock_equipment)
        mock_pack_repo.create_with_equipment = AsyncMock(return_value=mock_pack)
        
        # Выполняем тест
        result = await pack_service.create_pack(pack_data)
        
        # Проверяем результат
        assert result.name == "Large Pack"
        mock_equipment_repo.get_by_ids.assert_called_once_with(large_equipment_list)
        mock_pack_repo.create_with_equipment.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_all_packs_large_dataset(self, pack_service, mock_pack_repo):
        """Тест получения большого количества пачек"""
        # Создаем много пачек
        from datetime import datetime
        large_pack_list = [Pack(id=i, name=f"Pack {i}", description=f"Description {i}", created_at=datetime.now(), updated_at=datetime.now()) for i in range(1, 101)]
        
        # Настраиваем мок репозитория
        mock_pack_repo.get_all_with_equipment = AsyncMock(return_value=large_pack_list)
        
        # Выполняем тест
        result = await pack_service.get_all_packs()
        
        # Проверяем результат
        assert len(result) == 100
        assert result[0].id == 1
        assert result[99].id == 100
        mock_pack_repo.get_all_with_equipment.assert_called_once()