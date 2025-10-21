#!/bin/bash

# Скрипт для восстановления базы данных PostgreSQL из бэкапа в Docker
# Безопасен - создает новую БД или пересоздает существующую

set -e  # Выход при любой ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверяем аргументы
if [ $# -eq 0 ]; then
    error "Использование: $0 <путь_к_файлу_бэкапа>"
    error "Пример: $0 db_backup/rental_db_backup_20241201_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Проверяем наличие файла бэкапа
if [ ! -f "$BACKUP_FILE" ]; then
    error "Файл бэкапа не найден: $BACKUP_FILE"
    exit 1
fi

# Проверяем наличие .env файла
if [ ! -f ".env" ]; then
    error "Файл .env не найден! Создайте его на основе env.example"
    exit 1
fi

# Загружаем переменные окружения
source .env

# Проверяем обязательные переменные
if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_DB" ]; then
    error "Не все переменные базы данных заданы в .env файле"
    exit 1
fi

log "Начинаем восстановление базы данных из файла: $BACKUP_FILE"

# Проверяем, что контейнер базы данных запущен
if ! docker-compose ps db | grep -q "Up"; then
    error "Контейнер базы данных не запущен! Запустите: docker-compose up -d db"
    exit 1
fi

# Ждем готовности базы данных
log "Ожидаем готовности базы данных..."
timeout=60
while [ $timeout -gt 0 ]; do
    if docker-compose exec -T db pg_isready -U "$POSTGRES_USER" -d postgres >/dev/null 2>&1; then
        break
    fi
    sleep 1
    timeout=$((timeout-1))
done

if [ $timeout -eq 0 ]; then
    error "База данных не готова к работе"
    exit 1
fi

# Проверяем, существует ли база данных
DB_EXISTS=$(docker-compose exec -T db psql -U "$POSTGRES_USER" -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='$POSTGRES_DB';" | xargs)

if [ "$DB_EXISTS" = "1" ]; then
    warning "База данных '$POSTGRES_DB' уже существует"
    echo -e "${YELLOW}Вы хотите пересоздать базу данных? Это удалит все существующие данные!${NC}"
    read -p "Введите 'yes' для подтверждения: " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Операция отменена пользователем"
        exit 0
    fi
    
    log "Удаляем существующую базу данных..."
    docker-compose exec -T db psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
fi

# Создаем временную директорию для распаковки
TEMP_DIR="/tmp/restore_$$"
mkdir -p "$TEMP_DIR"

# Определяем, сжат ли файл
if [[ "$BACKUP_FILE" == *.gz ]]; then
    log "Распаковываем сжатый бэкап..."
    gunzip -c "$BACKUP_FILE" > "$TEMP_DIR/restore.sql"
else
    log "Копируем файл бэкапа..."
    cp "$BACKUP_FILE" "$TEMP_DIR/restore.sql"
fi

# Копируем файл в контейнер
docker cp "$TEMP_DIR/restore.sql" "$(docker-compose ps -q db):/tmp/restore.sql"

# Очищаем временную директорию
rm -rf "$TEMP_DIR"

log "Восстанавливаем базу данных..."

# Восстанавливаем базу данных
# Используем psql с правильными настройками кодировки
docker-compose exec -T db psql \
    --username="$POSTGRES_USER" \
    --dbname=postgres \
    --set=ON_ERROR_STOP=1 \
    --file="/tmp/restore.sql"

# Удаляем временный файл из контейнера
docker-compose exec -T db rm -f /tmp/restore.sql

# Проверяем, что база данных создана и содержит данные
log "Проверяем восстановленную базу данных..."

TABLE_COUNT=$(docker-compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

if [ "$TABLE_COUNT" -gt 0 ]; then
    success "База данных успешно восстановлена! Найдено таблиц: $TABLE_COUNT"
    
    # Показываем список таблиц
    log "Таблицы в восстановленной базе данных:"
    docker-compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"
    
    # Показываем кодировку базы данных
    ENCODING=$(docker-compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = '$POSTGRES_DB';" | xargs)
    log "Кодировка базы данных: $ENCODING"
    
else
    error "База данных восстановлена, но таблицы не найдены!"
    exit 1
fi

# Запускаем миграции Alembic для обновления схемы до актуального состояния
log "Запускаем миграции базы данных..."
if docker-compose ps backend | grep -q "Up"; then
    docker-compose exec backend alembic upgrade head
    success "Миграции выполнены успешно"
else
    warning "Backend контейнер не запущен. Запустите миграции вручную:"
    warning "docker-compose exec backend alembic upgrade head"
fi

success "Процесс восстановления завершен успешно!"
log "База данных готова к использованию"
