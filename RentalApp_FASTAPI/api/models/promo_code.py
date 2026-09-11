# api/models/promo_code.py

from sqlalchemy import (Column, Integer, String, Float, DateTime, Boolean,
                        ForeignKey, Table, Text)
from sqlalchemy.orm import relationship
from api.database_models import Base
# ✅ Импортируем timezone
from datetime import datetime, timezone

# Промежуточная таблица для отслеживания использований промокодов пользователями.
# usage_count: PK (user_id, promo_code_id) допускает одну строку на пару, поэтому
# лимит max_uses_per_user > 1 реализован счётчиком в этой строке
promo_code_usages = Table(
    'promo_code_usages', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('promo_code_id', Integer, ForeignKey('promo_codes.id'), primary_key=True),
    Column('usage_count', Integer, nullable=False, server_default='1'),
    # ✅ ИЗМЕНЕНИЕ: Добавляем timezone=True
    Column('used_at', DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
)

# Ассоциативная таблица для связи промокода с ID оборудования
promo_code_equipment_association = Table(
    'promo_code_equipment', Base.metadata,
    Column('promo_code_id', Integer, ForeignKey('promo_codes.id'), primary_key=True),
    Column('equipment_id', Integer, ForeignKey('equipment.id'), primary_key=True)
)

class PromoCode(Base):
    """
    Модель для хранения промокодов и их условий.
    """
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True, comment="Краткое описание для менеджеров")
    discount_percentage = Column(Float, nullable=False)

    # --- Статусы и сроки ---
    is_active = Column(Boolean, default=True)
    # ✅ ИЗМЕНЕНИЕ: Добавляем timezone=True
    valid_from = Column(DateTime(timezone=True), nullable=True, comment="Дата начала действия")
    # ✅ ИЗМЕНЕНИЕ: Добавляем timezone=True
    expires_at = Column(DateTime(timezone=True), nullable=True, comment="Дата истечения срока")

    # --- Ограничения использования ---
    max_uses = Column(Integer, nullable=True, comment="Общий лимит использований")
    times_used = Column(Integer, default=0, nullable=False)
    max_uses_per_user = Column(Integer, nullable=True, comment="Лимит на одного пользователя")

    # --- Условия применения ---
    min_order_amount = Column(Float, nullable=True, comment="Минимальная сумма заказа для активации")
    specific_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="Если код персональный")

    # --- Метаданные ---
    # ✅ ИЗМЕНЕНИЕ: Добавляем timezone=True
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_by_id = Column(Integer, ForeignKey("users.id"))

    # --- Связи ---
    creator = relationship("User", foreign_keys=[created_by_id])
    specific_user = relationship("User", foreign_keys=[specific_to_user_id])

    used_by_users = relationship(
        "User",
        secondary=promo_code_usages,
        back_populates="used_promo_codes"
    )

    applicable_equipment = relationship(
        "Equipment",
        secondary=promo_code_equipment_association,
        back_populates="applicable_promo_codes",
        lazy="select"
    )

    applicable_types = relationship(
        "PromoCodeApplicableType",
        back_populates="promo_code",
        cascade="all, delete-orphan",
        lazy="select"
    )

    # --- Вспомогательные свойства ---
    # Безопасны только при загруженных связях (selectinload в репозитории) —
    # иначе async-контекст упадёт на ленивой загрузке
    @property
    def applicable_to_equipment_ids(self) -> list[int]:
        return [item.id for item in self.applicable_equipment] if self.applicable_equipment else []

    @property
    def applicable_to_equipment_types(self) -> list[str]:
        return [item.type_name for item in self.applicable_types] if self.applicable_types else []
    
    @property
    def creator_email(self) -> str | None:
        return self.creator.email if self.creator else None

    def __repr__(self):
        return f"<PromoCode(code='{self.code}', discount={self.discount_percentage}%)>"


# Модель-посредник для хранения типов оборудования
class PromoCodeApplicableType(Base):
    __tablename__ = 'promo_code_applicable_types'
    promo_code_id = Column(Integer, ForeignKey('promo_codes.id'), primary_key=True)
    type_name = Column(String, primary_key=True)

    promo_code = relationship("PromoCode", back_populates="applicable_types")