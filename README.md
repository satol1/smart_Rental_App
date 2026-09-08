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
| Backend | Python 3.11, FastAPI, SQLAlchemy 2 (async), Alembic, dependency-injector, PyJWT, bcrypt |
| Frontend | React 19, TypeScript (strict), Vite, Tailwind CSS, Radix UI, framer-motion, recharts, react-i18next |
| База данных | PostgreSQL 15 (asyncpg) |
| Кэш/состояние | Redis 7 (rate limit, denylist токенов, защита от брутфорса, кэш дашборда; graceful fallback в память) |
| Инфраструктура | Docker Compose (non-root образы, healthchecks), nginx, Let's Encrypt (certbot), GitHub Actions CI |
| Безопасность | JWT (типизация + denylist), bcrypt, CSRF-валидация, rate limiting (slowapi + nginx), fail-fast секреты |
| Тесты | pytest (backend, ~1970), vitest (frontend, 306) |

## Процесс разработки (Spec-Driven)

Проект использует [GitHub SpecKit](https://github.com/github/spec-kit): конституция — `.specify/memory/constitution.md`, функциональность начинается со спека (`/speckit.specify` → clarify → plan → tasks → implement). Текущая программа модернизации: `specs/001-platform-modernization/` (spec + plan + tasks). Правила разработки: [RULES.md](RULES.md).

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
   # Пароль: аргумент CLI, env ADMIN_INITIAL_PASSWORD, либо будет сгенерирован и выведен в консоль
   docker compose exec backend python create_admin.py
```

**Важно (после модернизации 2026-09):** в продакшене (`DEBUG=false`) приложение отказывается стартовать без явно заданных `SECRET_KEY`, `CSRF_SECRET_KEY`, `POSTGRES_PASSWORD` (минимум 32 символа для секретов) — это защита от запуска с дефолтными значениями. База данных больше не публикуется наружу; добавлен сервис Redis.

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

Тесты выполняются в изолированных стеках (не затрагивают рабочий). Из `RentalApp_FASTAPI/`:

```bash
# Backend — наборы (unit / integration / e2e / все сразу)
docker compose -f docker-compose.unit-tests.yml up --build --abort-on-container-exit
docker compose -f docker-compose.integration-tests.yml up --build --abort-on-container-exit
docker compose -f docker-compose.e2e.yml up --build --abort-on-container-exit
docker compose -f docker-compose.full-architecture-tests.yml up --build --abort-on-container-exit
# после каждого прогона: docker compose -f <файл> down -v

# Обёртки (те же наборы, с очисткой)
./run_unit_tests.sh -d
./run_e2e_tests.sh -d

# Backend локально (нужен .venv с requirements-test.txt)
pytest tests/services/ -m "not slow"

# Frontend
cd rental-app-main && npm run test:run
```

Примечание: `docker compose exec backend pytest` больше не работает — тесты и
pytest не копируются в прод-образ (см. .dockerignore); используйте стеки выше.

⚠️ `docker compose up` без `-f` подхватывает `docker-compose.override.yml`
(dev-режим: DEBUG=true, порт 5173). Для прод-запуска на сервере используйте
`docker compose -f docker-compose.yml up -d` и переименуйте/удалите override.

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
