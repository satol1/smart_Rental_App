#!/bin/bash
# Скрипт для переключения между конфигурациями Docker Compose
# Использование: ./switch-docker-config.sh [normal|limited]

if [ $# -eq 0 ]; then
    echo "Использование: $0 [normal|limited]"
    echo ""
    echo "normal   - Обычная конфигурация без ограничений ресурсов"
    echo "limited  - Конфигурация с ограничениями ресурсов (1 vCore, 2GB RAM)"
    echo ""
    echo "Текущая конфигурация:"
    if [ -f "docker-compose.limited-resources.yml" ]; then
        echo "  - Ограниченная конфигурация доступна"
    fi
    if [ -f "docker-compose.yml" ]; then
        echo "  - Основная конфигурация доступна"
    fi
    exit 0
fi

case "$1" in
    "normal")
        echo "Переключение на обычную конфигурацию..."
        if [ -f "docker-compose.limited-resources.yml" ]; then
            mv "docker-compose.limited-resources.yml" "docker-compose.limited-resources.yml.backup"
        fi
        echo "Готово! Используйте: docker-compose up"
        ;;
    "limited")
        echo "Переключение на ограниченную конфигурацию..."
        if [ -f "docker-compose.limited-resources.yml.backup" ]; then
            mv "docker-compose.limited-resources.yml.backup" "docker-compose.limited-resources.yml"
        fi
        echo "Готово! Используйте: docker-compose -f docker-compose.limited-resources.yml up"
        ;;
    *)
        echo "Неверный параметр: $1"
        echo "Используйте: normal или limited"
        exit 1
        ;;
esac
