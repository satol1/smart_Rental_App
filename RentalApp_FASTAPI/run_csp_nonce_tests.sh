#!/bin/bash
# Скрипт для запуска тестов CSP nonce в Docker

set -e

echo "🧪 Запуск тестов CSP nonce в Docker..."

# Переходим в директорию проекта
cd "$(dirname "$0")"

# Запускаем тесты в Docker
docker-compose -f docker-compose.csp-nonce-tests.yml up --build --abort-on-container-exit test-backend

echo "✅ Тесты CSP nonce завершены"

