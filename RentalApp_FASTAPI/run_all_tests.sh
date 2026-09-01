#!/bin/bash
# Скрипт для запуска всех типов тестов RentalApp_FASTAPI

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
UNIT_ONLY=false
INTEGRATION_ONLY=false
E2E_ONLY=false
FAST_ONLY=false
FULL_ONLY=false
DOCKER=false
VERBOSE=false

# Обработка аргументов командной строки
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--unit)
            UNIT_ONLY=true
            shift
            ;;
        -i|--integration)
            INTEGRATION_ONLY=true
            shift
            ;;
        -e|--e2e)
            E2E_ONLY=true
            shift
            ;;
        -f|--fast)
            FAST_ONLY=true
            shift
            ;;
        --full)
            FULL_ONLY=true
            shift
            ;;
        -d|--docker)
            DOCKER=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Использование: $0 [опции]"
            echo ""
            echo "Опции:"
            echo "  -u, --unit         Запустить только юнит-тесты"
            echo "  -i, --integration  Запустить только интеграционные тесты"
            echo "  -e, --e2e          Запустить только E2E тесты"
            echo "  -f, --fast         Запустить только быстрые тесты (API, модели, утилиты)"
            echo "  --full             Запустить все тесты (быстрые + медленные)"
            echo "  -d, --docker       Запустить тесты в Docker"
            echo "  -v, --verbose      Подробный вывод"
            echo "  -h, --help         Показать эту справку"
            echo ""
            echo "Примеры:"
            echo "  $0                           # Запустить все тесты"
            echo "  $0 -u                        # Только юнит-тесты"
            echo "  $0 -i -d                     # Интеграционные тесты в Docker"
            echo "  $0 -e -d -v                  # E2E тесты в Docker с подробным выводом"
            exit 0
            ;;
        *)
            error "Неизвестный параметр: $1"
            exit 1
            ;;
    esac
done

log "Запуск тестов RentalApp_FASTAPI"

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
fi

# Формирование опций pytest
PYTEST_OPTS=""
if [ "$VERBOSE" = true ]; then
    PYTEST_OPTS="$PYTEST_OPTS -v -s"
fi

# Запуск быстрых тестов
if [ "$FAST_ONLY" = true ]; then
    log "Запуск быстрых тестов (API, модели, утилиты)..."
    
    if [ "$DOCKER" = true ]; then
        docker-compose -f docker-compose.fast-tests.yml down --remove-orphans
        docker-compose -f docker-compose.fast-tests.yml run --rm test-backend
    else
        pytest tests/api/ tests/models/ tests/repositories/ tests/utils/ tests/services/test_*_service.py tests/services/test_*_model.py tests/services/test_*_repository.py tests/services/test_password_utils.py $PYTEST_OPTS -m "not slow and not integration and not e2e"
    fi
    
    if [ $? -eq 0 ]; then
        success "Быстрые тесты завершены успешно"
    else
        error "Быстрые тесты завершились с ошибками"
        exit 1
    fi
    exit 0
fi

# Запуск полных тестов
if [ "$FULL_ONLY" = true ]; then
    log "Запуск всех тестов (быстрых + медленных)..."
    
    if [ "$DOCKER" = true ]; then
        docker-compose -f docker-compose.full-tests.yml down --remove-orphans
        docker-compose -f docker-compose.full-tests.yml run --rm test-backend
    else
        pytest tests/ $PYTEST_OPTS --durations=10
    fi
    
    if [ $? -eq 0 ]; then
        success "Все тесты завершены успешно"
    else
        error "Тесты завершились с ошибками"
        exit 1
    fi
    exit 0
fi

# Запуск юнит-тестов
if [ "$UNIT_ONLY" = true ] || ([ "$INTEGRATION_ONLY" = false ] && [ "$E2E_ONLY" = false ]); then
    log "Запуск юнит-тестов..."
    
    if [ "$DOCKER" = true ]; then
        docker-compose -f docker-compose.test.yml run --rm test-backend pytest tests/services/ $PYTEST_OPTS
    else
        pytest tests/services/ $PYTEST_OPTS
    fi
    
    if [ $? -eq 0 ]; then
        success "Юнит-тесты завершены успешно"
    else
        error "Юнит-тесты завершились с ошибками"
        exit 1
    fi
fi

# Запуск интеграционных тестов
if [ "$INTEGRATION_ONLY" = true ] || ([ "$UNIT_ONLY" = false ] && [ "$E2E_ONLY" = false ]); then
    log "Запуск интеграционных тестов..."
    
    if [ "$DOCKER" = true ]; then
        docker-compose -f docker-compose.test.yml up --abort-on-container-exit
    else
        pytest tests/integration/ $PYTEST_OPTS -m integration
    fi
    
    if [ $? -eq 0 ]; then
        success "Интеграционные тесты завершены успешно"
    else
        error "Интеграционные тесты завершились с ошибками"
        exit 1
    fi
fi

# Запуск E2E тестов
if [ "$E2E_ONLY" = true ] || ([ "$UNIT_ONLY" = false ] && [ "$INTEGRATION_ONLY" = false ]); then
    log "Запуск E2E тестов..."
    
    if [ "$DOCKER" = true ]; then
        docker-compose -f docker-compose.e2e.yml up --abort-on-container-exit
    else
        pytest tests/e2e/ $PYTEST_OPTS -m e2e
    fi
    
    if [ $? -eq 0 ]; then
        success "E2E тесты завершены успешно"
    else
        error "E2E тесты завершились с ошибками"
        exit 1
    fi
fi

success "Все тесты завершены успешно"
