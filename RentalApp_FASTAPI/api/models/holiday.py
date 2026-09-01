# api/models/holiday.py

from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, JSON
from sqlalchemy.orm import relationship
from api.database_models import Base
from datetime import datetime, timezone

# +++ НАЧАЛО: НОВАЯ МОДЕЛЬ ДЛЯ ПРАВИЛ +++
class HolidayRule(Base):
    """Модель для хранения правил автоматического создания выходных."""
    __tablename__ = "holiday_rules"

    id = Column(Integer, primary_key=True)
    rule_type = Column(String, nullable=False, comment="Тип правила, например 'weekly' или 'public_import'")
    parameters = Column(JSON, nullable=False, comment="Параметры правила, например {'day_of_week': 6} для воскресенья")
    description = Column(String, nullable=False, comment="Описание правила для админа")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    creator = relationship("User")
    # Связь для каскадного удаления всех выходных, созданных этим правилом
    holidays = relationship("Holiday", back_populates="rule", cascade="all, delete-orphan")
# +++ КОНЕЦ: НОВАЯ МОДЕЛЬ ДЛЯ ПРАВИЛ +++


class Holiday(Base):
    __tablename__ = "holidays"

    date = Column(Date, primary_key=True, index=True, comment="Дата выходного дня")
    description = Column(String, nullable=True, comment="Название (например, Новый год)")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # +++ НАЧАЛО: ИЗМЕНЕНИЯ В МОДЕЛИ HOLIDAY +++
    rule_id = Column(Integer, ForeignKey("holiday_rules.id"), nullable=True, comment="ID правила, которым создан этот выходной")
    rule = relationship("HolidayRule", back_populates="holidays")
    # +++ КОНЕЦ: ИЗМЕНЕНИЯ В МОДЕЛИ HOLIDAY +++

    creator = relationship("User", back_populates="created_holidays")

    def __repr__(self):
        return f"<Holiday(date='{self.date.strftime('%Y-%m-%d')}', description='{self.description}')>"