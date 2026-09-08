# Implementation Plan: Platform Modernization 2026

**Branch**: `001-platform-modernization` | **Date**: 2026-09-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-platform-modernization/spec.md`

## Summary

Трёхуровневая модернизация: (1) закрытие критических дыр безопасности и поломанной сборки, (2) инфраструктура доверия — CI/CD, образы, nginx, (3) современный фронтенд — code splitting, framer-motion, тёмная тема, графики, i18n-структура, тесты. Затем — горизонт масштабируемости (Redis, фоновые задачи). Основа — аудит `Reports/AUDIT_REPORT_2026-09-07.md`.

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript 5.8 strict (frontend)

**Primary Dependencies**: FastAPI 0.116, SQLAlchemy 2 async, Alembic, dependency-injector; React 19, Vite 6, Tailwind 3.4, Radix/shadcn, TanStack Query 5, zustand, react-hook-form + zod, framer-motion (новая)

**Storage**: PostgreSQL 15 (asyncpg); Redis 7 (новая — кэш, rate limit, сессии)

**Testing**: pytest (~1930 тестов, 5 compose-профилей), vitest + Testing Library (79 → цель 300+), Playwright (новая — e2e)

**Target Platform**: Linux VPS, Docker Compose; браузеры evergreen + мобильные

**Project Type**: web-application (FastAPI backend + React SPA)

**Performance Goals**: LCP ≤3s на 3G; TBT <200ms; p95 API <300ms; фоновые задачи без деградации API >10%

**Constraints**: 1 VPS (1–2 vCPU / 2GB RAM профиль limited); без простоя продакшена; существующие тесты продолжают проходить

**Scale/Scope**: 21 страница, 179 компонентов, 18 роутеров API, ~16 таблиц

## Constitution Check

*GATE: пройден. План соответствует принципам I–VI конституции: слоистость сохраняется, безопасность по умолчанию (фаза 0), spec-driven (этот документ), тесты-шлюз (фаза 1 вводит CI), единообразие UI через токены и общие примитивы (фаза 3), YAGNI — без микросервисов и Kubernetes.*

## Phases

### Фаза 0 — Критические исправления (.hotfix, ~3-5 дней)

Приоритет выше всего; каждое исправление сопровождается тестом на атакуемый сценарий.

| ID | Работа | Файлы (из аудита) |
|----|--------|-------------------|
| 0.1 | Восстановить сборку бэкенда: заменить `COPY containers.py` на корректные пути (пакет `containers/`) | `Dockerfile.backend:25` |
| 0.2 | CSRF: убрать `try/except: pass` вокруг `validate_csrf` во всех auth-эндпоинтах; тест на запрос без токена → 403 | `api/auth_api.py:87-91,113-116,155-159,182-185` |
| 0.3 | Rate limit: зарегистрировать `SlowAPIMiddleware`, строгие лимиты на /auth/login, /auth/register, /auth/refresh (напр. 5/мин) | `api/main_api.py:72,149-150` |
| 0.4 | JWT: проверка claim `type` в `get_user_by_token`; denylist refresh-токенов при logout; ротация refresh при каждом /auth/refresh | `api/dependencies.py:43`, `api/auth_api.py` |
| 0.5 | Секреты: удалить дефолты `SECRET_KEY`/`CSRF_SECRET_KEY`/`POSTGRES_PASSWORD` из Settings — fail-fast при DEBUG=false; вынести пароли из `create_admin.py`/`reset_admin_password.py` в env/аргументы | `config/core.py:16-30`, `create_admin.py:21`, `reset_admin_password.py:33` |
| 0.6 | Закрыть `GET /monitoring/stats` за require_admin | `api/main_api.py:163` |
| 0.7 | Прод-гигиена: DEBUG по умолчанию false; `/docs`+`/openapi.json` отключаются при DEBUG=false; ValidationError-детали только в DEBUG | `config/core.py:37`, `api/main_api.py:75,80-101` |
| 0.8 | Compose: убрать публикацию 5433:5432 из прода (доступ только внутри сети); убрать bind-mount `./RentalApp_FASTAPI:/app` из прод-сервиса | `docker-compose.yml` |
| 0.9 | nginx: убрать X-Debug-* заголовки и `error_log debug` из прода; добавить `limit_req` на /api/auth/ | `rental-app-main/nginx/nginx.conf` |
| 0.10 | Зависимости: `python-jose` → `pyjwt` (или ≥3.4), `aiohttp` ≥ актуальных security-фиксов, `passlib` → прямой `bcrypt`; перенести pytest из requirements.txt в requirements-test.txt | `requirements.txt:39,51,54,76` |
| 0.11 | Ротация скомпрометированных секретов вне репо: Telegram-токен, SMTP-пароль, пароль БД; `.env` — только шаблон, реальный — вне дерева проекта | `.env` (диск), BotFather / Яндекс |
| 0.12 | Удалить мусор: `app.log` (12.6MB), `containers.py.bak/.old`, `.venv`, пустые `api/deps/`, `api/dependencies/`, протухшие test-results | каталог `RentalApp_FASTAPI` |

### Фаза 1 — CI/CD и образы (~1 неделя)

| ID | Работа |
|----|--------|
| 1.1 | GitHub Actions: пайплайн `backend` (ruff, mypy, pytest unit), `frontend` (eslint, `tsc -b`, vitest), `docker build` обоих образов; обязательный status check |
| 1.2 | Dockerfile.backend: multistage (builder → runtime), без requirements-test.txt, `USER nonroot`, `HEALTHCHECK` (/health endpoint добавить) |
| 1.3 | Dockerfile.frontend: `npm ci`, prod-nginx конфиг в образ по умолчанию (не dev), `HEALTHCHECK`, non-root (nginx-unprivileged) |
| 1.4 | `.dockerignore` в обоих контекстах; убрать правило игнора `.dockerignore` из `.gitignore:58` |
| 1.5 | pre-commit: ruff, ruff-format, eslint --fix, tsc; зависимость файлы в git |
| 1.6 | Renovate/Dependabot для ежемесячных обновлений зависимостей |
| 1.7 | Консолидация compose: базовый + dev.override + limited (цель: ≤4 файлов вместо 9), удалить мёртвый `nginx/nginx.conf` (корневой пустой каталог) |
| 1.8 | Healthchecks в compose для backend/frontend; restart-политики уже есть |

### Фаза 2 — Фронтенд: производительность и современный UI (~2-3 недели)

Выполняется с навыками **framer-motion-animator** и **ui-ux-pro-max**.

| ID | Работа |
|----|--------|
| 2.1 | Code splitting: `React.lazy`+`Suspense` на все 21 страницу (App.tsx), `manualChunks` (react-vendor, radix-ui, calendar, charts); Suspense-fallback — скелетоны |
| 2.2 | Ассеты: сжать logo.png (768KB → WebP ≤100KB), lazy-loading изображений с зарезервированным местом (CLS <0.1) |
| 2.3 | framer-motion: подключить, ввести шкалу motion-токенов (fast 150ms / base 200ms / slow 300ms, easing standard); page transitions, stagger для списков карточек, анимации dialog/drawer, feedback кнопок; `useReducedMotion` глобально |
| 2.4 | Тёмная тема: рабочий переключатель (zustand store + класс на html + сохранение в localStorage), полный проход `.dark` по токенам, графики и модалки в обеих темах; дефолт — системная |
| 2.5 | Дизайн-токены: финализировать палитру (основа — текущая тёплая светлая; тёмная — производная; операции-акценты статусов согласованы между списками/модалками/таблицами); ликвидировать оставшиеся сырые hex |
| 2.6 | Графики: recharts на admin Dashboard (выручка по месяцам, число аренд, загрузка топ-техники); переиспользуемый `ui/chart.tsx` с токенами тем |
| 2.7 | Скелетоны: единый `SkeletonList/SkeletonCard` во всех списках (сейчас 7 из 69 файлов с loading) |
| 2.8 | i18n-структура: react-i18next с одним словарём ru; вынести тексты 21 страницы (поэтапно: сначала layout/навигация/формы) |
| 2.9 | Единые компоненты отображения сущностей: `StatusBadge`, `RoleBadge`, `MoneyText` — убрать расхождения между разделами |
| 2.10 | Accessibility-проход: контраст, фокус-обводки, aria-label иконных кнопок, зоны ≥44px, `html lang`; axe-проверка в CI |
| 2.11 | Типы: ликвидировать ~118 `any` (сначала services/hooks), сборка = `tsc -b && vite build` |
| 2.12 | Мёртвый код: удалить 5 пакетов @fullcalendar/*, вернуть `@eslint/eslintrc`/`@types/*` в devDependencies; убрать прямые axios-вызовы в `ConvertReservationDialog.tsx`, `useAdminHolidays.ts` (через сервисы) |
| 2.13 | Тесты фронтенда до ≥300: критические формы (логин, бронирование, админ-диалоги), ключевые хуки; Playwright e2e: happy-path бронирования и входа |

### Фаза 3 — Бэкенд: масштабируемость и надёжность (~2 недели, после фазы 1)

| ID | Работа |
|----|--------|
| 3.1 | Redis: добавить сервис в compose; rate limit slowapi → storage redis; brute-force защита → redis; denylist токенов → redis |
| 3.2 | Фоновые задачи: ARQ (легковеснее celery для 1 VPS) — отправка email/Telegram уведомлений из очереди, overdue_checker по расписанию; реализовать фактическую отправку Telegram (сейчас только запись в БД) |
| 3.3 | Пул: `pool_pre_ping=True`; размер пула из env |
| 3.4 | Кэш: каталог/фильтры и дашборд-агрегаты — redis TTL 60с с инвалидацией по событиям изменений |
| 3.5 | Структурированные логи (structlog JSON в проде), ротация; убрать дублирующий `db.commit()` в `auth_service.py:78` |
| 3.6 | Гигиена: унифицировать `get_current_admin_user` с `permissions.py`; ликвидировать каталог `api/dependencies/` vs модуль `api/dependencies.py`; 3 тест-файла вне tests/ перенести |
| 3.7 | Alembic: конвенция имён (авто-id, без XXXX), обязательный downgrade; `/api/v1` префикс для новых эндпоинтов |
| 3.8 | Снижение веса образа: matplotlib/numpy вынести в отдельный optional-слой (только PDF-генерация) или заменить weasyprint-графики на SVG |

### Фаза 4 — Процесс и документация (параллельно, постоянно)

- Все новые фичи — только через `/speckit.specify → clarify → plan → tasks → implement`.
- Обновить Docs/ARCHITECTURE, DEPLOYMENT, README под новое состояние (compose, CI, redis).
- CHANGELOG по фазам; правило безопасности из конституции II — hotfix-патчи вне спеков.

## Project Structure

### Documentation (this feature)

```text
specs/001-platform-modernization/
├── spec.md              # ЧТО и ДЛЯ КОГО (бизнес-уровень)
├── plan.md              # Этот файл — КАК
└── tasks.md             # Декомпозиция — сгенерировать /speckit.tasks
```

### Source Code (изменения поверх существующей структуры)

```text
rental-app-main/src/
├── components/ui/       # + chart.tsx, status-badge.tsx, skeleton-list.tsx
├── hooks/useTheme.ts    # тёмная тема
├── lib/motion.ts        # шкала motion-токенов framer-motion
└── i18n/                # словарь ru, конфиг react-i18next

RentalApp_FASTAPI/
├── api/tasks/           # ARQ-задачи (уведомления, overdue)
├── api/health_api.py    # /health для Docker HEALTHCHECK
└── config/core.py       # fail-fast секреты

.github/workflows/ci.yml # пайплайн
docker-compose.yml       # + redis, healthchecks, без наружной БД
```

**Structure Decision**: существующая слоистая структура сохраняется (конституция I); новые сущности встраиваются в неё, новых верхнеуровневых слоёв не появляется.

## Порядок исполнения и зависимости

```text
Фаза 0 (security hotfix)  ──► Фаза 1 (CI/CD) ──► Фаза 2 (frontend UX)
                                        │
                                        └──► Фаза 3 (backend scale)
Фаза 4 (process) — параллельно с 1-3
```

Фаза 0 выполняется немедленно и независимо; фазы 2 и 3 могут идти параллельно после фазы 1 (разные исполнители/каталоги).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| +Redis-сервис | FR-012: общее состояние для нескольких экземпляров | In-memory состояние уже показало неработоспособность (K2, brute-force) |
| +ARQ (фоновые задачи) | FR-011: асинхронные уведомления | BackgroundTasks FastAPI не переживает рестарт и не масштабируется |
