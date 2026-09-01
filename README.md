# Система аренды фототехники

Полнофункциональное веб-приложение для управления арендой фотооборудования: каталог, резервации, аренды, финансовый учёт, административная панель, уведомления в Telegram и на email, генерация PDF-документов.

## Возможности

- **Каталог оборудования** — карточки техники, фильтры по брендам и типам, календарь занятости
- **Резервации и аренды** — бронирование с проверкой пересечений дат, аренда напрямую (для персонала), аксессуары к технике
- **Финансы** — автоматический расчёт стоимости, скидки, промокоды, учёт балансов
- **Панель администратора** — управление пользователями, оборудованием, резервами, дашборд со статистикой
- **Уведомления** — Telegram-бот и email (SMTP) о событиях аренды
- **Документы** — генерация PDF-договоров/актов (WeasyPrint)
- **Роли**: клиент, менеджер, администратор

## Технологический стек

| Слой | Технологии |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2 (async), Alembic, dependency-injector |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Radix UI, FullCalendar |
| База данных | PostgreSQL 15 (asyncpg) |
| Инфраструктура | Docker Compose, nginx, Let's Encrypt (certbot) |
| Безопасность | JWT, bcrypt, CSRF-защита, rate limiting (slowapi) |
| Тесты | pytest (backend), Vitest (frontend) |

## Архитектура

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │
│ React + Vite │ API │   FastAPI    │     │      15      │
│ nginx :80/443│     │ uvicorn:8000 │     │   :5432      │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                    Telegram / SMTP / PDF
```

## Быстрый старт

Требования: Docker и Docker Compose.

```bash
# 1. Клонировать репозиторий
git clone https://github.com/satol1/smart_Rental_App.git
cd smart_Rental_App

# 2. Создать .env из примера и заполнить значения
cp env.example .env

# 3. Запустить все сервисы
docker compose up -d --build

# 4. Создать администратора (при первом запуске с пустой БД)
docker compose exec backend python create_admin.py
# Логин: admin@rentalapp.com  Пароль: AdminRental2024!
# (смените пароль после первого входа)
```

После запуска:

| Что | Где |
|---|---|
| Веб-интерфейс | http://localhost |
| API | http://localhost:8000/api |
| Документация API (Swagger) | http://localhost:8000/docs |
| PostgreSQL | localhost:5433 (снаружи контейнера) |

## Переменные окружения

Все переменные задаются в `.env` (см. [env.example](env.example)):

| Переменная | Назначение |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Учётные данные и имя базы PostgreSQL |
| `SECRET_KEY`, `CSRF_SECRET_KEY` | Секреты приложения (сгенерируйте случайные) |
| `DEBUG` | `true` для разработки, `false` для продакшена |
| `TELEGRAM_TOKEN`, `DEFAULT_TELEGRAM_CHAT_ID` | Бот для уведомлений |
| `YANDEX_EMAIL_SENDER`, `YANDEX_SMTP_PASSWORD` | Отправка email через SMTP Яндекса |
| `DOMAIN`, `SSL_EMAIL` | Домен и email для сертификата Let's Encrypt (продакшен) |

## Профили Docker Compose

Дополнительные сервисы включаются флагом `--profile`:

```bash
docker compose --profile ssl up -d          # certbot: получение SSL-сертификата
docker compose --profile backup up -d       # сервис бэкапов БД
docker compose --profile diagnostics up -d  # диагностические проверки
```

## Структура проекта

```
├── RentalApp_FASTAPI/     # Backend: API, модели, сервисы, репозитории, миграции
│   ├── api/               # Роутеры, модели, утилиты
│   ├── migrations/        # Миграции Alembic
│   ├── containers.py      # Конфигурация dependency-injector
│   └── tests/             # pytest-тесты
├── rental-app-main/       # Frontend: React + TypeScript + Vite
│   ├── src/               # Компоненты, страницы, хуки
│   └── nginx/             # Конфиги nginx для SPA и проксирования API
├── deploy/                # Скрипты развёртывания (создание админа)
├── scripts/               # Бэкапы БД, миграции статусов, переключение конфигов
├── Docs/                  # Архитектурная и техническая документация
├── docker-compose.yml     # Основная конфигурация (продакшен + SSL)
└── docker-compose.limited-resources.yml  # Для слабых VPS (1 vCPU / 2 ГБ RAM)
```

## Тесты

```bash
# Backend (все тесты)
docker compose exec backend pytest

# Отдельные наборы (unit / e2e / архитектурные)
RentalApp_FASTAPI/run_unit_tests.sh
RentalApp_FASTAPI/run_e2e_tests.sh
RentalApp_FASTAPI/run_full_architecture_tests.sh

# Frontend
cd rental-app-main && npm run test:run
```

## Бэкапы и восстановление БД

```bash
scripts/backup_database.sh        # создать бэкап в db_backup/
scripts/restore_database.sh       # восстановить из бэкапа
```

Есть вариант с гарантией кодировки UTF-8: `scripts/backup_database_utf8.sh` / `scripts/restore_database_utf8.sh`.

## Развёртывание на VPS

1. Минимальная конфигурация сервера — 1 vCPU / 2 ГБ RAM (например, VPS у Бегета).
2. Для серверов с ограниченными ресурсами переключитесь на облегчённую конфигурацию:

   ```bash
   ./scripts/switch-docker-config.sh limited
   ```

3. Укажите `DOMAIN` и `SSL_EMAIL` в `.env`, затем получите SSL-сертификат:

   ```bash
   docker compose --profile ssl up -d
   ```

4. Проверьте состояние: `docker compose ps`, логи: `docker compose logs -f backend`.
