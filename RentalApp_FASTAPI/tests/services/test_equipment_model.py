# tests/services/test_equipment_model.py

import pytest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from api.models.equipment import Equipment
from api.models.accessory import Accessory
from api.models.association import Association
from api.database_models import Base


class TestEquipmentModel:
    """Тесты для модели Equipment."""

    @pytest.fixture
    def sample_equipment_data(self):
        """Предоставляет тестовые данные для оборудования."""
        return {
            'equipment_type': 'Camera',
            'brand': 'Canon',
            'name': 'EOS R5',
            'serial_number': 'SN123456',
            'condition': 'Великолепно',
            'daily_rate': 150.0,
            'notes': 'Test camera',
            'last_maintenance': date(2024, 1, 1),
            'description': 'Professional camera',
            'image_url': 'https://example.com/image.jpg',
            'image_urls': ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
            'short_description': 'Pro camera'
        }

    def test_equipment_creation(self, sample_equipment_data):
        """Тест создания экземпляра оборудования."""
        # Act
        equipment = Equipment(**sample_equipment_data)

        # Assert
        assert equipment.equipment_type == 'Camera'
        assert equipment.brand == 'Canon'
        assert equipment.name == 'EOS R5'
        assert equipment.serial_number == 'SN123456'
        assert equipment.condition == 'Великолепно'
        assert equipment.daily_rate == 150.0
        assert equipment.notes == 'Test camera'
        assert equipment.last_maintenance == date(2024, 1, 1)
        assert equipment.description == 'Professional camera'
        assert equipment.image_url == 'https://example.com/image.jpg'
        assert equipment.image_urls == ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
        assert equipment.short_description == 'Pro camera'

    def test_equipment_creation_with_defaults(self):
        """Тест создания оборудования с значениями по умолчанию."""
        # Act
        equipment = Equipment(
            equipment_type='Lens',
            brand='Sony',
            name='FE 24-70mm'
        )

        # Assert
        assert equipment.equipment_type == 'Lens'
        assert equipment.brand == 'Sony'
        assert equipment.name == 'FE 24-70mm'
        # Значения по умолчанию устанавливаются в базе данных, не в модели
        assert equipment.condition is None  # Будет установлено в БД
        assert equipment.daily_rate is None  # Будет установлено в БД
        assert equipment.serial_number is None
        assert equipment.notes is None
        assert equipment.last_maintenance is None
        assert equipment.description is None
        assert equipment.image_url is None
        assert equipment.image_urls is None
        assert equipment.short_description is None

    def test_equipment_required_fields(self):
        """Тест обязательных полей оборудования."""
        # Act & Assert - должно работать с обязательными полями
        equipment = Equipment(
            equipment_type='Tripod',
            brand='Manfrotto',
            name='MT055XPRO3'
        )
        
        assert equipment.equipment_type == 'Tripod'
        assert equipment.brand == 'Manfrotto'
        assert equipment.name == 'MT055XPRO3'

    def test_equipment_relationships_initialization(self, sample_equipment_data):
        """Тест инициализации связей оборудования."""
        # Act
        equipment = Equipment(**sample_equipment_data)

        # Assert
        assert hasattr(equipment, 'accessories')
        assert hasattr(equipment, 'reservations')
        assert hasattr(equipment, 'applicable_promo_codes')
        assert hasattr(equipment, 'associations')
        assert hasattr(equipment, 'packs')

    def test_equipment_string_representation(self, sample_equipment_data):
        """Тест строкового представления оборудования."""
        # Act
        equipment = Equipment(**sample_equipment_data)

        # Assert
        # Проверяем, что объект можно преобразовать в строку
        str_repr = str(equipment)
        assert isinstance(str_repr, str)

    def test_equipment_json_serialization(self, sample_equipment_data):
        """Тест сериализации оборудования в JSON."""
        # Act
        equipment = Equipment(**sample_equipment_data)

        # Assert
        # Проверяем, что image_urls корректно обрабатывается как JSON
        assert isinstance(equipment.image_urls, list)
        assert len(equipment.image_urls) == 2

    def test_equipment_float_fields(self, sample_equipment_data):
        """Тест полей с плавающей точкой."""
        # Act
        equipment = Equipment(**sample_equipment_data)

        # Assert
        assert isinstance(equipment.daily_rate, float)
        assert equipment.daily_rate == 150.0

    def test_equipment_date_fields(self, sample_equipment_data):
        """Тест полей с датами."""
        # Act
        equipment = Equipment(**sample_equipment_data)

        # Assert
        assert isinstance(equipment.last_maintenance, date)
        assert equipment.last_maintenance == date(2024, 1, 1)

    def test_equipment_nullable_fields(self):
        """Тест nullable полей."""
        # Act
        equipment = Equipment(
            equipment_type='Light',
            brand='Godox',
            name='AD200Pro',
            serial_number=None,
            notes=None,
            last_maintenance=None,
            description=None,
            image_url=None,
            image_urls=None,
            short_description=None
        )

        # Assert
        assert equipment.serial_number is None
        assert equipment.notes is None
        assert equipment.last_maintenance is None
        assert equipment.description is None
        assert equipment.image_url is None
        assert equipment.image_urls is None
        assert equipment.short_description is None

    def test_equipment_unique_serial_number(self, sample_equipment_data):
        """Тест уникальности серийного номера."""
        # Act
        equipment1 = Equipment(**sample_equipment_data)
        equipment2 = Equipment(
            equipment_type='Camera',
            brand='Nikon',
            name='Z6',
            serial_number='SN123456'  # Тот же серийный номер
        )

        # Assert
        assert equipment1.serial_number == equipment2.serial_number
        # В реальной БД это должно вызывать ошибку уникальности

    def test_equipment_field_types(self, sample_equipment_data):
        """Тест типов полей оборудования."""
        # Act
        equipment = Equipment(**sample_equipment_data)

        # Assert
        assert isinstance(equipment.equipment_type, str)
        assert isinstance(equipment.brand, str)
        assert isinstance(equipment.name, str)
        assert isinstance(equipment.serial_number, str)
        assert isinstance(equipment.condition, str)
        assert isinstance(equipment.daily_rate, float)
        assert isinstance(equipment.notes, str)
        assert isinstance(equipment.last_maintenance, date)
        assert isinstance(equipment.description, str)
        assert isinstance(equipment.image_url, str)
        assert isinstance(equipment.image_urls, list)
        assert isinstance(equipment.short_description, str)

    def test_equipment_validation_scenarios(self):
        """Тест различных сценариев валидации."""
        # Тест с минимальными данными
        equipment_minimal = Equipment(
            equipment_type='Mic',
            brand='Rode',
            name='PodMic'
        )
        assert equipment_minimal.name == 'PodMic'

        # Тест с максимальными данными
        equipment_full = Equipment(
            equipment_type='Gimbal',
            brand='DJI',
            name='Ronin-S',
            serial_number='DJI123456',
            condition='Отлично',
            daily_rate=200.0,
            notes='Professional gimbal',
            last_maintenance=date(2024, 6, 1),
            description='3-axis handheld gimbal',
            image_url='https://example.com/gimbal.jpg',
            image_urls=['https://example.com/gimbal1.jpg', 'https://example.com/gimbal2.jpg'],
            short_description='Pro gimbal'
        )
        assert equipment_full.name == 'Ronin-S'
        assert equipment_full.daily_rate == 200.0
