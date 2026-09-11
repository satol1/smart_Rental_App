# tests/repositories/test_pagination_total_correctness.py
"""
Регрессионный тест этапа 2.3 аудита (верный total в пагинации).

Проверяет на реальной БД (in-memory SQLite), что total в пагинации не завышается
из-за eager-загрузки коллекций аксессуаров: заказ с 3 аксессуарами должен давать
total=1, а не 3. Count-запрос строится от базового select без eager-опций,
коллекции грузятся через selectinload (без декартова произведения).
"""

import pytest
from datetime import date

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from api.database_models import Base
from api.models.accessory import Accessory
from api.models.equipment import Equipment
from api.models.rental import Rental, RentalAccessory, rental_equipment_association
from api.models.reservation import (
    Reservation,
    ReservationAccessory,
    reservation_equipment_association,
)
from api.models.user import User
from api.repositories.rental_query_repository import RentalQueryRepository
from api.repositories.reservation_filter_repository import ReservationFilterRepository
from shared.constants.order_status import OrderStatus
from shared.services.period_service import PeriodService


@pytest.fixture
async def db_session():
    """Создает реальную in-memory БД со всей схемой моделей."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        yield session
    await engine.dispose()


async def _seed_user_equipment_accessories(session) -> tuple[User, Equipment, list[Accessory]]:
    user = User(email="total-test@example.com", hashed_password="x", full_name="Total Test")
    equipment = Equipment(name="Camera", brand="Brand", equipment_type="photo")
    session.add_all([user, equipment])
    await session.flush()

    accessories = [
        Accessory(name=f"acc-{i}", accessory_type="Прочее", price=10.0) for i in range(3)
    ]
    session.add_all(accessories)
    await session.flush()
    return user, equipment, accessories


class TestRentalPaginationTotal:
    """Аренда с 3 аксессуарами должна давать total=1 (не 3)."""

    async def test_admin_total_with_three_accessories(self, db_session):
        user, equipment, accessories = await _seed_user_equipment_accessories(db_session)

        rental = Rental(
            user_id=user.id,
            created_by_id=user.id,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 5),
            status=OrderStatus.ACTIVE,
            total_cost=100,
            deposit_amount=0,
        )
        db_session.add(rental)
        await db_session.flush()
        await db_session.execute(
            insert(rental_equipment_association).values(rental_id=rental.id, equipment_id=equipment.id)
        )
        for accessory in accessories:
            db_session.add(
                RentalAccessory(
                    rental_id=rental.id, equipment_id=equipment.id, accessory_id=accessory.id
                )
            )
        await db_session.flush()

        repo = RentalQueryRepository(db_session, PeriodService())
        items, total = await repo.get_paginated_for_admin(skip=0, limit=10)

        assert total == 1, "3 аксессуара не должны завышать total (ожидание этапа 2.3)"
        assert len(items) == 1
        assert len(items[0].accessory_links) == 3, "accessory_links должны быть загружены (selectinload)"
        assert len(items[0].equipment) == 1

    async def test_user_total_with_three_accessories(self, db_session):
        user, equipment, accessories = await _seed_user_equipment_accessories(db_session)

        rental = Rental(
            user_id=user.id,
            created_by_id=user.id,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 5),
            status=OrderStatus.ACTIVE,
            total_cost=100,
            deposit_amount=0,
        )
        db_session.add(rental)
        await db_session.flush()
        await db_session.execute(
            insert(rental_equipment_association).values(rental_id=rental.id, equipment_id=equipment.id)
        )
        for accessory in accessories:
            db_session.add(
                RentalAccessory(
                    rental_id=rental.id, equipment_id=equipment.id, accessory_id=accessory.id
                )
            )
        await db_session.flush()

        repo = RentalQueryRepository(db_session, PeriodService())
        items, total = await repo.get_paginated_for_user(user_id=user.id, skip=0, limit=10)

        assert total == 1, "3 аксессуара не должны завышать total (ожидание этапа 2.3)"
        assert len(items) == 1
        assert len(items[0].accessory_links) == 3


class TestReservationPaginationTotal:
    """Резерв с 3 аксессуарами должен давать total=1 (не 3)."""

    async def test_admin_total_with_three_accessories(self, db_session):
        user, equipment, accessories = await _seed_user_equipment_accessories(db_session)

        reservation = Reservation(
            user_id=user.id,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 5),
            status=OrderStatus.ACTIVE,
            total_cost=100,
            discount_amount=0,
        )
        db_session.add(reservation)
        await db_session.flush()
        await db_session.execute(
            insert(reservation_equipment_association).values(
                reservation_id=reservation.id, equipment_id=equipment.id
            )
        )
        for accessory in accessories:
            db_session.add(
                ReservationAccessory(
                    reservation_id=reservation.id,
                    equipment_id=equipment.id,
                    accessory_id=accessory.id,
                )
            )
        await db_session.flush()

        repo = ReservationFilterRepository(db_session, PeriodService())
        items, total = await repo.get_paginated_for_admin(skip=0, limit=10)

        assert total == 1, "3 аксессуара не должны завышать total (ожидание этапа 2.3)"
        assert len(items) == 1
        assert len(items[0].accessory_links) == 3, "accessory_links должны быть загружены (selectinload)"
        assert len(items[0].equipment) == 1

    async def test_user_total_with_three_accessories(self, db_session):
        user, equipment, accessories = await _seed_user_equipment_accessories(db_session)

        reservation = Reservation(
            user_id=user.id,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 5),
            status=OrderStatus.ACTIVE,
            total_cost=100,
            discount_amount=0,
        )
        db_session.add(reservation)
        await db_session.flush()
        await db_session.execute(
            insert(reservation_equipment_association).values(
                reservation_id=reservation.id, equipment_id=equipment.id
            )
        )
        for accessory in accessories:
            db_session.add(
                ReservationAccessory(
                    reservation_id=reservation.id,
                    equipment_id=equipment.id,
                    accessory_id=accessory.id,
                )
            )
        await db_session.flush()

        repo = ReservationFilterRepository(db_session, PeriodService())
        items, total = await repo.get_paginated_for_user(user_id=user.id, skip=0, limit=10)

        assert total == 1, "3 аксессуара не должны завышать total (ожидание этапа 2.3)"
        assert len(items) == 1
        assert len(items[0].accessory_links) == 3
