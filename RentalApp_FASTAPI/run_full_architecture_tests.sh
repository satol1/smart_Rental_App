#!/bin/bash

# Скрипт для запуска полного тестирования новой архитектуры в Docker
# Включает все типы тестов: unit, integration, API, e2e


# Docker Compose: standalone docker-compose или плагин 'docker compose'
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    echo "docker-compose (или плагин 'docker compose') не установлен" >&2
    exit 1
fi

set -e

echo "🚀 Запуск полного тестирования новой архитектуры в Docker..."

# Останавливаем и удаляем существующие контейнеры
echo "🧹 Очистка существующих контейнеров..."
$COMPOSE_CMD -f docker-compose.full-architecture-tests.yml down -v

# Собираем и запускаем тесты
echo "🔨 Сборка и запуск тестов..."
$COMPOSE_CMD -f docker-compose.full-architecture-tests.yml up --build --abort-on-container-exit

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
$COMPOSE_CMD -f docker-compose.full-architecture-tests.yml down -v

echo "🏁 Тестирование завершено!"
