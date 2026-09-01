# api/models/discount.py

from sqlalchemy import Column, Integer
from api.database_models import Base

class DurationDiscount(Base):
    """
    Модель для хранения пороговых значений скидок за длительность аренды.
    Например: от 3 до 6 дней - 10% скидка.
    """
    __tablename__ = "duration_discounts"

    id = Column(Integer, primary_key=True)
    min_days = Column(Integer, unique=True, nullable=False, comment="Минимальное количество дней для скидки (включительно)")
    discount_percentage = Column(Integer, nullable=False, comment="Процент скидки")