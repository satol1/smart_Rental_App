# tests/e2e/test_holiday_auto_extension_e2e.py
"""
E2E тесты для автоматического продления при добавлении выходных дней.
"""

import pytest
from datetime import date, timedelta
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from api.services.holiday_service import HolidayService
from api.services.notification_service import NotificationService
from api.repositories.holiday_repository import HolidayRepository
from api.repositories.rental_repository import RentalRepository
from api.repositories.reservation_repository import ReservationRepository
from api.models.user import User
from api.models.rental import Rental
from api.models.reservation import Reservation
from api.models.equipment import Equipment
from shared.schemas.holiday_schema import HolidayCreate
from shared.constants.order_status import OrderStatus


class TestHolidayAutoExtensionE2E:
    """E2E тесты для автоматического продления при добавлении выходных дней"""

    @pytest.mark.asyncio
    async def test_full_auto_extension_scenario(
        self,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_equipment_list: List[Equipment]
    ):
        """Полный E2E тест сценария автоматического продления"""
        # Arrange
        holiday_date = date.today() + timedelta(days=5)
        next_working_day = holiday_date + timedelta(days=1)
        
        # Создаем аренду, которая заканчивается в день нового выходного
        rental = Rental(
            user_id=e2e_test_user.id,
            created_by_id=e2e_test_user.id,  # Добавляем обязательное поле
            start_date=date.today(),
            end_date=holiday_date,
            status=OrderStatus.ACTIVE,
            total_cost=1000.0,
            deposit_amount=500.0,
            prepayment_amount=0.0
        )
        e2e_db_session.add(rental)

        # Создаем резерв, который заканчивается в день нового выходного
        reservation = Reservation(
            user_id=e2e_test_user.id,
            start_date=date.today() + timedelta(days=1),
            end_date=holiday_date,
            status=OrderStatus.ACTIVE,
            total_cost=1200.0
        )
        e2e_db_session.add(reservation)

        await e2e_db_session.commit()
        await e2e_db_session.refresh(rental)
        await e2e_db_session.refresh(reservation)
        
        # Создаем сервисы
        holiday_repo = HolidayRepository(e2e_db_session)
        rental_repo = RentalRepository(e2e_db_session)
        reservation_repo = ReservationRepository(e2e_db_session)
        notification_service = NotificationService(e2e_db_session)
        holiday_service = HolidayService(
            e2e_db_session,
            holiday_repo,
            rental_repo,
            reservation_repo,
            notification_service
        )
        
        # Act
        holiday_create = HolidayCreate(
            date=holiday_date,
            description="Test holiday for auto extension",
            force=True
        )
        
        result = await holiday_service.create_single_holiday(holiday_create, e2e_test_user)
        
        # Assert
        assert "message" in result
        assert "auto_extension" in result
        assert result["auto_extension"]["message"] == "Автоматически продлено 1 аренд и 1 резервов"
        assert result["auto_extension"]["next_working_day"] == next_working_day
        assert len(result["auto_extension"]["extended_rentals"]) == 1
        assert len(result["auto_extension"]["extended_reservations"]) == 1
        
        # Проверяем, что аренда была продлена
        await e2e_db_session.refresh(rental)
        assert rental.end_date == next_working_day

        # Проверяем, что резерв был продлен
        await e2e_db_session.refresh(reservation)
        assert reservation.end_date == next_working_day

        # Проверяем, что выходной день был создан
        created_holiday = await holiday_repo.find_holiday_by_date(holiday_date)
        assert created_holiday is not None
        assert created_holiday.date == holiday_date
        assert created_holiday.description == "Test holiday for auto extension"

    @pytest.mark.asyncio
    async def test_auto_extension_with_multiple_orders(
        self,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_equipment_list: List[Equipment]
    ):
        """E2E тест с множественными заказами"""
        # Arrange
        holiday_date = date.today() + timedelta(days=5)
        next_working_day = holiday_date + timedelta(days=1)
        
        # Создаем несколько аренд, которые заканчиваются в день нового выходного
        rentals = []
        for i in range(3):
            rental = Rental(
                user_id=e2e_test_user.id,
                created_by_id=e2e_test_user.id,  # Добавляем обязательное поле
                start_date=date.today() + timedelta(days=i),
                end_date=holiday_date,
                status=OrderStatus.ACTIVE,
                total_cost=1000.0 + i * 100,
                deposit_amount=500.0,
                prepayment_amount=0.0
            )
            e2e_db_session.add(rental)
            rentals.append(rental)
        
        # Создаем несколько резервов, которые заканчиваются в день нового выходного
        reservations = []
        for i in range(2):
            reservation = Reservation(
                user_id=e2e_test_user.id,
                start_date=date.today() + timedelta(days=i + 1),
                end_date=holiday_date,
                status=OrderStatus.ACTIVE,
                total_cost=1200.0 + i * 100
            )
            e2e_db_session.add(reservation)
            reservations.append(reservation)
        
        await e2e_db_session.commit()
        for rental in rentals:
            await e2e_db_session.refresh(rental)
        for reservation in reservations:
            await e2e_db_session.refresh(reservation)
        
        # Создаем сервисы
        holiday_repo = HolidayRepository(e2e_db_session)
        rental_repo = RentalRepository(e2e_db_session)
        reservation_repo = ReservationRepository(e2e_db_session)
        notification_service = NotificationService(e2e_db_session)
        holiday_service = HolidayService(
            e2e_db_session,
            holiday_repo,
            rental_repo,
            reservation_repo,
            notification_service
        )
        
        # Act
        holiday_create = HolidayCreate(
            date=holiday_date,
            description="Test holiday for multiple auto extensions",
            force=True
        )
        
        result = await holiday_service.create_single_holiday(holiday_create, e2e_test_user)
        
        # Assert
        assert result["auto_extension"]["message"] == "Автоматически продлено 3 аренд и 2 резервов"
        assert len(result["auto_extension"]["extended_rentals"]) == 3
        assert len(result["auto_extension"]["extended_reservations"]) == 2
        
        # Проверяем, что все аренды были продлены
        for rental in rentals:
            await e2e_db_session.refresh(rental)
            assert rental.end_date == next_working_day
        
        # Проверяем, что все резервы были продлены
        for reservation in reservations:
            await e2e_db_session.refresh(reservation)
            assert reservation.end_date == next_working_day

    @pytest.mark.asyncio
    async def test_auto_extension_no_conflicts(
        self,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_equipment_list: List[Equipment]
    ):
        """E2E тест без конфликтов"""
        # Arrange
        holiday_date = date.today() + timedelta(days=5)
        
        # Создаем аренду, которая НЕ заканчивается в день нового выходного
        rental = Rental(
            user_id=e2e_test_user.id,
            created_by_id=e2e_test_user.id,  # Добавляем обязательное поле
            start_date=date.today(),
            end_date=holiday_date + timedelta(days=1),  # Заканчивается на день позже
            status=OrderStatus.ACTIVE,
            total_cost=1000.0,
            deposit_amount=500.0,
            prepayment_amount=0.0
        )
        e2e_db_session.add(rental)
        await e2e_db_session.commit()
        await e2e_db_session.refresh(rental)
        
        # Создаем сервисы
        holiday_repo = HolidayRepository(e2e_db_session)
        rental_repo = RentalRepository(e2e_db_session)
        reservation_repo = ReservationRepository(e2e_db_session)
        notification_service = NotificationService(e2e_db_session)
        holiday_service = HolidayService(
            e2e_db_session,
            holiday_repo,
            rental_repo,
            reservation_repo,
            notification_service
        )
        
        # Act
        holiday_create = HolidayCreate(
            date=holiday_date,
            description="Test holiday without conflicts",
            force=True
        )
        
        result = await holiday_service.create_single_holiday(holiday_create, e2e_test_user)
        
        # Assert
        assert result["auto_extension"]["message"] == "Автоматически продлено 0 аренд и 0 резервов"
        assert len(result["auto_extension"]["extended_rentals"]) == 0
        assert len(result["auto_extension"]["extended_reservations"]) == 0
        
        # Проверяем, что аренда НЕ была изменена
        await e2e_db_session.refresh(rental)
        assert rental.end_date == holiday_date + timedelta(days=1)  # Осталась прежней
        
        # Проверяем, что выходной день был создан
        created_holiday = await holiday_repo.find_holiday_by_date(holiday_date)
        assert created_holiday is not None

    @pytest.mark.asyncio
    async def test_auto_extension_with_force_flag(
        self,
        e2e_db_session: AsyncSession,
        e2e_test_user: User,
        e2e_test_equipment_list: List[Equipment]
    ):
        """E2E тест с принудительным созданием выходного дня"""
        # Arrange
        holiday_date = date.today() + timedelta(days=5)
        next_working_day = holiday_date + timedelta(days=1)
        
        # Создаем резерв, который начинается в день нового выходного
        reservation = Reservation(
            user_id=e2e_test_user.id,
            start_date=holiday_date,  # Начинается в день выходного
            end_date=holiday_date + timedelta(days=3),
            status=OrderStatus.ACTIVE,
            total_cost=1200.0
        )
        e2e_db_session.add(reservation)
        await e2e_db_session.commit()
        await e2e_db_session.refresh(reservation)
        
        # Создаем сервисы
        holiday_repo = HolidayRepository(e2e_db_session)
        rental_repo = RentalRepository(e2e_db_session)
        reservation_repo = ReservationRepository(e2e_db_session)
        notification_service = NotificationService(e2e_db_session)
        holiday_service = HolidayService(
            e2e_db_session,
            holiday_repo,
            rental_repo,
            reservation_repo,
            notification_service
        )
        
        # Act - создаем выходной с флагом force
        holiday_create = HolidayCreate(
            date=holiday_date,
            description="Test holiday with force flag",
            force=True
        )
        
        result = await holiday_service.create_single_holiday(holiday_create, e2e_test_user)
        
        # Assert
        # Выходной день должен быть создан, несмотря на конфликт
        assert "message" in result
        assert "auto_extension" in result
        
        # Проверяем, что выходной день был создан
        created_holiday = await holiday_repo.find_holiday_by_date(holiday_date)
        assert created_holiday is not None
        assert created_holiday.date == holiday_date
        assert created_holiday.description == "Test holiday with force flag"
