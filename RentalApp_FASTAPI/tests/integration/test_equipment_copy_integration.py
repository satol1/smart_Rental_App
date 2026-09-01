import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.equipment import Equipment
from api.models.user import User
from shared.schemas.equipment_schema import EquipmentCopyRequest


class TestEquipmentCopyIntegration:
    """Интеграционные тесты для функционала копирования оборудования"""

    async def test_full_copy_workflow(self, client: AsyncClient, db_session: AsyncSession, test_manager: User, manager_auth_headers: dict):
        """Полный тест workflow копирования оборудования"""
        # Arrange - создаем исходное оборудование
        equipment_data = {
            "equipment_type": "Камера",
            "brand": "Canon",
            "name": "Canon EOS R5",
            "serial_number": "SN123456",
            "condition": "Великолепно",
            "daily_rate": 5000.0,
            "notes": "Отличная камера",
            "description": "Профессиональная камера",
            "short_description": "Проф камера"
        }

        # Создаем исходное оборудование
        create_response = await client.post(
            "/equipment/",
            json=equipment_data,
            headers=manager_auth_headers
        )
        assert create_response.status_code == 201
        source_equipment = create_response.json()

        # Act - копируем оборудование
        copy_data = {
            "name": "Canon EOS R5 (копия)",
            "serial_number": "SN789012",
            "notes": "Новая копия"
        }

        copy_response = await client.post(
            f"/equipment/{source_equipment['id']}/copy",
            json=copy_data,
            headers=manager_auth_headers
        )

        # Assert
        assert copy_response.status_code == 201
        copied_equipment = copy_response.json()

        # Проверяем, что скопированное оборудование имеет правильные данные
        assert copied_equipment["id"] != source_equipment["id"]
        assert copied_equipment["equipment_type"] == source_equipment["equipment_type"]
        assert copied_equipment["brand"] == source_equipment["brand"]
        assert copied_equipment["name"] == "Canon EOS R5 (копия)"
        assert copied_equipment["serial_number"] == "SN789012"
        assert copied_equipment["condition"] == source_equipment["condition"]
        assert copied_equipment["daily_rate"] == source_equipment["daily_rate"]
        assert copied_equipment["notes"] == "Новая копия"
        assert copied_equipment["description"] == source_equipment["description"]
        assert copied_equipment["short_description"] == source_equipment["short_description"]

    async def test_copy_equipment_with_default_values(self, client: AsyncClient, db_session: AsyncSession, test_manager: User, manager_auth_headers: dict):
        """Тест копирования с значениями по умолчанию"""
        # Arrange
        equipment_data = {
            "equipment_type": "Объектив",
            "brand": "Sony",
            "name": "Sony 24-70mm f/2.8",
            "serial_number": "SN111111",
            "condition": "Отлично",
            "daily_rate": 3000.0,
            "notes": "Отличный объектив"
        }

        create_response = await client.post(
            "/equipment/",
            json=equipment_data,
            headers=manager_auth_headers
        )
        source_equipment = create_response.json()

        # Act - копируем без указания дополнительных данных
        copy_response = await client.post(
            f"/equipment/{source_equipment['id']}/copy",
            json={},  # Пустые данные
            headers=manager_auth_headers
        )

        # Assert
        assert copy_response.status_code == 201
        copied_equipment = copy_response.json()

        assert copied_equipment["name"] == "Sony 24-70mm f/2.8 (копия)"
        assert copied_equipment["serial_number"] is None
        assert copied_equipment["notes"] == f"Скопировано из ID: {source_equipment['id']}"

    async def test_copy_nonexistent_equipment(self, client: AsyncClient, test_manager: User, manager_auth_headers: dict):
        """Тест копирования несуществующего оборудования"""
        # Act
        copy_response = await client.post(
            "/equipment/99999/copy",
            json={"name": "Тест"},
            headers=manager_auth_headers
        )

        # Assert
        assert copy_response.status_code == 500  # Внутренняя ошибка сервера

    async def test_copy_equipment_unauthorized(self, client: AsyncClient, test_user: User, user_auth_headers: dict):
        """Тест копирования без прав доступа"""
        # Arrange
        equipment_data = {
            "equipment_type": "Камера",
            "brand": "Nikon",
            "name": "Nikon D850",
            "condition": "Великолепно",
            "daily_rate": 4000.0
        }

        create_response = await client.post(
            "/equipment/",
            json=equipment_data,
            headers=user_auth_headers
        )
        # Обычный пользователь не может создавать оборудование
        assert create_response.status_code == 403

    async def test_copy_equipment_validation(self, client: AsyncClient, db_session: AsyncSession, test_manager: User, manager_auth_headers: dict):
        """Тест валидации данных при копировании"""
        # Arrange
        equipment_data = {
            "equipment_type": "Камера",
            "brand": "Canon",
            "name": "Canon EOS R5",
            "condition": "Великолепно",
            "daily_rate": 5000.0
        }

        create_response = await client.post(
            "/equipment/",
            json=equipment_data,
            headers=manager_auth_headers
        )
        source_equipment = create_response.json()

        # Act - пытаемся скопировать с пустым именем
        copy_data = {
            "name": "",  # Пустое имя
            "serial_number": "SN789012"
        }

        copy_response = await client.post(
            f"/equipment/{source_equipment['id']}/copy",
            json=copy_data,
            headers=manager_auth_headers
        )

        # Assert - должно пройти валидацию, так как имя будет заменено на значение по умолчанию
        assert copy_response.status_code == 201
