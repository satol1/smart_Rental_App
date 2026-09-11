# api/models/payment.py

from sqlalchemy import (Column, Integer, String, Float, DateTime,
                        ForeignKey, Text, Numeric)
from sqlalchemy.orm import relationship
from api.database_models import Base
from datetime import datetime, timezone

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # +++ ИЗМЕНЕНИЕ: Добавляем каскадное удаление на уровне БД +++
    rental_id = Column(Integer, ForeignKey("rentals.id", ondelete="CASCADE"), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)

    payment_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    payment_method = Column(String)
    transaction_type = Column(String, nullable=False)  # e.g., 'rental_payment', 'deposit', 'refund'
    description = Column(Text, nullable=True)

    user = relationship("User")
    rental = relationship("Rental", back_populates="payments")