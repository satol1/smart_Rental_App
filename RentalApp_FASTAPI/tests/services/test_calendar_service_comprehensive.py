"""
Комплексные тесты для CalendarService
Покрывает все методы и сценарии использования
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from datetime import date, datetime

from api.services.calendar_service import CalendarService
from api.models.user import User
from api.models.equipment import Equipment
from api.models.reservation import Reservation
from api.models.rental import Rental
from shared.schemas.calendar_schema import PublicOrderDetails, PublicOrderDetailsResponse
from shared.schemas.reservation_schema import AdminReservationOut
from shared.schemas.rental_schema import RentalOut as AdminRentalOut


class TestCalendarServiceComprehensive:
    """Комплексные тесты для CalendarService"""

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def mock_calendar_repo(self):
        """Мок репозитория календаря"""
        return AsyncMock()

    @pytest.fixture
    def calendar_service(self, mock_db_session, mock_calendar_repo):
        """Экземпляр CalendarService с мокированной сессией"""
        return CalendarService(mock_db_session, calendar_repo=mock_calendar_repo)

    @pytest.fixture
    def test_user(self):
        """Тестовый пользователь"""
        user = User()
        user.id = 1
        user.email = "test@example.com"
        user.full_name = "Test User"
        user.role = "user"
        user.is_active = True
        user.balance = 1000.0
        user.privacy_policy_accepted = True
        user.terms_accepted = True
        user.email_verified = True
        user.created_at = datetime.now()
        return user

    @pytest.fixture
    def admin_user(self):
        """Тестовый админ"""
        user = User()
        user.id = 2
        user.email = "admin@example.com"
        user.full_name = "Admin User"
        user.role = "admin"
        user.is_active = True
        user.balance = 0.0
        user.privacy_policy_accepted = True
        user.terms_accepted = True
        user.email_verified = True
        user.created_at = datetime.now()
        return user

    @pytest.fixture
    def test_equipment(self):
        """Тестовое оборудование"""
        equipment = Equipment()
        equipment.id = 1
        equipment.name = "Test Equipment"
        equipment.equipment_type = "camera"
        equipment.brand = "Test Brand"
        equipment.is_active = True
        equipment.daily_rate = 100.0  # Добавляем обязательное поле
        equipment.serial_number = "SN001"
        equipment.condition = "excellent"
        equipment.notes = "Test notes"
        equipment.description = "Test description"
        equipment.last_maintenance = "2024-01-01"
        equipment.image_url = "test.jpg"
        equipment.image_urls = ["test1.jpg", "test2.jpg"]
        equipment.short_description = "Test short description"
        equipment.accessories = []
        equipment.associations = []
        return equipment

    @pytest.fixture
    def test_reservation(self, test_user, test_equipment):
        """Тестовый резерв"""
        reservation = Reservation()
        reservation.id = 1
        reservation.user_id = test_user.id
        reservation.start_date = date(2024, 1, 1)
        reservation.end_date = date(2024, 1, 5)
        reservation.status = "active"  # Изменено с "confirmed" на "active"
        reservation.equipment = [test_equipment]
        reservation.user = test_user
        reservation.total_cost = 500.0
        reservation.discount_amount = 0.0
        reservation.final_cost = 500.0
        reservation.accessories_cost = 0.0
        reservation.remaining_amount = 500.0
        reservation.accessory_links = []
        reservation.rental_id = None
        return reservation

    @pytest.fixture
    def test_rental(self, test_user, test_equipment):
        """Тестовая аренда"""
        rental = Rental()
        rental.id = 1
        rental.user_id = test_user.id
        rental.start_date = date(2024, 1, 1)
        rental.end_date = date(2024, 1, 5)
        rental.status = "active"
        rental.equipment = [test_equipment]
        rental.user = test_user
        rental.total_cost = 500.0
        rental.discount_amount = 0.0
        rental.final_cost = 500.0
        rental.accessories_cost = 0.0
        rental.remaining_amount = 500.0
        rental.accessory_links = []
        
        # Добавляем поля, необходимые для RentalOut
        rental.created_by_id = 1
        rental.created_by = test_user
        rental.reservation_id = None
        rental.actual_return_date = None
        rental.prepayment_amount = 0.0
        rental.deposit_amount = 0.0
        rental.notes_on_issue = None
        rental.notes_on_return = None
        rental.created_at = datetime.now()
        rental.updated_at = datetime.now()
        rental.days_remaining = None
        rental.overdue_days = None
        rental.overdue_surcharge = None
        
        return rental

    # Тесты для get_order_details
    @pytest.mark.asyncio
    async def test_get_order_details_reservation_success(self, calendar_service, mock_calendar_repo, test_reservation, test_user):
        """Тест успешного получения деталей резерва"""
        # Настраиваем мок репозитория для возврата реального объекта резерва
        mock_calendar_repo.get_reservation_details.return_value = test_reservation

        # Вызываем метод
        result = await calendar_service.get_order_details("reservation", 1, test_user)

        # Проверяем результат
        assert isinstance(result, PublicOrderDetailsResponse)
        assert result.is_owner is True
        assert result.has_extended_access is True
        assert isinstance(result.order, AdminReservationOut)

    @pytest.mark.asyncio
    async def test_get_order_details_rental_success(self, calendar_service, mock_calendar_repo, test_rental, test_user):
        """Тест успешного получения деталей аренды"""
        # Настраиваем мок репозитория
        mock_calendar_repo.get_rental_details.return_value = test_rental

        # Вызываем метод
        result = await calendar_service.get_order_details("rental", 1, test_user)

        # Проверяем результат
        assert isinstance(result, PublicOrderDetailsResponse)
        assert result.is_owner is True
        assert result.has_extended_access is True
        assert isinstance(result.order, AdminRentalOut)

    @pytest.mark.asyncio
    async def test_get_order_details_invalid_type(self, calendar_service):
        """Тест недопустимого типа заказа"""
        with pytest.raises(HTTPException) as exc_info:
            await calendar_service.get_order_details("invalid_type", 1, None)
        
        assert exc_info.value.status_code == 400
        assert "Недопустимый тип заказа" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_order_details_reservation_not_found(self, calendar_service, mock_calendar_repo):
        """Тест резерва не найден"""
        # Настраиваем мок для возврата None
        mock_calendar_repo.get_reservation_details.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await calendar_service.get_order_details("reservation", 999, None)
        
        assert exc_info.value.status_code == 404
        assert "Резерв не найден" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_order_details_rental_not_found(self, calendar_service, mock_calendar_repo):
        """Тест аренды не найдена"""
        # Настраиваем мок для возврата None
        mock_calendar_repo.get_rental_details.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await calendar_service.get_order_details("rental", 999, None)
        
        assert exc_info.value.status_code == 404
        assert "Аренда не найдена" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_order_details_public_access_reservation(self, calendar_service, mock_calendar_repo, test_reservation):
        """Тест публичного доступа к резерву (неавторизованный пользователь)"""
        # Настраиваем мок репозитория
        mock_calendar_repo.get_reservation_details.return_value = test_reservation

        # Вызываем без пользователя
        result = await calendar_service.get_order_details("reservation", 1, None)

        # Проверяем результат
        assert isinstance(result, PublicOrderDetailsResponse)
        assert result.is_owner is False
        assert result.has_extended_access is False
        assert isinstance(result.order, PublicOrderDetails)
        assert result.order.id == 1
        assert result.order.order_type == "reservation"

    @pytest.mark.asyncio
    async def test_get_order_details_public_access_rental(self, calendar_service, mock_calendar_repo, test_rental):
        """Тест публичного доступа к аренде (неавторизованный пользователь)"""
        # Настраиваем мок репозитория
        mock_calendar_repo.get_rental_details.return_value = test_rental

        # Вызываем без пользователя
        result = await calendar_service.get_order_details("rental", 1, None)

        # Проверяем результат
        assert isinstance(result, PublicOrderDetailsResponse)
        assert result.is_owner is False
        assert result.has_extended_access is False
        assert isinstance(result.order, PublicOrderDetails)
        assert result.order.id == 1
        assert result.order.order_type == "rental"

    @pytest.mark.asyncio
    async def test_get_order_details_admin_access(self, calendar_service, mock_calendar_repo, test_reservation, admin_user):
        """Тест доступа админа к резерву другого пользователя"""
        # Настраиваем мок репозитория
        mock_calendar_repo.get_reservation_details.return_value = test_reservation

        # Вызываем с админом
        result = await calendar_service.get_order_details("reservation", 1, admin_user)

        # Проверяем результат
        assert isinstance(result, PublicOrderDetailsResponse)
        assert result.is_owner is False  # Админ не владелец
        assert result.has_extended_access is True  # Но имеет расширенный доступ
        assert isinstance(result.order, AdminReservationOut)

    @pytest.mark.asyncio
    async def test_get_order_details_database_error(self, calendar_service, mock_calendar_repo):
        """Тест ошибки базы данных"""
        # Настраиваем мок для выброса исключения
        mock_calendar_repo.get_reservation_details.side_effect = Exception("Database connection error")

        with pytest.raises(HTTPException) as exc_info:
            await calendar_service.get_order_details("reservation", 1, None)
        
        assert exc_info.value.status_code == 500
        assert "Ошибка при получении данных заказа" in exc_info.value.detail

    # Тесты для _get_reservation_details
    @pytest.mark.asyncio
    async def test_get_reservation_details_owner_access(self, calendar_service, mock_calendar_repo, test_reservation, test_user):
        """Тест получения деталей резерва владельцем"""
        # Настраиваем мок репозитория
        mock_calendar_repo.get_reservation_details.return_value = test_reservation

        result = await calendar_service._get_reservation_details(1, test_user)

        assert isinstance(result, PublicOrderDetailsResponse)
        assert result.is_owner is True
        assert result.has_extended_access is True
        assert isinstance(result.order, AdminReservationOut)

    @pytest.mark.asyncio
    async def test_get_reservation_details_public_access(self, calendar_service, mock_calendar_repo, test_reservation):
        """Тест получения деталей резерва публичным доступом"""
        # Настраиваем мок репозитория
        mock_calendar_repo.get_reservation_details.return_value = test_reservation

        result = await calendar_service._get_reservation_details(1, None)

        assert isinstance(result, PublicOrderDetailsResponse)
        assert result.is_owner is False
        assert result.has_extended_access is False
        assert isinstance(result.order, PublicOrderDetails)
        assert result.order.equipment_name == "Test Equipment"
        assert result.order.equipment_type == "camera"
        assert result.order.equipment_brand == "Test Brand"

    @pytest.mark.asyncio
    async def test_get_reservation_details_no_equipment(self, calendar_service, mock_calendar_repo, test_user):
        """Тест резерва без оборудования"""
        reservation = Reservation()
        reservation.id = 1
        reservation.user_id = test_user.id
        reservation.start_date = date(2024, 1, 1)
        reservation.end_date = date(2024, 1, 5)
        reservation.status = "active"
        reservation.equipment = []  # Нет оборудования
        reservation.user = test_user
        reservation.total_cost = 0.0
        reservation.discount_amount = 0.0
        reservation.final_cost = 0.0
        reservation.accessories_cost = 0.0
        reservation.remaining_amount = 0.0
        reservation.accessory_links = []
        reservation.rental_id = None

        # Настраиваем мок репозитория
        mock_calendar_repo.get_reservation_details.return_value = reservation

        result = await calendar_service._get_reservation_details(1, None)

        assert isinstance(result, PublicOrderDetailsResponse)
        assert result.order.equipment_id is None
        assert result.order.equipment_name is None
        assert result.order.equipment_type is None
        assert result.order.equipment_brand is None

    # Тесты для _get_rental_details
    @pytest.mark.asyncio
    async def test_get_rental_details_owner_access(self, calendar_service, mock_calendar_repo, test_rental, test_user):
        """Тест получения деталей аренды владельцем"""
        # Настраиваем мок репозитория
        mock_calendar_repo.get_rental_details.return_value = test_rental

        result = await calendar_service._get_rental_details(1, test_user)

        assert isinstance(result, PublicOrderDetailsResponse)
        assert result.is_owner is True
        assert result.has_extended_access is True
        assert isinstance(result.order, AdminRentalOut)

    @pytest.mark.asyncio
    async def test_get_rental_details_public_access(self, calendar_service, mock_calendar_repo, test_rental):
        """Тест получения деталей аренды публичным доступом"""
        # Настраиваем мок репозитория
        mock_calendar_repo.get_rental_details.return_value = test_rental

        result = await calendar_service._get_rental_details(1, None)

        assert isinstance(result, PublicOrderDetailsResponse)
        assert result.is_owner is False
        assert result.has_extended_access is False
        assert isinstance(result.order, PublicOrderDetails)
        assert result.order.equipment_name == "Test Equipment"
        assert result.order.equipment_type == "camera"
        assert result.order.equipment_brand == "Test Brand"

    @pytest.mark.asyncio
    async def test_get_rental_details_validation_error_fallback(self, calendar_service, mock_calendar_repo, test_rental, test_user):
        """Тест fallback к публичным данным при ошибке валидации"""
        # Настраиваем мок репозитория
        mock_calendar_repo.get_rental_details.return_value = test_rental

        # Мокаем ошибку валидации
        with patch.object(AdminRentalOut, 'model_validate', side_effect=Exception("Validation error")):
            result = await calendar_service._get_rental_details(1, test_user)

        # Должен вернуться fallback к публичным данным
        assert isinstance(result, PublicOrderDetailsResponse)
        assert result.is_owner is True
        assert result.has_extended_access is True
        assert isinstance(result.order, PublicOrderDetails)

    # Тесты для _get_equipment_by_id
    @pytest.mark.asyncio
    async def test_get_equipment_by_id_success(self, calendar_service, mock_calendar_repo, test_equipment):
        """Тест успешного получения оборудования по ID"""
        # Настраиваем мок репозитория
        mock_calendar_repo.get_equipment_by_id.return_value = test_equipment

        result = await calendar_service._get_equipment_by_id(1)

        assert result == test_equipment
        assert result.id == 1
        assert result.name == "Test Equipment"

    @pytest.mark.asyncio
    async def test_get_equipment_by_id_not_found(self, calendar_service, mock_calendar_repo):
        """Тест получения оборудования по несуществующему ID"""
        # Настраиваем мок для возврата None
        mock_calendar_repo.get_equipment_by_id.return_value = None

        result = await calendar_service._get_equipment_by_id(999)

        assert result is None

    # Тесты для manager доступа
    @pytest.mark.asyncio
    async def test_get_order_details_manager_access(self, calendar_service, mock_calendar_repo, test_reservation):
        """Тест доступа менеджера к резерву"""
        manager_user = User()
        manager_user.id = 3
        manager_user.email = "manager@example.com"
        manager_user.role = "manager"
        manager_user.is_active = True

        # Настраиваем мок репозитория
        mock_calendar_repo.get_reservation_details.return_value = test_reservation

        result = await calendar_service.get_order_details("reservation", 1, manager_user)

        assert isinstance(result, PublicOrderDetailsResponse)
        assert result.is_owner is False
        assert result.has_extended_access is True  # Менеджер имеет расширенный доступ
        assert isinstance(result.order, AdminReservationOut)

    # Тесты для обработки исключений
    @pytest.mark.asyncio
    async def test_get_reservation_details_exception_handling(self, calendar_service, mock_calendar_repo):
        """Тест обработки исключений в _get_reservation_details"""
        # Настраиваем мок для выброса исключения
        mock_calendar_repo.get_reservation_details.side_effect = Exception("Database error")

        with pytest.raises(Exception) as exc_info:
            await calendar_service._get_reservation_details(1, None)
        
        assert "Database error" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_rental_details_exception_handling(self, calendar_service, mock_calendar_repo):
        """Тест обработки исключений в _get_rental_details"""
        # Настраиваем мок для выброса исключения
        mock_calendar_repo.get_rental_details.side_effect = Exception("Database error")

        with pytest.raises(Exception) as exc_info:
            await calendar_service._get_rental_details(1, None)
        
        assert "Database error" in str(exc_info.value)
