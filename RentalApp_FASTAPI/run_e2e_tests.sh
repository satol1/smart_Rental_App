#!/bin/bash
# Скрипт для запуска E2E тестов RentalApp_FASTAPI

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Параметры по умолчанию
REBUILD=false
COVERAGE=false
VERBOSE=false
MARKER=""
DOCKER=false
PARALLEL=false

# Обработка аргументов командной строки
while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--rebuild)
            REBUILD=true
            shift
            ;;
        -c|--coverage)
            COVERAGE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -m|--marker)
            MARKER="$2"
            shift 2
            ;;
        -d|--docker)
            DOCKER=true
            shift
            ;;
        -p|--parallel)
            PARALLEL=true
            shift
            ;;
        -h|--help)
            echo "Использование: $0 [опции]"
            echo ""
            echo "Опции:"
            echo "  -r, --rebuild     Пересобрать Docker контейнеры"
            echo "  -c, --coverage    Запустить с покрытием кода"
            echo "  -v, --verbose     Подробный вывод"
            echo "  -m, --marker      Запустить тесты с определенным маркером"
            echo "  -d, --docker      Запустить тесты в Docker"
            echo "  -p, --parallel    Запустить тесты параллельно"
            echo "  -h, --help        Показать эту справку"
            echo ""
            echo "Примеры:"
            echo "  $0                           # Запустить все E2E тесты"
            echo "  $0 -c                        # С покрытием кода"
            echo "  $0 -m rental_flow            # Только тесты потока аренды"
            echo "  $0 -d -r -p                  # В Docker с пересборкой и параллельно"
            exit 0
            ;;
        *)
            error "Неизвестный параметр: $1"
            exit 1
            ;;
    esac
done

log "Запуск E2E тестов RentalApp_FASTAPI"

# Проверка наличия Docker
if [ "$DOCKER" = true ]; then
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "docker-compose не установлен"
        exit 1
    fi
    
    log "Запуск E2E тестов в Docker"
    
    # Пересборка контейнеров если нужно
    if [ "$REBUILD" = true ]; then
        log "Пересборка Docker контейнеров..."
        docker-compose down
        docker-compose build --no-cache
    fi
    
    # Запуск контейнеров
    log "Запуск контейнеров..."
    docker-compose up -d db
    
    # Ожидание готовности базы данных
    log "Ожидание готовности базы данных..."
    sleep 15
    
    # Установка тестовых зависимостей
    log "Установка тестовых зависимостей..."
    docker-compose exec -T backend pip install -r requirements-test.txt
    
    # Формирование команды pytest
    PYTEST_CMD="pytest tests/e2e/"
    
    if [ "$COVERAGE" = true ]; then
        PYTEST_CMD="$PYTEST_CMD --cov=api --cov-report=html --cov-report=term-missing"
    fi
    
    if [ "$VERBOSE" = true ]; then
        PYTEST_CMD="$PYTEST_CMD -v -s"
    fi
    
    if [ "$PARALLEL" = true ]; then
        PYTEST_CMD="$PYTEST_CMD -n auto"
    fi
    
    if [ -n "$MARKER" ]; then
        PYTEST_CMD="$PYTEST_CMD -m $MARKER"
    fi
    
    # Запуск E2E тестов
    log "Запуск E2E тестов..."
    docker-compose exec -T backend $PYTEST_CMD
    
    # Остановка контейнеров
    log "Остановка контейнеров..."
    docker-compose down
    
else
    # Локальный запуск
    log "Запуск E2E тестов локально"
    
    # Проверка виртуального окружения
    if [[ "$VIRTUAL_ENV" == "" ]]; then
        warning "Рекомендуется использовать виртуальное окружение"
    fi
    
    # Установка зависимостей
    log "Установка тестовых зависимостей..."
    pip install -r requirements-test.txt
    
    # Формирование команды pytest
    PYTEST_CMD="pytest tests/e2e/"
    
    if [ "$COVERAGE" = true ]; then
        PYTEST_CMD="$PYTEST_CMD --cov=api --cov-report=html --cov-report=term-missing"
    fi
    
    if [ "$VERBOSE" = true ]; then
        PYTEST_CMD="$PYTEST_CMD -v -s"
    fi
    
    if [ "$PARALLEL" = true ]; then
        PYTEST_CMD="$PYTEST_CMD -n auto"
    fi
    
    if [ -n "$MARKER" ]; then
        PYTEST_CMD="$PYTEST_CMD -m $MARKER"
    fi
    
    # Запуск E2E тестов
    log "Запуск E2E тестов..."
    eval $PYTEST_CMD
fi

success "E2E тесты завершены"

# Показать покрытие если запрошено
if [ "$COVERAGE" = true ]; then
    log "Отчет о покрытии создан в htmlcov/index.html"
fi
