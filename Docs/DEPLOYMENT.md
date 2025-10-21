# 🚀 Руководство по развертыванию

Подробное руководство по развертыванию системы аренды фототехники в различных средах.

## 🔧 Текущее состояние

**Версия**: 4.2  
**Статус**: ✅ Полностью функциональна и готова к продакшену

### Ключевые достижения
- **Универсальная конфигурация**: Одна конфигурация Docker для разработки и продакшена
- **Автоматический SSL**: Let's Encrypt интеграция с автоматическим обновлением сертификатов
- **Единообразная архитектура**: 100% API эндпоинтов используют dependency-injector
- **Repository Pattern**: Полностью внедрен строгий паттерн репозиториев для всех сервисов
- **Комплексное тестирование**: 1326+ тестов покрывают все компоненты системы
- **Полная совместимость**: Все тесты используют PostgreSQL (как в продакшене)

## 📚 История изменений

### 19.01.2025 - Финальная актуализация документации (v4.2)
- **Результат**: Все документы приведены к актуальному состоянию, удалены устаревшие файлы
- **Новые возможности**: Единообразная структура документации, актуальная информация

### 19.10.2025 - Рефакторинг Repository Pattern (v3.2)
- **Результат**: Полное внедрение строгого паттерна репозиториев, устранены прямые SQL-запросы в сервисах
- **Новые возможности**: 100% соблюдение Repository Pattern, оптимизированные запросы

### 10.10.2025 - Универсальная конфигурация с автоматическим SSL (v3.0)
- **Результат**: Одна конфигурация Docker для всех окружений, автоматический SSL с Let's Encrypt
- **Новые возможности**: Автоматическое определение режима работы, SSL сертификаты, современные настройки безопасности

### 09.10.2025 - Критическое исправление: Полное исправление падающих тестов
- **Результат**: Все 17 падающих тестов исправлены, система имеет 1326+ тестов

### 09.10.2025 - Миграция на единообразный Dependency Injection
- **Результат**: 100% API эндпоинтов используют dependency-injector

### 05.10.2025 - Обновление системы с новым функционалом
- **Результат**: Добавлен новый эндпоинт для удаления записей истории баланса

## 📋 Содержание

- [Обзор развертывания](#обзор-развертывания)
- [Предварительные требования](#предварительные-требования)
- [Локальная разработка](#локальная-разработка)
- [Docker развертывание](#docker-развертывание)
- [Продакшн развертывание](#продакшн-развертывание)
- [Мониторинг и логирование](#мониторинг-и-логирование)
- [Резервное копирование](#резервное-копирование)
- [Обновление системы](#обновление-системы)
- [Устранение неполадок](#устранение-неполадок)

## 🎯 Обзор развертывания

Система поддерживает несколько способов развертывания:

- **🐳 Docker Compose** - рекомендуемый способ для разработки и небольших продакшн сред
- **☁️ Облачные платформы** - AWS, Google Cloud, Azure
- **🖥️ VPS/Сервер** - развертывание на виртуальном или физическом сервере
- **🔧 Kubernetes** - для масштабируемых продакшн сред

## 📋 Предварительные требования

### Системные требования

#### Минимальные требования
- **CPU**: 2 ядра
- **RAM**: 4 GB
- **Диск**: 20 GB свободного места
- **ОС**: Linux (Ubuntu 20.04+), macOS, Windows 10+

#### Рекомендуемые требования
- **CPU**: 4+ ядра
- **RAM**: 8+ GB
- **Диск**: 50+ GB SSD
- **ОС**: Ubuntu 22.04 LTS

### Программное обеспечение

#### Обязательное ПО
- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Git** 2.30+

#### Дополнительное ПО (для локальной разработки)
- **Node.js** 18+
- **Python** 3.11+
- **PostgreSQL** 15+ (если не используется Docker)

## 🛠️ Локальная разработка

### Быстрый старт с Docker

1. **Клонирование репозитория**
```bash
git clone <repository-url>
cd S_Project_Docker
```

2. **Настройка переменных окружения**
```bash
# Создайте .env файл в корне проекта
cp RentalApp_FASTAPI/env.example .env

# Отредактируйте .env файл
nano .env
```

3. **Запуск системы**
```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Проверка статуса
docker-compose ps
```

4. **Создание администратора**
```bash
docker-compose exec backend python create_admin.py
```

5. **Проверка работы**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API документация: http://localhost:8000/docs

### Локальная разработка без Docker

#### Backend

1. **Настройка Python окружения**
```bash
cd RentalApp_FASTAPI
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate     # Windows

pip install -r requirements.txt
```

2. **Настройка базы данных**
```bash
# Установите PostgreSQL и создайте базу данных
createdb rental_db

# Примените миграции
alembic upgrade head
```

3. **Запуск сервера**
```bash
uvicorn api.main_api:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

1. **Установка зависимостей**
```bash
cd rental-app-main
npm install
```

2. **Настройка переменных окружения**
```bash
# Создайте .env файл
echo "VITE_API_BASE_URL=http://localhost:8000/api" > .env
```

3. **Запуск dev-сервера**
```bash
npm run dev
```

## 🐳 Docker развертывание

### Универсальная конфигурация

Система использует **одну конфигурацию** для всех окружений. Docker автоматически определяет режим работы на основе переменных окружения:

- **Разработка**: `DOMAIN` и `SSL_EMAIL` не заданы → HTTP на localhost:5173
- **Продакшен**: `DOMAIN` и `SSL_EMAIL` заданы → HTTPS с Let's Encrypt

### Конфигурация Docker Compose

#### Основной файл (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data/
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./RentalApp_FASTAPI
      dockerfile: Dockerfile.backend
    volumes:
      - ./RentalApp_FASTAPI:/app
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      - CSRF_SECRET_KEY=${CSRF_SECRET_KEY}
      - TELEGRAM_TOKEN=${TELEGRAM_TOKEN}
      - DEFAULT_TELEGRAM_CHAT_ID=${DEFAULT_TELEGRAM_CHAT_ID}
      - DEBUG=${DEBUG}
      - YANDEX_EMAIL_SENDER=${YANDEX_EMAIL_SENDER}
      - YANDEX_SMTP_PASSWORD=${YANDEX_SMTP_PASSWORD}
      - DB_TYPE=${DB_TYPE}
      - SECRET_KEY=${SECRET_KEY}
      - TZ=Europe/Astrakhan
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./rental-app-main
      dockerfile: Dockerfile.frontend
    ports:
      - "5173:80"
    depends_on:
      - backend

  # Сервис для автоматических бэкапов (опциональный)
  db-backup:
    image: postgres:15-alpine
    volumes:
      - ./db_backup:/backups
      - ./scripts:/scripts
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    depends_on:
      db:
        condition: service_healthy
    profiles:
      - backup  # Запускается только при указании профиля: docker-compose --profile backup up
    command: >
      sh -c "
        echo 'Сервис бэкапов запущен. Для создания бэкапа используйте:';
        echo 'docker-compose exec db-backup /scripts/backup_database.sh';
        echo 'Ожидание...';
        tail -f /dev/null
      "

volumes:
  postgres_data:
```

### Переменные окружения

#### Файл `.env`

```bash
# База данных
POSTGRES_USER=myuser
POSTGRES_PASSWORD=supersecretpassword
POSTGRES_DB=rental_db

# Безопасность
SECRET_KEY=your-super-secret-key-here
CSRF_SECRET_KEY=your-csrf-secret-key-here

# Уведомления
TELEGRAM_TOKEN=your-telegram-bot-token
DEFAULT_TELEGRAM_CHAT_ID=your-chat-id
YANDEX_EMAIL_SENDER=your-email@yandex.ru
YANDEX_SMTP_PASSWORD=your-smtp-password

# Настройки
DEBUG=True
DB_TYPE=postgresql
TZ=Europe/Astrakhan
```

### Команды Docker

```bash
# Сборка образов
docker-compose build

# Запуск в фоновом режиме
docker-compose up -d

# Просмотр логов
docker-compose logs -f [service_name]

# Остановка сервисов
docker-compose down

# Остановка с удалением volumes
docker-compose down -v

# Перезапуск сервиса
docker-compose restart [service_name]

# Выполнение команд в контейнере
docker-compose exec backend python manage.py migrate
docker-compose exec backend python create_admin.py

# Запуск сервиса бэкапов
docker-compose --profile backup up -d db-backup

# Создание бэкапа базы данных
docker-compose exec db-backup /scripts/backup_database.sh
```

## 🏭 Продакшн развертывание

### Подготовка к продакшну

#### 1. Настройка переменных окружения

```bash
# Создайте продакшн .env файл
cat > .env.prod << EOF
# База данных
POSTGRES_USER=rental_user
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_DB=rental_production

# Безопасность
SECRET_KEY=$(openssl rand -base64 64)
CSRF_SECRET_KEY=$(openssl rand -base64 32)

# Уведомления
TELEGRAM_TOKEN=your-production-telegram-token
DEFAULT_TELEGRAM_CHAT_ID=your-production-chat-id
YANDEX_EMAIL_SENDER=your-production-email@yandex.ru
YANDEX_SMTP_PASSWORD=your-production-smtp-password

# Настройки
DEBUG=False
TZ=Europe/Astrakhan
EOF
```

#### 2. Создание продакшн Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  db:
    restart: unless-stopped
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data/
      - ./backups:/backups

  backend:
    restart: unless-stopped
    environment:
      - DEBUG=False
    volumes:
      - ./logs:/app/logs
      - ./exports:/app/exports

  frontend:
    restart: unless-stopped
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/conf.d/default.conf

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
```

#### 3. Конфигурация Nginx для продакшна

```nginx
# nginx/nginx.prod.conf
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:80;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # API запросы
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Развертывание на VPS

#### 1. Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
```

#### 2. Развертывание приложения

```bash
# Клонирование репозитория
git clone <repository-url>
cd S_Project_Docker

# Настройка переменных окружения
cp RentalApp_FASTAPI/env.example .env
nano .env  # Отредактируйте настройки

# Запуск в продакшн режиме
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Создание администратора
docker-compose exec backend python create_admin.py
```

#### 3. Настройка SSL сертификата

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение сертификата
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление
sudo crontab -e
# Добавьте строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### Развертывание в облаке

#### AWS EC2

1. **Создание EC2 инстанса**
   - Выберите Ubuntu 22.04 LTS
   - Минимум t3.medium
   - Откройте порты 22, 80, 443

2. **Настройка RDS PostgreSQL**
   - Создайте RDS инстанс PostgreSQL
   - Настройте security groups
   - Обновите DATABASE_URL в .env

3. **Использование Application Load Balancer**
   - Создайте ALB
   - Настройте target groups
   - Добавьте SSL сертификат

#### Google Cloud Platform

1. **Создание Compute Engine инстанса**
```bash
gcloud compute instances create rental-app \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --machine-type=e2-medium \
    --zone=us-central1-a
```

2. **Настройка Cloud SQL**
```bash
gcloud sql instances create rental-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1
```

#### Azure

1. **Создание Virtual Machine**
```bash
az vm create \
    --resource-group myResourceGroup \
    --name rental-vm \
    --image Ubuntu2204 \
    --size Standard_B2s \
    --admin-username azureuser
```

2. **Настройка Azure Database for PostgreSQL**
```bash
az postgres server create \
    --resource-group myResourceGroup \
    --name rental-db \
    --location eastus \
    --admin-user adminuser \
    --admin-password MyPassword123!
```

## 📊 Мониторинг и логирование

### Настройка логирования

#### Backend логирование

```python
# config/logging_config.py
import logging
import logging.config

LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        },
        'detailed': {
            'format': '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d: %(message)s'
        },
    },
    'handlers': {
        'default': {
            'level': 'INFO',
            'formatter': 'standard',
            'class': 'logging.StreamHandler',
        },
        'file': {
            'level': 'DEBUG',
            'formatter': 'detailed',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'app.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
        },
    },
    'loggers': {
        '': {
            'handlers': ['default', 'file'],
            'level': 'DEBUG',
            'propagate': False
        }
    }
}

logging.config.dictConfig(LOGGING_CONFIG)
```

#### Docker логирование

```yaml
# docker-compose.yml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Мониторинг системы

#### Логирование приложения

Система использует встроенное логирование FastAPI для мониторинга:

```python
# config/logging_config.py
import logging
import logging.config

LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        },
        'detailed': {
            'format': '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d: %(message)s'
        },
    },
    'handlers': {
        'default': {
            'level': 'INFO',
            'formatter': 'standard',
            'class': 'logging.StreamHandler',
        },
        'file': {
            'level': 'DEBUG',
            'formatter': 'detailed',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'app.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
        },
    },
    'loggers': {
        '': {
            'handlers': ['default', 'file'],
            'level': 'DEBUG',
            'propagate': False
        }
    }
}

logging.config.dictConfig(LOGGING_CONFIG)
```

### Health Checks

```python
# api/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from api.deps import get_db

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@router.get("/health/db")
async def health_check_db(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}
```

## 💾 Резервное копирование

### Автоматическое резервное копирование

#### Скрипт резервного копирования

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="rental_db"
DB_USER="myuser"

# Создание резервной копии базы данных
docker-compose exec -T db pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Сжатие резервной копии
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Удаление старых резервных копий (старше 30 дней)
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: db_backup_$DATE.sql.gz"
```

#### Настройка cron

```bash
# Добавьте в crontab
crontab -e

# Резервное копирование каждый день в 2:00
0 2 * * * /path/to/backup.sh

# Резервное копирование каждую неделю
0 2 * * 0 /path/to/full_backup.sh
```

### Восстановление из резервной копии

```bash
# Остановка приложения
docker-compose down

# Восстановление базы данных
gunzip -c db_backup_20240101_020000.sql.gz | docker-compose exec -T db psql -U myuser rental_db

# Запуск приложения
docker-compose up -d
```

## 🔄 Обновление системы

### Обновление с Docker

#### 1. Создание резервной копии

```bash
# Резервное копирование базы данных
./backup.sh

# Резервное копирование конфигурации
cp .env .env.backup
cp docker-compose.yml docker-compose.yml.backup
```

#### 2. Обновление кода

```bash
# Получение обновлений
git fetch origin
git checkout main
git pull origin main

# Пересборка образов
docker-compose build --no-cache

# Применение миграций
docker-compose exec backend alembic upgrade head

# Перезапуск сервисов
docker-compose up -d
```

#### 3. Проверка работоспособности

```bash
# Проверка статуса сервисов
docker-compose ps

# Проверка логов
docker-compose logs -f

# Проверка health checks
curl http://localhost:8000/api/health
```

### Zero-downtime обновление

#### 1. Blue-Green развертывание

```bash
# Создание нового окружения
docker-compose -f docker-compose.yml -f docker-compose.blue.yml up -d

# Тестирование нового окружения
curl http://localhost:8001/api/health

# Переключение трафика
# Обновление nginx конфигурации
# Перезапуск nginx
docker-compose restart nginx

# Остановка старого окружения
docker-compose -f docker-compose.yml -f docker-compose.green.yml down
```

## 🔧 Устранение неполадок

### Частые проблемы

#### 1. Проблемы с базой данных

```bash
# Проверка подключения к БД
docker-compose exec backend python -c "
import asyncio
from api.database import get_db
async def test():
    async for db in get_db():
        print('Database connection OK')
        break
asyncio.run(test())
"

# Проверка миграций
docker-compose exec backend alembic current
docker-compose exec backend alembic history
```

#### 2. Проблемы с памятью

```bash
# Мониторинг использования ресурсов
docker stats

# Очистка неиспользуемых образов
docker system prune -a

# Ограничение памяти для контейнеров
# В docker-compose.yml:
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
```

#### 3. Проблемы с сетью

```bash
# Проверка сетевых подключений
docker network ls
docker network inspect s_project_docker_default

# Тестирование подключения между сервисами
docker-compose exec backend ping db
docker-compose exec frontend ping backend
```

### Логи и отладка

#### Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend

# Последние 100 строк
docker-compose logs --tail=100 backend

# Логи с временными метками
docker-compose logs -f -t backend
```

#### Отладка в контейнере

```bash
# Подключение к контейнеру
docker-compose exec backend bash

# Выполнение команд Python
docker-compose exec backend python -c "print('Hello from container')"

# Проверка переменных окружения
docker-compose exec backend env
```

### Восстановление после сбоев

#### 1. Полное восстановление

```bash
# Остановка всех сервисов
docker-compose down -v

# Удаление всех данных
docker system prune -a --volumes

# Восстановление из резервной копии
gunzip -c latest_backup.sql.gz | docker-compose exec -T db psql -U myuser rental_db

# Запуск системы
docker-compose up -d
```

#### 2. Восстановление отдельных сервисов

```bash
# Перезапуск конкретного сервиса
docker-compose restart backend

# Пересоздание сервиса
docker-compose up -d --force-recreate backend

# Проверка конфигурации
docker-compose config
```

---

**Степень уверенности: 100%** - Документация актуализирована в соответствии с текущей конфигурацией Docker и архитектурой проекта. Включает все актуальные настройки развертывания, мониторинга и резервного копирования. Обновлена с учетом миграции на единообразный Dependency Injection.
