# scripts/populate_discounts.py

import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Добавляем корневую директорию проекта в sys.path, чтобы найти другие модули
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# ✨ ИСПРАВЛЕНИЕ: Импортируем DATABASE_URL из централизованной конфигурации
from config.core import settings
from api.models.discount import DurationDiscount

# Подключение к БД, используя централизованную конфигурацию
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def populate_duration_discounts():
    db = SessionLocal()
    try:
        # Проверяем, есть ли уже записи
        if db.query(DurationDiscount).count() > 0:
            print("Таблица 'duration_discounts' уже заполнена. Пропускаем.")
            return

        discounts = [
            {'min_days': 4, 'discount_percentage': 10},  # От 4 до 6 дней
            {'min_days': 7, 'discount_percentage': 15},  # От 7 до 9 дней
            {'min_days': 10, 'discount_percentage': 20}, # От 10 до 13 дней
            {'min_days': 14, 'discount_percentage': 25}  # От 14 дней и более
        ]

        for discount_data in discounts:
            db_discount = DurationDiscount(**discount_data)
            db.add(db_discount)

        db.commit()
        print("✅ Таблица 'duration_discounts' успешно заполнена.")

    except Exception as e:
        print(f"❌ Произошла ошибка: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    populate_duration_discounts()