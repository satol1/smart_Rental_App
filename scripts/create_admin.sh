#!/bin/bash

# Скрипт для создания главного администратора в Docker контейнере
# Используется при разворачивании новой БД

echo "[$(date)] Создание главного администратора..."

# Проверяем, что контейнер backend запущен
if ! docker-compose ps backend | grep -q "Up"; then
    echo "[ERROR] Контейнер backend не запущен! Запустите: docker-compose up -d"
    exit 1
fi

# Проверяем, что база данных готова
echo "[$(date)] Ожидаем готовности базы данных..."
sleep 5

# Запускаем скрипт создания администратора
echo "[$(date)] Запускаем скрипт создания администратора..."
docker-compose exec backend python create_admin.py

if [ $? -ne 0 ]; then
    echo "[ERROR] Ошибка при создании администратора!"
    exit 1
fi

echo "[SUCCESS] Администратор создан успешно!"
echo ""
echo "Данные для входа:"
echo "  Email: admin@rentalapp.com"
echo "  Пароль: AdminRental2024!"
echo ""
