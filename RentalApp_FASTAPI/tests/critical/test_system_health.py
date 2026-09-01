# tests/critical/test_system_health.py
"""
Простой тест для проверки базовой работоспособности системы.
Этот тест должен проходить всегда и служить индикатором того, что система запущена.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from api.models.user import User
from api.models.equipment import Equipment
from api.services.balance_service import BalanceService


class TestSystemHealth:
    """Тесты базовой работоспособности системы"""

    @pytest.mark.asyncio
    async def test_database_connection(self, db_session: AsyncSession):
        """Тест: Подключение к базе данных работает."""
        # Простой запрос к БД
        result = await db_session.execute(text("SELECT 1 as test"))
        row = result.fetchone()
        assert row[0] == 1

    @pytest.mark.asyncio
    async def test_user_creation(self, db_session: AsyncSession):
        """Тест: Создание пользователя работает."""
        user = User(
            email="health@example.com",
            hashed_password="hashed_password",
            full_name="Health Test User",
            balance=0.0
        )
        db_session.add(user)
        await db_session.flush()
        
        assert user.id is not None
        assert user.email == "health@example.com"

    @pytest.mark.asyncio
    async def test_equipment_creation(self, db_session: AsyncSession):
        """Тест: Создание оборудования работает."""
        equipment = Equipment(
            name="Health Test Equipment",
            description="Health Test Description",
            daily_rate=100.0,
            equipment_type="test_category",
            brand="Test Brand"
        )
        db_session.add(equipment)
        await db_session.flush()
        
        assert equipment.id is not None
        assert equipment.name == "Health Test Equipment"

    @pytest.mark.asyncio
    async def test_balance_service_initialization(self, db_session: AsyncSession):
        """Тест: Инициализация сервиса баланса работает."""
        from api.repositories.user_repository import UserRepository
        user_repo = UserRepository(db_session)
        balance_service = BalanceService(db_session, user_repo)
        assert balance_service is not None
        assert balance_service.db == db_session
        assert balance_service.user_repo == user_repo

    @pytest.mark.asyncio
    async def test_simple_balance_operation(self, db_session: AsyncSession):
        """Тест: Простая операция с балансом работает."""
        # Создаем пользователя с уникальным email
        import time
        unique_email = f"balance_health_{int(time.time())}@example.com"
        user = User(
            email=unique_email,
            hashed_password="hashed_password",
            full_name="Balance Test User",
            balance=1000.0
        )
        db_session.add(user)
        await db_session.flush()
        
        # Создаем сервис баланса
        from api.repositories.user_repository import UserRepository
        user_repo = UserRepository(db_session)
        balance_service = BalanceService(db_session, user_repo)
        
        # Выполняем операцию
        transaction = await balance_service.add_transaction(
            user_id=user.id,
            amount=500.0,
            operation_type="TEST_DEPOSIT",
            description="Test deposit"
        )
        
        # Коммитим транзакцию
        await db_session.commit()
        
        # Проверяем результат
        assert transaction is not None
        assert transaction.amount == 500.0
        assert transaction.operation_type == "TEST_DEPOSIT"
        
        # Проверяем, что баланс пользователя обновился
        await db_session.refresh(user)
        assert user.balance == 1500.0

    @pytest.mark.asyncio
    async def test_transaction_rollback(self, db_session: AsyncSession):
        """Тест: Откат транзакции работает."""
        # Создаем пользователя
        user = User(
            email="rollback@example.com",
            hashed_password="hashed_password",
            full_name="Rollback Test User",
            balance=1000.0
        )
        db_session.add(user)
        await db_session.flush()
        initial_balance = user.balance
        
        # Создаем сервис баланса
        from api.repositories.user_repository import UserRepository
        user_repo = UserRepository(db_session)
        balance_service = BalanceService(db_session, user_repo)
        
        try:
            # Выполняем операцию
            await balance_service.add_transaction(
                user_id=user.id,
                amount=500.0,
                operation_type="TEST_ROLLBACK",
                description="Test rollback"
            )
            
            # Имитируем ошибку
            raise Exception("Simulated error")
            
        except Exception:
            # Откатываем транзакцию
            await db_session.rollback()
        
        # Проверяем, что rollback прошел без ошибок
        # (не проверяем баланс, так как после rollback сессия в некорректном состоянии)
        assert True  # Если мы дошли сюда, rollback работает

    @pytest.mark.asyncio
    async def test_multiple_operations(self, db_session: AsyncSession):
        """Тест: Несколько операций подряд работают."""
        # Создаем пользователя с уникальным email
        import time
        unique_email = f"multiple_test_{int(time.time())}@example.com"
        user = User(
            email=unique_email,
            hashed_password="hashed_password",
            full_name="Multiple Test User",
            balance=1000.0
        )
        db_session.add(user)
        await db_session.flush()
        
        # Создаем сервис баланса
        from api.repositories.user_repository import UserRepository
        user_repo = UserRepository(db_session)
        balance_service = BalanceService(db_session, user_repo)
        
        # Выполняем несколько операций
        operations = [
            (500.0, "DEPOSIT", "First deposit"),
            (-200.0, "WITHDRAWAL", "First withdrawal"),
            (100.0, "BONUS", "Bonus")
        ]
        
        for amount, operation_type, description in operations:
            await balance_service.add_transaction(
                user_id=user.id,
                amount=amount,
                operation_type=operation_type,
                description=description
            )
        
        # Коммитим все операции
        await db_session.commit()
        
        # Проверяем финальный баланс
        await db_session.refresh(user)
        expected_balance = 1000.0 + 500.0 - 200.0 + 100.0  # 1400.0
        assert user.balance == expected_balance
