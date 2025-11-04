@echo off
REM Скрипт для выполнения миграции статусов пользователей в Docker контейнере (Windows)
REM Обновляет статусы существующих пользователей на основе количества успешных аренд
REM и просроченных резервов

echo [%date% %time%] Запуск миграции статусов пользователей...
echo.

REM Проверяем, что контейнер backend запущен
docker-compose ps backend | findstr "Up" >nul
if errorlevel 1 (
    echo [ERROR] Контейнер backend не запущен! Запустите: docker-compose up -d
    exit /b 1
)

REM Проверяем, что база данных готова
echo [%date% %time%] Проверяем готовность базы данных...
timeout /t 3 /nobreak >nul

REM Применяем миграции БД (если нужно)
echo [%date% %time%] Проверяем миграции БД...
docker-compose exec backend alembic upgrade head

if errorlevel 1 (
    echo [ERROR] Ошибка при применении миграций БД!
    exit /b 1
)

REM Запускаем скрипт миграции данных
echo [%date% %time%] Запускаем миграцию данных статусов пользователей...
docker-compose exec backend python scripts/migrate_user_statuses.py

if errorlevel 1 (
    echo [ERROR] Ошибка при миграции данных!
    exit /b 1
)

echo.
echo [SUCCESS] Миграция статусов пользователей завершена успешно!
echo.
echo Проверьте логи выше для просмотра статистики миграции.

