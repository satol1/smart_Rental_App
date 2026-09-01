#!/usr/bin/env python3
"""
Скрипт для генерации криптографически стойких секретных ключей.
Используется для создания безопасных SECRET_KEY и CSRF_SECRET_KEY.
"""

import secrets
import base64
import os
from pathlib import Path

def generate_secret_key(length: int = 32) -> str:
    """Генерация криптографически стойкого секретного ключа."""
    return base64.b64encode(secrets.token_bytes(length)).decode('utf-8')

def generate_csrf_key(length: int = 32) -> str:
    """Генерация криптографически стойкого CSRF ключа."""
    return base64.b64encode(secrets.token_bytes(length)).decode('utf-8')

def validate_key_strength(key: str, min_length: int = 32) -> bool:
    """Валидация силы секретного ключа."""
    if len(key) < min_length:
        return False
    
    # Проверяем разнообразие символов
    unique_chars = len(set(key))
    if unique_chars < 16:  # Минимум 16 уникальных символов
        return False
    
    return True

def main():
    """Основная функция генерации секретов."""
    print("🔐 Генерация криптографически стойких секретных ключей")
    print("=" * 60)
    
    # Генерируем ключи
    secret_key = generate_secret_key(32)
    csrf_key = generate_csrf_key(32)
    
    # Валидируем ключи
    if not validate_key_strength(secret_key):
        print("❌ Ошибка: SECRET_KEY не соответствует требованиям безопасности")
        return False
    
    if not validate_key_strength(csrf_key):
        print("❌ Ошибка: CSRF_SECRET_KEY не соответствует требованиям безопасности")
        return False
    
    print("✅ SECRET_KEY сгенерирован успешно")
    print(f"   Длина: {len(secret_key)} символов")
    print(f"   Уникальных символов: {len(set(secret_key))}")
    print()
    
    print("✅ CSRF_SECRET_KEY сгенерирован успешно")
    print(f"   Длина: {len(csrf_key)} символов")
    print(f"   Уникальных символов: {len(set(csrf_key))}")
    print()
    
    # Выводим ключи для копирования в .env
    print("📋 Скопируйте следующие строки в ваш .env файл:")
    print("-" * 60)
    print(f"SECRET_KEY={secret_key}")
    print(f"CSRF_SECRET_KEY={csrf_key}")
    print("-" * 60)
    print()
    
    # Предупреждения безопасности
    print("⚠️  ВАЖНЫЕ ПРЕДУПРЕЖДЕНИЯ БЕЗОПАСНОСТИ:")
    print("1. НИКОГДА не коммитьте эти ключи в Git!")
    print("2. Храните .env файл в безопасном месте")
    print("3. Регулярно ротируйте ключи (каждые 3-6 месяцев)")
    print("4. Используйте разные ключи для разных окружений")
    print("5. В production используйте внешние системы управления секретами")
    print()
    
    # Создаем файл с ключами (опционально)
    save_to_file = input("💾 Сохранить ключи в файл secrets.txt? (y/N): ").lower().strip()
    if save_to_file in ['y', 'yes']:
        secrets_file = Path("secrets.txt")
        with open(secrets_file, 'w', encoding='utf-8') as f:
            f.write("# Сгенерированные секретные ключи\n")
            f.write("# НЕ КОММИТЬТЕ ЭТОТ ФАЙЛ В GIT!\n\n")
            f.write(f"SECRET_KEY={secret_key}\n")
            f.write(f"CSRF_SECRET_KEY={csrf_key}\n")
        
        print(f"✅ Ключи сохранены в {secrets_file}")
        print("⚠️  УДАЛИТЕ этот файл после копирования ключей в .env!")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        if success:
            print("🎉 Генерация завершена успешно!")
        else:
            print("❌ Генерация завершилась с ошибками")
            exit(1)
    except KeyboardInterrupt:
        print("\n⏹️  Генерация прервана пользователем")
        exit(1)
    except Exception as e:
        print(f"❌ Ошибка при генерации: {e}")
        exit(1)













