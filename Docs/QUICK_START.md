# 🚀 Быстрый старт

Минимальный путь до работающей системы аренды фототехники.

## Предварительные требования

- Docker и Docker Compose v2
- Git

## Запуск в Docker (рекомендуется)

### 1. Клонирование и настройка

```bash
git clone https://github.com/satol1/smart_Rental_App.git
cd smart_Rental_App
cp env.example .env
# Для разработки значения по умолчанию подходят; отредактируйте при необходимости
```

### 2. Запуск системы

```bash
# Подхватится docker-compose.override.yml (dev: DEBUG=true, фронт на :5173)
docker compose up -d --build

docker compose ps    # все сервисы должны быть healthy
```

### 3. Инициализация

```bash
# Миграции (на пустой БД)
docker compose exec backend alembic upgrade head

# Администратор: пароль — аргумент, env ADMIN_INITIAL_PASSWORD или сгенерируется и
# будет напечатан в консоли
docker compose exec backend python create_admin.py
```

### 4. Доступ к приложению

- **Frontend**: http://localhost:5173 (dev) / http://localhost (prod-конфиг без override)
- **Backend API**: http://localhost:8000/api
- **API Docs (Swagger)**: http://localhost:8000/docs — только при `DEBUG=true`

## Тесты

Тесты идут в изолированных стеках (рабочий не трогают). Из каталога
`RentalApp_FASTAPI/`:

```bash
# Юнит-тесты (самый быстрый набор)
docker compose -f docker-compose.unit-tests.yml up --build --abort-on-container-exit
docker compose -f docker-compose.unit-tests.yml down -v

# Интеграционные / E2E / все сразу
docker compose -f docker-compose.integration-tests.yml up --build --abort-on-container-exit
docker compose -f docker-compose.e2e.yml up --build --abort-on-container-exit
docker compose -f docker-compose.full-architecture-tests.yml up --build --abort-on-container-exit

# Обёртка с флагами: -u unit, -i integration, -e e2e, -d docker
./run_all_tests.sh -u -d
```

Фронтенд:

```bash
cd rental-app-main
npm run test:run                                  # локально
docker compose -f docker-compose.test.yml --profile test up --build --abort-on-container-exit   # в Docker
```

Примечание: `docker compose exec backend pytest` не работает — в прод-образе
нет тестовых зависимостей. После каждого тестового прогона выполняйте
`docker compose -f <файл> down -v`.

## Локальный запуск без Docker (опционально)

### Backend

```bash
cd RentalApp_FASTAPI
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# PostgreSQL и Redis должны быть доступны; параметры — в RentalApp_FASTAPI/.env
alembic upgrade head
uvicorn api.main_api:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd rental-app-main
npm ci
npm run dev        # Vite dev-сервер с проксированием /api
```

## Дальше

- Продакшен-развертывание и SSL: [DEPLOYMENT.md](DEPLOYMENT.md)
- Шпаргалка Docker-команд: [DOCKER.md](DOCKER.md)
- Архитектура: [ARCHITECTURE.md](ARCHITECTURE.md)
