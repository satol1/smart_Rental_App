#!/usr/bin/env python3
"""
Главный скрипт для полного развертывания и инициализации базы данных.
Запускает все необходимые скрипты в правильном порядке.
"""

import asyncio
import sys
import os
import subprocess
from pathlib import Path

def run_script(script_path: str, description: str):
    """Запускает Python скрипт и выводит результат."""
    print(f"\n{'='*60}")
    print(f"🚀 {description}")
    print(f"{'='*60}")
    
    try:
        # Запускаем скрипт
        result = subprocess.run([
            sys.executable, script_path
        ], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
        
        # Выводим результат
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        if result.returncode == 0:
            print(f"✅ {description} - УСПЕШНО")
        else:
            print(f"❌ {description} - ОШИБКА (код: {result.returncode})")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка при запуске {description}: {e}")
        return False
    
    return True

def main():
    """Основная функция развертывания."""
    print("🎯 ПОЛНОЕ РАЗВЕРТЫВАНИЕ СИСТЕМЫ АРЕНДЫ ОБОРУДОВАНИЯ")
    print("=" * 60)
    
    # Получаем путь к папке deploy
    deploy_dir = Path(__file__).parent
    
    # Список скриптов для выполнения в порядке
    scripts = [
        {
            "path": str(deploy_dir / "create_admin.py"),
            "description": "Создание администратора"
        },
        {
            "path": str(deploy_dir / "seed_equipment_data.py"),
            "description": "Заполнение базы данных оборудованием"
        }
    ]
    
    success_count = 0
    total_scripts = len(scripts)
    
    for script in scripts:
        if run_script(script["path"], script["description"]):
            success_count += 1
        else:
            print(f"\n❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось выполнить {script['description']}")
            print("🛑 Развертывание прервано!")
            return False
    
    # Итоговый отчет
    print(f"\n{'='*60}")
    print("📊 ИТОГОВЫЙ ОТЧЕТ РАЗВЕРТЫВАНИЯ")
    print(f"{'='*60}")
    print(f"✅ Успешно выполнено: {success_count}/{total_scripts} скриптов")
    
    if success_count == total_scripts:
        print("🎉 РАЗВЕРТЫВАНИЕ ЗАВЕРШЕНО УСПЕШНО!")
        print("\n📋 Что было создано:")
        print("  👤 Администратор системы")
        print("  📷 Оборудование для аренды")
        print("  🏷️  Системы брендов")
        print("  🎒 Аксессуары")
        print("\n🔑 Данные для входа администратора:")
        print("  📧 Email: admin@rentalapp.com")
        print("  🔑 Пароль: AdminRental2024!")
        print("\n🚀 Система готова к использованию!")
    else:
        print("❌ РАЗВЕРТЫВАНИЕ ЗАВЕРШЕНО С ОШИБКАМИ")
        print("Проверьте логи выше для диагностики проблем.")
    
    return success_count == total_scripts

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
