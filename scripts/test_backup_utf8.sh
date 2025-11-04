#!/bin/bash

# Скрипт для тестирования бэкапа с кириллицей в Docker
# Создает тестовую базу данных, добавляет кириллические данные, делает бэкап и восстанавливает

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

# Создаем тестовую базу данных
TEST_DB="${POSTGRES_DB}_test_utf8"
TEST_BACKUP_DIR="db_backup/test_utf8"
mkdir -p "$TEST_BACKUP_DIR"

log "Начинаем тестирование бэкапа с кириллицей..."

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

# Удаляем тестовую базу данных если она существует
log "Удаляем старую тестовую базу данных..."
docker-compose exec -T db psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB;" 2>/dev/null || true

# Создаем тестовую базу данных
log "Создаем тестовую базу данных: $TEST_DB"
docker-compose exec -T db psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $TEST_DB WITH ENCODING 'UTF8' LC_COLLATE='C.UTF-8' LC_CTYPE='C.UTF-8';"

# Создаем тестовую таблицу с кириллическими данными
log "Создаем тестовую таблицу с кириллическими данными..."
docker-compose exec -T db psql -U "$POSTGRES_USER" -d "$TEST_DB" -c "
CREATE TABLE test_cyrillic (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставляем тестовые данные с кириллицей
INSERT INTO test_cyrillic (name, description) VALUES 
('Пользователь Тест', 'Это тестовое описание с кириллическими символами'),
('Администратор Системы', 'Описание администратора системы аренды оборудования'),
('Менеджер Отдела', 'Менеджер отдела аренды и бронирования'),
('Технический Специалист', 'Специалист по техническому обслуживанию оборудования'),
('Клиент VIP', 'VIP клиент с особыми условиями аренды');

-- Создаем таблицу с названиями оборудования
CREATE TABLE test_equipment (
    id SERIAL PRIMARY KEY,
    equipment_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT
);

INSERT INTO test_equipment (equipment_name, category, description) VALUES 
('Камера Canon EOS R5', 'Фототехника', 'Профессиональная зеркальная камера для съемки'),
('Микрофон Rode Wireless GO II', 'Аудиотехника', 'Беспроводной микрофон для интервью и записи'),
('Светодиодная панель Aputure 300D', 'Световое оборудование', 'Мощная светодиодная панель для студийной съемки'),
('Стабилизатор DJI RS 3', 'Аксессуары', 'Трехосевой стабилизатор для камеры'),
('Штатив Manfrotto 055', 'Аксессуары', 'Профессиональный штатив для камеры');
"

# Проверяем, что данные вставлены
log "Проверяем вставленные данные..."
USER_COUNT=$(docker-compose exec -T db psql -U "$POSTGRES_USER" -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM test_cyrillic;" | xargs)
EQUIPMENT_COUNT=$(docker-compose exec -T db psql -U "$POSTGRES_USER" -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM test_equipment;" | xargs)

success "Вставлено пользователей: $USER_COUNT, оборудования: $EQUIPMENT_COUNT"

# Показываем данные для проверки
log "Проверяем кириллические данные:"
docker-compose exec -T db psql -U "$POSTGRES_USER" -d "$TEST_DB" -c "SELECT name, description FROM test_cyrillic LIMIT 3;"

# Создаем бэкап тестовой базы данных
log "Создаем бэкап тестовой базы данных..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEST_BACKUP_FILE="$TEST_BACKUP_DIR/test_utf8_backup_$TIMESTAMP.sql"

# Используем наш улучшенный скрипт бэкапа
docker-compose exec -T db bash -c "
    export LC_ALL=C.UTF-8
    export LANG=C.UTF-8
    export PGCLIENTENCODING=UTF8
    pg_dump \
        --username='$POSTGRES_USER' \
        --dbname='$TEST_DB' \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --encoding=UTF8 \
        --no-password \
        --format=plain \
        --file='/tmp/test_backup.sql'
"

# Копируем файл из контейнера
docker-compose exec -T db cat /tmp/test_backup.sql > "$TEST_BACKUP_FILE"

# Удаляем временный файл из контейнера
docker-compose exec -T db rm -f /tmp/test_backup.sql

# Проверяем размер созданного файла
if [ ! -s "$TEST_BACKUP_FILE" ]; then
    error "Тестовый бэкап не создан или файл пустой!"
    exit 1
fi

# Проверяем кодировку файла
FILE_ENCODING=$(file -bi "$TEST_BACKUP_FILE" | grep -o "charset=[^;]*" | cut -d= -f2)
log "Кодировка тестового бэкапа: $FILE_ENCODING"

# Проверяем наличие кириллицы в бэкапе
CYRILLIC_IN_BACKUP=$(grep -c "Пользователь\|Администратор\|Камера\|Микрофон" "$TEST_BACKUP_FILE" 2>/dev/null || echo "0")
if [ "$CYRILLIC_IN_BACKUP" -gt 0 ]; then
    success "Кириллические символы найдены в бэкапе: $CYRILLIC_IN_BACKUP вхождений"
else
    warning "Кириллические символы не найдены в бэкапе!"
fi

# Удаляем тестовую базу данных
log "Удаляем тестовую базу данных для тестирования восстановления..."
docker-compose exec -T db psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB;"

# Восстанавливаем из бэкапа
log "Восстанавливаем тестовую базу данных из бэкапа..."
docker-compose exec -T db bash -c "
    export LC_ALL=C.UTF-8
    export LANG=C.UTF-8
    export PGCLIENTENCODING=UTF8
    psql \
        --username='$POSTGRES_USER' \
        --dbname=postgres \
        --set=ON_ERROR_STOP=1 \
        --file='/tmp/test_backup.sql'
"

# Копируем файл в контейнер для восстановления
docker cp "$TEST_BACKUP_FILE" "$(docker-compose ps -q db):/tmp/test_backup.sql"

# Восстанавливаем
docker-compose exec -T db bash -c "
    export LC_ALL=C.UTF-8
    export LANG=C.UTF-8
    export PGCLIENTENCODING=UTF8
    psql \
        --username='$POSTGRES_USER' \
        --dbname=postgres \
        --set=ON_ERROR_STOP=1 \
        --file='/tmp/test_backup.sql'
"

# Удаляем временный файл из контейнера
docker-compose exec -T db rm -f /tmp/test_backup.sql

# Проверяем восстановленные данные
log "Проверяем восстановленные данные..."

# Проверяем количество записей
RESTORED_USER_COUNT=$(docker-compose exec -T db psql -U "$POSTGRES_USER" -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM test_cyrillic;" | xargs)
RESTORED_EQUIPMENT_COUNT=$(docker-compose exec -T db psql -U "$POSTGRES_USER" -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM test_equipment;" | xargs)

if [ "$RESTORED_USER_COUNT" -eq "$USER_COUNT" ] && [ "$RESTORED_EQUIPMENT_COUNT" -eq "$EQUIPMENT_COUNT" ]; then
    success "Количество записей восстановлено корректно: пользователей $RESTORED_USER_COUNT, оборудования $RESTORED_EQUIPMENT_COUNT"
else
    error "Количество записей не совпадает! Ожидалось: пользователей $USER_COUNT, оборудования $EQUIPMENT_COUNT. Получено: пользователей $RESTORED_USER_COUNT, оборудования $RESTORED_EQUIPMENT_COUNT"
fi

# Проверяем кириллические символы
log "Проверяем кириллические символы в восстановленных данных..."
CYRILLIC_TEST=$(docker-compose exec -T db psql -U "$POSTGRES_USER" -d "$TEST_DB" -t -c "SELECT name FROM test_cyrillic WHERE name LIKE '%Пользователь%';" | xargs)

if [[ "$CYRILLIC_TEST" == *"Пользователь"* ]]; then
    success "✅ Кириллические символы восстановлены корректно: $CYRILLIC_TEST"
else
    error "❌ Кириллические символы не восстановлены! Получено: $CYRILLIC_TEST"
fi

# Показываем восстановленные данные
log "Восстановленные данные:"
docker-compose exec -T db psql -U "$POSTGRES_USER" -d "$TEST_DB" -c "SELECT name, description FROM test_cyrillic LIMIT 3;"
docker-compose exec -T db psql -U "$POSTGRES_USER" -d "$TEST_DB" -c "SELECT equipment_name, category FROM test_equipment LIMIT 3;"

# Очищаем тестовую базу данных
log "Очищаем тестовую базу данных..."
docker-compose exec -T db psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB;"

# Создаем отчет о тестировании
REPORT_FILE="$TEST_BACKUP_DIR/test_report_$TIMESTAMP.txt"
cat > "$REPORT_FILE" << EOF
=== ОТЧЕТ О ТЕСТИРОВАНИИ БЭКАПА С КИРИЛЛИЦЕЙ ===

Дата тестирования: $(date)
Тестовая база данных: $TEST_DB
Файл бэкапа: $TEST_BACKUP_FILE

=== РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ ===
- Исходные данные: пользователей $USER_COUNT, оборудования $EQUIPMENT_COUNT
- Восстановленные данные: пользователей $RESTORED_USER_COUNT, оборудования $RESTORED_EQUIPMENT_COUNT
- Кодировка бэкапа: $FILE_ENCODING
- Кириллические символы в бэкапе: $CYRILLIC_IN_BACKUP вхождений
- Тест кириллицы: $CYRILLIC_TEST

=== СТАТУС ===
EOF

if [ "$RESTORED_USER_COUNT" -eq "$USER_COUNT" ] && [ "$RESTORED_EQUIPMENT_COUNT" -eq "$EQUIPMENT_COUNT" ] && [[ "$CYRILLIC_TEST" == *"Пользователь"* ]]; then
    echo "✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО" >> "$REPORT_FILE"
    echo "✅ Кириллические символы сохраняются и восстанавливаются корректно" >> "$REPORT_FILE"
    echo "✅ Бэкап готов к использованию в продакшене" >> "$REPORT_FILE"
    success "Все тесты пройдены успешно!"
else
    echo "❌ ТЕСТЫ НЕ ПРОЙДЕНЫ" >> "$REPORT_FILE"
    echo "❌ Обнаружены проблемы с кириллицей или восстановлением данных" >> "$REPORT_FILE"
    error "Тесты не пройдены! Проверьте настройки кодировки."
fi

log "Отчет о тестировании сохранен в: $REPORT_FILE"

# Показываем содержимое отчета
log "Содержимое отчета:"
cat "$REPORT_FILE"

success "Тестирование бэкапа завершено!"
