# AGENTS.md — Smart Rental App

Правила проекта для coding-агентов. Общие принципы (качество кода, безопасность, выбор
инструментов) задаёт глобальный AGENTS.md ZCode — здесь только специфика этого репозитория.

## Project Overview

Веб-приложение аренды фототехники: публичный каталог, резервации и аренды с проверкой
пересечений дат, финансовый учёт (балансы, промокоды, штрафы), админ-панель, уведомления
Telegram/email, PDF-документы. Роли: клиент / менеджер / администратор.

- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2 async, Alembic, dependency-injector — `RentalApp_FASTAPI/`
- **Frontend**: React 19, TypeScript strict, Vite, Tailwind + shadcn/Radix — `rental-app-main/`
- **Инфра**: PostgreSQL 15 + Redis 7; деплой Docker Compose на VPS (минимум 1 vCPU / 2 ГБ), nginx, Let's Encrypt
- **CI**: GitHub Actions — ruff + pytest (backend), eslint + tsc + vitest + build (frontend), контроль дрейфа API-контракта через OpenAPI

Подробности: [README.md](README.md) • [Docs/ARCHITECTURE.md](Docs/ARCHITECTURE.md) • [Docs/DEVELOPER_GUIDE.md](Docs/DEVELOPER_GUIDE.md) • продукт — [PRODUCT.md](PRODUCT.md)

## Architecture

Backend — слоистый: роутер (`api/*_api.py`) → сервис (`api/services/`) → репозиторий (`api/repositories/`).

- Роутеры тонкие: без бизнес-логики и SQL; сервисы не знают про HTTP; весь SQL инкапсулирован в репозиториях.
- В сложных доменах (`availability`, `dashboard`, `order`, `equipment`) есть один сервис-фасад —
  единственная точка входа (`AvailabilityService`, `DashboardService`, `RentalLifecycleService`…).
  Внутренние под-сервисы напрямую из роутеров не вызывать.
- CQS: команды (изменяют состояние) — `services/order/`; запросы — `*QueryService`. Не смешивать.
- Все денежные расчёты — только через `FinancialService`; любые изменения баланса пользователя —
  только через `BalanceService` (атомарность + история).
- DI через `dependency-injector`: `@inject` + `Depends(Provide[Container.x])`; экземпляры сервисов вручную не создавать.

Frontend:

- Транспорт — только через сервисы `src/core/services/*` (`ReservationService`, `RentalService`,
  `EquipmentService`…); прямые axios-вызовы в компонентах и хуках запрещены.
- Серверное состояние — TanStack Query; клиентское — zustand (persist — только тема);
  формы — react-hook-form + zod, схемы централизованы в `src/lib/validationSchemas.ts`.
- Логика — в хуках (`src/hooks/`, `src/hooks/features/`, `src/hooks/admin/`); компоненты занимаются только отображением.
- Контракт фронт↔бэк: `shared/schemas` (бэк) и `src/types/api/schema.d.ts` (генерация `npm run gen:api`).

## Commands

Backend (из `RentalApp_FASTAPI/`):

```bash
ruff check .                                              # линт
python -m pytest tests -m "not integration and not e2e and not slow" -q   # юнит (нужен TEST_DATABASE_URL)
./run_all_tests.sh -u          # обёртки: -u unit, -i integration, -e e2e, --full; -d — в Docker
./run_e2e_tests.sh -d
docker compose -f docker-compose.unit-tests.yml up --build --abort-on-container-exit   # изолированный стек
docker compose -f docker-compose.unit-tests.yml down -v                              # после каждого прогона
```

Frontend (из `rental-app-main/`):

```bash
npm run lint                 # eslint (0 ошибок — гейт)
npm run build                # tsc --noEmit + vite build (typecheck входит в сборку)
npm run test:run             # vitest
npm run test:e2e             # Playwright smoke: нужен бэкенд на VITE_API_PROXY_TARGET (:8001)
                             # с сидом scripts/seed_e2e_smoke.py; workers:1 из-за rate-limit
npm run gen:api              # типы из RentalApp_FASTAPI/openapi.json (экспорт: scripts/export_openapi.py)
npm run check:api-types      # контроль дрейфа контракта
npm run check:design-tokens  # гейт дизайн-токенов
```

Docker:

```bash
docker compose up -d --build                       # прод-стек
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d   # dev-оверлей (DEBUG=true, :5173)
docker compose -f docker-compose.limited-resources.yml up -d --build   # слабый VPS
docker compose config -q                           # проверка конфига после любых правок compose
```

## Project Rules

- Конституция `.specify/memory/constitution.md` главенствует при конфликтах с любыми другими правилами.
- Spec-driven: функциональность начинается со спека (`specs/NNN-name/`, SpecKit-флоу specify → clarify →
  plan → tasks). Исключение — багфиксы <50 строк и security-hotfix.
- Схема БД — только через Alembic-миграции: авто-ID ревизий, рабочий downgrade, одна голова.
- API-контракт `/api/v1` обратно совместим или версионируется. После правок бэка — обновить
  OpenAPI и типы фронта (`gen:api`); сгенерированный `openapi.json` не коммитится.
- UI: только design-токены (сырые hex в компонентах запрещены — гейт eslint + `check:design-tokens`);
  примитивы `src/components/ui/` прежде кастома; тексты интерфейса — в словари `src/i18n/`;
  `any` запрещён в новом коде; новые страницы — `React.lazy` + Suspense со скелетонами.
- Секреты — только через env; прод без явных `SECRET_KEY`/`CSRF_SECRET_KEY`/`POSTGRES_PASSWORD`
  не стартует (fail-fast). Утечка секрета = немедленная ротация.
- Прод-образ не содержит pytest и тестовых зависимостей — тесты гоняются отдельными compose-стеками
  (см. Commands), не `docker compose exec backend pytest`.
- Работа — в feature-ветках; main защищён CI, красный CI не сливается.
- Защита, которая написана, должна быть включена: мёртвый код защиты приравнивается к уязвимости.

## UI / Design

Дизайн-система проекта описана в [Docs/DESIGN_SYSTEM.md](Docs/DESIGN_SYSTEM.md) и манифесте
[DESIGN.md](DESIGN.md) («Digital Rental»). Она имеет приоритет над любыми универсальными
design-скиллами агента.

- Токены: CSS-переменные `src/index.css` → `tailwind.config.js` → cva-примитивы `src/components/ui/`.
- Шрифты — Onest; кириллица обязательна.
- Анимации — framer-motion по единой шкале 150/200/300 мс (`src/lib/motion.ts`), обязательно
  уважение `prefers-reduced-motion`; анимация несёт смысл, а не украшение.
- Доступность WCAG 2.1 AA: контраст 4.5:1, видимая фокус-обводка, интерактивные зоны ≥44px.
- Проектная запись дизайн-системы для Impeccable — `.impeccable/design.json`; обновлять при изменении системы.

## Database

- PostgreSQL 15 (asyncpg). Модели — `RentalApp_FASTAPI/api/models/`, миграции — `RentalApp_FASTAPI/migrations/`.
- Прод-правки схемы — только миграциями и только после бэкапа (`scripts/backup_database.sh`,
  профиль `backup`; тест восстановления — `backup-restore-test`).
- Порты БД и Redis наружу не публикуются.

## Testing

- Backend: pytest (~1600 тестов), маркеры `unit` / `integration` / `e2e` / `slow`; изолированные
  compose-стеки в `RentalApp_FASTAPI/`, после прогона — `down -v`.
- Frontend: vitest (компоненты, хуки, утилиты), Playwright e2e smoke (`e2e/smoke.spec.ts`).
- Новый функционал сопровождается тестами; security-фикс — тестом на атакуемый сценарий.

## Deployment

- Прод — `docker compose up -d --build` (или `docker-compose.limited-resources.yml` для слабых VPS).
- Наружу — только 80/443 фронтенда; `DEBUG=false` отключает /docs и стек-трейсы.
- SSL — профиль `--profile ssl` (certbot); полная инструкция — [Docs/DEPLOYMENT.md](Docs/DEPLOYMENT.md).

## Definition of Done

- Backend: `ruff check .` чист, затронутые pytest-наборы зелёные.
- Frontend: `npm run lint` и `npm run test:run` зелёные, `npm run build` проходит.
- UI-изменения: токены (не сырые цвета), проверены обе темы и reduced-motion.
- Миграции: upgrade и downgrade проверены; API-контракт не сломан (`check:api-types`).
- Правки инфраструктуры: `docker compose config -q` без ошибок.
