#!/bin/bash

# Скрипт для запуска полного тестирования новой архитектуры в Docker
# Включает все типы тестов: unit, integration, API, e2e

set -e

echo "🚀 Запуск полного тестирования новой архитектуры в Docker..."

# Останавливаем и удаляем существующие контейнеры
echo "🧹 Очистка существующих контейнеров..."
docker-compose -f docker-compose.full-architecture-tests.yml down -v

# Собираем и запускаем тесты
echo "🔨 Сборка и запуск тестов..."
docker-compose -f docker-compose.full-architecture-tests.yml up --build --abort-on-container-exit

# Проверяем результат
if [ $? -eq 0 ]; then
    echo "✅ Все тесты прошли успешно!"
    echo "🎉 Новая архитектура полностью протестирована!"
else
    echo "❌ Некоторые тесты не прошли. Проверьте логи выше."
    exit 1
fi

# Очищаем контейнеры
echo "🧹 Очистка тестовых контейнеров..."
docker-compose -f docker-compose.full-architecture-tests.yml down -v

echo "🏁 Тестирование завершено!"
