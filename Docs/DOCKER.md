# Docker конфигурации

Шпаргалка по compose-файлам и командам. Актуально для v5.0.3.

## Конфигурации

### Основные
- `docker-compose.yml` — продакшен (db, redis, backend, frontend; healthchecks у всех)
- `docker-compose.limited-resources.yml` — имитация слабого сервера (1 vCore, 2 ГБ RAM, лимиты ресурсов)
- `docker-compose.override.yml` — локальная разработка (подхватывается автоматически: DEBUG=true, фронт :5173, dev-nginx)

### Тестовые (из `RentalApp_FASTAPI/`, изолированные стеки на tmpfs)
- `docker-compose.unit-tests.yml` — юнит-тесты
- `docker-compose.integration-tests.yml` — интеграционные
- `docker-compose.e2e.yml` — E2E
- `docker-compose.full-architecture-tests.yml` — все фазы: unit → api → integration → e2e → critical
- `docker-compose.csp-nonce-tests.yml` — CSP nonce

### Фронтенд (`rental-app-main/`)
- `docker-compose.test.yml` — vitest в Docker (профиль `test`)

## Команды

### Продакшен
```bash
# Основная конфигурация (без override!)
docker compose -f docker-compose.yml up -d --build

# Профили
docker compose -f docker-compose.yml --profile ssl up -d          # certbot (Let's Encrypt)
docker compose -f docker-compose.yml --profile backup up -d       # хелпер бэкапа
docker compose -f docker-compose.yml --profile diagnostics up -d  # диагностика

# Локальная разработка (с override)
docker compose up -d --build
```

### Имитация слабого сервера
```bash
docker compose -f docker-compose.limited-resources.yml up -d --build
```

### Тесты (из `RentalApp_FASTAPI/`)
```bash
docker compose -f docker-compose.unit-tests.yml up --build --abort-on-container-exit
docker compose -f docker-compose.integration-tests.yml up --build --abort-on-container-exit
docker compose -f docker-compose.e2e.yml up --build --abort-on-container-exit
docker compose -f docker-compose.full-architecture-tests.yml up --build --abort-on-container-exit
docker compose -f docker-compose.csp-nonce-tests.yml up --build --abort-on-container-exit

# после каждого прогона: docker compose -f <файл> down -v

# Обёртки с очисткой: ./run_unit_tests.sh, ./run_e2e_tests.sh, ./run_csp_nonce_tests.sh,
# ./run_full_architecture_tests.sh, ./run_all_tests.sh -u|-i|-e -d
```

Примечание: `run --rm test-backend pytest ...` не работает — тестовые
зависимости ставятся командой из compose при `up` (прод-образ их не содержит).

## Порты

| Сервис | Продакшен | Limited | Dev (override) | Тестовые стеки |
|--------|-----------|---------|----------------|----------------|
| Frontend (nginx) | 80, 443 | 80, 443 | 5173 | — |
| Backend (uvicorn) | 8000 | 8000 | 8000 | — |
| PostgreSQL | *не публикуется* | *не публикуется* | *не публикуется* | *не публикуется* |
| Redis | *не публикуется* | *не публикуется* | *не публикуется* | *не публикуется* |

Порты тестовых БД наружу не публикуются: pytest ходит по внутренней сети
compose (раньше 543x-порты конфликтовали при параллельных наборах).

## Переменные окружения

### Основные (`.env`, шаблон — `env.example`)
```bash
POSTGRES_USER=myuser
POSTGRES_PASSWORD=...        # в проде — сильный, dev-значение отклоняется fail-fast
POSTGRES_DB=rental_db
SECRET_KEY=...               # >=32 символов в проде
CSRF_SECRET_KEY=...          # >=32 символов в проде
DEBUG=false                  # true только для разработки
DOMAIN=yourdomain.com        # для SSL
SSL_EMAIL=your@email.com
```

### Для тестовых стеков
Задаются внутри compose-файлов (`TEST_DATABASE_URL`, `DISABLE_CSRF=true`,
тестовые SECRET_KEY) — вручную указывать не нужно.

## Мониторинг

```bash
# Логи
docker compose logs -f backend

# Статус и healthchecks
docker compose ps

# Статистика ресурсов
docker stats

# Healthcheck API
curl http://localhost:8000/health

# Проверка БД (внутри сети)
docker compose exec db pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
```

## Устранение неполадок

### Занятые порты
```bash
sudo ss -tulpn | grep -E ':(80|443|5173|8000)'   # кто занял порт
docker compose down                               # остановить свой стек
```

### Полный сброс БД (удаляет данные!)
```bash
docker compose down -v && docker compose up -d --build
```

### SSL / сертификаты
```bash
docker compose -f docker-compose.yml --profile ssl up -d certbot   # получение/продление
docker compose exec frontend ls -la /etc/letsencrypt/live/          # что выдано
```

## Nginx конфигурации

- `rental-app-main/nginx/nginx.conf` — продакшен (TLS 1.2/1.3, HSTS, limit_req на auth, SPA fallback)
- `rental-app-main/nginx/nginx.dev.conf` — разработка (подменяется volume из override)

## Скрипты переключения

```bash
# Windows
scripts\switch-docker-config.bat limited
scripts\switch-docker-config.bat normal

# Linux/macOS
./scripts/switch-docker-config.sh limited
./scripts/switch-docker-config.sh normal
```

После любых правок compose-файлов: `docker compose -f <файл> config -q`.
