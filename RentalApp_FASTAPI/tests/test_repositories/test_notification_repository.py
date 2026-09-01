# tests/test_repositories/test_notification_repository.py

import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.notification_repository import NotificationRepository
from api.models.user import User
from api.models.rental import Rental
from api.models.reservation import Reservation


class TestNotificationRepository:
    """Тесты для NotificationRepository."""
    
    @pytest.fixture
    def mock_db(self):
        """Создает мок сессии базы данных."""
        return AsyncMock(spec=AsyncSession)
    
    @pytest.fixture
    def notification_repo(self, mock_db):
        """Создает экземпляр NotificationRepository с мок сессией."""
        return NotificationRepository(mock_db)
    
    @pytest.mark.asyncio
    async def test_get_user_by_id_success(self, notification_repo, mock_db):
        """Тест успешного получения пользователя по ID."""
        # Подготавливаем мок данные
        mock_user = MagicMock(spec=User)
        mock_user.id = 1
        mock_user.full_name = "Test User"
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        result = await notification_repo.get_user_by_id(1)
        
        # Проверяем результат
        assert result == mock_user
        assert result.id == 1
        assert result.full_name == "Test User"
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_user_by_id_not_found(self, notification_repo, mock_db):
        """Тест получения несуществующего пользователя."""
        # Подготавливаем мок данные
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        result = await notification_repo.get_user_by_id(999)
        
        # Проверяем результат
        assert result is None
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_user_by_id_exception(self, notification_repo, mock_db):
        """Тест обработки исключения при получении пользователя."""
        # Настраиваем мок для выброса исключения
        mock_db.execute.side_effect = Exception("Database error")
        
        # Выполняем тест
        result = await notification_repo.get_user_by_id(1)
        
        # Проверяем, что возвращается None
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_rental_by_id_success(self, notification_repo, mock_db):
        """Тест успешного получения аренды по ID."""
        # Подготавливаем мок данные
        mock_rental = MagicMock(spec=Rental)
        mock_rental.id = 1
        mock_rental.user_id = 1
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_rental
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        result = await notification_repo.get_rental_by_id(1)
        
        # Проверяем результат
        assert result == mock_rental
        assert result.id == 1
        assert result.user_id == 1
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_rental_by_id_not_found(self, notification_repo, mock_db):
        """Тест получения несуществующей аренды."""
        # Подготавливаем мок данные
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        result = await notification_repo.get_rental_by_id(999)
        
        # Проверяем результат
        assert result is None
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_rental_by_id_exception(self, notification_repo, mock_db):
        """Тест обработки исключения при получении аренды."""
        # Настраиваем мок для выброса исключения
        mock_db.execute.side_effect = Exception("Database error")
        
        # Выполняем тест
        result = await notification_repo.get_rental_by_id(1)
        
        # Проверяем, что возвращается None
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_reservation_by_id_success(self, notification_repo, mock_db):
        """Тест успешного получения резерва по ID."""
        # Подготавливаем мок данные
        mock_reservation = MagicMock(spec=Reservation)
        mock_reservation.id = 1
        mock_reservation.user_id = 1
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_reservation
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        result = await notification_repo.get_reservation_by_id(1)
        
        # Проверяем результат
        assert result == mock_reservation
        assert result.id == 1
        assert result.user_id == 1
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_reservation_by_id_not_found(self, notification_repo, mock_db):
        """Тест получения несуществующего резерва."""
        # Подготавливаем мок данные
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # Выполняем тест
        result = await notification_repo.get_reservation_by_id(999)
        
        # Проверяем результат
        assert result is None
        
        # Проверяем, что был вызван execute
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_reservation_by_id_exception(self, notification_repo, mock_db):
        """Тест обработки исключения при получении резерва."""
        # Настраиваем мок для выброса исключения
        mock_db.execute.side_effect = Exception("Database error")
        
        # Выполняем тест
        result = await notification_repo.get_reservation_by_id(1)
        
        # Проверяем, что возвращается None
        assert result is None
