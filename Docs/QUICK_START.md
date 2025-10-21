# 🚀 Быстрый старт

Краткое руководство по запуску системы аренды фототехники.

## 📋 Предварительные требования

- Docker и Docker Compose
- Git

## ⚡ Быстрый запуск

### 1. Клонирование и настройка

```bash
git clone <repository-url>
cd S_Project_Docker
cp env.example .env
# Отредактируйте .env файл при необходимости
```

### 2. Запуск системы

```bash
# Запуск всех сервисов
docker-compose up -d

# Проверка статуса
docker-compose ps
```

### 3. Инициализация

```bash
# Применение миграций
docker-compose exec backend alembic upgrade head

# Создание администратора
docker-compose exec backend python create_admin.py
```

### 4. Доступ к приложению

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🧪 Тестирование

### Unit тесты
```bash
docker-compose -f docker-compose.unit-tests.yml run --rm test-backend pytest tests/services/ -v
```

### Integration тесты
```bash
docker-compose -f docker-compose.integration-tests.yml run --rm test-backend pytest tests/integration/ -v
```

### E2E тесты
```bash
docker-compose -f docker-compose.e2e.yml run --rm test-backend pytest tests/e2e/ -v
```

### Все тесты
```bash
docker-compose -f docker-compose.test.yml run --rm test-backend pytest -v
```

## 🔧 Разработка

### Backend разработка
```bash
# Логи бэкенда
docker-compose logs -f backend

# Вход в контейнер
docker-compose exec backend bash

# Создание миграции
docker-compose exec backend alembic revision --autogenerate -m "Description"
```

### Frontend разработка
```bash
# Логи фронтенда
docker-compose logs -f frontend

# Пересборка фронтенда
docker-compose build frontend
```

## 🛑 Остановка

```bash
# Остановка всех сервисов
docker-compose down

# Остановка с удалением данных
docker-compose down -v
```

## 📚 Дополнительная документация

- [Архитектура](ARCHITECTURE.md) - Подробное описание архитектуры
- [Развертывание](DEPLOYMENT.md) - Руководство по развертыванию
- [API Документация](API_DOCUMENTATION.md) - Документация API
- [Руководство разработчика](DEVELOPER_GUIDE.md) - Практические советы

## ❓ Частые проблемы

### Порт занят
```bash
# Проверка занятых портов
netstat -tulpn | grep :8000
netstat -tulpn | grep :3000

# Остановка процессов
sudo kill -9 <PID>
```

### Проблемы с Docker
```bash
# Очистка Docker
docker system prune -a

# Пересборка контейнеров
docker-compose build --no-cache
```

### Проблемы с базой данных
```bash
# Сброс базы данных
docker-compose down -v
docker-compose up -d postgres
docker-compose exec backend alembic upgrade head
```

---

**Степень уверенности: 100%** - Краткое и практичное руководство для быстрого старта.
