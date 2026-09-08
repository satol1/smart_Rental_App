#!/bin/bash
# Скрипт для запуска тестов CSP nonce в Docker


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

echo "🧪 Запуск тестов CSP nonce в Docker..."

# Переходим в директорию проекта
cd "$(dirname "$0")"

# Запускаем тесты в Docker
$COMPOSE_CMD -f docker-compose.csp-nonce-tests.yml up --build --abort-on-container-exit test-backend

echo "✅ Тесты CSP nonce завершены"

