#!/usr/bin/env python3
"""
Скрипт для автоматического исправления ручного управления транзакциями в сервисах.
Удаляет await db.commit() и await db.rollback() из сервисов, так как транзакции
теперь управляются middleware.
"""

import os
import re
import glob
from pathlib import Path

def fix_transaction_management_in_file(file_path: str):
    """Исправляет управление транзакциями в одном файле"""
    print(f"Обрабатываем файл: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Удаляем await db.commit() с комментариями
    content = re.sub(r'\s*# .*коммит.*\n', '', content, flags=re.IGNORECASE)
    content = re.sub(r'\s*# .*commit.*\n', '', content, flags=re.IGNORECASE)
    content = re.sub(r'\s*# .*транзакц.*\n', '', content, flags=re.IGNORECASE)
    content = re.sub(r'\s*# .*transaction.*\n', '', content, flags=re.IGNORECASE)
    
    # Удаляем await db.commit()
    content = re.sub(r'\s*await\s+[a-zA-Z_][a-zA-Z0-9_]*\.commit\(\)\s*\n', '', content)
    
    # Удаляем await db.rollback() в блоках except
    content = re.sub(r'\s*await\s+[a-zA-Z_][a-zA-Z0-9_]*\.rollback\(\)\s*\n', '', content)
    
    # Добавляем комментарии о том, что транзакции управляются middleware
    if 'await' in content and ('commit' in original_content or 'rollback' in original_content):
        # Находим первое определение класса или функции
        class_match = re.search(r'class\s+(\w+)', content)
        if class_match:
            class_name = class_match.group(1)
            # Добавляем комментарий после определения класса
            content = re.sub(
                r'(class\s+' + class_name + r'[^:]*:)',
                r'\1\n    """\n    ВНИМАНИЕ: Транзакции управляются DIContainerMiddleware.\n    Не используйте await db.commit() или await db.rollback() в методах этого класса.\n    """',
                content,
                count=1
            )
    
    # Если файл изменился, сохраняем его
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Файл {file_path} исправлен")
        return True
    else:
        print(f"⏭️  Файл {file_path} не требует изменений")
        return False

def main():
    """Основная функция"""
    print("🔧 Исправление управления транзакциями в сервисах...")
    
    # Находим все Python файлы в папке services
    services_dir = Path("api/services")
    if not services_dir.exists():
        print("❌ Папка api/services не найдена")
        return
    
    python_files = list(services_dir.rglob("*.py"))
    
    fixed_files = 0
    total_files = len(python_files)
    
    for file_path in python_files:
        if fix_transaction_management_in_file(str(file_path)):
            fixed_files += 1
    
    print(f"\n📊 Результаты:")
    print(f"   Обработано файлов: {total_files}")
    print(f"   Исправлено файлов: {fixed_files}")
    print(f"   Без изменений: {total_files - fixed_files}")
    
    if fixed_files > 0:
        print(f"\n✅ Управление транзакциями исправлено в {fixed_files} файлах")
        print("⚠️  ВНИМАНИЕ: Транзакции теперь управляются DIContainerMiddleware")
        print("   Не используйте await db.commit() или await db.rollback() в сервисах")
    else:
        print("\n✅ Все файлы уже корректны")

if __name__ == "__main__":
    main()


