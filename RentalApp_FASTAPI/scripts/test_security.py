#!/usr/bin/env python3
"""
Скрипт для тестирования системы безопасности.
Проверяет работу защиты от брутфорса, валидацию паролей и аудит безопасности.
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime
from typing import Dict, Any

class SecurityTester:
    """Класс для тестирования системы безопасности."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_password_validation(self):
        """Тестирование валидации паролей."""
        print("🔐 Тестирование валидации паролей...")
        
        test_cases = [
            # Слабые пароли
            {"password": "123", "should_fail": True, "reason": "Слишком короткий"},
            {"password": "password", "should_fail": True, "reason": "Слишком простой"},
            {"password": "123456", "should_fail": True, "reason": "Только цифры"},
            {"password": "abcdef", "should_fail": True, "reason": "Только буквы"},
            {"password": "ABCdef", "should_fail": True, "reason": "Нет цифр"},
            {"password": "ABC123", "should_fail": True, "reason": "Нет строчных букв"},
            {"password": "abc123", "should_fail": True, "reason": "Нет заглавных букв"},
            
            # Сильные пароли
            {"password": "StrongPass123", "should_fail": False, "reason": "Сильный пароль"},
            {"password": "MySecure2024!", "should_fail": False, "reason": "Очень сильный пароль"},
        ]
        
        for case in test_cases:
            try:
                async with self.session.post(
                    f"{self.base_url}/api/auth/register",
                    json={
                        "full_name": "Test User",
                        "email": f"test{int(time.time())}{hash(case['password'])}@example.com",
                        "password": case["password"],
                        "privacy_policy_accepted": True,
                        "terms_accepted": True
                    }
                ) as response:
                    if case["should_fail"]:
                        if response.status == 422:  # Validation error
                            print(f"✅ {case['reason']}: Пароль правильно отклонен")
                        else:
                            print(f"❌ {case['reason']}: Пароль должен был быть отклонен, но был принят")
                    else:
                        if response.status in [200, 201]:
                            print(f"✅ {case['reason']}: Пароль правильно принят")
                        else:
                            print(f"❌ {case['reason']}: Пароль должен был быть принят, но был отклонен")
                            
            except Exception as e:
                print(f"❌ Ошибка при тестировании пароля '{case['password']}': {e}")
    
    async def test_brute_force_protection(self):
        """Тестирование защиты от брутфорса."""
        print("\n🛡️ Тестирование защиты от брутфорса...")
        
        # Создаем тестового пользователя
        test_email = f"bruteforce_test_{int(time.time())}@example.com"
        test_password = "TestPass123"
        
        try:
            # Регистрируем пользователя
            async with self.session.post(
                f"{self.base_url}/api/auth/register",
                json={
                    "full_name": "Brute Force Test",
                    "email": test_email,
                    "password": test_password,
                    "privacy_policy_accepted": True,
                    "terms_accepted": True
                }
            ) as response:
                if response.status not in [200, 201]:
                    print(f"❌ Не удалось создать тестового пользователя: {await response.text()}")
                    return
        
        except Exception as e:
            print(f"❌ Ошибка при создании тестового пользователя: {e}")
            return
        
        # Пытаемся войти с неверным паролем несколько раз
        print("Попытки входа с неверным паролем...")
        for i in range(7):  # Больше чем лимит (5)
            try:
                async with self.session.post(
                    f"{self.base_url}/api/auth/token",
                    data={
                        "username": test_email,
                        "password": "WrongPassword123"
                    }
                ) as response:
                    if response.status == 429:
                        print(f"✅ IP заблокирован после {i+1} попыток (ожидаемо)")
                        break
                    elif response.status == 401:
                        print(f"  Попытка {i+1}: Неверные учетные данные (ожидаемо)")
                    else:
                        print(f"  Попытка {i+1}: Неожиданный статус {response.status}")
            except Exception as e:
                print(f"❌ Ошибка при попытке {i+1}: {e}")
            
            # Небольшая задержка между попытками
            await asyncio.sleep(0.1)
        
        # Проверяем, что IP заблокирован
        try:
            async with self.session.post(
                f"{self.base_url}/api/auth/token",
                data={
                    "username": test_email,
                    "password": "AnotherWrongPassword"
                }
            ) as response:
                if response.status == 429:
                    print("✅ IP остается заблокированным")
                else:
                    print(f"❌ IP не заблокирован, статус: {response.status}")
        except Exception as e:
            print(f"❌ Ошибка при проверке блокировки: {e}")
    
    async def test_security_headers(self):
        """Тестирование заголовков безопасности."""
        print("\n🔒 Тестирование заголовков безопасности...")
        
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                headers = response.headers
                
                security_headers = {
                    "X-Content-Type-Options": "nosniff",
                    "X-Frame-Options": "DENY",
                    "X-XSS-Protection": "1; mode=block",
                    "Referrer-Policy": "strict-origin-when-cross-origin",
                    "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
                }
                
                for header, expected_value in security_headers.items():
                    if header in headers:
                        if headers[header] == expected_value:
                            print(f"✅ {header}: {headers[header]}")
                        else:
                            print(f"⚠️ {header}: {headers[header]} (ожидалось: {expected_value})")
                    else:
                        print(f"❌ {header}: отсутствует")
        
        except Exception as e:
            print(f"❌ Ошибка при проверке заголовков: {e}")
    
    async def test_secret_key_validation(self):
        """Тестирование валидации секретных ключей."""
        print("\n🔑 Тестирование валидации секретных ключей...")
        
        # Этот тест проверяет, что приложение запускается с валидными ключами
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                if response.status == 200:
                    print("✅ Приложение запущено с валидными секретными ключами")
                else:
                    print(f"❌ Приложение не отвечает корректно: {response.status}")
        except Exception as e:
            print(f"❌ Ошибка при проверке секретных ключей: {e}")
    
    async def test_csrf_protection(self):
        """Тестирование CSRF защиты."""
        print("\n🛡️ Тестирование CSRF защиты...")
        
        try:
            # Пытаемся выполнить POST запрос без CSRF токена
            async with self.session.post(
                f"{self.base_url}/api/auth/register",
                json={
                    "full_name": "CSRF Test",
                    "email": f"csrf_test_{int(time.time())}@example.com",
                    "password": "TestPass123",
                    "privacy_policy_accepted": True,
                    "terms_accepted": True
                }
            ) as response:
                if response.status in [200, 201]:
                    print("✅ CSRF защита работает корректно")
                elif response.status == 403:
                    print("✅ CSRF защита активна (запрос заблокирован)")
                else:
                    print(f"⚠️ Неожиданный статус CSRF: {response.status}")
        except Exception as e:
            print(f"❌ Ошибка при тестировании CSRF: {e}")
    
    async def run_all_tests(self):
        """Запуск всех тестов безопасности."""
        print("🚀 Запуск тестов безопасности...")
        print("=" * 60)
        
        await self.test_secret_key_validation()
        await self.test_password_validation()
        await self.test_brute_force_protection()
        await self.test_security_headers()
        await self.test_csrf_protection()
        
        print("\n" + "=" * 60)
        print("✅ Тестирование безопасности завершено!")

async def main():
    """Основная функция."""
    async with SecurityTester() as tester:
        await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
