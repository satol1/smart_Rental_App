@echo off
REM Скрипт для запуска всех типов тестов RentalApp_FASTAPI (Windows)

setlocal enabledelayedexpansion

REM Параметры по умолчанию
set UNIT_ONLY=false
set INTEGRATION_ONLY=false
set E2E_ONLY=false
set FAST_ONLY=false
set FULL_ONLY=false
set DOCKER=false
set VERBOSE=false

REM Обработка аргументов командной строки
:parse_args
if "%~1"=="" goto :run_tests
if "%~1"=="-u" (
    set UNIT_ONLY=true
    shift
    goto :parse_args
)
if "%~1"=="--unit" (
    set UNIT_ONLY=true
    shift
    goto :parse_args
)
if "%~1"=="-i" (
    set INTEGRATION_ONLY=true
    shift
    goto :parse_args
)
if "%~1"=="--integration" (
    set INTEGRATION_ONLY=true
    shift
    goto :parse_args
)
if "%~1"=="-e" (
    set E2E_ONLY=true
    shift
    goto :parse_args
)
if "%~1"=="--e2e" (
    set E2E_ONLY=true
    shift
    goto :parse_args
)
if "%~1"=="-f" (
    set FAST_ONLY=true
    shift
    goto :parse_args
)
if "%~1"=="--fast" (
    set FAST_ONLY=true
    shift
    goto :parse_args
)
if "%~1"=="--full" (
    set FULL_ONLY=true
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
echo   -u, --unit         Запустить только юнит-тесты
echo   -i, --integration  Запустить только интеграционные тесты
echo   -e, --e2e          Запустить только E2E тесты
echo   -f, --fast         Запустить только быстрые тесты (API, модели, утилиты)
echo   --full             Запустить все тесты (быстрые + медленные)
echo   -d, --docker       Запустить тесты в Docker
echo   -v, --verbose      Подробный вывод
echo   -h, --help         Показать эту справку
echo.
echo Примеры:
echo   %0                           # Запустить все тесты
echo   %0 -u                        # Только юнит-тесты
echo   %0 -f -d                     # Быстрые тесты в Docker
echo   %0 --full -d                 # Все тесты в Docker
echo   %0 -i -d                     # Интеграционные тесты в Docker
echo   %0 -e -d -v                  # E2E тесты в Docker с подробным выводом
exit /b 0

:run_tests
echo [%date% %time%] Запуск тестов RentalApp_FASTAPI

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
)

REM Формирование опций pytest
set PYTEST_OPTS=
if "%VERBOSE%"=="true" (
    set PYTEST_OPTS=!PYTEST_OPTS! -v -s
)

REM Запуск быстрых тестов
if "%FAST_ONLY%"=="true" (
    goto :run_fast_tests
)

REM Запуск полных тестов
if "%FULL_ONLY%"=="true" (
    goto :run_full_tests
)

REM Запуск юнит-тестов
if "%UNIT_ONLY%"=="true" (
    goto :run_unit_tests
)
if "%INTEGRATION_ONLY%"=="false" (
    if "%E2E_ONLY%"=="false" (
        goto :run_unit_tests
    )
)
goto :check_integration

:run_unit_tests
echo [INFO] Запуск юнит-тестов...

if "%DOCKER%"=="true" (
    docker-compose -f docker-compose.unit-tests.yml run --rm test-backend pytest tests/services/ !PYTEST_OPTS!
) else (
    pytest tests/services/ !PYTEST_OPTS!
)

if %ERRORLEVEL%==0 (
    echo [SUCCESS] Юнит-тесты завершены успешно
) else (
    echo [ERROR] Юнит-тесты завершились с ошибками
    exit /b 1
)

:check_integration
REM Запуск интеграционных тестов
if "%INTEGRATION_ONLY%"=="true" (
    goto :run_integration_tests
)
if "%UNIT_ONLY%"=="false" (
    if "%E2E_ONLY%"=="false" (
        goto :run_integration_tests
    )
)
goto :check_e2e

:run_integration_tests
echo [INFO] Запуск интеграционных тестов...

if "%DOCKER%"=="true" (
    docker-compose -f docker-compose.integration-tests.yml up --abort-on-container-exit
) else (
    pytest tests/integration/ !PYTEST_OPTS! -m integration
)

if %ERRORLEVEL%==0 (
    echo [SUCCESS] Интеграционные тесты завершены успешно
) else (
    echo [ERROR] Интеграционные тесты завершились с ошибками
    exit /b 1
)

:check_e2e
REM Запуск E2E тестов
if "%E2E_ONLY%"=="true" (
    goto :run_e2e_tests
)
if "%UNIT_ONLY%"=="false" (
    if "%INTEGRATION_ONLY%"=="false" (
        goto :run_e2e_tests
    )
)
goto :finish

:run_e2e_tests
echo [INFO] Запуск E2E тестов...

if "%DOCKER%"=="true" (
    docker-compose -f docker-compose.e2e.yml up --abort-on-container-exit
) else (
    pytest tests/e2e/ !PYTEST_OPTS! -m e2e
)

if %ERRORLEVEL%==0 (
    echo [SUCCESS] E2E тесты завершены успешно
) else (
    echo [ERROR] E2E тесты завершились с ошибками
    exit /b 1
)

:run_fast_tests
echo [INFO] Запуск быстрых тестов (API, модели, утилиты)...

if "%DOCKER%"=="true" (
    docker-compose -f docker-compose.fast-tests.yml down --remove-orphans
    docker-compose -f docker-compose.fast-tests.yml run --rm test-backend
) else (
    pytest tests/api/ tests/models/ tests/repositories/ tests/utils/ tests/services/test_*_service.py tests/services/test_*_model.py tests/services/test_*_repository.py tests/services/test_password_utils.py !PYTEST_OPTS! -m "not slow and not integration and not e2e"
)

if %ERRORLEVEL%==0 (
    echo [SUCCESS] Быстрые тесты завершены успешно
) else (
    echo [ERROR] Быстрые тесты завершились с ошибками
    exit /b 1
)
goto :finish

:run_full_tests
echo [INFO] Запуск всех тестов (быстрых + медленных)...

if "%DOCKER%"=="true" (
    docker-compose -f docker-compose.full-tests.yml down --remove-orphans
    docker-compose -f docker-compose.full-tests.yml run --rm test-backend
) else (
    pytest tests/ !PYTEST_OPTS! --durations=10
)

if %ERRORLEVEL%==0 (
    echo [SUCCESS] Все тесты завершены успешно
) else (
    echo [ERROR] Тесты завершились с ошибками
    exit /b 1
)
goto :finish

:finish
echo [SUCCESS] Все тесты завершены успешно
exit /b 0
