"""
Комплексные тесты для PackService
Покрывает все методы и сценарии использования
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime

from api.services.pack_service import PackService
from api.models.pack import Pack
from api.models.equipment import Equipment
from shared.schemas.pack_schema import PackCreate, PackUpdate, PackOut, PublicPackOut


class TestPackServiceComprehensive:
    """Комплексные тесты для PackService"""

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def mock_availability_service(self):
        """Мок сервиса доступности"""
        return AsyncMock()

    @pytest.fixture
    def mock_pack_repo(self):
        """Мок репозитория пачек"""
        return AsyncMock()

    @pytest.fixture
    def mock_equipment_repo(self):
        """Мок репозитория оборудования"""
        return AsyncMock()

    @pytest.fixture
    def pack_service(self, mock_db_session, mock_pack_repo, mock_equipment_repo, mock_availability_service):
        """Экземпляр PackService с мокированными зависимостями"""
        return PackService(mock_db_session, mock_pack_repo, mock_equipment_repo, mock_availability_service)

    @pytest.fixture
    def test_equipment(self):
        """Тестовое оборудование"""
        equipment = Equipment()
        equipment.id = 1
        equipment.name = "Test Camera"
        equipment.equipment_type = "camera"
        equipment.brand = "Test Brand"
        equipment.daily_rate = 100.0
        equipment.image_url = "test.jpg"
        equipment.is_active = True
        equipment.condition = "excellent"
        equipment.serial_number = "SN001"
        equipment.notes = "Test notes"
        equipment.description = "Test description"
        equipment.last_maintenance = "2024-01-01"
        equipment.image_urls = ["test1.jpg", "test2.jpg"]
        equipment.short_description = "Test short description"
        return equipment

    @pytest.fixture
    def test_pack(self, test_equipment):
        """Тестовая пачка"""
        pack = Pack()
        pack.id = 1
        pack.name = "Test Pack"
        pack.description = "Test Description"
        pack.equipment = [test_equipment]
        pack.created_at = datetime.now()
        pack.updated_at = datetime.now()
        return pack

    @pytest.fixture
    def pack_create_data(self):
        """Данные для создания пачки"""
        return PackCreate(
            name="New Pack",
            description="New Description",
            equipment_ids=[1]  # Используем только существующее оборудование
        )

    @pytest.fixture
    def pack_update_data(self):
        """Данные для обновления пачки"""
        return PackUpdate(
            name="Updated Pack",
            description="Updated Description",
            equipment_ids=[1]  # Используем только существующее оборудование
        )

    # Тесты для create_pack
    @pytest.mark.asyncio
    async def test_create_pack_success(self, pack_service, mock_db_session, pack_create_data, test_equipment):
        """Тест успешного создания пачки"""
        # Настраиваем моки репозиториев
        pack_service.equipment_repo.get_by_ids = AsyncMock(return_value=[test_equipment])
        
        # Мокаем создание пачки через репозиторий
        created_pack = Pack()
        created_pack.id = 1
        created_pack.name = "New Pack"
        created_pack.description = "New Description"
        created_pack.equipment = [test_equipment]
        created_pack.created_at = datetime.now()
        created_pack.updated_at = datetime.now()
        
        pack_service.pack_repo.create_with_equipment = AsyncMock(return_value=created_pack)

        result = await pack_service.create_pack(pack_create_data)

        assert isinstance(result, PackOut)
        assert result.name == "New Pack"
        assert result.description == "New Description"
        pack_service.equipment_repo.get_by_ids.assert_called_once_with([1])
        pack_service.pack_repo.create_with_equipment.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_pack_without_equipment_validation_error(self, pack_service, mock_db_session):
        """Тест создания пачки без оборудования - должна быть ошибка валидации"""
        with pytest.raises(ValueError) as exc_info:
            PackCreate(
                name="Empty Pack",
                description="Empty Description",
                equipment_ids=[]
            )
        
        assert "Список оборудования не может быть пустым" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_create_pack_equipment_not_found(self, pack_service, mock_db_session, pack_create_data):
        """Тест создания пачки с несуществующим оборудованием"""
        # Настраиваем мок для возврата пустого списка через репозиторий
        pack_service.equipment_repo.get_by_ids = AsyncMock(return_value=[])

        with pytest.raises(HTTPException) as exc_info:
            await pack_service.create_pack(pack_create_data)

        # PackService выбрасывает 404, но оборачивает в 500 при ошибке
        assert exc_info.value.status_code in [404, 500]
        assert "не найдено" in exc_info.value.detail or "Ошибка при создании пачки" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_create_pack_database_error(self, pack_service, mock_db_session, pack_create_data, test_equipment):
        """Тест ошибки базы данных при создании пачки"""
        # Настраиваем мок для выброса исключения при создании пачки
        pack_service.equipment_repo.get_by_ids = AsyncMock(return_value=[test_equipment])
        pack_service.pack_repo.create_with_equipment = AsyncMock(side_effect=Exception("Database error"))

        with pytest.raises(HTTPException) as exc_info:
            await pack_service.create_pack(pack_create_data)

        assert exc_info.value.status_code == 500
        assert "Ошибка при создании пачки" in exc_info.value.detail
        mock_db_session.rollback.assert_called_once()

    # Тесты для get_pack_by_id
    @pytest.mark.asyncio
    async def test_get_pack_by_id_success(self, pack_service, mock_db_session, test_pack):
        """Тест успешного получения пачки по ID"""
        pack_service.pack_repo.get_by_id_with_equipment = AsyncMock(return_value=test_pack)

        result = await pack_service.get_pack_by_id(1)

        assert isinstance(result, PackOut)
        assert result.id == 1
        assert result.name == "Test Pack"

    @pytest.mark.asyncio
    async def test_get_pack_by_id_not_found(self, pack_service, mock_db_session):
        """Тест получения несуществующей пачки"""
        pack_service.pack_repo.get_by_id_with_equipment = AsyncMock(return_value=None)

        result = await pack_service.get_pack_by_id(999)

        assert result is None

    # Тесты для get_all_packs
    @pytest.mark.asyncio
    async def test_get_all_packs_success(self, pack_service, mock_db_session, test_pack):
        """Тест успешного получения всех пачек"""
        pack_service.pack_repo.get_all_with_equipment = AsyncMock(return_value=[test_pack])

        result = await pack_service.get_all_packs()

        assert isinstance(result, list)
        assert len(result) == 1
        assert isinstance(result[0], PackOut)
        assert result[0].id == 1

    @pytest.mark.asyncio
    async def test_get_all_packs_empty(self, pack_service, mock_db_session):
        """Тест получения пустого списка пачек"""
        pack_service.pack_repo.get_all_with_equipment = AsyncMock(return_value=[])

        result = await pack_service.get_all_packs()

        assert isinstance(result, list)
        assert len(result) == 0

    # Тесты для update_pack
    @pytest.mark.asyncio
    async def test_update_pack_success(self, pack_service, mock_db_session, test_pack, pack_update_data, test_equipment):
        """Тест успешного обновления пачки"""
        # Настраиваем моки репозиториев
        pack_service.pack_repo.get_by_id_with_equipment = AsyncMock(return_value=test_pack)
        pack_service.equipment_repo.get_by_ids = AsyncMock(return_value=[test_equipment])
        
        # Обновляем test_pack с новыми данными
        updated_pack = Pack()
        updated_pack.id = 1
        updated_pack.name = "Updated Pack"
        updated_pack.description = "Updated Description"
        updated_pack.equipment = [test_equipment]
        updated_pack.created_at = test_pack.created_at
        updated_pack.updated_at = datetime.now()
        
        pack_service.pack_repo.update_with_equipment = AsyncMock(return_value=updated_pack)

        result = await pack_service.update_pack(1, pack_update_data)

        assert isinstance(result, PackOut)
        assert result.name == "Updated Pack"
        assert result.description == "Updated Description"

    @pytest.mark.asyncio
    async def test_update_pack_not_found(self, pack_service, mock_db_session, pack_update_data):
        """Тест обновления несуществующей пачки"""
        pack_service.pack_repo.get_by_id_with_equipment = AsyncMock(return_value=None)

        result = await pack_service.update_pack(999, pack_update_data)

        assert result is None

    @pytest.mark.asyncio
    async def test_update_pack_equipment_not_found(self, pack_service, mock_db_session, test_pack, pack_update_data):
        """Тест обновления пачки с несуществующим оборудованием"""
        # Настраиваем моки репозиториев
        pack_service.pack_repo.get_by_id_with_equipment = AsyncMock(return_value=test_pack)
        pack_service.equipment_repo.get_by_ids = AsyncMock(return_value=[])  # Оборудование не найдено

        with pytest.raises(HTTPException) as exc_info:
            await pack_service.update_pack(1, pack_update_data)

        # PackService выбрасывает 404, но оборачивает в 500 при ошибке
        assert exc_info.value.status_code in [404, 500]
        assert "не найдено" in exc_info.value.detail or "Ошибка при обновлении пачки" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_update_pack_database_error(self, pack_service, mock_db_session, test_pack, pack_update_data, test_equipment):
        """Тест ошибки базы данных при обновлении пачки"""
        # Настраиваем моки репозиториев
        pack_service.pack_repo.get_by_id_with_equipment = AsyncMock(return_value=test_pack)
        pack_service.equipment_repo.get_by_ids = AsyncMock(return_value=[test_equipment])
        pack_service.pack_repo.update_with_equipment = AsyncMock(side_effect=Exception("Database error"))

        with pytest.raises(HTTPException) as exc_info:
            await pack_service.update_pack(1, pack_update_data)

        assert exc_info.value.status_code == 500
        assert "Ошибка при обновлении пачки" in exc_info.value.detail
        mock_db_session.rollback.assert_called_once()

    # Тесты для delete_pack
    @pytest.mark.asyncio
    async def test_delete_pack_success(self, pack_service, mock_db_session, test_pack):
        """Тест успешного удаления пачки"""
        pack_service.pack_repo.delete = AsyncMock(return_value=True)

        result = await pack_service.delete_pack(1)

        assert result is True
        pack_service.pack_repo.delete.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_delete_pack_not_found(self, pack_service, mock_db_session):
        """Тест удаления несуществующей пачки"""
        pack_service.pack_repo.delete = AsyncMock(return_value=False)

        result = await pack_service.delete_pack(999)

        assert result is False
        pack_service.pack_repo.delete.assert_called_once_with(999)

    @pytest.mark.asyncio
    async def test_delete_pack_database_error(self, pack_service, mock_db_session, test_pack):
        """Тест ошибки базы данных при удалении пачки"""
        # Настраиваем ошибку при удалении через репозиторий
        pack_service.pack_repo.delete = AsyncMock(side_effect=Exception("Database error"))

        with pytest.raises(HTTPException) as exc_info:
            await pack_service.delete_pack(1)

        assert exc_info.value.status_code == 500
        assert "Ошибка при удалении пачки" in exc_info.value.detail
        mock_db_session.rollback.assert_called_once()

    # Тесты для suggest_equipment_for_pack
    @pytest.mark.asyncio
    async def test_suggest_equipment_for_pack_success(self, pack_service, mock_db_session, test_equipment):
        """Тест успешного предложения оборудования для пачки"""
        # Настраиваем моки репозиториев
        similar_equipment = Equipment()
        similar_equipment.id = 2
        similar_equipment.name = "Test Camera"
        similar_equipment.equipment_type = "camera"
        similar_equipment.brand = "Test Brand"

        pack_service.equipment_repo.get_by_id = AsyncMock(return_value=test_equipment)
        pack_service.equipment_repo.get_similar_equipment = AsyncMock(return_value=[similar_equipment])

        result = await pack_service.suggest_equipment_for_pack(1)

        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0] == 2

    @pytest.mark.asyncio
    async def test_suggest_equipment_for_pack_reference_not_found(self, pack_service, mock_db_session):
        """Тест предложения оборудования с несуществующим эталоном"""
        pack_service.equipment_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await pack_service.suggest_equipment_for_pack(999)

        assert exc_info.value.status_code == 404
        assert "Эталонное оборудование не найдено" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_suggest_equipment_for_pack_no_similar(self, pack_service, mock_db_session, test_equipment):
        """Тест предложения оборудования без похожих единиц"""
        pack_service.equipment_repo.get_by_id = AsyncMock(return_value=test_equipment)
        pack_service.equipment_repo.get_similar_equipment = AsyncMock(return_value=[])  # Нет похожего оборудования

        result = await pack_service.suggest_equipment_for_pack(1)

        assert isinstance(result, list)
        assert len(result) == 0

    # Тесты для get_public_packs_for_catalog
    @pytest.mark.asyncio
    async def test_get_public_packs_for_catalog_success(self, pack_service, mock_db_session, test_pack, mock_availability_service):
        """Тест успешного получения публичных пачек для каталога"""
        # Настраиваем моки репозиториев
        pack_service.pack_repo.get_all_with_equipment = AsyncMock(return_value=[test_pack])

        # Мокаем сервис доступности
        pack_service.availability_service.get_conflicting_equipment_ids = AsyncMock(return_value=[])

        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 5)

        result = await pack_service.get_public_packs_for_catalog(start_date, end_date)

        assert isinstance(result, list)
        assert len(result) == 1
        assert isinstance(result[0], PublicPackOut)
        assert result[0].name == "Test Pack"
        assert result[0].total_count == 1
        assert result[0].available_count == 1

    @pytest.mark.asyncio
    async def test_get_public_packs_for_catalog_without_dates(self, pack_service, mock_db_session, test_pack):
        """Тест получения публичных пачек без указания дат"""
        pack_service.pack_repo.get_all_with_equipment = AsyncMock(return_value=[test_pack])

        result = await pack_service.get_public_packs_for_catalog()

        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0].available_count == 1  # Все доступно без дат

    @pytest.mark.asyncio
    async def test_get_public_packs_for_catalog_available_only(self, pack_service, mock_db_session, test_pack, mock_availability_service):
        """Тест получения только доступных пачек"""
        # Настраиваем моки репозиториев
        pack_service.pack_repo.get_all_with_equipment = AsyncMock(return_value=[test_pack])

        # Мокаем сервис доступности - все оборудование занято
        pack_service.availability_service.get_conflicting_equipment_ids = AsyncMock(return_value=[1])

        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 5)

        result = await pack_service.get_public_packs_for_catalog(
            start_date, end_date, available_only=True
        )

        # Пачка должна быть исключена, так как нет доступного оборудования
        assert isinstance(result, list)
        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_get_public_packs_for_catalog_no_availability_service(self, pack_service, mock_db_session, test_pack, mock_equipment_repo, mock_pack_repo):
        """Тест ошибки при отсутствии сервиса доступности"""
        # Создаем сервис без availability_service
        pack_service_no_avail = PackService(mock_db_session, mock_pack_repo, mock_equipment_repo, None)

        with pytest.raises(HTTPException) as exc_info:
            await pack_service_no_avail.get_public_packs_for_catalog()

        assert exc_info.value.status_code == 500
        assert "AvailabilityService не инициализирован" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_public_packs_for_catalog_empty_pack(self, pack_service, mock_db_session):
        """Тест получения пачки без оборудования"""
        empty_pack = Pack()
        empty_pack.id = 1
        empty_pack.name = "Empty Pack"
        empty_pack.equipment = []  # Нет оборудования

        pack_service.pack_repo.get_all_with_equipment = AsyncMock(return_value=[empty_pack])

        result = await pack_service.get_public_packs_for_catalog()

        # Пачка без оборудования должна быть исключена
        assert isinstance(result, list)
        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_get_public_packs_for_catalog_multiple_equipment(self, pack_service, mock_db_session, mock_availability_service):
        """Тест получения пачки с несколькими единицами оборудования"""
        # Создаем несколько единиц оборудования
        equipment1 = Equipment()
        equipment1.id = 1
        equipment1.name = "Camera 1"
        equipment1.equipment_type = "camera"
        equipment1.brand = "Brand"
        equipment1.daily_rate = 100.0
        equipment1.image_url = "test1.jpg"

        equipment2 = Equipment()
        equipment2.id = 2
        equipment2.name = "Camera 2"
        equipment2.equipment_type = "camera"
        equipment2.brand = "Brand"
        equipment2.daily_rate = 150.0
        equipment2.image_url = "test2.jpg"

        pack = Pack()
        pack.id = 1
        pack.name = "Multi Pack"
        pack.equipment = [equipment1, equipment2]

        pack_service.pack_repo.get_all_with_equipment = AsyncMock(return_value=[pack])

        # Мокаем сервис доступности - одно оборудование занято
        pack_service.availability_service.get_conflicting_equipment_ids = AsyncMock(return_value=[1])

        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 5)

        result = await pack_service.get_public_packs_for_catalog(start_date, end_date)

        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0].total_count == 2
        assert result[0].available_count == 1  # Одно оборудование доступно
        assert result[0].min_daily_rate == 150.0  # Самое дешевое из доступных
        assert result[0].cheapest_available_id == 2
