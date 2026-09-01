# scripts/recalculate_balances.py

import sys
import os
from sqlalchemy import func
from sqlalchemy.orm import Session

# Добавляем корневую директорию проекта в sys.path,
# чтобы можно было импортировать модули из `api`
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from containers import SessionLocal
from api.models.user import User
from api.models.balance_history import BalanceHistory

def recalculate_all_balances():
    """
    Пересчитывает и обновляет баланс для всех пользователей на основе их истории транзакций.
    """
    print("🚀 Запуск скрипта для пересчета балансов...")
    db: Session = SessionLocal()
    try:
        users = db.query(User).all()
        if not users:
            print("В базе данных нет пользователей. Завершение.")
            return

        updated_count = 0
        print(f"Найдено {len(users)} пользователей для проверки.")

        for user in users:
            # Суммируем все транзакции для пользователя из таблицы balance_history
            correct_balance_query = db.query(func.sum(BalanceHistory.amount)).filter(BalanceHistory.user_id == user.id)
            correct_balance = correct_balance_query.scalar() or 0.0
            correct_balance = round(correct_balance, 2)

            # Сравниваем текущий (возможно, некорректный) баланс с правильным
            if user.balance != correct_balance:
                print(f"  - Пользователь ID {user.id} ({user.email}):")
                print(f"    Некорректный баланс: {user.balance:.2f} ₽")
                print(f"    Правильный баланс:   {correct_balance:.2f} ₽. Обновляем...")
                user.balance = correct_balance
                updated_count += 1

        if updated_count > 0:
            print(f"\nСохранение изменений для {updated_count} пользователей...")
            db.commit()
            print("✅ Изменения успешно сохранены.")
        else:
            print("\nВсе балансы пользователей уже были в актуальном состоянии. Обновление не требуется.")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Произошла ошибка: {e}")
        print("Все изменения были отменены.")
    finally:
        db.close()
        print("\n🏁 Скрипт завершил работу.")

if __name__ == "__main__":
    # Этот блок позволяет запускать скрипт напрямую из командной строки
    recalculate_all_balances()