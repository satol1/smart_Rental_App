@echo off
REM Скрипт для запуска бэкапа с поддержкой кириллицы в Windows

echo [%date% %time%] Starting UTF-8 database backup...

REM Проверяем наличие PowerShell
powershell -Command "Get-Host" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PowerShell not found!
    exit /b 1
)

REM Запускаем PowerShell скрипт
echo [%date% %time%] Running PowerShell backup script...
powershell -ExecutionPolicy Bypass -File "scripts\backup_database_utf8.ps1"

if errorlevel 1 (
    echo [ERROR] Backup failed!
    exit /b 1
)

echo [SUCCESS] Backup completed successfully!
pause
