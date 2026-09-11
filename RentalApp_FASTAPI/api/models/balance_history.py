# api/models/balance_history.py

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from api.database_models import Base
from datetime import datetime, timezone

class BalanceHistory(Base):
    __tablename__ = "balance_history"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # +++ ИЗМЕНЕНИЕ: Изменяем поведение внешнего ключа для сохранения истории транзакций +++
    rental_id = Column(Integer, ForeignKey("rentals.id", ondelete="SET NULL"), nullable=True)

    amount = Column(Numeric(12, 2), nullable=False, comment="Сумма операции. Отрицательная для списания, положительная для начисления.")
    operation_type = Column(String, nullable=False, comment="Тип операции (e.g., rental_debit, early_return_credit)")
    description = Column(Text, nullable=True, comment="Описание операции")

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Связи
    user = relationship("User", back_populates="balance_history")
    rental = relationship("Rental", back_populates="balance_history")

    def __repr__(self):
        return f"<BalanceHistory(id={self.id}, user_id={self.user_id}, amount={self.amount})>"