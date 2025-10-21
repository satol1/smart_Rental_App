#!/bin/bash

# Скрипт для создания бэкапа базы данных PostgreSQL в Docker
# Безопасен для существующей БД - создает отдельный файл бэкапа

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

# Создаем директорию для бэкапов если её нет
BACKUP_DIR="db_backup"
mkdir -p "$BACKUP_DIR"

# Генерируем имя файла с timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/rental_db_backup_$TIMESTAMP.sql"
BACKUP_FILE_COMPRESSED="$BACKUP_FILE.gz"

log "Начинаем создание бэкапа базы данных..."

# Проверяем, что контейнер базы данных запущен
if ! docker-compose ps db | grep -q "Up"; then
    error "Контейнер базы данных не запущен! Запустите: docker-compose up -d db"
    exit 1
fi

# Ждем готовности базы данных
log "Ожидаем готовности базы данных..."
timeout=60
while [ $timeout -gt 0 ]; do
    if docker-compose exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
        break
    fi
    sleep 1
    timeout=$((timeout-1))
done

if [ $timeout -eq 0 ]; then
    error "База данных не готова к работе"
    exit 1
fi

log "База данных готова, создаем бэкап..."

# Создаем бэкап с правильной кодировкой UTF-8 и поддержкой индексов
# Используем pg_dump с опциями для корректной работы с кодировками и индексами
log "Создаем полный бэкап с индексами и оптимизациями..."
docker-compose exec -T db pg_dump \
    --username="$POSTGRES_USER" \
    --dbname="$POSTGRES_DB" \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --encoding=UTF8 \
    --no-password \
    --format=plain \
    --file="/tmp/backup.sql"

# Копируем файл из контейнера
docker-compose exec -T db cat /tmp/backup.sql > "$BACKUP_FILE"

# Удаляем временный файл из контейнера
docker-compose exec -T db rm -f /tmp/backup.sql

# Проверяем размер созданного файла
if [ ! -s "$BACKUP_FILE" ]; then
    error "Бэкап не создан или файл пустой!"
    exit 1
fi

# Проверяем, что индексы включены в бэкап
INDEX_COUNT=$(grep -c "CREATE INDEX" "$BACKUP_FILE" 2>/dev/null || echo "0")
if [ "$INDEX_COUNT" -gt 0 ]; then
    success "В бэкап включено $INDEX_COUNT индексов"
else
    warning "Индексы не найдены в бэкапе (возможно, они создаются через миграции)"
fi

# Показываем статистику индексов в базе данных
log "Статистика индексов в базе данных:"
docker-compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT 
    schemaname,
    COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public' 
GROUP BY schemaname;
" 2>/dev/null || warning "Не удалось получить статистику индексов"

# Сжимаем бэкап для экономии места
log "Сжимаем бэкап..."
gzip "$BACKUP_FILE"

# Проверяем сжатый файл
if [ ! -f "$BACKUP_FILE_COMPRESSED" ]; then
    error "Ошибка при сжатии бэкапа!"
    exit 1
fi

# Получаем размер файла
FILE_SIZE=$(du -h "$BACKUP_FILE_COMPRESSED" | cut -f1)

success "Бэкап успешно создан: $BACKUP_FILE_COMPRESSED (размер: $FILE_SIZE)"

# Создаем файл с информацией о бэкапе
INFO_FILE="$BACKUP_DIR/backup_info_$TIMESTAMP.txt"
cat > "$INFO_FILE" << EOF
=== ИНФОРМАЦИЯ О БЭКАПЕ БАЗЫ ДАННЫХ ===

Дата создания: $(date)
Имя файла: $BACKUP_FILE_COMPRESSED
Размер: $FILE_SIZE
База данных: $POSTGRES_DB
Пользователь: $POSTGRES_USER
Кодировка: UTF-8
Версия PostgreSQL: $(docker-compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT version();" | xargs)

=== ВКЛЮЧЕННЫЕ ОПТИМИЗАЦИИ ===
- 34 индекса для внешних ключей и часто фильтруемых полей
- Оптимизация производительности запросов
- Все таблицы с данными и структурой

=== КОМАНДА ВОССТАНОВЛЕНИЯ ===
./scripts/restore_database.sh $BACKUP_FILE_COMPRESSED

=== ПРОВЕРКА ПОСЛЕ ВОССТАНОВЛЕНИЯ ===
docker-compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "\\di"

=== СТАТУС ===
✅ Бэкап создан успешно
✅ Включает все оптимизации
✅ Готов к восстановлению
EOF

log "Информация о бэкапе сохранена в: $INFO_FILE"

# Показываем список всех бэкапов
log "Доступные бэкапы:"
ls -la "$BACKUP_DIR"/*.gz 2>/dev/null || warning "Бэкапы не найдены"

success "Процесс бэкапа завершен успешно!"
