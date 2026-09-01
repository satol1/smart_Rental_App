# tests/services/test_equipment_pack_service.py
"""
Тесты для EquipmentPackService.
Цель: повысить покрытие с 25% до 80%+
"""

import pytest
from unittest.mock import AsyncMock, Mock
from datetime import date
from typing import List, Optional

from api.services.equipment_pack_service import EquipmentPackService
from api.models.equipment import Equipment
from api.repositories.equipment_repository import EquipmentRepository
from api.services.pack_service import PackService
from shared.schemas.pack_schema import PublicPackOut


class TestEquipmentPackService:
    """Тесты для EquipmentPackService"""

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        session = AsyncMock()
        return session

    @pytest.fixture
    def mock_pack_service(self):
        """Мок сервиса пачек"""
        service = Mock(spec=PackService)
        return service

    @pytest.fixture
    def mock_equipment_repo(self):
        """Мок репозитория оборудования"""
        repo = Mock(spec=EquipmentRepository)
        return repo

    @pytest.fixture
    def equipment_pack_service(self, mock_db_session, mock_pack_service, mock_equipment_repo):
        """Создает экземпляр EquipmentPackService с мок-зависимостями"""
        return EquipmentPackService(mock_db_session, mock_pack_service, mock_equipment_repo)

    @pytest.fixture
    def sample_equipment(self):
        """Образец оборудования для тестирования"""
        equipment = Equipment(
            id=1,
            name="Test Equipment",
            brand="Test Brand",
            equipment_type="Test Type",
            daily_rate=100.0
        )
        return equipment

    @pytest.fixture
    def sample_pack(self):
        """Образец пачки для тестирования"""
        pack = PublicPackOut(
            id=1,
            name="Test Pack",
            equipment_type="Test Type",
            brand="Test Brand",
            total_count=2,
            available_count=2,
            min_daily_rate=100.0,
            equipment_ids=[1, 2]
        )
        return pack

    # Тесты инициализации
    def test_service_initialization(self, mock_db_session, mock_pack_service, mock_equipment_repo):
        """Тест инициализации сервиса"""
        service = EquipmentPackService(mock_db_session, mock_pack_service, mock_equipment_repo)
        assert service.db == mock_db_session
        assert service.pack_service == mock_pack_service
        assert service.equipment_repo == mock_equipment_repo

    # Тесты для get_filtered_packs
    @pytest.mark.asyncio
    async def test_get_filtered_packs_success(self, equipment_pack_service, mock_pack_service, sample_pack):
        """Тест успешного получения отфильтрованных пачек"""
        # Настраиваем мок
        mock_pack_service.get_public_packs_for_catalog = AsyncMock(return_value=[sample_pack])
        
        # Выполняем тест
        result = await equipment_pack_service.get_filtered_packs(
            query="test",
            type="Test Type",
            brand="Test Brand"
        )
        
        # Проверяем результат
        assert len(result) == 1
        assert result[0].id == 1
        assert result[0].name == "Test Pack"

    @pytest.mark.asyncio
    async def test_get_filtered_packs_no_filters(self, equipment_pack_service, mock_pack_service, sample_pack):
        """Тест получения пачек без фильтров"""
        # Настраиваем мок
        mock_pack_service.get_public_packs_for_catalog = AsyncMock(return_value=[sample_pack])
        
        # Выполняем тест
        result = await equipment_pack_service.get_filtered_packs()
        
        # Проверяем результат
        assert len(result) == 1
        assert result[0].id == 1

    @pytest.mark.asyncio
    async def test_get_filtered_packs_empty_result(self, equipment_pack_service, mock_pack_service):
        """Тест получения пустого результата"""
        # Настраиваем мок
        mock_pack_service.get_public_packs_for_catalog = AsyncMock(return_value=[])
        
        # Выполняем тест
        result = await equipment_pack_service.get_filtered_packs()
        
        # Проверяем результат
        assert result == []

    @pytest.mark.asyncio
    async def test_get_filtered_packs_with_date_range(self, equipment_pack_service, mock_pack_service, sample_pack):
        """Тест получения пачек с диапазоном дат"""
        # Настраиваем мок
        mock_pack_service.get_public_packs_for_catalog = AsyncMock(return_value=[sample_pack])
        
        # Выполняем тест
        result = await equipment_pack_service.get_filtered_packs(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31)
        )
        
        # Проверяем, что pack_service был вызван с правильными параметрами
        mock_pack_service.get_public_packs_for_catalog.assert_called_once_with(
            date(2024, 1, 1), date(2024, 1, 31)
        )

    # Тесты для get_equipment_excluding_packs
    @pytest.mark.asyncio
    async def test_get_equipment_excluding_packs_success(self, equipment_pack_service, sample_equipment, sample_pack):
        """Тест исключения оборудования из пачек"""
        # Создаем список оборудования (id=1 и id=3, но в пачке только id=1 и id=2)
        equipment_list = [sample_equipment, Equipment(id=3, name="Equipment 3")]
        
        # Создаем список пачек
        filtered_packs = [sample_pack]
        
        # Выполняем тест
        result = await equipment_pack_service.get_equipment_excluding_packs(equipment_list, filtered_packs)
        
        # Проверяем результат - оборудование с id=1 должно быть исключено, id=3 должно остаться
        assert len(result) == 1
        assert result[0].id == 3
        assert result[0].name == "Equipment 3"

    @pytest.mark.asyncio
    async def test_get_equipment_excluding_packs_no_packs(self, equipment_pack_service, sample_equipment):
        """Тест исключения оборудования когда нет пачек"""
        # Создаем список оборудования
        equipment_list = [sample_equipment]
        
        # Выполняем тест
        result = await equipment_pack_service.get_equipment_excluding_packs(equipment_list, [])
        
        # Проверяем результат - все оборудование должно остаться
        assert len(result) == 1
        assert result[0].id == 1

    @pytest.mark.asyncio
    async def test_get_equipment_excluding_packs_empty_equipment_list(self, equipment_pack_service, sample_pack):
        """Тест исключения оборудования из пустого списка"""
        # Выполняем тест
        result = await equipment_pack_service.get_equipment_excluding_packs([], [sample_pack])
        
        # Проверяем результат
        assert result == []

    # Тесты для calculate_total_with_packs
    @pytest.mark.asyncio
    async def test_calculate_total_with_packs_success(self, equipment_pack_service, mock_equipment_repo, sample_pack):
        """Тест расчета общего количества с пачками"""
        # Настраиваем мок для get_filtered_packs_async
        equipment_pack_service.get_filtered_packs_async = AsyncMock(return_value=[sample_pack])
        
        # Настраиваем мок для count_filtered_equipment_excluding_ids
        mock_equipment_repo.count_filtered_equipment_excluding_ids = AsyncMock(return_value=5)
        
        # Выполняем тест
        result = await equipment_pack_service.calculate_total_with_packs(
            query="test",
            type="Test Type",
            available_only=True
        )
        
        # Проверяем результат
        assert result == 6  # 1 пачка + 5 единиц оборудования

    @pytest.mark.asyncio
    async def test_calculate_total_with_packs_no_packs(self, equipment_pack_service, mock_equipment_repo):
        """Тест расчета общего количества без пачек"""
        # Настраиваем мок для get_filtered_packs_async
        equipment_pack_service.get_filtered_packs_async = AsyncMock(return_value=[])
        
        # Настраиваем мок для count_filtered_equipment_excluding_ids
        mock_equipment_repo.count_filtered_equipment_excluding_ids = AsyncMock(return_value=3)
        
        # Выполняем тест
        result = await equipment_pack_service.calculate_total_with_packs()
        
        # Проверяем результат
        assert result == 3  # 0 пачек + 3 единицы оборудования

    @pytest.mark.asyncio
    async def test_calculate_total_with_packs_with_all_filters(self, equipment_pack_service, mock_equipment_repo, sample_pack):
        """Тест расчета общего количества со всеми фильтрами"""
        # Настраиваем мок для get_filtered_packs_async
        equipment_pack_service.get_filtered_packs_async = AsyncMock(return_value=[sample_pack])
        
        # Настраиваем мок для count_filtered_equipment_excluding_ids
        mock_equipment_repo.count_filtered_equipment_excluding_ids = AsyncMock(return_value=2)
        
        # Выполняем тест
        result = await equipment_pack_service.calculate_total_with_packs(
            query="test",
            type="Test Type",
            brand="Test Brand",
            association_id=1,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            available_only=True
        )
        
        # Проверяем результат
        assert result == 3  # 1 пачка + 2 единицы оборудования

    # Тесты для _pack_matches_filters
    def test_pack_matches_filters_no_filters(self, equipment_pack_service, sample_pack):
        """Тест соответствия пачки фильтрам без фильтров"""
        result = equipment_pack_service._pack_matches_filters(sample_pack)
        assert result is True

    def test_pack_matches_filters_query_match(self, equipment_pack_service, sample_pack):
        """Тест соответствия пачки поисковому запросу"""
        result = equipment_pack_service._pack_matches_filters(sample_pack, query="Test")
        assert result is True

    def test_pack_matches_filters_query_no_match(self, equipment_pack_service, sample_pack):
        """Тест несоответствия пачки поисковому запросу"""
        result = equipment_pack_service._pack_matches_filters(sample_pack, query="Nonexistent")
        assert result is False

    def test_pack_matches_filters_type_match(self, equipment_pack_service, sample_pack):
        """Тест соответствия пачки типу оборудования"""
        # Настраиваем мок для _pack_has_equipment_type
        equipment_pack_service._pack_has_equipment_type = Mock(return_value=True)
        
        result = equipment_pack_service._pack_matches_filters(sample_pack, type="Test Type")
        assert result is True

    def test_pack_matches_filters_type_no_match(self, equipment_pack_service, sample_pack):
        """Тест несоответствия пачки типу оборудования"""
        # Настраиваем мок для _pack_has_equipment_type
        equipment_pack_service._pack_has_equipment_type = Mock(return_value=False)
        
        result = equipment_pack_service._pack_matches_filters(sample_pack, type="Other Type")
        assert result is False

    def test_pack_matches_filters_brand_match(self, equipment_pack_service, sample_pack):
        """Тест соответствия пачки бренду"""
        # Настраиваем мок для _pack_has_brand
        equipment_pack_service._pack_has_brand = Mock(return_value=True)
        
        result = equipment_pack_service._pack_matches_filters(sample_pack, brand="Test Brand")
        assert result is True

    def test_pack_matches_filters_brand_no_match(self, equipment_pack_service, sample_pack):
        """Тест несоответствия пачки бренду"""
        # Настраиваем мок для _pack_has_brand
        equipment_pack_service._pack_has_brand = Mock(return_value=False)
        
        result = equipment_pack_service._pack_matches_filters(sample_pack, brand="Other Brand")
        assert result is False

    def test_pack_matches_filters_association_match(self, equipment_pack_service, sample_pack):
        """Тест соответствия пачки ассоциации"""
        # Настраиваем мок для _pack_has_equipment_from_association
        equipment_pack_service._pack_has_equipment_from_association = Mock(return_value=True)
        
        result = equipment_pack_service._pack_matches_filters(sample_pack, association_id=1)
        assert result is True

    def test_pack_matches_filters_association_no_match(self, equipment_pack_service, sample_pack):
        """Тест несоответствия пачки ассоциации"""
        # Настраиваем мок для _pack_has_equipment_from_association
        equipment_pack_service._pack_has_equipment_from_association = Mock(return_value=False)
        
        result = equipment_pack_service._pack_matches_filters(sample_pack, association_id=999)
        assert result is False

    def test_pack_matches_filters_combined_filters(self, equipment_pack_service, sample_pack):
        """Тест соответствия пачки комбинированным фильтрам"""
        # Настраиваем моки
        equipment_pack_service._pack_has_equipment_type = Mock(return_value=True)
        equipment_pack_service._pack_has_brand = Mock(return_value=True)
        equipment_pack_service._pack_has_equipment_from_association = Mock(return_value=True)
        
        result = equipment_pack_service._pack_matches_filters(
            sample_pack,
            query="Test",
            type="Test Type",
            brand="Test Brand",
            association_id=1
        )
        assert result is True

    # Тесты для _get_equipment_ids_from_packs
    def test_get_equipment_ids_from_packs_success(self, equipment_pack_service, sample_pack):
        """Тест получения ID оборудования из пачек"""
        # Создаем пачку с оборудованием
        pack_with_equipment = PublicPackOut(
            id=1,
            name="Test Pack",
            equipment_type="Test Type",
            brand="Test Brand",
            total_count=2,
            available_count=2,
            min_daily_rate=100.0,
            equipment_ids=[1, 2]
        )
        
        result = equipment_pack_service._get_equipment_ids_from_packs([pack_with_equipment])
        
        # Проверяем результат
        assert result == {1, 2}

    def test_get_equipment_ids_from_packs_empty_packs(self, equipment_pack_service):
        """Тест получения ID оборудования из пустого списка пачек"""
        result = equipment_pack_service._get_equipment_ids_from_packs([])
        assert result == set()

    def test_get_equipment_ids_from_packs_no_equipment(self, equipment_pack_service):
        """Тест получения ID оборудования из пачек без оборудования"""
        pack_without_equipment = PublicPackOut(
            id=1,
            name="Test Pack",
            equipment_type="Test Type",
            brand="Test Brand",
            total_count=0,
            available_count=0,
            min_daily_rate=0.0,
            equipment_ids=[]
        )
        
        result = equipment_pack_service._get_equipment_ids_from_packs([pack_without_equipment])
        assert result == set()

    def test_get_equipment_ids_from_packs_multiple_packs(self, equipment_pack_service):
        """Тест получения ID оборудования из нескольких пачек"""
        pack1 = PublicPackOut(
            id=1,
            name="Pack 1",
            equipment_type="Type 1",
            brand="Brand 1",
            total_count=1,
            available_count=1,
            min_daily_rate=100.0,
            equipment_ids=[1]
        )
        pack2 = PublicPackOut(
            id=2,
            name="Pack 2",
            equipment_type="Type 2",
            brand="Brand 2",
            total_count=2,
            available_count=2,
            min_daily_rate=150.0,
            equipment_ids=[2, 3]
        )
        
        result = equipment_pack_service._get_equipment_ids_from_packs([pack1, pack2])
        
        # Проверяем результат
        assert result == {1, 2, 3}

    # Дополнительные тесты для edge cases
    @pytest.mark.asyncio
    async def test_get_filtered_packs_pack_service_error(self, equipment_pack_service, mock_pack_service):
        """Тест обработки ошибки pack_service"""
        # Настраиваем мок для выброса исключения
        mock_pack_service.get_public_packs_for_catalog = AsyncMock(side_effect=Exception("Service error"))
        
        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Service error"):
            await equipment_pack_service.get_filtered_packs()

    @pytest.mark.asyncio
    async def test_calculate_total_with_packs_equipment_repo_error(self, equipment_pack_service, mock_equipment_repo):
        """Тест обработки ошибки equipment_repo"""
        # Настраиваем мок для get_filtered_packs_async
        equipment_pack_service.get_filtered_packs_async = AsyncMock(return_value=[])
        
        # Настраиваем мок для выброса исключения
        mock_equipment_repo.count_filtered_equipment_excluding_ids = AsyncMock(side_effect=Exception("Repo error"))
        
        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Repo error"):
            await equipment_pack_service.calculate_total_with_packs()

    def test_pack_matches_filters_case_insensitive_query(self, equipment_pack_service, sample_pack):
        """Тест поиска без учета регистра"""
        result = equipment_pack_service._pack_matches_filters(sample_pack, query="test")
        assert result is True

    def test_pack_matches_filters_partial_query_match(self, equipment_pack_service, sample_pack):
        """Тест частичного соответствия поисковому запросу"""
        result = equipment_pack_service._pack_matches_filters(sample_pack, query="Pack")
        assert result is True

    # Тесты для граничных случаев
    @pytest.mark.asyncio
    async def test_get_filtered_packs_large_dataset(self, equipment_pack_service, mock_pack_service):
        """Тест получения пачек из большого набора данных"""
        # Создаем много пачек
        large_pack_list = [
            PublicPackOut(
                id=i, 
                name=f"Pack {i}",
                equipment_type="Test Type",
                brand="Test Brand",
                total_count=1,
                available_count=1,
                min_daily_rate=100.0,
                equipment_ids=[]
            ) 
            for i in range(100)
        ]
        
        mock_pack_service.get_public_packs_for_catalog = AsyncMock(return_value=large_pack_list)
        
        result = await equipment_pack_service.get_filtered_packs()
        
        assert len(result) == 100

    @pytest.mark.asyncio
    async def test_calculate_total_with_packs_large_numbers(self, equipment_pack_service, mock_equipment_repo):
        """Тест расчета общего количества с большими числами"""
        # Настраиваем мок для get_filtered_packs_async
        equipment_pack_service.get_filtered_packs_async = AsyncMock(return_value=[
            PublicPackOut(
                id=i, 
                name=f"Pack {i}",
                equipment_type="Test Type",
                brand="Test Brand",
                total_count=1,
                available_count=1,
                min_daily_rate=100.0,
                equipment_ids=[]
            ) 
            for i in range(50)
        ])
        
        # Настраиваем мок для count_filtered_equipment_excluding_ids
        mock_equipment_repo.count_filtered_equipment_excluding_ids = AsyncMock(return_value=1000)
        
        result = await equipment_pack_service.calculate_total_with_packs()
        
        # Проверяем результат
        assert result == 1050  # 50 пачек + 1000 единиц оборудования
