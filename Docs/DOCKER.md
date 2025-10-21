# Docker конфигурации

## Конфигурации

### Основные
- `docker-compose.yml` - продакшен (без ограничений ресурсов)
- `docker-compose.limited-resources.yml` - имитация сервера (1 vCore, 2GB RAM)
- `docker-compose.override.yml` - локальная разработка (автоматически)

### Тестовые
- `docker-compose.unit-tests.yml` - unit тесты
- `docker-compose.integration-tests.yml` - интеграционные тесты
- `docker-compose.e2e.yml` - E2E тесты
- `docker-compose.full-architecture-tests.yml` - все тесты

## Команды

### Продакшен
```bash
# Основная конфигурация
docker-compose up -d

# С SSL
docker-compose --profile ssl up -d

# С диагностикой
docker-compose --profile diagnostics up -d
```

### Имитация сервера
```bash
docker-compose -f docker-compose.limited-resources.yml up -d
```

### Тесты
```bash
# Unit тесты
docker-compose -f docker-compose.unit-tests.yml up --build

# Интеграционные тесты
docker-compose -f docker-compose.integration-tests.yml up --build

# E2E тесты
docker-compose -f docker-compose.e2e.yml up --build

# Все тесты
docker-compose -f docker-compose.full-architecture-tests.yml up --build
```

## Порты

| Сервис | Продакшен | Limited | Unit | Integration | E2E |
|--------|-----------|---------|------|-------------|-----|
| Frontend | 80, 443 | 5173 | - | - | - |
| Backend | 8000 | 8000 | - | - | - |
| Database | 5433 | 5433 | 5436 | 5437 | 5435 |

## Переменные окружения

### Основные
```bash
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=rental_db
DOMAIN=yourdomain.com
SSL_EMAIL=your@email.com
DEBUG=false
```

### Для тестов
```bash
TEST_DATABASE_URL=postgresql+asyncpg://test_user:test_password@test-db:5432/test_db
DISABLE_CSRF=true
```

## Мониторинг

```bash
# Логи
docker-compose logs -f [service_name]

# Статистика ресурсов
docker stats

# Статус сервисов
docker-compose ps

# Проверка БД
docker-compose exec db pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}
```

## Устранение неполадок

### Проблемы с портами
```bash
# Проверка занятых портов
netstat -tulpn | grep :8000
netstat -tulpn | grep :5433

# Остановка всех контейнеров
docker-compose down
```

### Проблемы с БД
```bash
# Пересоздание БД
docker-compose down -v
docker-compose up -d db
```

### Проблемы с SSL
```bash
# Проверка сертификатов
docker-compose exec frontend ls -la /etc/letsencrypt/live/

# Обновление сертификатов
docker-compose exec certbot certbot renew
```

## Nginx конфигурации

- `nginx.conf` - продакшен с SSL
- `nginx.dev.conf` - разработка

## Скрипты переключения

```bash
# Windows
scripts\switch-docker-config.bat limited
scripts\switch-docker-config.bat normal

# Linux/macOS
./scripts/switch-docker-config.sh limited
./scripts/switch-docker-config.sh normal
```
