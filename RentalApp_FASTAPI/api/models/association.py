# api/models/association.py

from sqlalchemy import Column, Integer, String, Text, Table, ForeignKey
from sqlalchemy.orm import relationship
from api.database_models import Base

association_equipment_association = Table(
    'association_equipment_association', Base.metadata,
    Column('association_id', Integer, ForeignKey('associations.id'), primary_key=True),
    Column('equipment_id', Integer, ForeignKey('equipment.id'), primary_key=True)
)

class Association(Base):
    __tablename__ = "associations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)

    # Связь "многие-ко-многим" с оборудованием
    equipment = relationship(
        "Equipment",
        secondary=association_equipment_association,
        back_populates="associations"
    )

    # Свойство закомментировано для избежания проблем с ленивой загрузкой
    # @property
    # def equipment_ids(self) -> list[int]:
    #     return [item.id for item in self.equipment] if self.equipment else []

    def __repr__(self):
        return f"<Association(id={self.id}, name='{self.name}')>"
