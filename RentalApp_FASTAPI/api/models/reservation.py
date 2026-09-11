# api/models/reservation.py

from decimal import Decimal
from sqlalchemy import Column, Integer, DateTime, ForeignKey, Table, Float, String, Date, Numeric
from sqlalchemy.orm import relationship
from api.database_models import Base
from typing import Optional, Dict, List
from datetime import datetime, timezone

reservation_equipment_association = Table('reservation_equipment', Base.metadata,
                                          Column('reservation_id', Integer, ForeignKey('reservations.id'), primary_key=True),
                                          Column('equipment_id', Integer, ForeignKey('equipment.id'), primary_key=True)
                                          )

class ReservationAccessory(Base):
    __tablename__ = 'reservation_accessories'
    reservation_id = Column(Integer, ForeignKey('reservations.id'), primary_key=True)
    equipment_id = Column(Integer, ForeignKey('equipment.id'), primary_key=True)
    accessory_id = Column(Integer, ForeignKey('accessories.id'), primary_key=True)

    # --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
    accessory = relationship("Accessory", back_populates="reservation_links")
    reservation = relationship("Reservation", back_populates="accessory_links")
    # -------------------------

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String, default='active', nullable=False, index=True)
    promo_code_id = Column(Integer, ForeignKey("promo_codes.id"), nullable=True)
    total_cost = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    discount_amount = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    # Оптимистичная блокировка: параллельный апдейт по устаревшей версии -> 409
    version = Column(Integer, nullable=False, default=1, server_default="1")

    user = relationship("User", back_populates="reservations", lazy="joined")
    applied_promo_code = relationship("PromoCode", lazy="joined")
    equipment = relationship(
        "Equipment",
        secondary=reservation_equipment_association,
        back_populates="reservations",
        lazy="joined"
    )
    # --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
    accessory_links = relationship(
        "ReservationAccessory",
        back_populates="reservation",
        cascade="all, delete-orphan",
        lazy="joined"
    )
    # -------------------------
    rental = relationship("Rental", back_populates="reservation", uselist=False, cascade="all, delete-orphan", single_parent=True)

    @property
    def equipment_ids(self) -> list[int]:
        return [item.id for item in self.equipment] if self.equipment else []

    @property
    def selected_accessories(self) -> Dict[int, List[int]]:
        grouped_accessories: Dict[int, List[int]] = {}
        if not self.accessory_links:
            return {}
        for link in self.accessory_links:
            if link.equipment_id not in grouped_accessories:
                grouped_accessories[link.equipment_id] = []
            grouped_accessories[link.equipment_id].append(link.accessory_id)
        return grouped_accessories

    @property
    def promo_code(self) -> Optional[str]:
        try:
            return self.applied_promo_code.code if self.applied_promo_code else None
        except Exception:
            # Если есть проблемы с доступом к связанному объекту, возвращаем None
            return None
    
    @property
    def user_info(self):
        """Свойство для совместимости со схемой AdminReservationOut"""
        return self.user