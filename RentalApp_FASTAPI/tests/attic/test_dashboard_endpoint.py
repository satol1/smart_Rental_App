#!/usr/bin/env python3
"""
Скрипт для тестирования эндпоинта /admin/dashboard-summary
Запускается внутри Docker контейнера для доступа к БД
"""

import asyncio
import httpx
import json
from typing import Dict, Any

async def test_dashboard_endpoint():
    """Тестирует эндпоинт dashboard с авторизацией"""
    
    base_url = "http://localhost:8000"
    
    # Данные для авторизации
    login_data = {
        "username": "admin@rentalapp.com",
        "password": "admin123"
    }
    
    print("🔐 Получение токена авторизации...")
    
    async with httpx.AsyncClient() as client:
        try:
            # Получаем токен
            login_response = await client.post(
                f"{base_url}/api/auth/token",
                data=login_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if login_response.status_code != 200:
                print(f"❌ Ошибка авторизации: {login_response.status_code}")
                print(f"Ответ: {login_response.text}")
                return False
                
            token_data = login_response.json()
            token = token_data["access_token"]
            print("✅ Токен получен успешно!")
            
            # Тестируем dashboard эндпоинт
            print("\n📊 Тестирование эндпоинта /api/admin/dashboard-summary...")
            
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            dashboard_response = await client.get(
                f"{base_url}/api/admin/dashboard-summary",
                headers=headers
            )
            
            if dashboard_response.status_code == 200:
                print("✅ Эндпоинт работает успешно!")
                print("\n📋 Ответ:")
                dashboard_data = dashboard_response.json()
                print(json.dumps(dashboard_data, indent=2, ensure_ascii=False))
                return True
            else:
                print(f"❌ Ошибка эндпоинта: {dashboard_response.status_code}")
                print(f"Ответ: {dashboard_response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Ошибка при тестировании: {e}")
            import traceback
            traceback.print_exc()
            return False

async def test_simple_endpoints():
    """Тестирует простые эндпоинты без авторизации"""
    
    base_url = "http://localhost:8000"
    
    print("🔍 Тестирование простых эндпоинтов...")
    
    async with httpx.AsyncClient() as client:
        try:
            # Тест health check
            health_response = await client.get(f"{base_url}/health")
            if health_response.status_code == 200:
                print("✅ /health работает")
            else:
                print(f"❌ /health не работает: {health_response.status_code}")
                
            # Тест test-simple
            simple_response = await client.get(f"{base_url}/test-simple")
            if simple_response.status_code == 200:
                print("✅ /test-simple работает")
            else:
                print(f"❌ /test-simple не работает: {simple_response.status_code}")
                
        except Exception as e:
            print(f"❌ Ошибка при тестировании простых эндпоинтов: {e}")

async def main():
    """Основная функция тестирования"""
    print("🚀 Запуск тестирования эндпоинтов...")
    print("=" * 50)
    
    # Тестируем простые эндпоинты
    await test_simple_endpoints()
    print()
    
    # Тестируем dashboard эндпоинт
    success = await test_dashboard_endpoint()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Все тесты прошли успешно!")
    else:
        print("💥 Тесты завершились с ошибками!")
    
    return success

if __name__ == "__main__":
    asyncio.run(main())
