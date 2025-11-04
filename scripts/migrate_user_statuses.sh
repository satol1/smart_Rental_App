#!/bin/bash

# Скрипт для выполнения миграции статусов пользователей в Docker контейнере
# Обновляет статусы существующих пользователей на основе количества успешных аренд
# и просроченных резервов

echo "[$(date)] Запуск миграции статусов пользователей..."
echo ""

# Проверяем, что контейнер backend запущен
if ! docker-compose ps backend | grep -q "Up"; then
    echo "[ERROR] Контейнер backend не запущен! Запустите: docker-compose up -d"
    exit 1
fi

# Проверяем, что база данных готова
echo "[$(date)] Проверяем готовность базы данных..."
if ! docker-compose exec -T db pg_isready -U ${POSTGRES_USER:-myuser} -d ${POSTGRES_DB:-rental_db} > /dev/null 2>&1; then
    echo "[ERROR] База данных не готова! Ожидаем..."
    sleep 5
fi

# Применяем миграции БД (если нужно)
echo "[$(date)] Проверяем миграции БД..."
docker-compose exec backend alembic upgrade head

if [ $? -ne 0 ]; then
    echo "[ERROR] Ошибка при применении миграций БД!"
    exit 1
fi

# Запускаем скрипт миграции данных
echo "[$(date)] Запускаем миграцию данных статусов пользователей..."
docker-compose exec backend python scripts/migrate_user_statuses.py

if [ $? -ne 0 ]; then
    echo "[ERROR] Ошибка при миграции данных!"
    exit 1
fi

echo ""
echo "[SUCCESS] Миграция статусов пользователей завершена успешно!"
echo ""
echo "Проверьте логи выше для просмотра статистики миграции."

