# tests/test_repositories/test_dashboard_repository.py

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.dashboard_repository import DashboardRepository
from shared.schemas.dashboard_schema import PopularEquipmentItem, ActivityFeedItem


class TestDashboardRepository:
    """Тесты для DashboardRepository."""
    
    @pytest.fixture
    def mock_db(self):
        """Создает мок сессии базы данных."""
        return AsyncMock(spec=AsyncSession)
    
    @pytest.fixture
    def dashboard_repo(self, mock_db):
        """Создает экземпляр DashboardRepository с мок сессией."""
        return DashboardRepository(mock_db)
    
    @pytest.mark.asyncio
    async def test_get_popular_equipment_success(self, dashboard_repo, mock_db):
        """Тест успешного получения популярного оборудования."""
        # Подготавливаем мок данные
        mock_result = MagicMock()
        mock_mappings = [
            {
                'equipment_id': 1,
                'equipment_name': 'Test Equipment 1',
                'rental_count': 5,
                'revenue': 1000.0
            },
            {
                'equipment_id': 2,
                'equipment_name': 'Test Equipment 2',
                'rental_count': 3,
                'revenue': 750.0
            }
        ]
        mock_result.mappings.return_value.all.return_value = mock_mappings
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        result = await dashboard_repo.get_popular_equipment(30)
        
        # Проверяем результат
        assert len(result) == 2
        assert isinstance(result[0], PopularEquipmentItem)
        assert result[0].equipment_id == 1
        assert result[0].equipment_name == 'Test Equipment 1'
        assert result[0].rental_count == 5
        assert result[0].revenue == 1000.0
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_popular_equipment_exception(self, dashboard_repo, mock_db):
        """Тест обработки исключения при получении популярного оборудования."""
        # Настраиваем мок для выброса исключения
        mock_db.execute.side_effect = Exception("Database error")
        
        # Выполняем тест
        result = await dashboard_repo.get_popular_equipment(30)
        
        # Проверяем, что возвращается пустой список
        assert result == []
    
    @pytest.mark.asyncio
    async def test_get_recent_activity_success(self, dashboard_repo, mock_db):
        """Тест успешного получения последних событий."""
        # Подготавливаем мок данные
        mock_result = MagicMock()
        # Создаем мок объекты с атрибутами
        mock_row1 = MagicMock()
        mock_row1.id = 1
        mock_row1.timestamp = datetime.now()
        mock_row1.activity_type = 'rental_started'
        mock_row1.user_name = 'Test User'
        mock_row1.equipment_name = 'Test Equipment'
        
        mock_row2 = MagicMock()
        mock_row2.id = 2
        mock_row2.timestamp = datetime.now() - timedelta(hours=1)
        mock_row2.activity_type = 'user_registered'
        mock_row2.user_name = 'New User'
        mock_row2.equipment_name = None
        
        mock_mappings = [mock_row1, mock_row2]
        mock_result.mappings.return_value.all.return_value = mock_mappings
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        result = await dashboard_repo.get_recent_activity(7)
        
        # Проверяем результат
        assert len(result) == 2
        assert isinstance(result[0], ActivityFeedItem)
        assert result[0].activity_type == 'rental_started'
        assert result[0].user_name == 'Test User'
        assert result[0].description == 'Новая аренда для Test User'
        
        assert result[1].activity_type == 'user_registered'
        assert result[1].user_name == 'New User'
        assert result[1].description == 'Новый пользователь: New User'
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_recent_activity_exception(self, dashboard_repo, mock_db):
        """Тест обработки исключения при получении последних событий."""
        # Настраиваем мок для выброса исключения
        mock_db.execute.side_effect = Exception("Database error")
        
        # Выполняем тест
        result = await dashboard_repo.get_recent_activity(7)
        
        # Проверяем, что возвращается пустой список
        assert result == []
    
    @pytest.mark.asyncio
    async def test_get_today_pickups_success(self, dashboard_repo, mock_db):
        """Тест успешного получения резервов на сегодня."""
        # Подготавливаем мок данные
        mock_result = MagicMock()
        # репозиторий вызывает result.unique().scalars().all() — замыкаем unique на себя
        mock_result.unique.return_value = mock_result
        mock_scalars = [MagicMock(), MagicMock()]
        mock_result.scalars.return_value.all.return_value = mock_scalars
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        today = date.today()
        result = await dashboard_repo.get_today_pickups(today)
        
        # Проверяем результат
        assert len(result) == 2
        assert result == mock_scalars
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_today_returns_success(self, dashboard_repo, mock_db):
        """Тест успешного получения аренд на возврат сегодня."""
        # Подготавливаем мок данные
        mock_result = MagicMock()
        mock_result.unique.return_value = mock_result
        mock_scalars = [MagicMock()]
        mock_result.scalars.return_value.all.return_value = mock_scalars
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        today = date.today()
        result = await dashboard_repo.get_today_returns(today)
        
        # Проверяем результат
        assert len(result) == 1
        assert result == mock_scalars
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_overdue_rentals_success(self, dashboard_repo, mock_db):
        """Тест успешного получения просроченных аренд."""
        # Подготавливаем мок данные
        mock_result = MagicMock()
        mock_result.unique.return_value = mock_result
        mock_scalars = [MagicMock(), MagicMock(), MagicMock()]
        mock_result.scalars.return_value.all.return_value = mock_scalars
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        today = date.today()
        result = await dashboard_repo.get_overdue_rentals(today)
        
        # Проверяем результат
        assert len(result) == 3
        assert result == mock_scalars
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_today_pickups_exception(self, dashboard_repo, mock_db):
        """Тест обработки исключения при получении резервов на сегодня."""
        # Настраиваем мок для выброса исключения
        mock_db.execute.side_effect = Exception("Database error")
        
        # Выполняем тест
        today = date.today()
        result = await dashboard_repo.get_today_pickups(today)
        
        # Проверяем, что возвращается пустой список
        assert result == []
    
    @pytest.mark.asyncio
    async def test_get_today_returns_exception(self, dashboard_repo, mock_db):
        """Тест обработки исключения при получении аренд на возврат сегодня."""
        # Настраиваем мок для выброса исключения
        mock_db.execute.side_effect = Exception("Database error")
        
        # Выполняем тест
        today = date.today()
        result = await dashboard_repo.get_today_returns(today)
        
        # Проверяем, что возвращается пустой список
        assert result == []
    
    @pytest.mark.asyncio
    async def test_get_overdue_rentals_exception(self, dashboard_repo, mock_db):
        """Тест обработки исключения при получении просроченных аренд."""
        # Настраиваем мок для выброса исключения
        mock_db.execute.side_effect = Exception("Database error")
        
        # Выполняем тест
        today = date.today()
        result = await dashboard_repo.get_overdue_rentals(today)
        
        # Проверяем, что возвращается пустой список
        assert result == []
