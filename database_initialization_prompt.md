# Промпт для AI-агента: Инициализация новой чистой базы данных

## Описание задачи
Необходимо создать новую чистую базу данных PostgreSQL для проекта RentalApp, применив миграции Alembic и создав первого пользователя-администратора. Все операции должны выполняться через Docker контейнеры.

## Структура проекта
```
S_Project_Docker/
├── docker-compose.yml
├── RentalApp_FASTAPI/
│   ├── alembic.ini
│   ├── create_admin.py
│   ├── Dockerfile.backend
│   └── migrations/
│       ├── env.py
│       └── versions/
│           └── 9290ae79b0d3_create_initial_tables.py
└── rental-app-main/
    └── Dockerfile.frontend
```

## Последовательность действий

### 1. Подготовка и проверка
- Убедиться, что файл `.env` существует и содержит необходимые переменные окружения
- Проверить, что все необходимые файлы на месте:
  - `docker-compose.yml`
  - `RentalApp_FASTAPI/alembic.ini`
  - `RentalApp_FASTAPI/create_admin.py`
  - `RentalApp_FASTAPI/migrations/versions/9290ae79b0d3_create_initial_tables.py`

### 2. Запуск базы данных
```bash
docker-compose up -d db
```
- Дождаться, пока контейнер базы данных станет здоровым (healthy)
- Проверить статус: `docker-compose ps`

### 3. Запуск backend контейнера
```bash
docker-compose up -d backend
```
- Backend контейнер должен запуститься после того, как база данных станет доступной
- Проверить статус: `docker-compose ps`

### 4. Применение миграций Alembic
```bash
docker-compose exec backend alembic upgrade head
```
- Эта команда применит все миграции и создаст все необходимые таблицы
- Ожидаемый результат: `Running upgrade -> 9290ae79b0d3, Create initial tables`

### 5. Создание первого администратора
```bash
docker-compose exec backend python create_admin.py
```
- Создаст пользователя-администратора с данными:
  - **Email:** `admin@rentalapp.com`
  - **Пароль:** `AdminRental2024!`
  - **Роль:** `admin`

### 6. Запуск frontend (опционально)
```bash
docker-compose up -d frontend
```

### 7. Проверка статуса всех контейнеров
```bash
docker-compose ps
```
- Все контейнеры должны быть в состоянии "Running"
- База данных должна быть "Healthy"

## Создаваемые таблицы
Миграция создает следующие основные таблицы:
- `users` - пользователи системы
- `equipment` - оборудование для аренды
- `reservations` - бронирования
- `rentals` - аренды
- `accessories` - аксессуары
- `promo_codes` - промокоды
- `holidays` - выходные дни
- `associations` - ассоциации
- `balance_history` - история баланса
- `payments` - платежи
- И все необходимые связующие таблицы

## Важные замечания
1. **Никаких новых файлов создавать не нужно** - все необходимые файлы уже присутствуют
2. Все операции выполняются через Docker контейнеры
3. База данных использует PostgreSQL 15
4. Backend использует FastAPI с асинхронными миграциями Alembic
5. После успешного выполнения можно войти в систему как администратор

## Команды для проверки
```bash
# Проверить статус контейнеров
docker-compose ps

# Проверить логи backend
docker-compose logs backend

# Проверить логи базы данных
docker-compose logs db

# Подключиться к базе данных (если нужно)
docker-compose exec db psql -U myuser -d rental_db
```

## Ожидаемый результат
После выполнения всех шагов:
- ✅ База данных PostgreSQL запущена и здорова
- ✅ Все таблицы созданы через миграции Alembic
- ✅ Первый администратор создан
- ✅ Backend API доступен на порту 8000
- ✅ Frontend доступен на порту 5173
- ✅ Можно войти в систему с учетными данными администратора

## Учетные данные администратора
- **URL:** http://localhost:5173 (frontend) или http://localhost:8000 (API)
- **Email:** admin@rentalapp.com
- **Пароль:** AdminRental2024!
