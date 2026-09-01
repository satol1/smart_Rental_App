@echo off
REM rental-app-main/run_tests.bat
REM Скрипт для запуска тестов фронтенда в Docker (Windows)

echo 🚀 Запуск тестов фронтенда в Docker...

REM Проверка наличия Docker
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker не установлен
    exit /b 1
)

REM Проверка наличия docker-compose
docker-compose --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ docker-compose не установлен
    exit /b 1
)

REM Переходим в директорию скрипта
cd /d "%~dp0"

REM Запуск тестов
echo 📦 Запуск тестов...
docker-compose -f docker-compose.test.yml run --rm frontend-test

if %ERRORLEVEL% EQU 0 (
    echo ✅ Тесты завершены
) else (
    echo ❌ Тесты завершились с ошибками
    exit /b 1
)

