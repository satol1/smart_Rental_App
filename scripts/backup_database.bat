@echo off
setlocal enabledelayedexpansion

REM Скрипт для создания бэкапа базы данных PostgreSQL в Docker (Windows)
REM Безопасен для существующей БД - создает отдельный файл бэкапа

echo [%date% %time%] Starting database backup creation...

REM Проверяем наличие .env файла
if not exist ".env" (
    echo [ERROR] .env file not found! Create it based on env.example
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

REM Создаем директорию для бэкапов если её нет
if not exist "db_backup" mkdir db_backup

REM Генерируем имя файла с timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%%MM%%DD%_%HH%%Min%%Sec%"

set "BACKUP_FILE=db_backup\rental_db_backup_%timestamp%.sql"

echo [%date% %time%] Creating backup: %BACKUP_FILE%

REM Проверяем, что контейнер базы данных запущен
docker-compose ps db | findstr "Up" >nul
if errorlevel 1 (
    echo [ERROR] Database container is not running! Start it with: docker-compose up -d db
    exit /b 1
)

REM Ждем готовности базы данных
echo [%date% %time%] Waiting for database readiness...
timeout /t 10 /nobreak >nul

REM Создаем бэкап с правильной кодировкой UTF-8
echo [%date% %time%] Creating database backup...
docker-compose exec -T db pg_dump --username=%POSTGRES_USER% --dbname=%POSTGRES_DB% --verbose --clean --if-exists --create --encoding=UTF8 --no-password --format=plain --file="/tmp/backup.sql"

if errorlevel 1 (
    echo [ERROR] Error creating backup!
    exit /b 1
)

REM Копируем файл из контейнера
docker-compose exec -T db cat /tmp/backup.sql > "%BACKUP_FILE%"

if errorlevel 1 (
    echo [ERROR] Error copying backup file!
    exit /b 1
)

REM Удаляем временный файл из контейнера
docker-compose exec -T db rm -f /tmp/backup.sql

REM Проверяем размер созданного файла
if not exist "%BACKUP_FILE%" (
    echo [ERROR] Backup not created!
    exit /b 1
)

for %%A in ("%BACKUP_FILE%") do set "FILE_SIZE=%%~zA"
if %FILE_SIZE%==0 (
    echo [ERROR] Backup file is empty!
    exit /b 1
)

echo [SUCCESS] Backup created successfully: %BACKUP_FILE% (size: %FILE_SIZE% bytes)

REM Создаем файл с информацией о бэкапе с правильной кодировкой UTF-8
set "INFO_FILE=db_backup\backup_info_%timestamp%.txt"
powershell -Command "[System.IO.File]::WriteAllText('%INFO_FILE%', \"Информация о бэкапе`r`n==================`r`nДата создания: %date% %time%`r`nИмя файла: %BACKUP_FILE%`r`nРазмер: %FILE_SIZE% байт`r`nБаза данных: %POSTGRES_DB%`r`nПользователь: %POSTGRES_USER%`r`nКодировка: UTF-8`r`n`r`nДля восстановления используйте:`r`nscripts\restore_database.bat %BACKUP_FILE%\", [System.Text.Encoding]::UTF8)"

echo [%date% %time%] Backup info saved to: %INFO_FILE%

REM Показываем список всех бэкапов
echo [%date% %time%] Available backups:
dir /b db_backup\*.sql 2>nul || echo [WARNING] No backups found

echo [SUCCESS] Backup process completed successfully!
pause
