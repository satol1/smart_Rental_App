@echo off
REM Скрипт для запуска полного тестирования новой архитектуры в Docker
REM Включает все типы тестов: unit, integration, API, e2e

echo 🚀 Запуск полного тестирования новой архитектуры в Docker...

REM Останавливаем и удаляем существующие контейнеры
echo 🧹 Очистка существующих контейнеров...
docker-compose -f docker-compose.full-architecture-tests.yml down -v

REM Собираем и запускаем тесты
echo 🔨 Сборка и запуск тестов...
docker-compose -f docker-compose.full-architecture-tests.yml up --build --abort-on-container-exit

REM Проверяем результат
if %ERRORLEVEL% EQU 0 (
    echo ✅ Все тесты прошли успешно!
    echo 🎉 Новая архитектура полностью протестирована!
) else (
    echo ❌ Некоторые тесты не прошли. Проверьте логи выше.
    exit /b 1
)

REM Очищаем контейнеры
echo 🧹 Очистка тестовых контейнеров...
docker-compose -f docker-compose.full-architecture-tests.yml down -v

echo 🏁 Тестирование завершено!
pause
