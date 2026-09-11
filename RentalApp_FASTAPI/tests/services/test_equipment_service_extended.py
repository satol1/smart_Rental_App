# tests/services/test_equipment_service_extended.py

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from datetime import date, datetime

from api.services.equipment_crud_service import EquipmentCRUDService
from shared.schemas.equipment_schema import EquipmentCreate, EquipmentUpdateExtended


class TestEquipmentServiceExtended:
    """Расширенные тесты для EquipmentService."""

    @pytest.fixture
    def equipment_service(self):
        """Фикстура для создания экземпляра EquipmentCRUDService."""
        mock_db = AsyncMock()
        mock_repo = AsyncMock()
        return EquipmentCRUDService(db=mock_db, repo=mock_repo)

    @pytest.fixture
    def sample_equipment_data(self):
        """Тестовые данные для создания оборудования."""
        return EquipmentCreate(
            equipment_type="Камера",
            brand="Canon",
            name="EOS R5",
            serial_number="SN123456",
            condition="Отлично",
            daily_rate=200.0,
            notes="Профессиональная камера",
            description="Полнокадровая беззеркальная камера",
            last_maintenance=date(2024, 1, 15),
            image_url="https://example.com/camera.jpg",
            short_description="Canon EOS R5"
        )

    @pytest.fixture
    def sample_equipment_update(self):
        """Тестовые данные для обновления оборудования."""
        return EquipmentUpdateExtended(
            name="EOS R5 Updated",
            condition="Хорошо",
            daily_rate=180.0,
            notes="Обновленное оборудование"
        )

    @pytest.mark.asyncio
    async def test_get_all_equipment_success(self, equipment_service):
        """Тест успешного получения всего оборудования."""
        # Мокаем результат запроса через репозиторий
        mock_equipment1 = MagicMock()
        mock_equipment1.id = 1
        mock_equipment1.name = "EOS R5"
        mock_equipment2 = MagicMock()
        mock_equipment2.id = 2
        mock_equipment2.name = "EOS R6"
        
        equipment_service.repo.get_all_with_details = AsyncMock(return_value=[mock_equipment1, mock_equipment2])

        result = await equipment_service.get_all_equipment()

        assert len(result) == 2
        assert result[0].id == 1
        assert result[1].id == 2
        equipment_service.repo.get_all_with_details.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_all_equipment_empty(self, equipment_service):
        """Тест получения пустого списка оборудования."""
        equipment_service.repo.get_all_with_details = AsyncMock(return_value=[])

        result = await equipment_service.get_all_equipment()

        assert len(result) == 0
        equipment_service.repo.get_all_with_details.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_equipment_by_id_success(self, equipment_service):
        """Тест успешного получения оборудования по ID."""
        mock_equipment = MagicMock()
        mock_equipment.id = 1
        mock_equipment.name = "EOS R5"
        equipment_service.repo.get_by_id_with_details.return_value = mock_equipment

        result = await equipment_service.get_equipment_by_id(1)

        assert result.id == 1
        assert result.name == "EOS R5"
        equipment_service.repo.get_by_id_with_details.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_get_equipment_by_id_not_found(self, equipment_service):
        """Тест получения несуществующего оборудования."""
        equipment_service.repo.get_by_id_with_details.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await equipment_service.get_equipment_by_id(999)
        
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_update_equipment_details_success(self, equipment_service, sample_equipment_update):
        """Тест успешного обновления деталей оборудования."""
        mock_equipment = MagicMock()
        mock_equipment.id = 1
        mock_equipment.name = "EOS R5 Updated"
        equipment_service.repo.get_by_id_with_details.return_value = mock_equipment
        equipment_service.repo.update_with_relations.return_value = mock_equipment

        result = await equipment_service.update_equipment_details(1, sample_equipment_update)

        assert result.id == 1
        assert result.name == "EOS R5 Updated"
        equipment_service.repo.update_with_relations.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_equipment_details_not_found(self, equipment_service, sample_equipment_update):
        """Тест обновления деталей несуществующего оборудования."""
        equipment_service.repo.get_by_id_with_details.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await equipment_service.update_equipment_details(999, sample_equipment_update)
        
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_validate_equipment_fields(self, equipment_service):
        """Дефолты проставляются через set_committed_value (без записи в БД)."""
        from api.models.equipment import Equipment
        from sqlalchemy import inspect as sa_inspect

        # Реальные ORM-объекты: set_committed_value работает с инструментами ORM
        equipment1 = Equipment(id=1)
        equipment1.name = None
        equipment1.daily_rate = None
        equipment1.condition = None

        equipment2 = Equipment(id=2)
        equipment2.name = "Valid Equipment"
        equipment2.daily_rate = 100.0
        equipment2.condition = "Отлично"

        equipment_list = [equipment1, equipment2]

        # Вызываем приватный метод валидации
        equipment_service._validate_equipment_fields(equipment_list)

        # Проверяем, что поля были исправлены
        assert equipment1.name == "Неизвестное оборудование"
        assert equipment1.daily_rate == 0.0
        assert equipment1.condition == "Великолепно"

        # Проверяем, что валидные поля не изменились
        assert equipment2.name == "Valid Equipment"
        assert equipment2.daily_rate == 100.0
        assert equipment2.condition == "Отлично"

        # Ключевое: история изменений атрибутов чиста — flush не запишет
        # «починенные» дефолты в БД (в отличие от прежнего прямого присваивания)
        state = sa_inspect(equipment1)
        assert not state.attrs.name.history.has_changes()
        assert not state.attrs.daily_rate.history.has_changes()
        assert not state.attrs.condition.history.has_changes()
