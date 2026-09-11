# api/models/rental.py

from decimal import Decimal
from sqlalchemy import (Column, Integer, DateTime, ForeignKey, Float,
                        String, Text, Table, Boolean, Date, Numeric)
from sqlalchemy.orm import relationship
from api.database_models import Base
from datetime import datetime, timezone

class RentalAccessory(Base):
    __tablename__ = 'rental_accessories'
    rental_id = Column(Integer, ForeignKey('rentals.id', ondelete="CASCADE"), primary_key=True)
    equipment_id = Column(Integer, ForeignKey('equipment.id'), primary_key=True)
    accessory_id = Column(Integer, ForeignKey('accessories.id'), primary_key=True)

    accessory = relationship("Accessory", back_populates="rental_links")
    rental = relationship("Rental", back_populates="accessory_links")

rental_equipment_association = Table('rental_equipment', Base.metadata,
                                     Column('rental_id', Integer, ForeignKey('rentals.id', ondelete="CASCADE"), primary_key=True),
                                     Column('equipment_id', Integer, ForeignKey('equipment.id'), primary_key=True)
                                     )

class Rental(Base):
    __tablename__ = "rentals"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reservation_id = Column(Integer, ForeignKey("reservations.id"), nullable=True, unique=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    actual_return_date = Column(Date, nullable=True)
    status = Column(String, default="active", nullable=False, index=True)
    total_cost = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    discount_amount = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    promo_code = Column(String, nullable=True)
    final_cost = Column(Numeric(12, 2), nullable=True)
    deposit_amount = Column(Numeric(12, 2), default=Decimal("0.00"))
    prepayment_amount = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))  # Сумма предоплаты, внесенная при создании аренды
    notes_on_issue = Column(Text, nullable=True)
    notes_on_return = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # ✅ Упрощенный конструктор без бизнес-логики
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    user = relationship("User", foreign_keys=[user_id], back_populates="rentals", lazy="joined")
    created_by = relationship("User", foreign_keys=[created_by_id])

    # --- НАЧАЛО ИСПРАВЛЕНИЙ ---
    # Убираем управляющие инструкции `cascade` и `single_parent` со стороны "потомка".
    # Теперь эта связь является просто обратной ссылкой.
    reservation = relationship("Reservation", back_populates="rental")
    # --- КОНЕЦ ИСПРАВЛЕНИЙ ---

    # Коллекции грузим selectin-ом (отдельный IN-запрос): joined давал
    # декартово произведение строк на выборках списка аренд
    equipment = relationship("Equipment", secondary=rental_equipment_association, lazy="selectin")
    balance_history = relationship("BalanceHistory", back_populates="rental")
    payments = relationship("Payment", back_populates="rental", cascade="all, delete-orphan")
    accessory_links = relationship(
        "RentalAccessory",
        back_populates="rental",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    # ✅ Метод копирования аксессуаров удален - логика перенесена в репозиторий

    @property
    def user_info(self):
        """Свойство для совместимости со схемой RentalOut"""
        return self.user
    
    def __repr__(self):
        return f"<Rental(id={self.id}, user_id={self.user_id}, status='{self.status}')>"