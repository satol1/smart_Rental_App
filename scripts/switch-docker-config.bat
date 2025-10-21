@echo off
REM Скрипт для переключения между конфигурациями Docker Compose
REM Использование: switch-docker-config.bat [normal|limited]

setlocal enabledelayedexpansion

if "%1"=="" (
    echo Использование: %0 [normal^|limited]
    echo.
    echo normal   - Обычная конфигурация без ограничений ресурсов
    echo limited  - Конфигурация с ограничениями ресурсов (1 vCore, 2GB RAM)
    echo.
    echo Текущая конфигурация:
    if exist "docker-compose.limited-resources.yml" (
        echo   - Ограниченная конфигурация доступна
    )
    if exist "docker-compose.yml" (
        echo   - Основная конфигурация доступна
    )
    goto :eof
)

if "%1"=="normal" (
    echo Переключение на обычную конфигурацию...
    if exist "docker-compose.limited-resources.yml" (
        ren "docker-compose.limited-resources.yml" "docker-compose.limited-resources.yml.backup"
    )
    echo Готово! Используйте: docker-compose up
    goto :eof
)

if "%1"=="limited" (
    echo Переключение на ограниченную конфигурацию...
    if exist "docker-compose.limited-resources.yml.backup" (
        ren "docker-compose.limited-resources.yml.backup" "docker-compose.limited-resources.yml"
    )
    echo Готово! Используйте: docker-compose -f docker-compose.limited-resources.yml up
    goto :eof
)

echo Неверный параметр: %1
echo Используйте: normal или limited
