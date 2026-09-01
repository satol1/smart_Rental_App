# tests/test_repositories/test_calendar_repository.py

import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.calendar_repository import CalendarRepository
from api.models.reservation import Reservation
from api.models.rental import Rental
from api.models.equipment import Equipment as ApiEquipment


class TestCalendarRepository:
    """Тесты для CalendarRepository."""
    
    @pytest.fixture
    def mock_db(self):
        """Создает мок сессии базы данных."""
        return AsyncMock(spec=AsyncSession)
    
    @pytest.fixture
    def calendar_repo(self, mock_db):
        """Создает экземпляр CalendarRepository с мок сессией."""
        return CalendarRepository(mock_db)
    
    @pytest.mark.asyncio
    async def test_get_reservation_details_success(self, calendar_repo, mock_db):
        """Тест успешного получения деталей резерва."""
        # Подготавливаем мок данные
        mock_reservation = MagicMock(spec=Reservation)
        mock_reservation.id = 1
        mock_reservation.user_id = 1
        mock_reservation.equipment = [MagicMock()]
        mock_reservation.user = MagicMock()
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_reservation
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        result = await calendar_repo.get_reservation_details(1)
        
        # Проверяем результат
        assert result == mock_reservation
        assert result.id == 1
        assert result.user_id == 1
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_reservation_details_not_found(self, calendar_repo, mock_db):
        """Тест получения несуществующего резерва."""
        # Подготавливаем мок данные
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        result = await calendar_repo.get_reservation_details(999)
        
        # Проверяем результат
        assert result is None
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_reservation_details_exception(self, calendar_repo, mock_db):
        """Тест обработки исключения при получении резерва."""
        # Настраиваем мок для выброса исключения
        mock_db.execute.side_effect = Exception("Database error")
        
        # Выполняем тест
        result = await calendar_repo.get_reservation_details(1)
        
        # Проверяем, что возвращается None
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_rental_details_success(self, calendar_repo, mock_db):
        """Тест успешного получения деталей аренды."""
        # Подготавливаем мок данные
        mock_rental = MagicMock(spec=Rental)
        mock_rental.id = 1
        mock_rental.user_id = 1
        mock_rental.equipment = [MagicMock()]
        mock_rental.user = MagicMock()
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_rental
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        result = await calendar_repo.get_rental_details(1)
        
        # Проверяем результат
        assert result == mock_rental
        assert result.id == 1
        assert result.user_id == 1
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_rental_details_not_found(self, calendar_repo, mock_db):
        """Тест получения несуществующей аренды."""
        # Подготавливаем мок данные
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        result = await calendar_repo.get_rental_details(999)
        
        # Проверяем результат
        assert result is None
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_rental_details_exception(self, calendar_repo, mock_db):
        """Тест обработки исключения при получении аренды."""
        # Настраиваем мок для выброса исключения
        mock_db.execute.side_effect = Exception("Database error")
        
        # Выполняем тест
        result = await calendar_repo.get_rental_details(1)
        
        # Проверяем, что возвращается None
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_equipment_by_id_success(self, calendar_repo, mock_db):
        """Тест успешного получения оборудования по ID."""
        # Подготавливаем мок данные
        mock_equipment = MagicMock(spec=ApiEquipment)
        mock_equipment.id = 1
        mock_equipment.name = "Test Equipment"
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_equipment
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        result = await calendar_repo.get_equipment_by_id(1)
        
        # Проверяем результат
        assert result == mock_equipment
        assert result.id == 1
        assert result.name == "Test Equipment"
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_equipment_by_id_not_found(self, calendar_repo, mock_db):
        """Тест получения несуществующего оборудования."""
        # Подготавливаем мок данные
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        result = await calendar_repo.get_equipment_by_id(999)
        
        # Проверяем результат
        assert result is None
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_equipment_by_id_exception(self, calendar_repo, mock_db):
        """Тест обработки исключения при получении оборудования."""
        # Настраиваем мок для выброса исключения
        mock_db.execute.side_effect = Exception("Database error")
        
        # Выполняем тест
        result = await calendar_repo.get_equipment_by_id(1)
        
        # Проверяем, что возвращается None
        assert result is None
