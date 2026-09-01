# tests/services/test_settings_service.py

import pytest
from unittest.mock import AsyncMock, MagicMock

from api.services.settings_service import SettingsService
from api.models.setting import Setting
from shared.schemas.setting_schema import SettingUpdate


class TestSettingsService:
    """Тесты для SettingsService."""

    @pytest.fixture
    def mock_db(self):
        """Создает мок базы данных."""
        return AsyncMock()

    @pytest.fixture
    def settings_service(self, mock_db):
        """Создает экземпляр SettingsService с моком БД и зависимостями."""
        mock_system_service = AsyncMock()
        return SettingsService(db=mock_db, system_service=mock_system_service)

    @pytest.fixture
    def sample_setting(self):
        """Создает тестовую настройку."""
        setting = MagicMock(spec=Setting)
        setting.id = 1
        setting.key = "test_key"
        setting.value = "test_value"
        setting.description = "Test setting"
        return setting

    @pytest.fixture
    def sample_setting_update(self):
        """Создает тестовые данные для обновления настройки."""
        return SettingUpdate(
            key="test_key",
            value="updated_value",
            description="Updated test setting"
        )

    @pytest.mark.asyncio
    async def test_get_all_settings_success(self, settings_service, sample_setting):
        """Тест успешного получения всех настроек."""
        # Arrange
        settings_list = [sample_setting]
        settings_service.system_service.get_all_settings.return_value = settings_list

        # Act
        result = await settings_service.get_all_settings()

        # Assert
        assert result == settings_list
        settings_service.system_service.get_all_settings.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_all_settings_empty(self, settings_service):
        """Тест получения пустого списка настроек."""
        # Arrange
        settings_service.system_service.get_all_settings.return_value = []

        # Act
        result = await settings_service.get_all_settings()

        # Assert
        assert result == []
        settings_service.system_service.get_all_settings.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_settings_success(self, settings_service, sample_setting_update):
        """Тест успешного обновления настроек."""
        # Arrange
        settings_data = [sample_setting_update]
        settings_service.system_service.upsert_settings.return_value = None

        # Act
        await settings_service.update_settings(settings_data)

        # Assert
        settings_service.system_service.upsert_settings.assert_called_once()
        settings_service.db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_settings_empty_list(self, settings_service):
        """Тест обновления настроек с пустым списком."""
        # Arrange
        settings_data = []

        # Act
        await settings_service.update_settings(settings_data)

        # Assert
        settings_service.system_service.upsert_settings.assert_not_called()
        settings_service.db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_settings_multiple_settings(self, settings_service):
        """Тест обновления нескольких настроек."""
        # Arrange
        settings_data = [
            SettingUpdate(key="key1", value="value1", description="Setting 1"),
            SettingUpdate(key="key2", value="value2", description="Setting 2"),
            SettingUpdate(key="key3", value="value3", description="Setting 3")
        ]
        settings_service.system_service.upsert_settings.return_value = None

        # Act
        await settings_service.update_settings(settings_data)

        # Assert
        settings_service.system_service.upsert_settings.assert_called_once()
        call_args = settings_service.system_service.upsert_settings.call_args[0][0]
        assert len(call_args) == 3
        assert call_args[0]["key"] == "key1"
        assert call_args[1]["key"] == "key2"
        assert call_args[2]["key"] == "key3"
        settings_service.db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_settings_repository_error(self, settings_service, sample_setting_update):
        """Тест обновления настроек с ошибкой репозитория."""
        # Arrange
        settings_data = [sample_setting_update]
        settings_service.system_service.upsert_settings.side_effect = Exception("Database error")

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await settings_service.update_settings(settings_data)

        assert "Database error" in str(exc_info.value)
        settings_service.db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_settings_commit_error(self, settings_service, sample_setting_update):
        """Тест обновления настроек с ошибкой коммита."""
        # Arrange
        settings_data = [sample_setting_update]
        settings_service.system_service.upsert_settings.return_value = None
        settings_service.db.commit.side_effect = Exception("Commit error")

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await settings_service.update_settings(settings_data)

        assert "Commit error" in str(exc_info.value)
        settings_service.system_service.upsert_settings.assert_called_once()

    def test_settings_service_initialization(self, mock_db):
        """Тест инициализации SettingsService."""
        # Act
        mock_system_service = AsyncMock()
        service = SettingsService(db=mock_db, system_service=mock_system_service)

        # Assert
        assert service.db == mock_db
        assert service.system_service is not None

    @pytest.mark.asyncio
    async def test_get_all_settings_repository_error(self, settings_service):
        """Тест получения настроек с ошибкой репозитория."""
        # Arrange
        settings_service.system_service.get_all_settings.side_effect = Exception("Database error")

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await settings_service.get_all_settings()

        assert "Database error" in str(exc_info.value)
