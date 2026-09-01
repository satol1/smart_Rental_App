# api/models/user.py

from sqlalchemy import (Column, Integer, String, Boolean, DateTime,
                        Float, Text)
from sqlalchemy.orm import relationship
from api.database_models import Base
from datetime import datetime, timezone

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    telegram_username = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    role = Column(String, default="user") # user, manager, admin

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    is_active = Column(Boolean, default=True)
    phone = Column(String)
    status = Column(String, default="Новый")  # Новый статус по умолчанию для новых пользователей
    status_changed_manually = Column(Boolean, default=False)  # Флаг ручного изменения статуса (приоритет над автоматическим)
    balance = Column(Float, default=0.0)
    notes = Column(Text)

    privacy_policy_accepted = Column(Boolean, default=False)
    terms_accepted = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)

    # Существующие связи
    reservations = relationship("Reservation", back_populates="user")
    used_promo_codes = relationship(
        "PromoCode",
        secondary="promo_code_usages",
        back_populates="used_by_users"
    )

    # +++ НОВЫЕ СВЯЗИ +++
    rentals = relationship("Rental", foreign_keys="[Rental.user_id]", back_populates="user", cascade="all, delete-orphan")
    balance_history = relationship("BalanceHistory", back_populates="user", cascade="all, delete-orphan")
    created_holidays = relationship("Holiday", back_populates="creator")