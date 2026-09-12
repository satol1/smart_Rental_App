# scripts/recalculate_balances.py

import asyncio
import os
import sys
from decimal import Decimal

from sqlalchemy import func, select, update

# Добавляем корневую директорию проекта в sys.path,
# чтобы можно было импортировать модули из `api`
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from containers import AsyncSessionLocal
from api.models.user import User
from api.models.balance_history import BalanceHistory


async def recalculate_all_balances():
    """
    Пересчитывает и обновляет баланс для всех пользователей на основе их истории транзакций.

    Асинхронная версия: синхронный SessionLocal в контейнере недоступен (синхронный
    драйвер psycopg не установлен), из-за чего прежняя версия падала с
    TypeError: 'NoneType' object is not callable, не доходя до БД.
    """
    print("🚀 Запуск скрипта для пересчета балансов...")
    async with AsyncSessionLocal() as db:
        users = (await db.execute(select(User.id, User.email, User.balance))).all()
        if not users:
            print("В базе данных нет пользователей. Завершение.")
            return

        updated_count = 0
        print(f"Найдено {len(users)} пользователей для проверки.")

        for user_id, email, balance in users:
            # Суммируем все транзакции пользователя из таблицы balance_history
            history_sum = (await db.execute(
                select(func.coalesce(func.sum(BalanceHistory.amount), 0)).where(
                    BalanceHistory.user_id == user_id
                )
            )).scalar_one()
            correct_balance = Decimal(str(history_sum)).quantize(Decimal("0.01"))
            current_balance = Decimal(str(balance if balance is not None else 0))

            # Сравниваем текущий (возможно, некорректный) баланс с правильным
            if current_balance != correct_balance:
                print(f"  - Пользователь ID {user_id} ({email}):")
                print(f"    Некорректный баланс: {current_balance:.2f} ₽")
                print(f"    Правильный баланс:   {correct_balance:.2f} ₽. Обновляем...")
                await db.execute(
                    update(User).where(User.id == user_id).values(balance=correct_balance)
                )
                updated_count += 1

        if updated_count > 0:
            await db.commit()
            print(f"\nСохранение изменений для {updated_count} пользователей...")
            print("✅ Изменения успешно сохранены.")
        else:
            print("\nВсе балансы пользователей уже были в актуальном состоянии. Обновление не требуется.")

    print("\n🏁 Скрипт завершил работу.")


if __name__ == "__main__":
    asyncio.run(recalculate_all_balances())
