# 🚀 Руководство по развертыванию

Развёртывание системы аренды фототехники. Актуально для v5.0.3 (сентябрь 2026).

## 📋 Содержание

- [Конфигурации Docker](#конфигурации-docker)
- [Предварительные требования](#предварительные-требования)
- [Локальная разработка](#локальная-разработка)
- [Продакшн-развертывание на VPS](#продакшн-развертывание-на-vps)
- [Переменные окружения](#переменные-окружения)
- [Обновление системы](#обновление-системы)
- [Мониторинг](#мониторинг)
- [Резервное копирование](#резервное-копирование)
- [Устранение неполадок](#устранение-неполадок)

## Конфигурации Docker

| Файл | Назначение |
|---|---|
| `docker-compose.yml` | Основная (продакшен): db + redis + backend + frontend (nginx, 80/443), healthchecks |
| `docker-compose.override.yml` | Локальная разработка: подхватывается автоматически (DEBUG=true, фронт на :5173, dev-nginx) |
| `docker-compose.limited-resources.yml` | Слабые VPS (1 vCPU / 2 ГБ RAM) — с лимитами ресурсов |
| `RentalApp_FASTAPI/docker-compose.*-tests.yml` | Изолированные тестовые стеки (unit / integration / e2e / full-architecture / csp-nonce) |
| `rental-app-main/docker-compose.test.yml` | Тесты фронтенда (vitest) в Docker, профиль `test` |

Профили основного компоуза: `ssl` (certbot), `backup` (хелпер бэкапа), `diagnostics`.

Сервисы: **db** (PostgreSQL 15, порт не публикуется), **redis** (Redis 7, порт не
публикуется), **backend** (uvicorn, 8000), **frontend** (nginx + статика SPA,
80/443), опционально **certbot** / **db-backup** / **diagnostics**.

## Предварительные требования

- Docker 24+ и Docker Compose v2 (плагин `docker compose`)
- 2+ vCPU, 4+ ГБ RAM (минимум для limited-конфигурации — 1 vCPU / 2 ГБ)
- Домен с A-записью на сервер (для продакшена с HTTPS)

## Локальная разработка

```bash
# 1. Клонировать и настроить окружение
git clone https://github.com/satol1/smart_Rental_App.git
cd smart_Rental_App
cp env.example .env          # значения по умолчанию годятся для dev

# 2. Запустить (override включит dev-режим: DEBUG=true, фронт на :5173)
docker compose up -d --build

# 3. Создать администратора (пароль: аргумент, env ADMIN_INITIAL_PASSWORD или сгенерируется)
docker compose exec backend python create_admin.py
```

Доступ: фронтенд http://localhost:5173, API http://localhost:8000/api,
Swagger http://localhost:8000/docs (включён при DEBUG=true).

Локальный запуск без Docker см. в [QUICK_START.md](QUICK_START.md) и
[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).

## Продакшн-развертывание на VPS

### 1. Подготовка сервера

```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
sudo usermod -aG docker $USER   # перелогиньтесь
```

### 2. Код и окружение

```bash
git clone https://github.com/satol1/smart_Rental_App.git
cd smart_Rental_App
cp env.example .env && nano .env
```

**Чек-лист прод-.env (обязательно):**

| Переменная | Значение |
|---|---|
| `DEBUG` | `false` — иначе включены /docs, детали ошибок, cookie без Secure, wildcard-CORS |
| `SECRET_KEY`, `CSRF_SECRET_KEY` | ≥32 символов, случайные. При `DEBUG=false` приложение **не стартует** с dev-значениями: генератор `RentalApp_FASTAPI/scripts/generate_secrets.py` |
| `POSTGRES_PASSWORD` | сильный пароль (dev-значение `12345` будет отклонено) |
| `CORS_ORIGINS` | ваш домен: `https://yourdomain.com` (не wildcard) |
| `CORS_ALLOW_WILDCARD` | `false` |
| `DOMAIN`, `SSL_EMAIL` | домен и почта для Let's Encrypt |
| `FORWARDED_ALLOW_IPS` | подсеть docker (по умолчанию `172.16.0.0/12`); при нестандартной сети — адрес nginx-контейнера |

### 3. Запуск

```bash
# Прод-конфигурация БЕЗ override (override = dev-режим!)
rm docker-compose.override.yml   # или переименуйте
docker compose -f docker-compose.yml up -d --build

# Получение SSL-сертификата (профиль ssl; certbot получает сертификат,
# nginx терминирует TLS)
docker compose -f docker-compose.yml --profile ssl up -d

# Админ
docker compose -f docker-compose.yml exec backend python create_admin.py
```

Миграции применяются вручную при обновлениях (при первичном старте на пустой
БД — `docker compose -f docker-compose.yml exec backend alembic upgrade head`).

### 4. Слабый VPS

Для серверов 1 vCPU / 2 ГБ RAM используйте лимитированную конфигурацию
(вместо основной; override также удалить):

```bash
docker compose -f docker-compose.limited-resources.yml up -d --build
```

## Переменные окружения

Полный список с описаниями — [env.example](../env.example). Ключевые:

| Переменная | Назначение |
|---|---|
| `POSTGRES_USER/PASSWORD/DB` | Учётные данные PostgreSQL |
| `SECRET_KEY`, `CSRF_SECRET_KEY` | Секреты приложения (≥32 символов в проде, fail-fast) |
| `DEBUG` | `false` в проде |
| `REDIS_URL` | Задаётся компоузом (`redis://redis:6379/0`); при недоступности Redis бэкенд деградирует на in-memory (warning в логах) |
| `CORS_*` | Источники/заголовки CORS |
| `WORKERS` | Число воркеров uvicorn (по умолчанию 1); с несколькими воркерами Redis желателен |
| `TELEGRAM_TOKEN`, `DEFAULT_TELEGRAM_CHAT_ID` | Уведомления в Telegram |
| `YANDEX_EMAIL_SENDER`, `YANDEX_SMTP_PASSWORD` | Отправка email |
| `DOMAIN`, `SSL_EMAIL` | Сертификат Let's Encrypt |

## Обновление системы

```bash
# 1. Бэкап БД
./scripts/backup_database.sh

# 2. Новый код
git pull origin main

# 3. Пересборка и запуск
docker compose -f docker-compose.yml up -d --build

# 4. Миграции (если в релизе есть)
docker compose -f docker-compose.yml exec backend alembic upgrade head

# 5. Проверка
docker compose -f docker-compose.yml ps           # все healthy
curl -fsS http://localhost:8000/health            # {"status":"ok",...}
```

Катящиеся обновления: `--build` пересоздаёт только изменившиеся образы;
nginx продолжит отдавать статику, кратковременная недоступность API — норма.

## Мониторинг

- **Healthcheck**: `GET /health` (без аутентификации; по нему же работает
  healthcheck контейнера backend)
- **Метрики middleware**: `GET /monitoring/stats` — только для админа
- **Логи**: `docker compose -f docker-compose.yml logs -f backend`
- **Диагностика**: `docker compose -f docker-compose.yml --profile diagnostics run diagnostics`
  или `RentalApp_FASTAPI/scripts/run_diagnostics.py`
- **События безопасности**: аудит-лог входов/брутфорса —
  `GET /api/admin/security/audit/logs` (см. [SECURITY_GUIDE](../RentalApp_FASTAPI/SECURITY_GUIDE.md))

## Резервное копирование

```bash
./scripts/backup_database.sh           # бэкап в db_backup/
./scripts/restore_database.sh          # восстановление
./scripts/backup_database_utf8.sh      # вариант с гарантией UTF-8
./scripts/restore_database_utf8.sh
```

Скрипты работают через `docker compose exec db pg_dump` — внешний порт БД не
нужен и **не публикуется**. Регулярное расписание настройте cron'ом на хосте,
например ежедневно в 02:00:

```
0 2 * * * cd /path/to/smart_Rental_App && ./scripts/backup_database.sh
```

Старые дампы (`db_backup/*.sql`) чистите вручную или find'ом в cron
(`-mtime +30 -delete`). Они git-игнорируются, но храните их вне сервера
(офсайт-копия).

## Устранение неполадок

| Симптом | Причина / действие |
|---|---|
| Backend не стартует, `ValueError` про SECRET_KEY | Прод-режим (`DEBUG=false`) с dev-секретами — сгенерируйте (`scripts/generate_secrets.py`) и впишите в `.env` |
| Все клиенты с одного IP в rate-limit/брутфорс-логах | `FORWARDED_ALLOW_IPS` не покрывает сеть docker — задайте подсеть |
| В логах `Redis недоступен ... in-memory fallback` | Redis не поднялся: `docker compose ps redis`, `logs redis`. Приложение работает, но denylist/лимиты per-process |
| 401/разлогин через ~60 минут | Проверьте, что фронт ходит на тот же домен (cookie Secure/CSRF) и nginx проксирует `/api/auth/` без rewrite (`proxy_pass http://backend;`) |
| Frontend 502 | backend не поднялся: `docker compose logs backend`; проверьте `up -d --build` после pull |
| SSL не выдаётся | certbot webroot требует доступный `http://DOMAIN/.well-known/`; проверьте DNS и `--profile ssl` |
| `docker compose exec backend pytest` не работает | Так и задумано — тестов нет в прод-образе; см. [DOCKER.md](DOCKER.md) для тестовых стеков |

---

Связанные документы: [DOCKER.md](DOCKER.md) (шпаргалка команд),
[QUICK_START.md](QUICK_START.md), [BACKUP_UTF8_GUIDE.md](BACKUP_UTF8_GUIDE.md),
[SECURITY_GUIDE](../RentalApp_FASTAPI/SECURITY_GUIDE.md),
[CHANGELOG.md](CHANGELOG.md).
