# api/models/brand_system.py

from sqlalchemy import Column, Integer, String, Text, Table, ForeignKey
from sqlalchemy.orm import relationship
from api.database_models import Base

# Определяем ассоциативную таблицу для связи "многие-ко-многим"
# между BrandSystem и Equipment.
brand_system_equipment_association = Table(
    'brand_system_equipment_association',
    Base.metadata,
    Column('brand_system_id', Integer, ForeignKey('brand_systems.id', ondelete='CASCADE'), primary_key=True),
    Column('equipment_id', Integer, ForeignKey('equipment.id', ondelete='CASCADE'), primary_key=True)
)

class BrandSystem(Base):
    """
    Модель "Система Бренда".
    Представляет собой экосистему (например, "Canon EF", "Nikon Z"),
    которая объединяет оборудование основного бренда и совместимое
    оборудование от сторонних производителей.
    """
    __tablename__ = "brand_systems"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)

    # Связь "многие-ко-многим" с оборудованием
    equipment = relationship(
        "Equipment",
        secondary=brand_system_equipment_association,
        back_populates="brand_systems",
        lazy="selectin"  # Используем selectin для эффективной загрузки
    )
