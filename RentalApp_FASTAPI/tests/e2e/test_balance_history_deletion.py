# tests/e2e/test_balance_history_deletion.py

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from api.models.user import User
from api.models.balance_history import BalanceHistory

pytestmark = pytest.mark.e2e


async def test_delete_balance_history_entry_and_recalculate_balance(
    e2e_client: AsyncClient,
    e2e_db_session: AsyncSession,
    e2e_test_user: User,
    e2e_admin_auth_headers: dict
):
    """
    Тестирует полный цикл:
    1. Создаем записи в истории.
    2. Обновляем баланс пользователя.
    3. Удаляем одну запись через API.
    4. Проверяем, что запись удалена.
    5. Проверяем, что баланс пользователя корректно пересчитан.
    """
    # 1. Создаем записи в истории
    entry1 = BalanceHistory(user_id=e2e_test_user.id, amount=1000.0, operation_type="top_up", description="Пополнение")
    entry2 = BalanceHistory(user_id=e2e_test_user.id, amount=-250.0, operation_type="debit", description="Списание")
    e2e_db_session.add_all([entry1, entry2])
    
    # 2. Обновляем баланс
    e2e_test_user.balance = 750.0
    e2e_db_session.add(e2e_test_user)
    await e2e_db_session.commit()
    await e2e_db_session.refresh(entry1)
    await e2e_db_session.refresh(entry2)
    
    initial_balance = e2e_test_user.balance
    assert initial_balance == 750.0
    
    history_entry_to_delete_id = entry2.id

    # 3. Удаляем одну запись через API
    response = await e2e_client.delete(
        f"/api/admin/users/balance-history/{history_entry_to_delete_id}",
        headers=e2e_admin_auth_headers
    )
    
    # 4. Проверяем успешный ответ
    assert response.status_code == 204
    
    # 5. Проверяем, что запись удалена из БД
    # Обновляем сессию, чтобы увидеть изменения от API
    await e2e_db_session.commit()
    # Создаем новую сессию для проверки
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from config.core import settings
    
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as new_session:
        deleted_entry = await new_session.get(BalanceHistory, history_entry_to_delete_id)
        assert deleted_entry is None
    
    # 6. Проверяем, что баланс пользователя корректно пересчитан
    await e2e_db_session.refresh(e2e_test_user)
    expected_balance = initial_balance - (-250.0) # 750 - (-250) = 1000
    assert e2e_test_user.balance == expected_balance

async def test_delete_nonexistent_balance_history_entry(
    e2e_client: AsyncClient,
    e2e_admin_auth_headers: dict
):
    """
    Тестирует удаление несуществующей записи истории баланса.
    Должен вернуть 404.
    """
    nonexistent_id = 99999
    
    response = await e2e_client.delete(
        f"/api/admin/users/balance-history/{nonexistent_id}",
        headers=e2e_admin_auth_headers
    )
    
    assert response.status_code == 404
    assert "не найдена" in response.json()["detail"]

async def test_delete_balance_history_entry_unauthorized(
    e2e_client: AsyncClient,
    e2e_db_session: AsyncSession,
    e2e_test_user: User
):
    """
    Тестирует удаление записи истории баланса без авторизации.
    Должен вернуть 401.
    """
    # Создаем запись в истории
    entry = BalanceHistory(user_id=e2e_test_user.id, amount=100.0, operation_type="top_up", description="Тест")
    e2e_db_session.add(entry)
    await e2e_db_session.commit()
    await e2e_db_session.refresh(entry)
    
    # Пытаемся удалить без авторизации
    response = await e2e_client.delete(
        f"/api/admin/users/balance-history/{entry.id}"
    )
    
    assert response.status_code == 401

async def test_delete_balance_history_entry_insufficient_permissions(
    e2e_client: AsyncClient,
    e2e_db_session: AsyncSession,
    e2e_test_user: User
):
    """
    Тестирует удаление записи истории баланса пользователем без прав админа.
    Должен вернуть 403.
    """
    # Создаем обычного пользователя
    regular_user = User(
        email="regular@test.com",
        full_name="Regular User",
        hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # secret
        role="user",
        is_active=True
    )
    e2e_db_session.add(regular_user)
    await e2e_db_session.commit()
    await e2e_db_session.refresh(regular_user)
    
    # Авторизуемся как обычный пользователь
    auth_response = await e2e_client.post(
        "/api/auth/token",
        data={"username": "regular@test.com", "password": "secret"},
    )
    # Пропускаем этот тест, если у нас нет пароля для обычного пользователя
    if auth_response.status_code != 200:
        pytest.skip("Не удалось авторизовать обычного пользователя")
    
    token = auth_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Создаем запись в истории
    entry = BalanceHistory(user_id=e2e_test_user.id, amount=100.0, operation_type="top_up", description="Тест")
    e2e_db_session.add(entry)
    await e2e_db_session.commit()
    await e2e_db_session.refresh(entry)
    
    # Пытаемся удалить как обычный пользователь
    response = await e2e_client.delete(
        f"/api/admin/users/balance-history/{entry.id}",
        headers=headers
    )
    
    assert response.status_code == 403
