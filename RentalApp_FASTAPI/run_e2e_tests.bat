@echo off
REM Скрипт для запуска E2E тестов RentalApp_FASTAPI в Windows

setlocal enabledelayedexpansion

REM Параметры по умолчанию
set REBUILD=false
set COVERAGE=false
set VERBOSE=false
set MARKER=
set DOCKER=false
set PARALLEL=false

REM Обработка аргументов командной строки
:parse_args
if "%~1"=="" goto :run_tests
if "%~1"=="-r" (
    set REBUILD=true
    shift
    goto :parse_args
)
if "%~1"=="--rebuild" (
    set REBUILD=true
    shift
    goto :parse_args
)
if "%~1"=="-c" (
    set COVERAGE=true
    shift
    goto :parse_args
)
if "%~1"=="--coverage" (
    set COVERAGE=true
    shift
    goto :parse_args
)
if "%~1"=="-v" (
    set VERBOSE=true
    shift
    goto :parse_args
)
if "%~1"=="--verbose" (
    set VERBOSE=true
    shift
    goto :parse_args
)
if "%~1"=="-m" (
    set MARKER=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--marker" (
    set MARKER=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="-d" (
    set DOCKER=true
    shift
    goto :parse_args
)
if "%~1"=="--docker" (
    set DOCKER=true
    shift
    goto :parse_args
)
if "%~1"=="-p" (
    set PARALLEL=true
    shift
    goto :parse_args
)
if "%~1"=="--parallel" (
    set PARALLEL=true
    shift
    goto :parse_args
)
if "%~1"=="-h" (
    goto :show_help
)
if "%~1"=="--help" (
    goto :show_help
)
echo [ERROR] Неизвестный параметр: %~1
exit /b 1

:show_help
echo Использование: %0 [опции]
echo.
echo Опции:
echo   -r, --rebuild     Пересобрать Docker контейнеры
echo   -c, --coverage    Запустить с покрытием кода
echo   -v, --verbose     Подробный вывод
echo   -m, --marker      Запустить тесты с определенным маркером
echo   -d, --docker      Запустить тесты в Docker
echo   -p, --parallel    Запустить тесты параллельно
echo   -h, --help        Показать эту справку
echo.
echo Примеры:
echo   %0                           # Запустить все E2E тесты
echo   %0 -c                        # С покрытием кода
echo   %0 -m rental_flow            # Только тесты потока аренды
echo   %0 -d -r -p                  # В Docker с пересборкой и параллельно
exit /b 0

:run_tests
echo [%date% %time%] Запуск E2E тестов RentalApp_FASTAPI

REM Проверка наличия Docker
if "%DOCKER%"=="true" (
    docker --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Docker не установлен
        exit /b 1
    )
    
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] docker-compose не установлен
        exit /b 1
    )
    
    echo [INFO] Запуск E2E тестов в Docker
    
    REM Пересборка контейнеров если нужно
    if "%REBUILD%"=="true" (
        echo [INFO] Пересборка Docker контейнеров...
        docker-compose down
        docker-compose build --no-cache
    )
    
    REM Запуск контейнеров
    echo [INFO] Запуск контейнеров...
    docker-compose up -d db
    
    REM Ожидание готовности базы данных
    echo [INFO] Ожидание готовности базы данных...
    timeout /t 15 /nobreak >nul
    
    REM Установка тестовых зависимостей
    echo [INFO] Установка тестовых зависимостей...
    docker-compose exec -T backend pip install -r requirements-test.txt
    
    REM Формирование команды pytest
    set PYTEST_CMD=pytest tests/e2e/
    
    if "%COVERAGE%"=="true" (
        set PYTEST_CMD=!PYTEST_CMD! --cov=api --cov-report=html --cov-report=term-missing
    )
    
    if "%VERBOSE%"=="true" (
        set PYTEST_CMD=!PYTEST_CMD! -v -s
    )
    
    if "%PARALLEL%"=="true" (
        set PYTEST_CMD=!PYTEST_CMD! -n auto
    )
    
    if not "%MARKER%"=="" (
        set PYTEST_CMD=!PYTEST_CMD! -m %MARKER%
    )
    
    REM Запуск E2E тестов
    echo [INFO] Запуск E2E тестов...
    docker-compose exec -T backend !PYTEST_CMD!
    
    REM Остановка контейнеров
    echo [INFO] Остановка контейнеров...
    docker-compose down
    
) else (
    REM Локальный запуск
    echo [INFO] Запуск E2E тестов локально
    
    REM Установка зависимостей
    echo [INFO] Установка тестовых зависимостей...
    pip install -r requirements-test.txt
    
    REM Формирование команды pytest
    set PYTEST_CMD=pytest tests/e2e/
    
    if "%COVERAGE%"=="true" (
        set PYTEST_CMD=!PYTEST_CMD! --cov=api --cov-report=html --cov-report=term-missing
    )
    
    if "%VERBOSE%"=="true" (
        set PYTEST_CMD=!PYTEST_CMD! -v -s
    )
    
    if "%PARALLEL%"=="true" (
        set PYTEST_CMD=!PYTEST_CMD! -n auto
    )
    
    if not "%MARKER%"=="" (
        set PYTEST_CMD=!PYTEST_CMD! -m %MARKER%
    )
    
    REM Запуск E2E тестов
    echo [INFO] Запуск E2E тестов...
    !PYTEST_CMD!
)

echo [SUCCESS] E2E тесты завершены

REM Показать покрытие если запрошено
if "%COVERAGE%"=="true" (
    echo [INFO] Отчет о покрытии создан в htmlcov/index.html
)
