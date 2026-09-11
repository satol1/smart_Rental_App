#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Инкрементальное добавление новых позиций каталога Bukza от 12.09.2026.
В отличие от seed_bukza_catalog.py НЕ очищает БД: только вставляет новые
позиции (по serial_number BZ-<id>) и их связи с бренд-системами,
аксессуарами и подборками. Повторный запуск безопасен (idempotent).

Запуск: docker compose exec backend python scripts/seed_bukza_updates_20260912.py

Источник: https://app.bukza.com/#/14027/12684/catalog/14012 (скрап 12.09.2026,
scripts/bukza_scrape_20260912.json). Новая позиция:
  82116 Объектив Canon RF 28-70mm f/2.8 IS STM — 3000 руб/сутки
"""

import sys
import os
import asyncio
from sqlalchemy import text, select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from containers import AsyncSessionLocal
from api.models.equipment import Equipment

# Новые позиции Bukza (скрап 12.09.2026)
NEW_ITEMS = [
    {
        "id": 82116,
        "name": "Объектив Canon RF 28-70mm f/2.8 IS STM",
        "brand": "Canon",
        "equipment_type": "Объективы",
        "daily_rate": 3000.0,
        "serial_number": "BZ-82116",
        "condition": "Великолепно",
        "short_description": "Компактный полнокадровый стандарт-зум Canon RF с постоянной светосилой f/2.8 и стабилизатором IS.",
        "description": (
            "Объектив Canon RF 28-70mm f/2.8 IS STM — легкий (490 г) полнокадровый стандарт-зум "
            "с постоянной светосилой f/2.8 по всему диапазону фокусных расстояний. Построен по складной схеме: "
            "тубус укорачивается на 28 мм, поэтому объектив занимает минимум места в кофре. "
            "Встроенный оптический стабилизатор IS дает до 5,5 ступеней компенсации тряски, "
            "а шаговый автофокус STM фокусируется быстро и практически бесшумно — одинаково "
            "удобен для репортажа и видеосъемки. Минимальная дистанция фокусировки 0,25 м "
            "(максимальное увеличение 0,24×) позволяет снимать крупные планы и небольшие предметы. "
            "Резьба под светофильтры 67 мм. Совместим со всеми камерами Canon с байонетом RF. "
            "Проверен на юстировку и оптическую чистоту."
        ),
        "image_url": "/images/equipment/82116.jpeg",
        "group": "Объектив Canon",
        # Связи (по именам сущностей, существующих в БД)
        "brand_systems": ["Canon"],
        "accessory_types": ["Фильтры и оптика", "Сумки и кофры"],
        "associations": [
            "Для профессионала (Pro Photo)",
            "Для съемки видео и клипов",
        ],
    }
]


async def run_seed():
    print("🚀 Инкрементальное обновление каталога из Bukza (12.09.2026)...")

    async with AsyncSessionLocal() as session:
        try:
            created = skipped = 0
            for item in NEW_ITEMS:
                exists = (
                    await session.execute(
                        select(Equipment).where(Equipment.serial_number == item["serial_number"])
                    )
                ).scalar_one_or_none()
                if exists is not None:
                    print(f"⏭️  {item['name']} ({item['serial_number']}) уже существует — пропущено.")
                    skipped += 1
                    continue

                eq = Equipment(
                    name=item["name"],
                    brand=item["brand"],
                    equipment_type=item["equipment_type"],
                    daily_rate=item["daily_rate"],
                    serial_number=item["serial_number"],
                    condition=item["condition"],
                    short_description=item["short_description"],
                    description=item["description"],
                    image_url=item["image_url"],
                    notes=f"Группа Bukza: {item['group']}",
                )
                session.add(eq)
                await session.flush()
                eq_id = eq.id
                created += 1
                print(f"✅ Добавлено: {item['name']} (ID {eq_id})")

                # Бренд-системы
                for bs_name in item["brand_systems"]:
                    bs_id = (
                        await session.execute(
                            text("SELECT id FROM brand_systems WHERE name = :n"), {"n": bs_name}
                        )
                    ).scalar_one_or_none()
                    if bs_id is None:
                        print(f"⚠️  Бренд-система «{bs_name}» не найдена — связь пропущена.")
                        continue
                    await session.execute(
                        text(
                            "INSERT INTO brand_system_equipment_association (brand_system_id, equipment_id) "
                            "VALUES (:bs_id, :eq_id) ON CONFLICT DO NOTHING"
                        ),
                        {"bs_id": bs_id, "eq_id": eq_id},
                    )
                    print(f"   🔗 Бренд-система: {bs_name}")

                # Аксессуары (по типу, как в seed_bukza_catalog.py для объективов)
                acc_rows = (
                    await session.execute(
                        text(
                            "SELECT id, name FROM accessories "
                            "WHERE accessory_type = ANY(:types)"
                        ),
                        {"types": item["accessory_types"]},
                    )
                ).fetchall()
                for acc_id, acc_name in acc_rows:
                    await session.execute(
                        text(
                            "INSERT INTO equipment_accessories (equipment_id, accessory_id) "
                            "VALUES (:eq_id, :aid) ON CONFLICT DO NOTHING"
                        ),
                        {"eq_id": eq_id, "aid": acc_id},
                    )
                print(f"   🎒 Аксессуаров привязано: {len(acc_rows)}")

                # Подборки
                for assoc_name in item["associations"]:
                    a_id = (
                        await session.execute(
                            text("SELECT id FROM associations WHERE name = :n"), {"n": assoc_name}
                        )
                    ).scalar_one_or_none()
                    if a_id is None:
                        print(f"⚠️  Подборка «{assoc_name}» не найдена — связь пропущена.")
                        continue
                    await session.execute(
                        text(
                            "INSERT INTO association_equipment_association (association_id, equipment_id) "
                            "VALUES (:a_id, :eq_id) ON CONFLICT DO NOTHING"
                        ),
                        {"a_id": a_id, "eq_id": eq_id},
                    )
                    print(f"   🎯 Подборка: {assoc_name}")

            await session.commit()
            print(f"\n🎉 Готово: добавлено {created}, пропущено {skipped}.")

        except Exception as e:
            await session.rollback()
            print(f"\n❌ ОШИБКА: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(run_seed())
