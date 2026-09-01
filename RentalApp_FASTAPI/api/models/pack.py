# api/models/pack.py

from sqlalchemy import Column, Integer, String, Text, Table, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from api.database_models import Base

# Связующая таблица для отношения "многие-ко-многим" между пачками и оборудованием
pack_equipment_association = Table(
    'pack_equipment_association', Base.metadata,
    Column('pack_id', Integer, ForeignKey('packs.id', ondelete='CASCADE'), primary_key=True),
    Column('equipment_id', Integer, ForeignKey('equipment.id', ondelete='CASCADE'), primary_key=True)
)

class Pack(Base):
    __tablename__ = "packs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Связь "многие-ко-многим" с оборудованием
    equipment = relationship(
        "Equipment",
        secondary=pack_equipment_association,
        back_populates="packs"
    )

    @property
    def equipment_ids(self) -> list[int]:
        """Возвращает список ID связанного оборудования."""
        # Проверяем, загружены ли связанные объекты
        if hasattr(self, '_sa_instance_state') and self._sa_instance_state.expired_attributes.get('equipment', False):
            # Если данные не загружены, возвращаем пустой список
            return []
        return [item.id for item in self.equipment] if self.equipment else []

    def __repr__(self):
        return f"<Pack(id={self.id}, name='{self.name}')>"
