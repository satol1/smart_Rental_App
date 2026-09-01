#!/bin/bash
# rental-app-main/run_tests.sh
# Скрипт для запуска тестов фронтенда в Docker

set -e

echo "🚀 Запуск тестов фронтенда в Docker..."

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен"
    exit 1
fi

# Проверка наличия docker-compose
if ! command -v docker-compose &> /dev/null && ! command -v docker compose &> /dev/null; then
    echo "❌ docker-compose не установлен"
    exit 1
fi

# Определяем команду docker-compose
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

# Переходим в директорию скрипта
cd "$(dirname "$0")"

# Запуск тестов
echo "📦 Запуск тестов..."
$DOCKER_COMPOSE -f docker-compose.test.yml run --rm frontend-test

echo "✅ Тесты завершены"

