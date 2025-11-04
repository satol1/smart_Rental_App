@echo off
REM Скрипт для запуска восстановления с поддержкой кириллицы в Windows

if "%1"=="" (
    echo [ERROR] Usage: run_restore_utf8.bat ^<backup_file^>
    echo [ERROR] Example: run_restore_utf8.bat db_backup\rental_db_backup_20241201_120000.sql
    exit /b 1
)

echo [%date% %time%] Starting UTF-8 database restoration...

REM Проверяем наличие PowerShell
powershell -Command "Get-Host" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PowerShell not found!
    exit /b 1
)

REM Запускаем PowerShell скрипт
echo [%date% %time%] Running PowerShell restore script...
powershell -ExecutionPolicy Bypass -File "scripts\restore_database_utf8.ps1" "%1"

if errorlevel 1 (
    echo [ERROR] Restore failed!
    exit /b 1
)

echo [SUCCESS] Restore completed successfully!
pause
