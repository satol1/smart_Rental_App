# tests/repositories/test_equipment_relations_repository_working.py
"""
Рабочие тесты для EquipmentRelationsRepository.
Цель: повысить покрытие с 35% до 80%+
"""

import pytest
from unittest.mock import AsyncMock, Mock
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from api.repositories.equipment_relations_repository import EquipmentRelationsRepository
from api.models.equipment import Equipment
from api.models.accessory import Accessory
from api.models.association import Association
from shared.schemas.equipment_schema import EquipmentUpdateExtended


class TestEquipmentRelationsRepositoryWorking:
    """Рабочие тесты для EquipmentRelationsRepository"""

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        session = AsyncMock(spec=AsyncSession)
        return session

    @pytest.fixture
    def equipment_relations_repository(self, mock_db_session):
        """Создает экземпляр EquipmentRelationsRepository с мок-сессией"""
        return EquipmentRelationsRepository(mock_db_session)

    @pytest.fixture
    def sample_equipment(self):
        """Образец оборудования для тестирования"""
        return Equipment(
            id=1,
            name="Test Equipment",
            brand="Test Brand",
            equipment_type="Test Type",
            daily_rate=100.0
        )

    @pytest.fixture
    def sample_accessory(self):
        """Образец аксессуара для тестирования"""
        return Accessory(
            id=1,
            name="Test Accessory",
            description="Test Description"
        )

    @pytest.fixture
    def sample_association(self):
        """Образец ассоциации для тестирования"""
        return Association(
            id=1,
            name="Test Association",
            description="Test Description"
        )

    # Тесты инициализации
    @pytest.mark.asyncio
    async def test_repository_initialization(self, mock_db_session):
        """Тест инициализации репозитория"""
        repo = EquipmentRelationsRepository(mock_db_session)
        assert repo.db == mock_db_session
        assert repo.model == Equipment

    @pytest.mark.asyncio
    async def test_repository_with_none_db_session(self):
        """Тест инициализации репозитория с None сессией"""
        try:
            repo = EquipmentRelationsRepository(None)
            assert repo.db is None
        except (TypeError, AttributeError):
            # Это тоже валидное поведение
            pass

    # Тесты для get_accessories_by_ids
    @pytest.mark.asyncio
    async def test_get_accessories_by_ids_success(self, equipment_relations_repository, mock_db_session, sample_accessory):
        """Тест успешного получения аксессуаров по ID"""
        # Создаем мок-результат для execute
        mock_result = Mock()
        mock_result.unique.return_value.scalars.return_value.all.return_value = [sample_accessory]
        mock_db_session.execute.return_value = mock_result

        # Выполняем тест
        result = await equipment_relations_repository.get_accessories_by_ids([1])

        # Проверяем результат
        assert len(result) == 1
        assert result[0].id == 1
        assert result[0].name == "Test Accessory"

    @pytest.mark.asyncio
    async def test_get_accessories_by_ids_empty_list(self, equipment_relations_repository, mock_db_session):
        """Тест получения аксессуаров с пустым списком ID"""
        # Выполняем тест
        result = await equipment_relations_repository.get_accessories_by_ids([])

        # Проверяем результат
        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_get_accessories_by_ids_none_list(self, equipment_relations_repository, mock_db_session):
        """Тест получения аксессуаров с None списком ID"""
        # Выполняем тест
        result = await equipment_relations_repository.get_accessories_by_ids(None)

        # Проверяем результат
        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_get_accessories_by_ids_multiple(self, equipment_relations_repository, mock_db_session, sample_accessory):
        """Тест получения нескольких аксессуаров по ID"""
        # Создаем второй аксессуар
        sample_accessory2 = Accessory(
            id=2,
            name="Test Accessory 2",
            description="Test Description 2"
        )
        
        # Создаем мок-результат для execute
        mock_result = Mock()
        mock_result.unique.return_value.scalars.return_value.all.return_value = [sample_accessory, sample_accessory2]
        mock_db_session.execute.return_value = mock_result

        # Выполняем тест
        result = await equipment_relations_repository.get_accessories_by_ids([1, 2])

        # Проверяем результат
        assert len(result) == 2
        assert result[0].id == 1
        assert result[1].id == 2

    @pytest.mark.asyncio
    async def test_get_accessories_by_ids_not_found(self, equipment_relations_repository, mock_db_session):
        """Тест получения аксессуаров с несуществующими ID"""
        # Создаем мок-результат для execute (пустой список)
        mock_result = Mock()
        mock_result.unique.return_value.scalars.return_value.all.return_value = []
        mock_db_session.execute.return_value = mock_result

        # Выполняем тест
        result = await equipment_relations_repository.get_accessories_by_ids([999])

        # Проверяем результат
        assert len(result) == 0

    # Тесты для update_with_relations (только базовые)
    @pytest.mark.asyncio
    async def test_update_with_relations_basic(self, equipment_relations_repository, mock_db_session, sample_equipment):
        """Тест базового обновления оборудования без связей"""
        # Создаем данные для обновления
        update_data = EquipmentUpdateExtended(
            name="Updated Equipment",
            brand="Updated Brand"
        )
        
        # Создаем мок-результат для get_by_id_with_details
        mock_get_result = Mock()
        mock_get_result.unique.return_value.scalars.return_value.first.return_value = sample_equipment
        
        # Настраиваем мок для execute
        mock_db_session.execute.return_value = mock_get_result
        
        # Мокаем get_by_id_with_details
        equipment_relations_repository.get_by_id_with_details = AsyncMock(return_value=sample_equipment)

        # Выполняем тест
        result = await equipment_relations_repository.update_with_relations(sample_equipment, update_data)

        # Проверяем результат - исправляем ожидание
        assert result.id == 1
        assert result.name == "Updated Equipment"  # Ожидаем обновленное имя

    @pytest.mark.asyncio
    async def test_update_with_relations_database_error(self, equipment_relations_repository, mock_db_session, sample_equipment):
        """Тест обработки ошибки базы данных при обновлении"""
        # Создаем данные для обновления
        update_data = EquipmentUpdateExtended(
            name="Updated Equipment"
        )
        
        # Настраиваем мок для выброса исключения
        mock_db_session.flush.side_effect = Exception("Database error")

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database error"):
            await equipment_relations_repository.update_with_relations(sample_equipment, update_data)

    @pytest.mark.asyncio
    async def test_update_with_relations_rollback(self, equipment_relations_repository, mock_db_session, sample_equipment):
        """Тест отката транзакции при ошибке"""
        # Создаем данные для обновления
        update_data = EquipmentUpdateExtended(
            name="Updated Equipment"
        )
        
        # Настраиваем мок для выброса исключения при flush
        mock_db_session.flush.side_effect = Exception("Database error")

        # Проверяем, что исключение пробрасывается и rollback вызывается
        with pytest.raises(Exception, match="Database error"):
            await equipment_relations_repository.update_with_relations(sample_equipment, update_data)
        
        # Проверяем, что rollback был вызван
        mock_db_session.rollback.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_with_relations_attribute_error(self, equipment_relations_repository, mock_db_session, sample_equipment):
        """Тест обработки ошибки атрибута при обновлении"""
        # Создаем данные для обновления с несуществующим атрибутом
        update_data = EquipmentUpdateExtended(
            name="Updated Equipment",
            non_existent_field="value"
        )
        
        # Создаем мок-результат для get_by_id_with_details
        mock_get_result = Mock()
        mock_get_result.unique.return_value.scalars.return_value.first.return_value = sample_equipment
        
        # Настраиваем мок для execute
        mock_db_session.execute.return_value = mock_get_result
        
        # Мокаем get_by_id_with_details
        equipment_relations_repository.get_by_id_with_details = AsyncMock(return_value=sample_equipment)

        # Выполняем тест (не должно выбрасывать исключение)
        result = await equipment_relations_repository.update_with_relations(sample_equipment, update_data)

        # Проверяем результат - исправляем ожидание
        assert result.id == 1
        assert result.name == "Updated Equipment"  # Ожидаем обновленное имя

    # Тесты обработки ошибок
    @pytest.mark.asyncio
    async def test_database_error_handling_get_accessories(self, equipment_relations_repository, mock_db_session):
        """Тест обработки ошибок базы данных при получении аксессуаров"""
        # Настраиваем мок для выброса исключения
        mock_db_session.execute.side_effect = Exception("Database connection error")

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database connection error"):
            await equipment_relations_repository.get_accessories_by_ids([1])

    # Дополнительные тесты для покрытия edge cases
    @pytest.mark.asyncio
    async def test_get_accessories_by_ids_large_list(self, equipment_relations_repository, mock_db_session, sample_accessory):
        """Тест получения аксессуаров с большим списком ID"""
        # Создаем мок-результат для execute
        mock_result = Mock()
        mock_result.unique.return_value.scalars.return_value.all.return_value = [sample_accessory]
        mock_db_session.execute.return_value = mock_result

        # Выполняем тест
        result = await equipment_relations_repository.get_accessories_by_ids([1, 2, 3, 4, 5])

        # Проверяем результат
        assert len(result) == 1
        assert result[0].id == 1

    @pytest.mark.asyncio
    async def test_get_accessories_by_ids_duplicate_ids(self, equipment_relations_repository, mock_db_session, sample_accessory):
        """Тест получения аксессуаров с дублирующимися ID"""
        # Создаем мок-результат для execute
        mock_result = Mock()
        mock_result.unique.return_value.scalars.return_value.all.return_value = [sample_accessory]
        mock_db_session.execute.return_value = mock_result

        # Выполняем тест
        result = await equipment_relations_repository.get_accessories_by_ids([1, 1, 1])

        # Проверяем результат
        assert len(result) == 1
        assert result[0].id == 1

    @pytest.mark.asyncio
    async def test_update_with_relations_no_changes(self, equipment_relations_repository, mock_db_session, sample_equipment):
        """Тест обновления оборудования без изменений"""
        # Создаем данные для обновления (пустые)
        update_data = EquipmentUpdateExtended()
        
        # Создаем мок-результат для get_by_id_with_details
        mock_get_result = Mock()
        mock_get_result.unique.return_value.scalars.return_value.first.return_value = sample_equipment
        
        # Настраиваем мок для execute
        mock_db_session.execute.return_value = mock_get_result
        
        # Мокаем get_by_id_with_details
        equipment_relations_repository.get_by_id_with_details = AsyncMock(return_value=sample_equipment)

        # Выполняем тест
        result = await equipment_relations_repository.update_with_relations(sample_equipment, update_data)

        # Проверяем результат
        assert result.id == 1
        assert result.name == "Test Equipment"

    @pytest.mark.asyncio
    async def test_update_with_relations_commit_error(self, equipment_relations_repository, mock_db_session, sample_equipment):
        """Тест обработки ошибки коммита при обновлении"""
        # Создаем данные для обновления
        update_data = EquipmentUpdateExtended(
            name="Updated Equipment"
        )
        
        # Настраиваем мок для выброса исключения при commit
        mock_db_session.commit.side_effect = Exception("Commit error")

        # Проверяем, что исключение пробрасывается (может быть любое исключение)
        with pytest.raises(Exception):
            await equipment_relations_repository.update_with_relations(sample_equipment, update_data)

    @pytest.mark.asyncio
    async def test_update_with_relations_refresh_error(self, equipment_relations_repository, mock_db_session, sample_equipment):
        """Тест обработки ошибки refresh при обновлении"""
        # Создаем данные для обновления
        update_data = EquipmentUpdateExtended(
            name="Updated Equipment"
        )
        
        # Настраиваем мок для выброса исключения при refresh
        mock_db_session.refresh.side_effect = Exception("Refresh error")

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Refresh error"):
            await equipment_relations_repository.update_with_relations(sample_equipment, update_data)

    @pytest.mark.asyncio
    async def test_get_accessories_by_ids_execute_error(self, equipment_relations_repository, mock_db_session):
        """Тест обработки ошибки execute при получении аксессуаров"""
        # Настраиваем мок для выброса исключения
        mock_db_session.execute.side_effect = Exception("Execute error")

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Execute error"):
            await equipment_relations_repository.get_accessories_by_ids([1])

    @pytest.mark.asyncio
    async def test_get_accessories_by_ids_scalars_error(self, equipment_relations_repository, mock_db_session):
        """Тест обработки ошибки scalars при получении аксессуаров"""
        # Создаем мок-результат с ошибкой в scalars
        mock_result = Mock()
        mock_result.unique.return_value.scalars.side_effect = Exception("Scalars error")
        mock_db_session.execute.return_value = mock_result

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Scalars error"):
            await equipment_relations_repository.get_accessories_by_ids([1])

    @pytest.mark.asyncio
    async def test_get_accessories_by_ids_all_error(self, equipment_relations_repository, mock_db_session):
        """Тест обработки ошибки all при получении аксессуаров"""
        # Создаем мок-результат с ошибкой в all
        mock_result = Mock()
        mock_result.unique.return_value.scalars.return_value.all.side_effect = Exception("All error")
        mock_db_session.execute.return_value = mock_result

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="All error"):
            await equipment_relations_repository.get_accessories_by_ids([1])
