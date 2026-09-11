# Полный аудит RentalApp и план поэтапного внедрения улучшений

**Дата:** 11.09.2026 · **Ветка:** `feat/rental-design-system-v2` · **Охват:** бэкенд (146 файлов API), фронтенд (423 TS/TSX), контракт API, Docker/nginx/тесты/CI.

Аудит проводился четырьмя параллельными направлениями (бэкенд, фронтенд/UI-UX, контракт фронт↔бэк, инфраструктура). Все находки уровня «критично» перепроверены вручную по коду. Пути фронтенда указаны от `rental-app-main/src`, бэкенда — от `RentalApp_FASTAPI`.

---

## 1. Резюме

Проект в целом зрелый: анти-овербукинг на `pg_advisory_xact_lock` реализован корректно, строгая типизация фронтенда (2 `any` на 423 файла), грамотные manualChunks и lazy-роутинг, образцовый контур загрузки изображений, ~1577 активных тестов бэкенда. Основной техдолг сосредоточен в четырёх зонах:

1. **Финансы на float** — все денежные поля и расчёты на `Float`, расхождения копеек гарантированы при росте оборота.
2. **Админка отстала от редизайна** — «тряска» при смене разделов (диагностирована ранее, не исправлена), старая палитра (649 палитровых классов, тёмная тема сломана), 4 разных стиля ошибок.
3. **Рассинхрон контракта фронт↔бэк** — периодные фильтры админки молча не работают (camelCase vs snake_case), защита от удаления оборудования в активной аренде не срабатывает ни на фронте, ни на бэке.
4. **Инфраструктура** — API торчит наружу мимо nginx/TLS, бэкапы только ручные, integration/e2e-тесты и eslint фронта не защищают main.

Обнаружено **3 проверенные критические уязвимости/бага в рантайме** и **2 критические проблемы данных** (дубликат миграции + float-деньги).

---

## 2. Критические находки (проверены вручную)

| # | Проблема | Где | Последствие |
|---|----------|-----|-------------|
| К1 | `GET /api/calendar/events` **без авторизации** отдаёт ФИО клиентов (`"Резерв: {user.full_name}"`) | `api/calendar_api.py:148`, `api/services/availability/calendar.py:63` | Утечка ПД: аноним выгружает всех клиентов и их брони |
| К2 | Периодные фильтры админ-списков молча не работают: фронт шлёт `periodType/periodOffset`, бэк ждёт `period_type/period_offset` без алиасов | `src/core/services/RentalService.ts:58`, `ReservationService.ts:145` ↔ `api/admin_rental_api.py:30-31`, `admin_reservation_api.py:63-64` | Менеджер видит «все записи» вместо выбранного периода; неверные totals |
| К3 | Удаление оборудования с активными резервами/арендами: фронт читает camelCase (`hasActiveReservations`), бэк отдаёт snake_case; бэкенд проверку связей тоже не делает | `src/hooks/admin/useEquipmentTableLogic.ts:13,63` ↔ `shared/schemas/equipment_schema.py:139`; `api/services/equipment_crud_service.py:52-59` | Порча данных — осиротевшие резервы/аренды |
| К4 | Две миграции создают одну таблицу `security_audit_logs` на разных ветках (обе достижимы через merge-heads) | `migrations/versions/014_add_security_audit_logs.py:21` и `a5a01de73060_...py:25` | `alembic upgrade head` падает на чистой БД — свежий деплой/CI невозможен |
| К5 | Все деньги на `Float`: модели (`reservation.py:34-35`, `rental.py:34-39`, `payment.py:16`, `user.py:25`), расчёты (`financial_service.py:154-176`), `user.balance += amount` (`balance_service.py:49`) | см. ссылки | Расхождения копеек, `sum(history) ≠ users.balance` |

---

## 3. План поэтапного внедрения

Этапы упорядочены по принципу «сначала то, что ломает данные и пользователей сейчас, потом безопасность, потом UX, потом архитектура и качество». Каждый этап можно выпускать отдельным PR/группой PR; внутри этапа порядок задач примерно соответствует приоритету.

### Этап 0 — Хотфиксы (1–2 дня, ветка от main)

Цель: убрать то, что прямо сейчас врёт пользователю и ломает деплой.

| Задача | Что делать | Проверка приёмки |
|--------|-----------|------------------|
| 0.1 **Фикс периодных фильтров** (К2) | Добавить `alias="periodType"` / `alias="periodOffset"` в query-параметры `admin_rental_api.py:30-31` и `admin_reservation_api.py:63-64` (алиасы уже используются в каталоге equipment — паттерн есть) | В админке «Резервы/Аренды» выбор «неделя/месяц/квартал/год» + смещение реально фильтрует список; totals совпадает |
| 0.2 **Запрет удаления связанного оборудования** (К3) | Бэк: в `equipment_crud_service.delete_equipment` проверять активные резервы/аренды → 409 с деталями. Фронт: в `useEquipmentTableLogic.ts:13` переименовать поля под фактический snake_case-ответ | Попытка удалить оборудование в аренде → понятная ошибка; API возвращает 409 |
| 0.3 **Авторизация календаря** (К1) | `GET /calendar/events` под `require_user`; из `title` для не-менеджеров убрать `full_name` (оставить «Занято/Резерв») | Анонимный запрос → 401; авторизованный без роли manager не видит ФИО |
| 0.4 **Дубликат миграции** (К4) | Удалить одну из двух миграций `security_audit_logs` (ту, что на менее используемой ветке) либо сделать `CREATE TABLE IF NOT EXISTS` + почистить merge-heads | `alembic upgrade head` на чистой БД проходит; `alembic heads` = 1 head |
| 0.5 **Промокоды: пагинация и статусный фильтр** | `useAdminPromoCodes.ts:27` — передавать limit (или все с пагинацией в UI); фронт `AllReservationsManagementPage.ts:64`: убрать/добавить поддержку `fulfilled/cancelled` в `_apply_status_filter` (`reservation_filter_repository.py:128-145`) | В админке видно >10 промокодов; табы фильтров показывают то, что написано |
| 0.6 **`docker-compose.override.yml` убрать из автоподхвата** | Переименовать в `docker-compose.dev.yml` (запуск только явным `-f`); файл закоммичен и ставит `DEBUG=true` + dev-nginx на любом `docker compose up` | `docker compose up` на сервере не включает debug |

### Этап 1 — Безопасность и инфраструктура (3–5 дней)

| Задача | Что делать |
|--------|-----------|
| 1.1 **Закрыть публичный порт бэкенда** | `docker-compose.yml:50-51`: убрать публикацию `8000:8000` (nginx ходит по внутренней сети) либо `127.0.0.1:8000:8000` — сейчас API доступен мимо TLS/rate-limit/security-headers |
| 1.2 **Автоматизация бэкапов БД + uploads** | Сервис db-backup сейчас простаивающий echo-контейнер (`docker-compose.yml:165-183`). Добавить sidecar с циклом `pg_dump` + ротация; том `uploads_data` не бэкапится вообще — добавить tar-бэкап. Консолидировать 8 бэкап-скриптов (4 варианта дублируются, utf8/не-utf8 расходятся) до sh+bat |
| 1.3 **CSRF: убрать «декоративную» зависимость** | `csrf_protect: CsrfProtect = Depends()` стоит почти во всех роутерах, но `validate_csrf` вызывается только в 4 auth-эндпоинтах (`auth_api.py:141,163,205,234`). Либо общий `validate_csrf_dependency` на все мутации, либо удалить зависимость — сейчас интерфейс защиты обманывает |
| 1.4 **Проверка пароля в change-password** | `user_profile_api.py:94-116` принимает сырой dict без `validate_password_strength` — можно поставить пароль «1» |
| 1.5 **Rate limiter на Redis** | `api/rate_limiter.py:22-26` — `memory://`: лимиты умножаются на число воркеров; brute-force-фолбэк тоже per-process (`brute_force_protection_service.py:34-35`) |
| 1.6 **CSP для SPA** | nginx не выставляет CSP на статику (`nginx/nginx.conf`), только бэк на API. Добавить заголовок в `location /`, согласовав с nonce-механизмом (инфраструктура уже есть: `test_csp_nonce.py`) |
| 1.7 **Мелочи**: убрать `/test-simple` из прод (`main_api.py:174-177`); выровнять `client_max_body_size` 25m ↔ 15 МБ бэкенда (`nginx.conf:71` vs `image_service.py:18`); pin `certbot/certbot` версией; забрать CORS-переменные в limited-compose (`limited-resources.yml:84-101`); вычистить пароль из `alembic.ini:66` |
| 1.8 **Telegram-уведомления: ретраи** | `telegram_notification_service.py:114-136` — fire-and-forget: ошибка = потерянное уведомление о заказе. Минимум — retry с backoff; в идеале outbox-таблица |

### Этап 2 — Целостность данных и финансов (1,5–2 недели, самый рискованный этап)

Ранее переносился (Decimal/ARQ отложены) — но чем дольше копятся float-операции, тем дороже миграция. Рекомендуется выделить отдельным спринтом.

| Задача | Что делать |
|--------|-----------|
| 2.1 **Float → Decimal/Numeric(12,2)** (К5) | Миграция колонок (`reservation`, `rental`, `payment`, `user.balance`, `balance_history`), `Decimal` во всех расчётах `financial_service.py`, `balance_service.py`. Написать скрипт сверки «до/после» на прод-дампе |
| 2.2 **Дисциплина транзакций** | Ручные `commit/rollback` внутри запроса ломают единую транзакцию middleware (`main_api.py:321-332`): `security_audit_service.py:68,76` (**каждый логин**), `holiday_repository.py:80-104`, `base_repository.save()` (`:133`, вызывается из discount_service). Заменить на `flush()`, commit оставить middleware |
| 2.3 **Верный `total` в пагинации** | `reservation_filter_repository.py:75,169`, `rental_query_repository.py:104` — count поверх subquery с `joinedload` коллекций аксессуаров → завышенный total и прыгающие страницы. Отдельный count-запрос без eager-опций; коллекции перевести на `selectinload` |
| 2.4 **Гонки на промокодах и лимитах** | `SELECT ... FOR UPDATE` на промокоде при валидации (`promo_code_validator.py` → `promo_code_repository.py:170-179`); сейчас два параллельных заказа проходят `max_uses`, а повторное использование тем же юзером даёт IntegrityError→500 (PK `(user_id, promo_code_id)`). Аналогично `MAX_RESERVATIONS_BY_STATUS` без лока (`order_validator.py:313-326`) |
| 2.5 **Оптимистичная блокировка резервов** | Read-modify-write без version-счётчика в `reservation_service.py:138-289` — параллельные апдейты = last-writer-wins |
| 2.6 **Промокод не должен молча пропадать** | `rental_creation_service.py:250-264` и `rental_update_service.py:282-295`: `except → None` — аренда создаётся без скидки без всякого предупреждения. Возвращать 409 или warning в ответе |
| 2.7 **Убрать «хелперы» смены дат без проверки конфликтов** | `reservation_repository.py:123-146`, `rental_repository.py:209-232` меняют даты в обход анти-овербукинга (пока похоже мёртвый код — удалить или провести через валидатор) |

### Этап 3 — UI/UX фронтенда (1–1,5 недели)

| Задача | Что делать |
|--------|-----------|
| 3.1 **Фикс «тряски» админки** (диагностировано 08.09, подтверждено) | Один PR: (а) вынести `AdminNavigation` из 13 админ-страниц во вложенный layout-роут `/admin/*` с `<Outlet/>` — сейчас навбар мигает и исчезает в состояниях error/loading (`EquipmentManagementPage.tsx:62-85`); (б) `scrollbar-gutter: stable` на html (`index.css:243-246`); (в) PageFallback с геометрией админ-страниц (`MainLayout.tsx:22-24`) |
| 3.2 **Дедупликация юридических документов** | 4 документа живут дважды — модалка и страница (~1300 строк дублей): `TermsOfServiceModal.tsx` (420 строк — крупнейший файл проекта) ↔ `pages/legal/TermsOfServicePage.tsx` и аналоги. Реквизиты ИП **уже разъехались** (`PrivacyPolicyModal.tsx:47` — хардкод vs `COMPANY_INFO` на страницах). Контент вынести в данные + один рендерер |
| 3.3 **Тёмная тема/палитра админки** | 649 палитровых классов в обход токенам + 23 `bg-white` (хотспоты: `KpiCardsWidget.tsx:56-192`, `EditableRentalCard.tsx:60-161`, `HolidayManagementPage.tsx:22`). Заменить на токены дизайн-системы v2 (`bg-card` и т.п.); заодно `NotFoundPage`/`ForbiddenPage` |
| 3.4 **Единые состояния ошибок/загрузки** | Сейчас каталог не отличает ошибку от пустого списка (`EquipmentGrid.tsx:95-105` — «ничего не найдено» при падении API); в админке 4 стиля ошибок, retry через `window.location.reload()` (`EquipmentManagementPage.tsx:79`); `RequireAuth.tsx:14-16` мигает голым «Загрузка профиля...». Сделать общий `ErrorState` c `refetch` + скелетоны (SkeletonList уже есть, применяется выборочно) |
| 3.5 **Один источник правды авторизации** | `authStore.ts` (logout в UserNav/ProfilePage) параллельно с `AuthService` + react-query. Плюс мёртвое событие `auth-token-expired` (`api.ts:159` — dispatch без слушателей) и редирект неавторизованных на `/` с потерей deep-link (`RequireAuth.tsx:17-19`). Единый logout-путь + возврат на исходный URL после входа |
| 3.6 **Двойной показ ошибок формы входа** | `useAuthFormViewModel.ts:216` — одна ошибка и инлайн, и toast. Выбрать один канал; заодно `isFormReady()` на `watch()` каждый рендер (`:229-247`) |
| 3.7 **a11y и мелочи UX** | Миниатюры галереи — div без role/tabIndex/keydown (`EquipmentDetailsView.tsx:75-86`); ошибки полей без `aria-describedby` в AuthForm; cookie-баннер без отказа/Esc; `loading="lazy"` на img галереи; заголовки без `flex-wrap` (`EquipmentManagementPage.tsx:111-127`) |
| 3.8 **Чистка мёртвого кода** | `CalendarTestPage.tsx` (маршрута нет); `filterStore.brand`; 46 console.log в прод-коде (`useEditReservation.ts` — 13, `reserveStore.ts` — 11); deprecated-пропсы в `components/shared/receipt/*` |

### Этап 4 — Контракт API и архитектура (1–1,5 недели)

| Задача | Что делать |
|--------|-----------|
| 4.1 **OpenAPI-codegen типов фронтенда** | 16 файлов `src/types/` дублируют схемы бэка вручную — дрейф ловится только в рантайме (уже поймали: К1–К3, `packs`, `RegisterResponse`). Подключить `openapi-typescript`/orval в CI: diff сгенерированных типов = alarm |
| 4.2 **Чистка мёртвого API** | Не используется фронтом: `GET /equipment/tree`, `POST /admin/rentals/from-reservation/{id}` (дубль convert-to-rental), `GET /user/me` (дубль /auth/me), **весь модуль admin_security_api (9 эндпоинтов)**, `GET /holidays/rules`. Сломанные вызовы фронта (404 при подключении): `PATCH /promocodes/toggle-status`, `GET /equipment/{id}/accessories`, `GET /reservations/{id}`. Решить по каждому: удалить или допилить. **Смену пароля фронт не умеет вовсе** (`PUT /user/change-password` не вызывается) — кандидат на реализацию в ProfilePage |
| 4.3 **Починить сломанный сервисный слой фронта** | `PromoCodeService.ts:76-81` шлёт `total_amount` вместо обязательного `order_amount` и ждёт camelCase-ответ → любые 422/«промокод недействителен» (боевой путь в `DiscountCalculator.tsx:73` корректен, сервис — мина). `AvailabilityService.getDailyStatuses:81` ждёт неправильный корень ответа |
| 4.4 **`EquipmentListResponse.packs` исчез** | Бэк теперь отдаёт пачки внутри `items`; фронт ждёт `packs` → `useEquipmentData.ts:61` молча получает `[]` → оборудование из пачек выпадает из проверок занятости и календарных полосок |
| 4.5 **Дедупликация reservation_service** | ~300 строк скопированы между user/admin-путями (`:55-136` ≈ `:343-432`, `:138-289` ≈ `:434-551`) и уже расходятся мелочами. Общий приватный метод с флагами |
| 4.6 **Логика из роутеров в сервисы** | Прямые SQL в `equipment_api.py:163-200`, сборка view в `calendar_api.py:38-99`, вызовы приватного `_enrich_rental_with_dynamic_fields` из 5 мест (`admin_rental_api.py:56,72,88,104`, `admin_reservation_api.py:147`) |
| 4.7 **Обработка ошибок в роутерах** | `except Exception` поверх `HTTPException` превращает 400/404/409 в 500: `admin_balance_api.py:42-65`, `admin_reservation_api.py:46-54`, `admin_security_api.py` (9 мест), `promo_code_api.py` (`detail=str(e)` — утечка внутренних деталей) |

### Этап 5 — Производительность, тесты, CI (1 неделя, частично параллелится)

| Задача | Что делать |
|--------|-----------|
| 5.1 **N+1 и тяжёлые запросы** | `calendar_api.py:70-74` (get_by_id в цикле), `availability/calendar.py:57` (refresh в цикле), `equipment_api.py:76-97` (вся таблица + группировка в Python), `rental_query_service.py:75,97` (праздники на каждую аренду), `holiday_repository.py:123-137` (по запросу на день), `equipment_query_repository.py:165-204` (фильтры на каждую страницу каталога без кэша), `lazy="joined"` на 4 связях Reservation (декартово произведение) |
| 5.2 **Integration/e2e в CI** | 135 integration + 17 e2e тестов (race-conditions, транзакции!) в CI не гоняются (`ci.yml:64-67`), только локально. Отдельный job с postgres-service или docker-compose.integration-tests.yml |
| 5.3 **eslint фронта — блокирующий** | Сейчас `continue-on-error: true` (~329 ошибок легаси) — линт фиктивен (`ci.yml:89-93`), pre-commit-хук тоже advisory. lint-staged на изменённых файлах → постепенная чистка |
| 5.4 **HTTP-слой тестами денег/резерваций** | tests/api — только auth/CSRF/rate-limit/upload; из ~21 роутера через TestClient не тестируется почти ничего. Легаси-тесты биллинга уже лежат выключенными в `tests/attic/api-legacy` — реанимировать |
| 5.5 **Playwright smoke на фронте** | 38 файлов/327 кейсов vitest есть, браузерных e2e нет. 3–5 сценариев: вход → каталог → резерв → отмена; печать чека |
| 5.6 **Синхронный Redis в async-коде** | `redis_client.py:95-119` — блокирующие вызовы с таймаутом 1с из async-пути (denylist, кэш, brute-force) — блокировка event loop при деградации Redis → redis.asyncio |
| 5.7 **Кэш без TTL** | `user_status_service._completed_rentals_cache` (`:46,322-347`) инвалидируется только возвратом аренды; мультиворкер/удаление аренды → неверный статус и лимит резервов |
| 5.8 **CI-гигиена** | `ruff format --check`; concurrency-группы; timeout-minutes; pip-audit/npm audit; advisory mypy |

---

## 4. Что в хорошем состоянии (не трогаем)

- **Анти-овербукинг**: `pg_advisory_xact_lock` + fail-closed согласованность интервалов (`order_validator.py:111-139`, `availability/base.py:62-67`).
- **Загрузка файлов**: Pillow-валидация, uuid-имена, regex на удаление, лимит размеров (`uploads_api.py` + `image_service.py`).
- **CORS/secrets fail-fast** при `DEBUG=False` (`config/core.py:118-181`), whitelist-валидация origins.
- **Фронт**: lazy-роутинг всех 20+ страниц, manualChunks (recharts изолирован), memo на 19 списковых компонентах, защита от двойного сабмита в AuthForm и ReservePage, 2 `any` на весь проект, skip-link и высокий базовый a11y публичной части.
- **Refresh-флоу**: очередь pendingRequests, корректный повтор; CSRF double-submit согласован.
- **Nginx-статика**: immutable-кэш 1y, gzip, security-заголовки с учётом наследования.

## 5. Риски и зависимости между этапами

- **Этап 2 (деньги) — самый рискованный**: миграция float→Numeric затрагивает все таблицы и расчёты; делать только после этапа 0/1 и с прогоном сверки на прод-дампе. Тесты этапа 5.4 желательно поднять до или вместе с ним.
- **Этап 3.1 (тряска) и 3.3 (палитра)** трогают одни и те же админ-страницы — делать последовательно в одном спринте, иначе конфликты.
- **Этап 4.1 (codegen)** до чистки мёртвого API (4.2) — иначе генератор закрепит мусор.
- **Uncommitted-работа**: в рабочей дереве уже есть legal-страницы, ConsentModal и Telegram-сервис — этапы 3.2 и 1.8 стыкуются с ними; сначала закоммитить/достроить текущую ветку.
- После каждого этапа — прогон `run_all_tests.sh` + docker-build smoke из CI.

## 6. Сводный таймлайн

| Этап | Содержание | Оценка | Приоритет |
|------|-----------|--------|-----------|
| 0 | Хотфиксы (К1–К4, фильтры, промокоды, override) | 1–2 дня | немедленно |
| 1 | Безопасность + бэкапы + CSRF/limiter/CSP | 3–5 дней | высокий |
| 2 | Float→Decimal, транзакции, гонки, пагинация | 1,5–2 нед | высокий (риски) |
| 3 | Тряска админки, legal-дедуп, палитра, error-states | 1–1,5 нед | средний |
| 4 | Codegen типов, чистка API, дедуп сервисов | 1–1,5 нед | средний |
| 5 | N+1, CI (integration/e2e/eslint), Playwright | 1 нед | средний |
| **Итого** | | **~5–6 недель** фокусной работы | |
