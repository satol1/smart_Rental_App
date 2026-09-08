#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Мастер-скрипт полной очистки тестовой БД и наполнения реальными данными из Bukza.
Использует прямые SQL-вставки для связей многие-ко-многим (async-безопасно и быстро).
"""

import sys
import os
import json
import asyncio
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from containers import AsyncSessionLocal
from api.models.user import User
from api.models.equipment import Equipment
from api.models.brand_system import BrandSystem
from api.models.accessory import Accessory
from api.models.association import Association
from api.models.discount import DurationDiscount
from api.models.promo_code import PromoCode
from api.utils.password_utils import hash_password

DATA_FILE = "/app/prepared_equipment.json"
if not os.path.exists(DATA_FILE):
    DATA_FILE = os.path.join(os.path.dirname(__file__), "prepared_equipment.json")

async def run_seed():
    print("🚀 НАЧАЛО ОЧИСТКИ И НАПОЛНЕНИЯ БАЗЫ ДАННЫХ...")
    
    if not os.path.exists(DATA_FILE):
        print(f"❌ Файл с данными {DATA_FILE} не найден!")
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        equipment_items = json.load(f)

    print(f"📦 Загружено {len(equipment_items)} записей оборудования из {DATA_FILE}")

    async with AsyncSessionLocal() as session:
        try:
            # 1. ОЧИСТКА БАЗЫ ДАННЫХ
            print("\n🧹 1. Полная очистка таблиц (TRUNCATE CASCADE)...")
            truncate_sql = """
            TRUNCATE TABLE 
                reservation_accessories,
                reservation_equipment,
                reservations,
                rental_accessories,
                rental_equipment,
                rentals,
                payments,
                balance_history,
                brand_system_equipment_association,
                equipment_accessories,
                association_equipment_association,
                pack_equipment_association,
                promo_code_equipment,
                promo_code_applicable_types,
                promo_code_usages,
                promo_codes,
                duration_discounts,
                packs,
                associations,
                brand_systems,
                accessories,
                equipment,
                security_audit_logs,
                users
            RESTART IDENTITY CASCADE;
            """
            await session.execute(text(truncate_sql))
            await session.commit()
            print("✅ Все таблицы успешно очищены, счетчики сброшены.")

            # 2. СОЗДАНИЕ ТЕСТОВОГО АДМИНИСТРАТОРА
            print("\n👤 2. Создание учетной записи тестового администратора...")
            admin_user = User(
                email="admin@rentalapp.com",
                full_name="Главный Администратор",
                phone="+7 (999) 000-00-00",
                hashed_password=hash_password("Admin123!"),
                role="admin",
                status="VIP",
                is_active=True,
                email_verified=True,
                privacy_policy_accepted=True,
                terms_accepted=True,
                balance=0.0,
                notes="Тестовый администратор системы"
            )
            session.add(admin_user)
            await session.flush()
            print(f"✅ Администратор создан: admin@rentalapp.com / Admin123! (ID: {admin_user.id})")

            # 3. СОЗДАНИЕ СИСТЕМ БРЕНДОВ (BRAND SYSTEMS)
            print("\n🏢 3. Создание Систем Брендов (Brand Systems)...")
            brand_systems_data = [
                {"name": "Canon", "description": "Экосистема Canon (байонет RF/EF, оригинальная оптика, вспышки и совместимые решения Sigma, Tamron, Godox)"},
                {"name": "Sony", "description": "Экосистема Sony (байонет E-mount, камеры Alpha, кинокамеры FX, оптика Sony, Tamron, Samyang, вспышки Godox)"},
                {"name": "Fujifilm", "description": "Экосистема Fujifilm (байонет X-mount, камеры серий X-T/X-S, оптика Fujinon XF, вспышки и триггеры Godox)"},
                {"name": "Nikon", "description": "Экосистема Nikon (байонет Z/F, камеры Z5, оптика Nikkor, Meike, Sigma, адаптеры Viltrox, вспышки Godox)"},
                {"name": "DJI", "description": "Экосистема DJI (экшн-камеры Osmo Pocket, стабилизаторы Ronin RS, беспроводные микрофонные системы DJI Mic)"},
                {"name": "GoPro", "description": "Экосистема экшн-съемки GoPro (камеры Hero 10/11, аккумуляторы, зарядные хабы, защитные кейсы и крепления)"},
                {"name": "Godox", "description": "Студийный импульсный и постоянный свет, накамерные вспышки, радиосинхронизаторы и светоформирующие модификаторы"},
                {"name": "Aputure / Amaran", "description": "Профессиональный киносвет и мобильные осветительные приборы, софтбоксы Light Dome, Lantern и аксессуары V-mount"},
                {"name": "Звук и аудио", "description": "Профессиональное звуковое оборудование: RODE, Shure, Zoom, Hollyland, Saramonic, Boya, Comica"},
                {"name": "Штативы и риги", "description": "Системы стабилизации и удержания: Manfrotto, Zhiyun, Falcon Eyes, K&F Concept, SmallRig, Kupo"}
            ]

            brand_systems_map = {}
            for bsd in brand_systems_data:
                bs = BrandSystem(**bsd)
                session.add(bs)
                await session.flush()
                brand_systems_map[bs.name] = bs.id

            print(f"✅ Создано {len(brand_systems_map)} систем брендов.")

            # 4. СОЗДАНИЕ ОБОРУДОВАНИЯ (EQUIPMENT)
            print(f"\n📷 4. Создание {len(equipment_items)} единиц оборудования...")
            equipment_db_list = []
            for item in equipment_items:
                eq = Equipment(
                    name=item["name"],
                    brand=item["brand"],
                    equipment_type=item["equipment_type"],
                    daily_rate=item["daily_rate"],
                    serial_number=item["serial_number"],
                    condition="Великолепно",
                    short_description=item["short_description"],
                    description=item["description"],
                    image_url=item["image_url"],
                    notes=f"Группа Bukza: {item['group']}"
                )
                session.add(eq)
                equipment_db_list.append((eq, item))

            await session.flush()
            print(f"✅ Успешно добавлено {len(equipment_db_list)} единиц оборудования.")

            # 5. ПРИВЯЗКА К СИСТЕМАМ БРЕНДОВ ЧЕРЕЗ SQL
            print("\n🔗 5. Настройка кросс-совместимости с Системами Брендов...")
            bs_links = set()
            for eq, item in equipment_db_list:
                eq_id = eq.id
                name_l = eq.name.lower()
                brand_l = eq.brand.lower()
                group_l = item["group"].lower()

                # Canon system
                if ("canon" in name_l or "canon" in brand_l or "canon" in group_l or
                    ("sigma" in brand_l and "canon" in name_l) or
                    ("godox" in brand_l and ("(canon)" in name_l or "v860 iii c" in name_l or "v1c" in name_l or "x2t-c" in name_l)) or
                    ("адаптер canon" in name_l)):
                    bs_links.add((brand_systems_map["Canon"], eq_id))

                # Sony system
                if ("sony" in name_l or "sony" in brand_l or "sony" in group_l or
                    ("tamron" in brand_l and ("sony" in name_l or "sony" in group_l)) or
                    ("samyang" in brand_l and ("sony" in name_l or "sony" in group_l)) or
                    ("godox" in brand_l and ("(sony)" in name_l or "v860 ii ttl" in name_l or "v1s" in name_l or "x2t-s" in name_l)) or
                    ("viltrox e-z" in name_l)):
                    bs_links.add((brand_systems_map["Sony"], eq_id))

                # Fujifilm system
                if ("fuji" in name_l or "fujifilm" in brand_l or "fujifilm" in group_l or
                    ("godox" in brand_l and ("(fujifilm)" in name_l or "tt-685" in name_l or "x2t-f" in name_l))):
                    bs_links.add((brand_systems_map["Fujifilm"], eq_id))

                # Nikon system
                if ("nikon" in name_l or "nikon" in brand_l or "nikon" in group_l or
                    ("meike" in brand_l and "z-mount" in name_l) or
                    ("sigma" in brand_l and "nikon" in name_l) or
                    ("viltrox e-z" in name_l) or
                    ("godox" in brand_l and ("(nikon)" in name_l or "x2t-n" in name_l))):
                    bs_links.add((brand_systems_map["Nikon"], eq_id))

                # DJI
                if "dji" in brand_l or "dji" in name_l:
                    bs_links.add((brand_systems_map["DJI"], eq_id))

                # GoPro
                if "gopro" in brand_l or "gopro" in name_l or "telesin" in brand_l or "orbmart" in brand_l:
                    bs_links.add((brand_systems_map["GoPro"], eq_id))

                # Godox
                if "godox" in brand_l or "godox" in name_l:
                    bs_links.add((brand_systems_map["Godox"], eq_id))

                # Aputure / Amaran
                if "aputure" in brand_l or "amaran" in brand_l or "aputure" in name_l or "amaran" in name_l:
                    bs_links.add((brand_systems_map["Aputure / Amaran"], eq_id))

                # Sound
                if eq.equipment_type == "Запись звука":
                    bs_links.add((brand_systems_map["Звук и аудио"], eq_id))

                # Rigs / Support
                if eq.equipment_type in ["Штативы и стабилизаторы", "Студийное оборудование и фоны"]:
                    bs_links.add((brand_systems_map["Штативы и риги"], eq_id))

            for bs_id, eq_id in bs_links:
                await session.execute(
                    text("INSERT INTO brand_system_equipment_association (brand_system_id, equipment_id) VALUES (:bs_id, :eq_id)"),
                    {"bs_id": bs_id, "eq_id": eq_id}
                )

            print(f"✅ Создано {len(bs_links)} связей оборудования с Системами Брендов.")

            # 6. УНИВЕРСАЛЬНЫЕ АКСЕССУАРЫ (БЕЗ БРЕНДОВ)
            print("\n🎒 6. Создание универсальных аксессуаров...")
            accessories_data = [
                {"name": "Сумка для фотокамеры (компактная)", "accessory_type": "Сумки и кофры", "price": 100.0, "description": "Защитная наплечная сумка с мягкими перегородками для одной камеры с объективом."},
                {"name": "Сумка для фотокамеры (средняя)", "accessory_type": "Сумки и кофры", "price": 150.0, "description": "Вместительная сумка для камеры и 2-3 объективов или вспышки."},
                {"name": "Кофр защитный противоударный", "accessory_type": "Сумки и кофры", "price": 250.0, "description": "Жесткий кейс с пенополиуретановым наполнителем для безопасной транспортировки видеооборудования."},
                
                {"name": "Карта памяти SDXC 64GB UHS-I V30", "accessory_type": "Карты памяти", "price": 200.0, "description": "Надежная скоростная карта памяти для быстрой серийной съемки и Full HD / 4K видео."},
                {"name": "Карта памяти SDXC 128GB UHS-I V30", "accessory_type": "Карты памяти", "price": 300.0, "description": "Оптимальный объем памяти для продолжительной съемки репортажей и мероприятий."},
                {"name": "Карта памяти SDXC 256GB UHS-II V90", "accessory_type": "Карты памяти", "price": 500.0, "description": "Топовая высокоскоростная карта (до 300 МБ/с) для записи 4K/60p All-Intra и высокобитрейтного RAW."},
                {"name": "Универсальный картридер USB-C / USB 3.0", "accessory_type": "Карты памяти", "price": 150.0, "description": "Быстрый карманный адаптер для считывания SD и MicroSD на ПК, Mac и планшетах."},

                {"name": "Штатив напольный универсальный", "accessory_type": "Штативы и стойки", "price": 300.0, "description": "Устойчивый трипод с 3D-головкой и быстросъемной площадкой для фотокамер."},
                {"name": "Монопод телескопический с опорой", "accessory_type": "Штативы и стойки", "price": 300.0, "description": "Легкий операторский монопод с мини-треногой для максимальной мобильности в репортаже."},
                {"name": "Мини-штатив настольный", "accessory_type": "Штативы и стойки", "price": 150.0, "description": "Компактный трипод для съемки со стола, низких ракурсов или использования в качестве рукоятки."},
                {"name": "Стойка осветительная 2.6м", "accessory_type": "Штативы и стойки", "price": 250.0, "description": "Прочная металлическая стойка с пневмоамортизацией для вспышек и осветителей."},

                {"name": "Дополнительный аккумулятор повышенной емкости", "accessory_type": "Питание и аккумуляторы", "price": 300.0, "description": "Сменный штатный аккумулятор для уверенной работы на протяжении всей смены."},
                {"name": "Внешний аккумулятор Power Bank 20000mAh PD", "accessory_type": "Питание и аккумуляторы", "price": 300.0, "description": "Мощный пауэрбанк с поддержкой быстрой зарядки USB Power Delivery для камер и стабилизаторов."},
                {"name": "Двухканальное быстрое зарядное устройство", "accessory_type": "Питание и аккумуляторы", "price": 200.0, "description": "Устройство для одновременной зарядки двух батарей от сети или USB."},

                {"name": "Защитный светофильтр UV", "accessory_type": "Фильтры и оптика", "price": 100.0, "description": "Оптический фильтр для надежной защиты передней линзы объектива от пыли, царапин и капель."},
                {"name": "Поляризационный светофильтр CPL", "accessory_type": "Фильтры и оптика", "price": 200.0, "description": "Круговой поляризатор для устранения нежелательных бликов с воды/стекла и насыщенного неба."},
                {"name": "Переменный ND-фильтр (Variable ND)", "accessory_type": "Фильтры и оптика", "price": 300.0, "description": "Плавное затемнение от 2 до 8 ступеней для съемки видео с открытой диафрагмой при ярком солнце."},

                {"name": "Кабель HDMI — MicroHDMI / MiniHDMI 2м", "accessory_type": "Коммутация", "price": 150.0, "description": "Высокоскоростной кабель для подключения накамерных мониторов и видеосендеров."},
                {"name": "Крепление накамерное Magic Arm с зажимом", "accessory_type": "Коммутация", "price": 200.0, "description": "Шарнирный кронштейн 1/4\" для фиксации микрофонов, экранов и мобильного света."},
                {"name": "Универсальный держатель для смартфона на башмак", "accessory_type": "Коммутация", "price": 150.0, "description": "Металлический зажим для установки смартфона на камеру или штатив."}
            ]

            accessories_db = []
            for ad in accessories_data:
                acc = Accessory(**ad)
                session.add(acc)
                await session.flush()
                accessories_db.append(acc)

            print(f"✅ Создано {len(accessories_db)} универсальных аксессуаров.")

            camera_acc_ids = [a.id for a in accessories_db if a.accessory_type in ["Сумки и кофры", "Карты памяти", "Штативы и стойки", "Питание и аккумуляторы"]]
            lens_acc_ids = [a.id for a in accessories_db if a.accessory_type in ["Фильтры и оптика", "Сумки и кофры"]]
            video_acc_ids = [a.id for a in accessories_db if a.accessory_type in ["Карты памяти", "Питание и аккумуляторы", "Коммутация", "Сумки и кофры"]]
            light_acc_ids = [a.id for a in accessories_db if a.name in ["Стойка осветительная 2.6м", "Крепление накамерное Magic Arm с зажимом", "Внешний аккумулятор Power Bank 20000mAh PD"]]

            eq_acc_links = set()
            for eq, _ in equipment_db_list:
                eq_id = eq.id
                if eq.equipment_type == "Фотокамеры":
                    for aid in camera_acc_ids:
                        eq_acc_links.add((eq_id, aid))
                elif eq.equipment_type == "Видеокамеры и экшн-камеры":
                    for aid in video_acc_ids:
                        eq_acc_links.add((eq_id, aid))
                elif eq.equipment_type == "Объективы":
                    for aid in lens_acc_ids:
                        eq_acc_links.add((eq_id, aid))
                elif eq.equipment_type in ["Студийный свет", "Мобильный свет", "Вспышки и синхронизаторы"]:
                    for aid in light_acc_ids:
                        eq_acc_links.add((eq_id, aid))

            for eq_id, aid in eq_acc_links:
                await session.execute(
                    text("INSERT INTO equipment_accessories (equipment_id, accessory_id) VALUES (:eq_id, :aid)"),
                    {"eq_id": eq_id, "aid": aid}
                )

            print(f"✅ Привязано {len(eq_acc_links)} аксессуаров к карточкам основной техники.")

            # 7. ПОДБОРКИ (АССОЦИАЦИИ)
            print("\n🎯 7. Создание 7 кураторских подборок (ассоциаций)...")
            associations_data = [
                {"name": "Для новичка (Быстрый старт)", "description": "Легкие и интуитивно понятные камеры, универсальные зум-объективы, простые микрофоны и надежные штативы — все для успешного первого старта.", "sort_order": 1},
                {"name": "Для профессионала (Pro Photo)", "description": "Топовые полнокадровые фотокамеры, флагманская оптика f/1.2 – f/2.8, вспышки с круглой головой и беспроводные синхронизаторы для коммерческих съемок.", "sort_order": 2},
                {"name": "Для съемки видео и клипов", "description": "Кинокамеры Cinema Line, электронные стабилизаторы, беспроводные видеосендеры, накамерный и мощный заливающий свет.", "sort_order": 3},
                {"name": "Для путешествий и влогов", "description": "Компактные стедикамы, экшн-камеры, ультралегкий полный кадр, беспроводные микрофоны и емкие аккумуляторы для мобильной съемки налегке.", "sort_order": 4},
                {"name": "Для портретной съемки", "description": "Светосильные портретные фикс-объективы 50mm и 85mm с пластичным боке, отражатели, стойки и мягкие параболические октобоксы.", "sort_order": 5},
                {"name": "Для подкастов и стримов", "description": "Многоканальные звуковые станции Rodecaster, студийные микрофоны Shure, аудиорекордеры Zoom, радиосистемы и телесуфлеры.", "sort_order": 6},
                {"name": "Студийный свет и спецэффекты", "description": "Мощные светодиодные моноблоки Bowens (300W - 600W), RGB трубки, проекционные маски Гобо, генераторы дыма и студийные вентиляторы.", "sort_order": 7}
            ]

            assoc_map = {}
            for ad in associations_data:
                assoc = Association(**ad)
                session.add(assoc)
                await session.flush()
                assoc_map[assoc.name] = assoc.id

            assoc_links = set()
            for eq, _ in equipment_db_list:
                eq_id = eq.id
                nl = eq.name.lower()

                # 1. Для новичка
                if any(x in nl for x in ["m50", "x-t30", "6400", "18-55", "16-50", "15-45", "boya by-m1", "k&f concept bi234m"]):
                    assoc_links.add((assoc_map["Для новичка (Быстрый старт)"], eq_id))

                # 2. Для профессионала
                if any(x in nl for x in ["ilce-7m4", "eos r6", "eos r8", "nikon z5", "24-70mm f/2.8", "50mm f/1.2", "85mm f/1.4", "v1c", "v1s", "v860"]):
                    assoc_links.add((assoc_map["Для профессионала (Pro Photo)"], eq_id))

                # 3. Для видео и клипов
                if any(x in nl for x in ["fx-30", "rs 4", "cineview", "c300x", "ls 300", "tamron 28-75", "16-35mm", "dji mic", "lark m2", "halo 600x"]):
                    assoc_links.add((assoc_map["Для съемки видео и клипов"], eq_id))

                # 4. Для путешествий
                if any(x in nl for x in ["pocket 4", "gopro", "7cl", "28-60mm", "x-s10", "dji mic mini", "ace 25", "power bank"]):
                    assoc_links.add((assoc_map["Для путешествий и влогов"], eq_id))

                # 5. Для портретной съемки
                if any(x in nl for x in ["85mm", "50mm", "90mm", "отражатель", "ra-d85", "v1c", "v1s", "хромакей", "lastolite"]):
                    assoc_links.add((assoc_map["Для портретной съемки"], eq_id))

                # 6. Для подкастов и стримов
                if any(x in nl for x in ["rodecaster", "shure mv7", "zoom h6", "zoom h4", "teleprompter", "lark m2", "dji mic", "blink 500"]):
                    assoc_links.add((assoc_map["Для подкастов и стримов"], eq_id))

                # 7. Студийный свет и спецэффекты
                if any(x in nl for x in ["c300x", "halo 600x", "gvm 800d", "tl30", "smoke", "вентилятор", "spotlight", "vsa-26k", "light dome"]):
                    assoc_links.add((assoc_map["Студийный свет и спецэффекты"], eq_id))

            for a_id, eq_id in assoc_links:
                await session.execute(
                    text("INSERT INTO association_equipment_association (association_id, equipment_id) VALUES (:a_id, :eq_id)"),
                    {"a_id": a_id, "eq_id": eq_id}
                )

            print(f"✅ Создано 7 подборок и {len(assoc_links)} связей с оборудованием.")

            # 8. СКИДКИ ЗА ДЛИТЕЛЬНОСТЬ (DURATION DISCOUNTS)
            print("\n⏳ 8. Настройка скидок за длительность аренды...")
            discounts_data = [
                {"min_days": 3, "discount_percentage": 10},
                {"min_days": 7, "discount_percentage": 15},
                {"min_days": 14, "discount_percentage": 20},
                {"min_days": 30, "discount_percentage": 30}
            ]
            for dd in discounts_data:
                discount = DurationDiscount(**dd)
                session.add(discount)

            await session.flush()
            print("✅ Добавлены прогрессивные скидки (от 3 дн. - 10%, от 7 дн. - 15%, от 14 дн. - 20%, от 30 дн. - 30%).")

            # 9. ОСНОВНЫЕ ПРОМОКОДЫ
            print("\n🎁 9. Создание основных промокодов на скидку...")
            promos_data = [
                {
                    "code": "WELCOME",
                    "description": "Приветственная скидка 10% на первый заказ для новых клиентов",
                    "discount_percentage": 10.0,
                    "is_active": True,
                    "max_uses_per_user": 1,
                    "created_by_id": admin_user.id
                },
                {
                    "code": "PROPHOTO",
                    "description": "Скидка 15% для фотографов и продакшн-команд",
                    "discount_percentage": 15.0,
                    "is_active": True,
                    "created_by_id": admin_user.id
                },
                {
                    "code": "WEEKEND",
                    "description": "Скидка 12% на творческие съемки выходного дня",
                    "discount_percentage": 12.0,
                    "is_active": True,
                    "created_by_id": admin_user.id
                },
                {
                    "code": "SEASON",
                    "description": "Сезонная промо-скидка 20% на весь каталог оборудования",
                    "discount_percentage": 20.0,
                    "is_active": True,
                    "created_by_id": admin_user.id
                },
                {
                    "code": "VIPCLIENT",
                    "description": "Эксклюзивная закрытая скидка 25% для постоянных резидентов",
                    "discount_percentage": 25.0,
                    "is_active": True,
                    "created_by_id": admin_user.id
                }
            ]

            for pd in promos_data:
                promo = PromoCode(**pd)
                session.add(promo)

            await session.flush()
            print(f"✅ Успешно создано {len(promos_data)} промокодов (WELCOME, PROPHOTO, WEEKEND, SEASON, VIPCLIENT).")

            # КОММИТ ВСЕХ ИЗМЕНЕНИЙ
            await session.commit()
            print("\n🎉 ВСЕ ДАННЫЕ УСПЕШНО ЗАФИКСИРОВАНЫ В БАЗЕ ДАННЫХ!")

        except Exception as e:
            await session.rollback()
            print(f"\n❌ ОШИБКА ПРИ НАПОЛНЕНИИ БАЗЫ ДАННЫХ: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    asyncio.run(run_seed())
