# Аудит кодовой базы — 07.09.2026

Полный аудит приложения аренды фототехники (FastAPI + React + PostgreSQL + nginx в Docker).
Метод: автоматизированное сканирование трёх доменов (бэкенд, фронтенд, инфраструктура).

**Общее состояние:** проект зрелый и аккуратный — слоистая архитектура соблюдена, god-файлов нет, git-репозиторий чистый (секреты и мусор не коммитились), бэкенд покрыт ~1930 тестами. Однако за год простоя накопились: уязвимые зависимости, три фактически отключённые защиты (CSRF, rate limit, тип токена), отсутствующий CI/CD, монолитный бандл фронтенда без code splitting и сильно отставшее покрытие тестами фронтенда (79 тестов против 1930 на бэкенде).

---

## 1. Критические дефекты (исправить немедленно)

| # | Проблема | Где | Последствие |
|---|----------|-----|-------------|
| К1 | **CSRF-защита фактически отключена**: `csrf_protect.validate_csrf(request)` обёрнут в `try/except: pass` во всех auth-эндпоинтах | `api/auth_api.py:87-91, 113-116, 155-159, 182-185` | CSRF-атака на вход/выход/refresh возможна, защита фиктивна |
| К2 | **Rate limiter не применяется**: slowapi `Limiter` создан, но `SlowAPIMiddleware` не зарегистрирован и `@limiter.limit` нигде не используется | `api/main_api.py:72, 149-150` | Лимит 200/мин не действует; брутфорс сдерживает только in-memory защита логина |
| К3 | **Refresh-токен принимается как access**: в `get_user_by_token` декод без проверки claim `type` | `api/dependencies.py:43` | Утечка refresh-токена (живёт 14 дней) = 14 дней доступа к API |
| К4 | **Сборка прод-образа бэкенда сломана**: `COPY containers.py containers.py`, но файла нет (остались только `.bak`/`.old` и пакет `containers/`) | `Dockerfile.backend:25` | `docker compose up --build` упадёт; образ не пересобирается с момента переименования |
| К5 | **PostgreSQL опубликован наружу хоста** (порт 5433:5432) в прод-конфиге; в `.env` пароль БД `12345` | `docker-compose.yml` (db), `.env` | Прямая атака на СУБД из интернета |
| К6 | **Уязвимые зависимости**: `python-jose==3.5.0` (CVE-2024-33663/33664, algorithm confusion), `aiohttp==3.9.1` (старше security-фиксов 3.9.2+), `passlib==1.7.4` (не поддерживается, несовместим с bcrypt 4.x) | `requirements.txt:54,76,39` | Известные CVE в цепочке аутентификации |
| К7 | **Захардкоженные секреты в коде**: дефолтные `SECRET_KEY`/`CSRF_SECRET_KEY`/`POSTGRES_PASSWORD` в Settings; `create_admin.py:21` — `AdminRental2024!`; `reset_admin_password.py:33` — `admin123` | `config/core.py:16,19,25,30` | Предсказуемые секреты при отсутствии env; пароли админа в истории |
| К8 | **`GET /monitoring/stats` без аутентификации** | `api/main_api.py:163` | Утечка метрик middleware наружу |
| К9 | **Секреты на диске вне защиты**: `.env` с реальным Telegram-токеном и SMTP-паролем; приватный ключ `ssl/key.pem`; прод-дампы БД в `db_backup/` (включая `rental_db_backup_production_*.sql`) — в git не попали, но лежат открыто | `.env`, `ssl/`, `db_backup/` | Компрометация рабочей станции = компрометация прод |
| К10 | **DEBUG=True по умолчанию**, `/docs`/`/openapi.json` не отключаются в проде; обработчик ValidationError всегда отдаёт полные детали | `config/core.py:37`, `api/main_api.py:75, 80-101` | Раскрытие структуры API и внутренних деталей валидации |

## 2. Бэкенд (RentalApp_FASTAPI)

**Стек:** Python 3.11, FastAPI 0.116.1, SQLAlchemy 2.0.42 (async), Alembic, dependency-injector, asyncpg. 181 файл / ~20 700 строк + 150 тестовых файлов.

**Сильные стороны:**
- Чёткая слоистость: 18 роутеров → ~60 сервисов → 27 репозиториев (CQRS-расщепление запросов/команд), DI-контейнер, Pydantic-схемы (17 файлов).
- Нет god-файлов (максимум 497 строк), нет сырого SQL c интерполяцией (2 `text()` с биндами — безопасно).
- ~1930 тестов (services 926, api 381, repositories 211, integration 160…), pytest.ini с маркерами, 5 тестовых compose-конфигов.
- Транзакции: сессия на запрос через `DIContainerMiddleware`, изоляция contextvars.
- Security-audit-логирование попыток входа, secure-headers middleware с CSP nonce.

**Слабые стороны (помимо критических):**
- Logout не инвалидирует токены (нет denylist) — `api/auth_api.py`.
- Brute-force защита in-memory (dict/deque) — не переживает рестарт, не работает при нескольких инстансах (`api/services/brute_force_protection_service.py`).
- `pool_pre_ping=False` в пуле соединений (`containers/constants.py:20-29`).
- Нет кэширования (Redis отсутствует), нет фоновых задач (планировщика нет): Telegram-уведомления объявлены в требованиях, но `notification_service.py` пишет только в БД; `overdue_checker_service` — заготовка под cron.
- Тяжёлые зависимости в прод-образе: matplotlib, numpy, weasyprint, pillow + requirements-test.txt (pytest/factory-boy в проде, `Dockerfile.backend:15-17`).
- Мусор в каталоге: `app.log` 12.6 МБ, `containers.py.bak`/`.old`, `.venv` внутри проекта, пустые `api/deps/` и конфликтующий `api/dependencies/` (каталог) vs `api/dependencies.py` (модуль).
- Alembic: 3 merge-миграции в истории, revision-id вручную (`'014'`, `'add_user_status_gradation'`), файл `XXXX_add_user_status_gradation.py` с заглушкой downgrade (`pass`) и плейсхолдерным именем.
- Дублирование проверки роли: `get_current_admin_user` (`api/dependencies.py:86-95`) логически расходится с `api/permissions.py:21`.
- `DEBUG=true` также в `docker-compose.override.yml` и тестовых компоузах (для тестов — допустимо).

## 3. Фронтенд (rental-app-main)

**Стек:** React 19.1, TypeScript 5.8 (strict), Vite 6.3, Tailwind 3.4 + shadcn-паттерн (26 ui-примитивов на Radix), TanStack Query 5.76, zustand 5, react-hook-form 7 + zod, axios, sonner, lucide-react. ~36 700 строк, 179 компонентов, 21 страница, 77 хуков, 13 сторов.

**Сильные стороны:**
- Современный и последовательный стек: серверное состояние — TanStack Query (38 потребителей), клиентское — zustand (без записи в localStorage), формы — RHF+zod единообразно в 38 файлах, схемы централизованы (`src/lib/validationSchemas.ts`).
- Access-токен только в памяти (`tokenManager.ts`), авторизация через cookies + авторефреш с очередью 401 (`src/lib/api.ts`).
- Код сильно измельчен: только 1 файл >400 строк (`TermsOfServiceModal.tsx`, 413).
- Единые примитивы: `ui/table.tsx` (12 потребителей), `ui/dialog.tsx` (31), sonner-тосты (146 вызовов).

**Слабые стороны:**
- **Бандл — монолит 2.4 МБ** (`dist/assets/index-*.js`): нет `React.lazy`/`Suspense`, нет `manualChunks`, все 21 страница импортируются статически в `src/app/App.tsx`; logo.png 768 КБ.
- **Анимации отсутствуют** как система: framer-motion не установлен, только CSS-переходы (transition в 42 файлах) — «современного» ощущения интерфейсу не хватает.
- **Тёмная тема объявлена, но не работает**: `.dark` в `src/index.css:58` и `darkMode:"class"` в конфиге, во всём src одна `dark:`-строка, переключателя нет.
- **Нет i18n** — весь текст хардкодом на русском.
- **Нет chart-библиотеки** для дашборда админа (`--chart-1..5` переменные пустые).
- **Мёртвые зависимости**: все 5 пакетов `@fullcalendar/*` не импортируются (календарь самописный на `src/components/calendar/`); `@eslint/eslintrc`, `@types/*` лежат в dependencies.
- **Тесты: 6 файлов / 79 тестов** — покрыты только DI, 2 сервиса, константы и периоды; 179 компонентов, 21 страница, ~70 хуков без тестов. Протухший `test-results.json` (2 fail) лежит в корне.
- **~118 `: any` / `as any`** вне тестов; сборка — `vite build` без `tsc -b`, типы не блокируют билд.
- Skeleton-компоненты только в 7 файлах при 69 файлах с isLoading/isError — loading-состояния неоднородны.

## 4. Инфраструктура и процессы

**Сильные стороны:**
- Git-репозиторий чистый: 823 файла, `.env` никогда не коммитился, .gitignore (104 строки) покрывает всё реально существующее; история без секретов.
- nginx (прод): TLS 1.2/1.3, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, COOP/COEP/CORP, gzip, статика `expires 1y immutable`, SPA fallback; CSP nonce формирует бэкенд.
- Тестовая инфраструктура продумана: 5 отдельных compose-профилей (unit/integration/e2e/arch/csp-nonce), tmpfs для тестовой pgdata.
- Профиль `limited-resources` с CPU/RAM-лимитами для слабых VPS.

**Слабые стороны:**
- **CI/CD отсутствует полностью**: нет `.github/workflows`, pre-commit, husky. Тесты запускаются только вручную.
- **Docker-образы**: оба Dockerfile без `USER` (root), без `HEALTHCHECK`; бэкенд одностадийный с тестовыми зависимостями; фронтенд собирается `npm install` вместо `npm ci`, в образ запечён dev-конфиг nginx; `.dockerignore` отсутствует во всех контекстах (и `.gitignore:58` его игнорирует!).
- **Прод-композ**: bind-mount исходников бэкенда в контейнер (`./RentalApp_FASTAPI:/app`) — код хоста в проде; нет resource limits в основном файле; у backend нет healthcheck.
- **nginx-прод**: наружу торчат debug-заголовки `X-Debug-Backend-Status`/`X-Debug-Request-ID` и `error_log ... debug` для /api/; `limit_req`/`limit_conn` нет.
- **nginx-dev**: security-заголовки полностью отсутствуют, gzip и кэширование статики нет.
- **9 compose-файлов** — конфигурационный разнобой; `nginx/nginx.conf` в корне — пустой мёртвый каталог; сервис `db-backup` (profile backup) — просто `tail -f`, реального автобэкапа нет (только ручные скрипты).
- Alembic-история требует внимания (см. §2).

## 5. Итоговая оценка по осям

| Ось | Оценка | Комментарий |
|-----|--------|-------------|
| Архитектура кода | ★★★★☆ | Слоистость и DRY выдержаны, CQRS, DI; мелкие дубли (`dependencies.py` vs `permissions.py`) |
| Безопасность | ★★☆☆☆ | Хорошая основа (CSP nonce, аудит-логи, cookies), но CSRF/лимиты/тип токена фактически отключены + CVE + секреты |
| Тесты | ★★★☆☆ | Бэкенд образцово (1930), фронтенд провально (79), автозапуска нет |
| UI/UX | ★★★☆☆ | Стек современный и единообразный, но нет анимаций, тёмной темы, графиков, i18n; бандл 2.4 МБ |
| Инфраструктура | ★★★☆☆ | Продуманные тестовые профили, но нет CI/CD, образы от root, прод-композ с bind-mount и наружной БД |
| Масштабируемость | ★★☆☆☆ | Нет кэша, очередей, фоновых задач; горизонтальное масштабирование блокирует in-memory состояние (лимиты, brute-force) |

---
*Аудит подготовлен с использованием навыков ui-ux-pro-max (критерии UI) и GitHub SpecKit (структура плана). Источник данных: три параллельных сканирования кодовой базы от 07.09.2026.*
