@echo off
REM Скрипт для запуска тестов CSP nonce в Docker (Windows)

echo 🧪 Запуск тестов CSP nonce в Docker...

cd /d %~dp0

docker-compose -f docker-compose.csp-nonce-tests.yml up --build --abort-on-container-exit test-backend

echo ✅ Тесты CSP nonce завершены

