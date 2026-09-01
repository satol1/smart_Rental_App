# tests/integration/test_auth_api.py
"""
Интеграционные тесты для API аутентификации.
"""

import pytest
import os
import os
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.user import User

# Фикстуры из critical conftest уже доступны

# Проверяем, отключена ли CSRF защита
CSRF_DISABLED = os.getenv("DISABLE_CSRF", "false").lower() == "true"


async def get_csrf_token_if_needed(client: AsyncClient) -> dict:
    """Получает CSRF токен, если CSRF защита включена."""
    if CSRF_DISABLED:
        return {}
    
    csrf_response = await client.get("/api/auth/csrf-token")
    csrf_token = csrf_response.json()["csrf_token"]
    return {"X-CSRF-Token": csrf_token}


@pytest.mark.asyncio
@pytest.mark.integration
class TestAuthAPI:
    """Тесты для API аутентификации."""

    async def test_register_user_success(
        self, 
        client: AsyncClient, 
        db_session: AsyncSession
    ):
        """Тест успешной регистрации пользователя."""
        user_data = {
            "email": "newuser@example.com",
            "password": "NewPassword123",
            "full_name": "New User",
            "privacy_policy_accepted": True,
            "terms_accepted": True
        }
        
        # Получаем CSRF токен, если нужно
        csrf_headers = await get_csrf_token_if_needed(client)
        
        response = await client.post(
            "/api/auth/register", 
            json=user_data,
            headers=csrf_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert "message" in data
        
        # Проверяем, что пользователь создан в БД
        from api.repositories.user_repository import UserRepository
        user_repo = UserRepository(db_session)
        user = await user_repo.get_by_email(user_data["email"])
        assert user is not None
        assert user.email == user_data["email"]

    async def test_register_user_duplicate_email(
        self, 
        client: AsyncClient, 
        test_user: User
    ):
        """Тест регистрации с дублирующимся email."""
        user_data = {
            "email": test_user.email,
            "password": "Password123",
            "full_name": "Another User",
            "privacy_policy_accepted": True,
            "terms_accepted": True
        }
        
        # Получаем CSRF токен, если нужно
        csrf_headers = await get_csrf_token_if_needed(client)
        
        response = await client.post(
            "/api/auth/register", 
            json=user_data,
            headers=csrf_headers
        )
        
        assert response.status_code == 400
        detail = response.json()["detail"].lower()
        assert "email" in detail and ("already" in detail or "уже" in detail)

    async def test_login_success(
        self, 
        client: AsyncClient, 
        test_user: User):
        """Тест успешного входа."""
        login_data = {
            "username": test_user.email,
            "password": "secret"
        }
        
        # Получаем CSRF токен, если нужно
        csrf_headers = await get_csrf_token_if_needed(client)
        
        response = await client.post(
            "/api/auth/token", 
            data=login_data,
            headers=csrf_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_invalid_credentials(
        self, 
        client: AsyncClient, 
        test_user: User):
        """Тест входа с неверными данными."""
        login_data = {
            "username": test_user.email,
            "password": "wrongpassword"
        }
        
        response = await client.post("/api/auth/token", data=login_data)
        
        assert response.status_code == 401
        detail = response.json()["detail"].lower()
        assert "incorrect" in detail or "неверные" in detail or "invalid" in detail

    async def test_get_current_user_success(
        self, 
        client: AsyncClient, 
        test_user: User,
        auth_headers: dict):
        """Тест получения информации о текущем пользователе."""
        response = await client.get("/api/user/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email
        assert data["full_name"] == test_user.full_name

    async def test_get_current_user_unauthorized(
        self, 
        client: AsyncClient):
        """Тест получения информации о пользователе без авторизации."""
        response = await client.get("/api/user/me")
        
        assert response.status_code == 401

    async def test_get_current_user_invalid_token(
        self, 
        client: AsyncClient):
        """Тест получения информации о пользователе с неверным токеном."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = await client.get("/api/user/me", headers=headers)
        
        assert response.status_code == 401

    async def test_update_user_profile_success(
        self, 
        client: AsyncClient,
        test_user: User,
        auth_headers: dict
    ):
        """Тест успешного обновления профиля пользователя."""
        update_data = {
            "full_name": "Updated Name"
        }
        
        response = await client.put("/api/user/", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == update_data["full_name"]
        assert data["email"] == test_user.email  # Email не должен измениться

    async def test_update_user_profile_unauthorized(
        self, 
        client: AsyncClient):
        """Тест обновления профиля без авторизации."""
        update_data = {
            "full_name": "Updated Name"
        }
        
        response = await client.put("/api/user/", json=update_data)
        
        assert response.status_code == 401

    async def test_change_password_success(
        self, 
        client: AsyncClient,
        test_user: User,
        auth_headers: dict
    ):
        """Тест успешной смены пароля."""
        password_data = {
            "current_password": "secret",
            "new_password": "NewSecret123"
        }
        
        # Получаем CSRF токен, если нужно
        csrf_headers = await get_csrf_token_if_needed(client)
        
        # Добавляем CSRF токен к заголовкам
        headers_with_csrf = {**auth_headers, **csrf_headers}
        
        response = await client.put("/api/user/change-password", json=password_data, headers=headers_with_csrf)
        
        assert response.status_code == 200
        assert "Пароль успешно изменен" in response.json()["message"]

    async def test_change_password_wrong_current(
        self, 
        client: AsyncClient,
        test_user: User,
        auth_headers: dict
    ):
        """Тест смены пароля с неверным текущим паролем."""
        password_data = {
            "current_password": "wrongpassword",
            "new_password": "NewSecret123"
        }
        
        response = await client.put("/api/user/change-password", json=password_data, headers=auth_headers)
        
        assert response.status_code == 400
        detail = response.json()["detail"].lower()
        assert "incorrect" in detail or "неверный" in detail or "wrong" in detail

    async def test_change_password_unauthorized(
        self, 
        client: AsyncClient):
        """Тест смены пароля без авторизации."""
        password_data = {
            "current_password": "secret",
            "new_password": "NewSecret123"
        }
        
        response = await client.put("/api/user/change-password", json=password_data)
        
        assert response.status_code == 401
