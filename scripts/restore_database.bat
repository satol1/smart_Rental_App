@echo off
setlocal enabledelayedexpansion

REM Скрипт для восстановления базы данных PostgreSQL из бэкапа в Docker (Windows)
REM Безопасен - создает новую БД или пересоздает существующую

if "%~1"=="" (
    echo [ERROR] Использование: %0 ^<путь_к_файлу_бэкапа^>
    echo [ERROR] Пример: %0 db_backup\rental_db_backup_20241201_120000.sql
    exit /b 1
)

set "BACKUP_FILE=%~1"

REM Проверяем наличие файла бэкапа
if not exist "%BACKUP_FILE%" (
    echo [ERROR] Файл бэкапа не найден: %BACKUP_FILE%
    exit /b 1
)

echo [%date% %time%] Начинаем восстановление базы данных из файла: %BACKUP_FILE%

REM Проверяем наличие .env файла
if not exist ".env" (
    echo [ERROR] Файл .env не найден! Создайте его на основе env.example
    exit /b 1
)

REM Загружаем переменные окружения из .env
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    if "%%a"=="POSTGRES_USER" set POSTGRES_USER=%%b
    if "%%a"=="POSTGRES_PASSWORD" set POSTGRES_PASSWORD=%%b
    if "%%a"=="POSTGRES_DB" set POSTGRES_DB=%%b
)

REM Проверяем обязательные переменные
if "%POSTGRES_USER%"=="" (
    echo [ERROR] POSTGRES_USER не задан в .env файле
    exit /b 1
)
if "%POSTGRES_PASSWORD%"=="" (
    echo [ERROR] POSTGRES_PASSWORD не задан в .env файле
    exit /b 1
)
if "%POSTGRES_DB%"=="" (
    echo [ERROR] POSTGRES_DB не задан в .env файле
    exit /b 1
)

REM Проверяем, что контейнер базы данных запущен
docker-compose ps db | findstr "Up" >nul
if errorlevel 1 (
    echo [ERROR] Контейнер базы данных не запущен! Запустите: docker-compose up -d db
    exit /b 1
)

REM Ждем готовности базы данных
echo [%date% %time%] Ожидаем готовности базы данных...
timeout /t 10 /nobreak >nul

REM Проверяем, существует ли база данных
for /f %%i in ('docker-compose exec -T db psql -U %POSTGRES_USER% -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='%POSTGRES_DB%';"') do set "DB_EXISTS=%%i"

if "%DB_EXISTS%"=="1" (
    echo [WARNING] База данных '%POSTGRES_DB%' уже существует
    echo [WARNING] Вы хотите пересоздать базу данных? Это удалит все существующие данные!
    set /p "confirm=Введите 'yes' для подтверждения: "
    
    if not "!confirm!"=="yes" (
        echo [%date% %time%] Операция отменена пользователем
        exit /b 0
    )
    
    echo [%date% %time%] Удаляем существующую базу данных...
    docker-compose exec -T db psql -U %POSTGRES_USER% -d postgres -c "DROP DATABASE IF EXISTS %POSTGRES_DB%;"
)

echo [%date% %time%] Восстанавливаем базу данных...

REM Копируем файл бэкапа в контейнер
docker cp "%BACKUP_FILE%" "$(docker-compose ps -q db):/tmp/restore.sql"

if errorlevel 1 (
    echo [ERROR] Ошибка при копировании файла бэкапа в контейнер!
    exit /b 1
)

REM Восстанавливаем базу данных
docker-compose exec -T db psql --username=%POSTGRES_USER% --dbname=postgres --set=ON_ERROR_STOP=1 --file="/tmp/restore.sql"

if errorlevel 1 (
    echo [ERROR] Ошибка при восстановлении базы данных!
    docker-compose exec -T db rm -f /tmp/restore.sql
    exit /b 1
)

REM Удаляем временный файл из контейнера
docker-compose exec -T db rm -f /tmp/restore.sql

REM Проверяем, что база данных создана и содержит данные
echo [%date% %time%] Проверяем восстановленную базу данных...

for /f %%i in ('docker-compose exec -T db psql -U %POSTGRES_USER% -d %POSTGRES_DB% -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"') do set "TABLE_COUNT=%%i"

if %TABLE_COUNT% gtr 0 (
    echo [SUCCESS] База данных успешно восстановлена! Найдено таблиц: %TABLE_COUNT%
    
    REM Показываем список таблиц
    echo [%date% %time%] Таблицы в восстановленной базе данных:
    docker-compose exec -T db psql -U %POSTGRES_USER% -d %POSTGRES_DB% -c "\dt"
    
    REM Показываем кодировку базы данных
    for /f %%i in ('docker-compose exec -T db psql -U %POSTGRES_USER% -d %POSTGRES_DB% -t -c "SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = '%POSTGRES_DB%';"') do set "ENCODING=%%i"
    echo [%date% %time%] Кодировка базы данных: %ENCODING%
    
) else (
    echo [ERROR] База данных восстановлена, но таблицы не найдены!
    exit /b 1
)

REM Запускаем миграции Alembic для обновления схемы до актуального состояния
echo [%date% %time%] Запускаем миграции базы данных...
docker-compose ps backend | findstr "Up" >nul
if not errorlevel 1 (
    docker-compose exec backend alembic upgrade head
    echo [SUCCESS] Миграции выполнены успешно
) else (
    echo [WARNING] Backend контейнер не запущен. Запустите миграции вручную:
    echo [WARNING] docker-compose exec backend alembic upgrade head
)

echo [SUCCESS] Процесс восстановления завершен успешно!
echo [%date% %time%] База данных готова к использованию
pause
