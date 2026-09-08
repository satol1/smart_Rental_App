---
description: "Task list for Platform Modernization 2026"
---

# Tasks: Platform Modernization 2026

**Input**: Design documents from `/specs/001-platform-modernization/` (spec.md, plan.md)

**Статус**: ✅ ЗАВЕРШЕНО 07-08.09.2026 (волны 1-2 + верификация). Отложено владельцем: Telegram/email-отправка и ARQ.

**Tests**: Включены для US1 (тесты на атакуемые сценарии — 41 новый) и US2/US3 (рост покрытия фронтенда: 95 → 306).

**Organization**: Задачи сгруппированы по user stories; [P] — параллелизуемые; [USn] — принадлежность к истории.

**OUT OF SCOPE (решение владельца 2026-09-07)**: реальная отправка Telegram/email-уведомлений и ARQ-инфраструктура очередей — отложено на следующий цикл.

## Phase 1: Setup

- [x] T001 Создать ветку `001-platform-modernization` от main
- [x] T002 [P] Сгенерировать tasks.md (этот файл) через /speckit.tasks
- [x] T003 [P] Доработать RULES.md современными требованиями → RULES.md 2.0 (безопасность, SpecKit, CI-шлюзы, UI-стандарты)

---

## Phase 2: Foundational

- [x] T004 [P] Исправить `Dockerfile.backend` (COPY containers.py → COPY containers/) — multistage-вариант реализован в T021
- [x] T005 [P] Разделить зависимости: pytest → requirements-test.txt; runtime-файл чистый (+ кодировка UTF-16LE → UTF-8 — иначе Linux-сборка падала)

**Checkpoint**: ✅ образ собирается; prod-requirements чистые

---

## Phase 3: User Story 1 — Доверие и защищённость данных (P1) 🎯 MVP

- [x] T006 [P] [US1] tests/api/test_csrf_protection.py — 8 тестов
- [x] T007 [P] [US1] tests/services/test_token_type_safety.py — 12 тестов
- [x] T008 [P] [US1] tests/api/test_rate_limiting.py — 6 тестов
- [x] T009 [US1] CSRF: try/except:pass убраны (4 места); double-submit + подпись itsdangerous; DISABLE_CSRF сохранён для тестов
- [x] T010 [US1] SlowAPIMiddleware зарегистрирован (200/мин) + 5/мин на login/register/refresh (api/rate_limiter.py)
- [x] T011 [US1] JWT: type claim + jti; denylist при logout (api/services/token_denylist_service.py)
- [x] T012 [P] [US1] /monitoring/stats → require_admin
- [x] T013 [P] [US1] DEBUG=false по умолчанию; /docs отключаются; ValidationError-детали только в DEBUG
- [x] T014 [P] [US1] Секреты: дефолты удалены, fail-fast валидация при DEBUG=false; пароли админ-скриптов env/CLI/генерация
- [x] T015 [P] [US1] python-jose → PyJWT 2.13.0; aiohttp → 3.14.3; passlib → bcrypt 4.3.0 (совместимость $2b$ покрыта тестом)
- [x] T016 [P] [US1] GET /health (+ @limiter.exempt)
- [x] T017 [P] [US1] Прод-composes: 5433 наружу убран; bind-mount кода убран (основной + limited)
- [x] T018 [P] [US1] nginx: X-Debug-* удалены; error_log warn; limit_req на /api/auth/ (10r/m, burst 5); ${DOMAIN}-баг прод-конфига исправлен
- [x] T019 [US1] Тесты US1 зелёные (41 passed); регрессий 0 против baseline

**Checkpoint**: ✅ US1 подтверждён тестами и runtime-smoke (контейнер: /health ok, fail-fast с перечнем секретов)

---

## Phase 4: User Story 5 — Прозрачный процесс разработки

- [x] T020 [P] [US5] .github/workflows/ci.yml (backend ruff+pytest; frontend eslint+build+vitest; docker build на main)
- [x] T021 [P] [US5] Dockerfile.backend: multistage, appuser, HEALTHCHECK (/health), weasyprint-библиотеки в runtime
- [x] T022 [P] [US5] Dockerfile.frontend: npm ci, прод-nginx по умолчанию, USER nginx, HEALTHCHECK (проверено живым контейнером)
- [x] T023 [P] [US5] .dockerignore ×2; .gitignore больше не игнорирует .dockerignore
- [x] T024 [P] [US5] .pre-commit-config.yaml (ruff, ruff-format, hooks, eslint advisory)
- [x] T025 [P] [US5] .github/dependabot.yml (pip/npm/actions, weekly)
- [x] T026 [P] [US5] Мусор удалён (app.log 12МБ, .bak/.old, htmlcov, кэши, протухшие test-results)
- [x] T027 [P] [US5] Healthchecks в compose (backend/frontend)

---

## Phase 5: User Story 2 — Быстрый и живой интерфейс (P2)

- [x] T028 [P] [US2] React.lazy+Suspense на все страницы + PageFallback
- [x] T029 [P] [US2] manualChunks (react-vendor/radix/query/charts); entry 2479→268 КБ
- [x] T030 [P] [US2] framer-motion + src/lib/motion.ts (токены 150/200/300мс)
- [x] T031 [US2] AnimatedOutlet + MotionConfig reducedMotion="user"
- [x] T032 [P] [US2] Stagger-каскады каталога/резервов + layout-анимации
- [x] T033 [P] [US2] SkeletonList/SkeletonCard/SkeletonTable внедрены
- [x] T034 [P] [US2] logo.png 768КБ → logo.webp 49КБ
- [x] T035 [US2] Тесты lazy/theme/skeleton (16 шт.)

**Checkpoint**: ✅ первая загрузка ~3.4МБ → ~873КБ raw (~240КБ gzip)

---

## Phase 6: User Story 3 — Современный единый визуальный язык (P2)

- [x] T036 [P] [US3] Тёмная тема: themeStore + ThemeSwitcher + .dark-токены + анти-мигание inline-скрипт
- [x] T037 [P] [US3] recharts + ui/chart.tsx; Pie структуры заказов + Bar топ-техники на реальных данных
- [x] T038 [P] [US3] StatusBadge/RoleBadge/MoneyText — внедрение в 14+ мест
- [x] T039 [P] [US3] i18n: react-i18next + ru.json (nav/auth/common/forms/errors)
- [x] T040 [P] [US3] Accessibility: aria-label ~30 иконным кнопкам, aria-hidden декоративным, focus-visible
- [x] T041 [US3] Тесты фронтенда: 95 → 306 (304 зелёных; 2 — пре-существующие)

---

## Phase 7: User Story 4 — Готовность к росту нагрузки (P3)

- [x] T042 [US4] Redis 7-alpine в обоих прод-compose (healthcheck, volume, limits в limited)
- [x] T043 [US4] RedisClient (ленивый, exception-safe, fallback) + REDIS_URL в Settings
- [x] T044 [US4] Хранилища → Redis: slowapi storage, brute-force (INCR/SETEX), denylist; in-memory fallback сохранён (проверено живым Redis + FakeRedis-тесты)
- [x] T045 [P] [US4] pool_pre_ping=True; POSTGRES_POOL_SIZE/MAX_OVERFLOW из env
- [x] T046 [P] [US4] Кэш дашборда (dashboard:summary, TTL 60с, инвалидация в 7 точках мутаций)

*(ARQ, отправка Telegram/email — отложено, см. OUT OF SCOPE)*

---

## Phase 8: Polish & Cross-Cutting

- [x] T047 [P] any 118 → 0; tsc 195 → 0; build = `tsc --noEmit -p tsconfig.app.json && vite build`
- [x] T048 [P] @fullcalendar/* (5 пакетов) удалены; @eslint/eslintrc и @types/* → devDependencies
- [x] T049 [P] useAdminHolidays → HolidayService; ConvertReservationDialog — прямых вызовов не оказалось
- [x] T050 [P] require_admin унифицирован (9 эндпоинтов admin_security); api/dependencies/ удалён; db.commit() убран; smoke-скрипты → tests/attic/
- [x] T051 [P] Документация: README, Docs/ARCHITECTURE, DEPLOYMENT, CHANGELOG (v5.0)
- [x] T052 Финальная верификация: compose config ✅; backend smoke 111 маршрутов ✅; 41 security-тест ✅; фронт build 10.7s + 304/306 ✅; docker build образа ✅; runtime: /health, /docs-гейтинг, fail-fast секретов — живой контейнер ✅

---

## Dependencies & Execution Order (фактическое исполнение)

- **Волна 1** (параллельно): US1-бэкенд (A) ∥ US5-инфра (B) ∥ US2+US3-фронтенд (C) — завершено
- **Волна 2** (параллельно): US4+гигиена-бэкенд (E) ∥ качество-фронтенд (D) — завершено
- **Волна 3**: документация + интеграционная верификация (координатор) — завершено

## Notes
- Коммитов нет — работа в ветке `001-platform-modernization`, 258+ изменённых файлов; решение о коммите за владельцем
- Перед деплоем: см. Docs/DEPLOYMENT.md «Обязательные шаги при деплое на v5.0» (секреты, DEBUG, ротация)
- Следующий цикл: ARQ + реальная отправка Telegram/email; вес backend-образа (matplotlib/weasyprint-слой); глубокая консолидация compose
