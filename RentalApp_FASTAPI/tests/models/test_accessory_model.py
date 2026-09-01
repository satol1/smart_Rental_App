# tests/models/test_accessory_model.py

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api.models.accessory import Accessory, equipment_accessories_association
from api.database_models import Base


class TestAccessoryModel:
    """Тесты для модели Accessory."""

    @pytest.fixture
    def db_session(self):
        """Создает тестовую сессию базы данных."""
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=engine)
        TestingSessionLocal = sessionmaker(autoflush=False, bind=engine)
        session = TestingSessionLocal()
        yield session
        session.close()

    @pytest.fixture
    def sample_accessory_data(self):
        """Создает тестовые данные для аксессуара."""
        return {
            "name": "Test Accessory",
            "accessory_type": "Кабель",
            "price": 150.0,
            "description": "Test accessory description"
        }

    def test_accessory_creation(self, db_session, sample_accessory_data):
        """Тест создания аксессуара."""
        # Act
        accessory = Accessory(**sample_accessory_data)
        db_session.add(accessory)
        db_session.commit()
        db_session.refresh(accessory)

        # Assert
        assert accessory.id is not None
        assert accessory.name == sample_accessory_data["name"]
        assert accessory.accessory_type == sample_accessory_data["accessory_type"]
        assert accessory.price == sample_accessory_data["price"]
        assert accessory.description == sample_accessory_data["description"]

    def test_accessory_creation_with_defaults(self, db_session):
        """Тест создания аксессуара с значениями по умолчанию."""
        # Arrange
        accessory_data = {"name": "Minimal Accessory"}

        # Act
        accessory = Accessory(**accessory_data)
        db_session.add(accessory)
        db_session.commit()
        db_session.refresh(accessory)

        # Assert
        assert accessory.id is not None
        assert accessory.name == "Minimal Accessory"
        assert accessory.accessory_type == "Прочее"  # default value
        assert accessory.price == 0.0  # default value
        assert accessory.description is None

    def test_accessory_required_fields(self, db_session):
        """Тест обязательных полей аксессуара."""
        # Act & Assert
        with pytest.raises(Exception):  # SQLAlchemy will raise an exception for missing required field
            accessory = Accessory()  # Missing required 'name' field
            db_session.add(accessory)
            db_session.commit()

    def test_accessory_relationships_initialization(self, db_session, sample_accessory_data):
        """Тест инициализации связей аксессуара."""
        # Act
        accessory = Accessory(**sample_accessory_data)
        db_session.add(accessory)
        db_session.commit()
        db_session.refresh(accessory)

        # Assert
        assert accessory.equipment_items == []
        assert accessory.reservation_links == []
        assert accessory.rental_links == []

    def test_accessory_string_representation(self, db_session, sample_accessory_data):
        """Тест строкового представления аксессуара."""
        # Act
        accessory = Accessory(**sample_accessory_data)
        db_session.add(accessory)
        db_session.commit()
        db_session.refresh(accessory)

        # Assert
        expected_repr = f"<Accessory(id={accessory.id}, name='{accessory.name}')>"
        assert repr(accessory) == expected_repr

    def test_accessory_json_serialization(self, db_session, sample_accessory_data):
        """Тест сериализации аксессуара в JSON."""
        # Act
        accessory = Accessory(**sample_accessory_data)
        db_session.add(accessory)
        db_session.commit()
        db_session.refresh(accessory)

        # Assert
        assert hasattr(accessory, 'id')
        assert hasattr(accessory, 'name')
        assert hasattr(accessory, 'accessory_type')
        assert hasattr(accessory, 'price')
        assert hasattr(accessory, 'description')

    def test_accessory_float_fields(self, db_session):
        """Тест полей с плавающей точкой."""
        # Arrange
        accessory_data = {
            "name": "Float Test Accessory",
            "price": 99.99
        }

        # Act
        accessory = Accessory(**accessory_data)
        db_session.add(accessory)
        db_session.commit()
        db_session.refresh(accessory)

        # Assert
        assert isinstance(accessory.price, float)
        assert accessory.price == 99.99

    def test_accessory_nullable_fields(self, db_session):
        """Тест nullable полей."""
        # Arrange
        accessory_data = {
            "name": "Nullable Test Accessory",
            "description": None
        }

        # Act
        accessory = Accessory(**accessory_data)
        db_session.add(accessory)
        db_session.commit()
        db_session.refresh(accessory)

        # Assert
        assert accessory.description is None

    def test_accessory_field_types(self, db_session, sample_accessory_data):
        """Тест типов полей аксессуара."""
        # Act
        accessory = Accessory(**sample_accessory_data)
        db_session.add(accessory)
        db_session.commit()
        db_session.refresh(accessory)

        # Assert
        assert isinstance(accessory.id, int)
        assert isinstance(accessory.name, str)
        assert isinstance(accessory.accessory_type, str)
        assert isinstance(accessory.price, float)
        assert isinstance(accessory.description, str)

    def test_accessory_validation_scenarios(self, db_session):
        """Тест различных сценариев валидации."""
        # Test 1: Valid accessory
        accessory1 = Accessory(name="Valid Accessory", price=100.0)
        db_session.add(accessory1)
        db_session.commit()
        assert accessory1.id is not None

        # Test 2: Accessory with zero price
        accessory2 = Accessory(name="Zero Price Accessory", price=0.0)
        db_session.add(accessory2)
        db_session.commit()
        assert accessory2.price == 0.0

        # Test 3: Accessory with negative price (should be allowed by model)
        accessory3 = Accessory(name="Negative Price Accessory", price=-10.0)
        db_session.add(accessory3)
        db_session.commit()
        assert accessory3.price == -10.0

    def test_equipment_accessories_association_table(self):
        """Тест таблицы ассоциации между оборудованием и аксессуарами."""
        # Assert
        assert equipment_accessories_association is not None
        assert equipment_accessories_association.name == "equipment_accessories"
        
        # Check columns
        columns = equipment_accessories_association.columns
        assert "equipment_id" in columns
        assert "accessory_id" in columns
        
        # Check foreign keys
        equipment_id_col = columns["equipment_id"]
        accessory_id_col = columns["accessory_id"]
        
        assert equipment_id_col.foreign_keys is not None
        assert accessory_id_col.foreign_keys is not None
