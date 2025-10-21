@echo off
setlocal enabledelayedexpansion

REM Скрипт для создания главного администратора в Docker контейнере
REM Используется при разворачивании новой БД

echo [%date% %time%] Создание главного администратора...

REM Проверяем, что контейнер backend запущен
docker-compose ps backend | findstr "Up" >nul
if errorlevel 1 (
    echo [ERROR] Контейнер backend не запущен! Запустите: docker-compose up -d
    exit /b 1
)

REM Проверяем, что база данных готова
echo [%date% %time%] Ожидаем готовности базы данных...
timeout /t 5 /nobreak >nul

REM Запускаем скрипт создания администратора
echo [%date% %time%] Запускаем скрипт создания администратора...
docker-compose exec backend python create_admin.py

if errorlevel 1 (
    echo [ERROR] Ошибка при создании администратора!
    exit /b 1
)

echo [SUCCESS] Администратор создан успешно!
echo.
echo Данные для входа:
echo   Email: admin@rentalapp.com
echo   Пароль: AdminRental2024!
echo.
pause
