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
| Инфраструктура | Docker Compose (healthchecks; backend non-root; frontend — официальная модель nginx), nginx, Let's Encrypt (certbot), GitHub Actions CI |
| Безопасность | JWT (типизация + denylist), bcrypt, CSRF-валидация, rate limiting (slowapi + nginx), fail-fast секреты |
| Тесты | pytest (backend, ~1500+), vitest (frontend, 618) |

## Процесс разработки (Spec-Driven)

Проект использует [GitHub SpecKit](https://github.com/github/spec-kit): конституция — `.specify/memory/constitution.md`, функциональность начинается со спека (`/speckit.specify` → clarify → plan → tasks → implement). Программа модернизации `specs/001-platform-modernization/` завершена и влита (журнал — [Docs/CHANGELOG.md](Docs/CHANGELOG.md)). Правила разработки: [RULES.md](RULES.md).

## Архитектура

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │
│ React + Vite │ API │   FastAPI    │     │      15      │
│ nginx :80/443│     │ uvicorn:8000 │     └──────────────┘
└──────────────┘     └──────┬───────┘     ┌──────────────┐
                            │────────────▶│   Redis 7    │
                    Telegram / SMTP / PDF  └──────────────┘
```

PostgreSQL и Redis не публикуют порты наружу — доступ только внутри
compose-сети. Backend публикует `8000:8000` (для API-документации и отладки;
в жёстком проде уберите публикацию — nginx проксирует `/api/` внутри сети).

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
| Веб-интерфейс | http://localhost (prod) / http://localhost:5173 (с dev-override) |
| API | http://localhost:8000/api |
| Документация API (Swagger) | http://localhost:8000/docs (только при `DEBUG=true`) |
| PostgreSQL / Redis | без публикации портов — только внутри compose-сети (`docker compose exec db psql ...`) |

## Переменные окружения

Все переменные задаются в `.env` (см. [env.example](env.example)):

| Переменная | Назначение |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Учётные данные и имя базы PostgreSQL |
| `SECRET_KEY`, `CSRF_SECRET_KEY` | Секреты приложения (сгенерируйте случайные) |
| `DEBUG` | `true` для разработки, `false` для продакшена |
| `CORS_ORIGINS` | Разрешённые источники через запятую (по умолчанию localhost:5173,3000) |
| `REDIS_URL` | Адрес Redis (в compose задаётся автоматически: `redis://redis:6379/0`) |
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
│   ├── containers/        # Конфигурация dependency-injector (пакет)
│   ├── migrations/        # Миграции Alembic
│   ├── shared/            # Схемы Pydantic, константы (синхронизация фронт↔бэк)
│   └── tests/             # pytest-тесты (tests/attic — устаревшие, не запускаются)
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

Тесты выполняются в изолированных стеках (не затрагивают рабочий).
Все наборы — зелёные: backend unit 953 / integration 94 / e2e 17 /
critical 17 / csp-nonce 9; frontend 618.

```bash
# Backend — обёртки (из RentalApp_FASTAPI/), флаги: -u unit, -i integration,
# -e e2e, --full всё; -d — в Docker
./run_all_tests.sh -u -d          # юнит в Docker
./run_e2e_tests.sh -d             # e2e в изолированном стеке

# Backend — напрямую через compose
docker compose -f docker-compose.unit-tests.yml up --build --abort-on-container-exit
docker compose -f docker-compose.integration-tests.yml up --build --abort-on-container-exit
docker compose -f docker-compose.e2e.yml up --build --abort-on-container-exit
docker compose -f docker-compose.full-architecture-tests.yml up --build --abort-on-container-exit
# после каждого прогона: docker compose -f <файл> down -v

# Frontend — локально или в Docker
cd rental-app-main && npm run test:run
cd rental-app-main && docker compose -f docker-compose.test.yml --profile test up --build --abort-on-container-exit
```

Примечание: `docker compose exec backend pytest` не работает — тесты и pytest
не копируются в прод-образ (см. .dockerignore); используйте стеки выше.

ℹ️ `docker compose up` без `-f` запускает только прод-конфиг. Dev-настройки
(DEBUG=true, порт 5173) подключаются явно: `docker compose -f docker-compose.yml
-f docker-compose.dev.yml up -d`.

## Бэкапы и восстановление БД

```bash
scripts/backup_database.sh        # создать бэкап в db_backup/
scripts/restore_database.sh       # восстановить из бэкапа
```

UTF-8-обработка (LC_ALL/PGCLIENTENCODING) встроена в сами `scripts/backup_database.sh` и `scripts/restore_database.sh`; отдельные utf8-варианты удалены. Автоматический планировщик: `docker compose --profile backup up -d db-backup` (дамп БД + архив uploads + ротация 14 дней).

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
