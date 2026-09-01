# api/models/accessory.py

from sqlalchemy import Column, Integer, String, Float, Text, Table, ForeignKey
from sqlalchemy.orm import relationship
from api.database_models import Base

equipment_accessories_association = Table(
    'equipment_accessories', Base.metadata,
    Column('equipment_id', Integer, ForeignKey('equipment.id'), primary_key=True),
    Column('accessory_id', Integer, ForeignKey('accessories.id'), primary_key=True)
)

class Accessory(Base):
    __tablename__ = "accessories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    accessory_type = Column(String, default="Прочее", index=True)
    price = Column(Float, default=0.0)
    description = Column(Text, nullable=True)

    equipment_items = relationship(
        "Equipment",
        secondary=equipment_accessories_association,
        back_populates="accessories"
    )

    # --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
    # Явно указываем SQLAlchemy, как эта модель связана с таблицами-посредниками
    reservation_links = relationship("ReservationAccessory", back_populates="accessory")
    rental_links = relationship("RentalAccessory", back_populates="accessory")
    # -------------------------

    def __repr__(self):
        return f"<Accessory(id={self.id}, name='{self.name}')>"