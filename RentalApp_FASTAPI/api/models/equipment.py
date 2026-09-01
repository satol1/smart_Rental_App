# api/models/equipment.py

from sqlalchemy import Column, Integer, String, Float, Date, Text, JSON
from sqlalchemy.orm import relationship
from api.database_models import Base
from api.models.accessory import equipment_accessories_association
from api.models.reservation import reservation_equipment_association
from api.models.promo_code import promo_code_equipment_association
from api.models.association import association_equipment_association
from api.models.pack import pack_equipment_association
from api.models.brand_system import brand_system_equipment_association

class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True)
    equipment_type = Column(String, nullable=False)
    brand = Column(String, nullable=False)
    name = Column(String, nullable=False)
    serial_number = Column(String, unique=True)
    condition = Column(String, default="Великолепно")
    daily_rate = Column(Float, default=0.0)
    notes = Column(String)

    # ✅ ИЗМЕНЕНИЕ: Тип поля изменен с DateTime на Date
    last_maintenance = Column(Date)

    description = Column(Text)
    image_url = Column(String, nullable=True)
    image_urls = Column(JSON, nullable=True)
    short_description = Column(String, nullable=True)

    accessories = relationship(
        "Accessory",
        secondary=equipment_accessories_association,
        back_populates="equipment_items"
    )

    reservations = relationship(
        "Reservation",
        secondary=reservation_equipment_association,
        back_populates="equipment"
    )

    applicable_promo_codes = relationship(
        "PromoCode",
        secondary=promo_code_equipment_association,
        back_populates="applicable_equipment"
    )

    # Связь многие-ко-многим с Association
    associations = relationship(
        "Association",
        secondary=association_equipment_association,
        back_populates="equipment"
    )

    # Связь многие-ко-многим с Pack
    packs = relationship(
        "Pack",
        secondary=pack_equipment_association,
        back_populates="equipment"
    )

    # Связь "многие-ко-многим" с BrandSystem
    brand_systems = relationship(
        "BrandSystem",
        secondary=brand_system_equipment_association,
        back_populates="equipment",
        lazy="selectin"
    )