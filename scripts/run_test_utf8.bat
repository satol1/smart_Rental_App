@echo off
REM Скрипт для запуска тестирования бэкапа с поддержкой кириллицы в Windows

echo [%date% %time%] Starting UTF-8 backup testing...

REM Проверяем наличие WSL или Git Bash
where bash >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Bash not found! Please install WSL or Git Bash
    echo [ERROR] Alternatively, you can test manually by creating test data
    exit /b 1
)

REM Запускаем bash скрипт
echo [%date% %time%] Running bash test script...
bash scripts/test_backup_utf8.sh

if errorlevel 1 (
    echo [ERROR] Test failed!
    exit /b 1
)

echo [SUCCESS] Test completed successfully!
pause
