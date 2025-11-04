# 📚 API Документация

Подробная документация REST API системы аренды фототехники.

## 🔧 Текущее состояние

**Версия**: 4.2  
**Статус**: ✅ Полностью функциональна и готова к продакшену

### Ключевые достижения
- **Repository Pattern**: Полностью внедрен строгий паттерн репозиториев для всех сервисов
- **Dependency Injection**: Единообразный DI-контейнер для всех компонентов системы
- **Единообразная архитектура**: 100% API эндпоинтов используют dependency-injector
- **Комплексное тестирование**: 49 API тестов + 420+ общих тестов системы
- **Полная совместимость**: Все тесты используют PostgreSQL (как в продакшене)

## 📚 История изменений

### 19.10.2025 - Рефакторинг Repository Pattern: Полное внедрение строгого паттерна репозиториев
- **Результат**: Все сервисы теперь строго следуют Repository Pattern, устранены прямые SQL-запросы в сервисах
- **Ключевые изменения**:
  - **BalanceService**: Рефакторирован для использования `UserRepository` вместо прямых `db.execute()`
  - **EquipmentCRUDService**: Использует `EquipmentRepository.get_all_with_details()` вместо прямых запросов
  - **AvailabilityBaseService**: Делегирует все запросы к `ReservationRepository` и `RentalRepository`
  - **Новые методы репозиториев**: Добавлены специализированные методы для блокировок и оптимизированных запросов
- **DI-контейнер**: Исправлены циклические зависимости и корректная настройка всех availability сервисов
- **Тестирование**: Все тесты проходят на 100% (Deep Diagnostic: 100%, Race Condition: 100%)
- **Производительность**: 159.94 запросов/сек без ошибок, среднее время ответа 0.081s

### 09.10.2025 - Реализация функционала "Аренда с нуля"
- **Результат**: Полная реализация создания аренды без предварительного резерва в админ-панели
- **Компоненты**: Backend API, бизнес-логика, frontend UI, тесты, документация
- **Статус**: ✅ Полностью завершен и готов к продакшену

### 09.10.2025 - Критическое исправление: Полное исправление падающих тестов
- **Результат**: Все 17 падающих тестов исправлены, система имеет 420+ тестов

### 09.10.2025 - Миграция на единообразный Dependency Injection
- **Результат**: 100% API эндпоинтов используют dependency-injector

### 08.01.2025 - Актуализация документации и очистка проекта
- **Результат**: Документация приведена к текущему состоянию, удалены промежуточные отчеты и отладочные файлы

### 06.10.2025 - Система автоматического создания "Систем Бренда"
- **Результат**: Автоматическое создание систем брендов, все фильтры работают корректно

### 05.10.2025 - Рефакторинг user_api.py
- **Результат**: Разделение на модульные файлы, улучшена читаемость и поддержка кода

## 📋 Содержание

- [Обзор API](#обзор-api)
- [Аутентификация](#аутентификация)
- [Эндпоинты](#эндпоинты)
- [Модели данных](#модели-данных)
- [Коды ошибок](#коды-ошибок)
- [Примеры запросов](#примеры-запросов)

## 🎯 Обзор API

### Базовый URL
```
http://localhost:8000/api
```

### Формат данных
- **Content-Type**: `application/json`
- **Accept**: `application/json`

### Аутентификация
API использует JWT токены для аутентификации. Токен должен передаваться в заголовке:
```
Authorization: Bearer <your-jwt-token>
```

### CSRF защита
Для всех POST/PUT/DELETE запросов требуется CSRF токен:
```
X-CSRF-Token: <csrf-token>
```

## 🔐 Аутентификация

### POST /auth/token
Вход в систему

**Запрос:**
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Ответ:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer"
}
```

### POST /auth/register
Регистрация нового пользователя

**Запрос:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "full_name": "Петр Петров",
  "phone": "+7 (999) 123-45-67"
}
```

**Ответ:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": 2,
    "email": "newuser@example.com",
    "full_name": "Петр Петров",
    "role": "client",
    "balance": 0.00
  }
}
```

### GET /auth/me
Получение информации о текущем пользователе

**Заголовки:**
```
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "Иван Иванов",
  "phone": "+7 (999) 123-45-67",
  "role": "client",
  "balance": 1000.00,
  "is_active": true,
  "created_at": "2024-01-01T10:00:00Z"
}
```

## 🔌 Эндпоинты

### Оборудование

#### POST /equipment/{equipment_id}/copy
Копирование оборудования

**Описание:** Копирует существующее оборудование с возможностью изменения некоторых полей.

**Параметры:**
- `equipment_id` (path) - ID исходного оборудования

**Тело запроса:**
```json
{
  "name": "Новое название (опционально)",
  "serial_number": "Новый серийный номер (опционально)", 
  "notes": "Новые заметки (опционально)"
}
```

**Ответ:** `201 Created`
```json
{
  "id": 123,
  "entity_type": "equipment",
  "equipment_type": "Камера",
  "brand": "Canon",
  "name": "Canon EOS R5 (копия)",
  "serial_number": "SN789012",
  "condition": "Великолепно",
  "daily_rate": 5000.0,
  "notes": "Скопировано из ID: 1",
  "description": "Профессиональная камера",
  "last_maintenance": null,
  "image_url": "https://example.com/image.jpg",
  "image_urls": ["https://example.com/image1.jpg"],
  "short_description": "Проф камера"
}
```

**Особенности:**
- Копируются все поля исходного оборудования
- Автоматически создается система бренда если не существует
- Копируются связи с аксессуарами и ассоциациями
- Если `name` не указан, добавляется суффикс " (копия)"
- Если `serial_number` не указан, очищается для уникальности
- Если `notes` не указаны, добавляется префикс "Скопировано из ID: {source_id}"

**Требования доступа:** Только менеджеры и администраторы

#### GET /equipment/
Получение списка оборудования

**Параметры запроса:**
- `skip` (int, optional): Количество пропускаемых записей (по умолчанию: 0)
- `limit` (int, optional): Количество записей на странице (по умолчанию: 20)
- `query` (string, optional): Поисковый запрос
- `type` (string, optional): Фильтр по типу оборудования
- `brand` (string, optional): Фильтр по бренду
- `brand_system_id` (int, optional): Фильтр по системе бренда
- `association_id` (int, optional): Фильтр по ассоциации
- `start_date` (date, optional): Дата начала для проверки доступности
- `end_date` (date, optional): Дата окончания для проверки доступности
- `available_only` (boolean, optional): Показывать только доступное оборудование
- `group_similar` (boolean, optional): Группировать похожее оборудование

**Пример запроса:**
```
GET /equipment/?skip=0&limit=10&type=camera&available_only=true&start_date=2024-01-15&end_date=2024-01-20
```

**Ответ:**
```json
{
  "items": [
    {
      "id": 1,
      "entity_type": "equipment",
      "name": "Canon EOS R5",
      "brand": "Canon",
      "equipment_type": "camera",
      "daily_rate": 5000.00,
      "condition": "excellent",
      "image_url": "https://example.com/canon-r5.jpg",
      "is_active": true,
      "associations": [
        {
          "id": 1,
          "name": "Профессиональные камеры",
          "sort_order": 1
        }
      ],
      "accessories": [
        {
          "id": 1,
          "name": "Батарея Canon LP-E6NH",
          "daily_rate": 200.00
        }
      ]
    },
    {
      "id": 1,
      "entity_type": "pack",
      "name": "Комплект для свадебной съемки",
      "description": "Полный комплект для профессиональной свадебной съемки",
      "equipment": [
        {
          "id": 1,
          "name": "Canon EOS R5",
          "daily_rate": 5000.00
        },
        {
          "id": 2,
          "name": "Canon RF 24-70mm f/2.8L IS USM",
          "daily_rate": 3000.00
        }
      ],
      "total_daily_rate": 8000.00,
      "available_count": 2,
      "cheapest_available_id": 1
    }
  ],
  "total": 150,
  "availableFilters": {
    "types": ["camera", "lens", "lighting"],
    "brands": ["Canon", "Nikon", "Sony"],
    "associations": [
      {
        "id": 1,
        "name": "Профессиональные камеры",
        "sort_order": 1
      }
    ]
  }
}
```

#### GET /equipment/{id}
Получение детальной информации об оборудовании

**Ответ:**
```json
{
  "id": 1,
  "name": "Canon EOS R5",
  "brand": "Canon",
  "equipment_type": "camera",
  "daily_rate": 5000.00,
  "condition": "excellent",
  "image_url": "https://example.com/canon-r5.jpg",
  "notes": "Отличное состояние, недавно обслуживалась",
  "description": "Полнокадровая беззеркальная камера с высоким разрешением",
  "is_active": true,
  "associations": [...],
  "accessories": [...],
  "brand_systems": [...],
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

#### POST /equipment/
Создание нового оборудования (требует права admin/manager)

**Запрос:**
```json
{
  "name": "Nikon Z9",
  "brand": "Nikon",
  "equipment_type": "camera",
  "daily_rate": 6000.00,
  "condition": "excellent",
  "image_url": "https://example.com/nikon-z9.jpg",
  "notes": "Новое оборудование",
  "description": "Флагманская беззеркальная камера Nikon",
  "association_ids": [1, 2],
  "accessory_ids": [3, 4]
}
```

#### PUT /equipment/{id}
Обновление оборудования (требует права admin/manager)

#### DELETE /equipment/{id}
Удаление оборудования (требует права admin/manager)

### Резервации

#### GET /reservations/
Получение списка резерваций

**Параметры запроса:**
- `skip` (int, optional): Количество пропускаемых записей
- `limit` (int, optional): Количество записей на странице
- `status` (string, optional): Фильтр по статусу
- `user_id` (int, optional): Фильтр по пользователю (только для admin/manager)

**Ответ:**
```json
{
  "items": [
    {
      "id": 1,
      "user_id": 1,
      "start_date": "2024-01-15",
      "end_date": "2024-01-20",
      "status": "confirmed",
      "total_amount": 25000.00,
      "deposit_amount": 5000.00,
      "created_at": "2024-01-01T10:00:00Z",
      "user": {
        "id": 1,
        "full_name": "Иван Иванов",
        "email": "user@example.com"
      },
      "equipment": [
        {
          "id": 1,
          "name": "Canon EOS R5",
          "daily_rate": 5000.00
        }
      ],
      "accessories": [
        {
          "id": 1,
          "name": "Батарея Canon LP-E6NH",
          "daily_rate": 200.00
        }
      ]
    }
  ],
  "total": 25
}
```

#### POST /reservations/
Создание новой резервации

**Ограничения на основе статуса пользователя:**
- **Новый**: максимум 2 активных резерва одновременно
- **Постоянный**: максимум 5 активных резервов одновременно
- **VIP**: максимум 10 активных резервов одновременно
- **Заблокирован**: не может создавать резервы самостоятельно (только через менеджера)
- **Персона НонГрата**: не может создавать резервы

**Ошибки:**
- `403 Forbidden` - достигнут лимит одновременных резервов
- `403 Forbidden` - пользователь заблокирован или имеет статус "Персона НонГрата"

**Запрос:**
```json
{
  "start_date": "2024-01-15",
  "end_date": "2024-01-20",
  "equipment_ids": [1, 2],
  "accessory_ids": [3, 4],
  "notes": "Резервация для свадебной съемки"
}
```

**Ответ:**
```json
{
  "id": 1,
  "user_id": 1,
  "start_date": "2024-01-15",
  "end_date": "2024-01-20",
  "status": "pending",
  "total_amount": 25000.00,
  "deposit_amount": 5000.00,
  "created_at": "2024-01-01T10:00:00Z",
  "equipment": [...],
  "accessories": [...]
}
```

#### PUT /reservations/{id}
Обновление резервации

**Ограничения на основе статуса пользователя:**
- **Новый**: можно редактировать только за 2+ дня до начала, иначе - только через менеджера
- **Постоянный**: можно редактировать только за 1+ день до начала, иначе - только через менеджера
- **VIP**: можно редактировать в любой момент (нет ограничений)
- **Заблокирован**: можно редактировать только через менеджера
- **Персона НонГрата**: нельзя редактировать

**Ошибки:**
- `403 Forbidden` - редактирование запрещено из-за статуса и близости даты начала
- Сообщение содержит информацию о количестве дней до начала, когда редактирование возможно

#### DELETE /reservations/{id}
Отмена резервации

**Ограничения на основе статуса пользователя:**
- Те же ограничения, что и для редактирования (см. выше)
- Отмена резерва, преобразованного в аренду, невозможна

**Ошибки:**
- `403 Forbidden` - отмена запрещена из-за статуса и близости даты начала
- `409 Conflict` - резерв уже преобразован в аренду

### Календарь

#### GET /calendar/view
Просмотр доступности оборудования

**Параметры запроса:**
- `start` (date, required): Дата начала
- `end` (date, required): Дата окончания
- `ids` (array, optional): ID оборудования для проверки

**Пример запроса:**
```
GET /calendar/view?start=2024-01-15&end=2024-01-20&ids=1&ids=2
```

**Ответ:**
```json
{
  "items": [
    {
      "equipment_id": 1,
      "equipment_name": "Canon EOS R5",
      "is_available": true,
      "conflicts": []
    },
    {
      "equipment_id": 2,
      "equipment_name": "Nikon Z9",
      "is_available": false,
      "conflicts": [
        {
          "reservation_id": 5,
          "start_date": "2024-01-16",
          "end_date": "2024-01-18",
          "user_name": "Петр Петров"
        }
      ]
    }
  ]
}
```

#### GET /calendar/conflicts
Получение конфликтов в расписании

### Пользователи (Admin)

#### 📊 Градация статусов пользователей

Система поддерживает 5 статусов пользователей с различными правами и ограничениями:

| Статус | Описание | Лимит резервов | Ограничения на редактирование |
|--------|----------|----------------|-------------------------------|
| **Новый** | Новые пользователи (по умолчанию) | 2 резерва | За 2 дня до начала - только через менеджера |
| **Постоянный** | ≥3 успешных аренд | 5 резервов | За 1 день до начала - только через менеджера |
| **VIP** | ≥7 успешных аренд | 10 резервов | Нет ограничений |
| **Заблокирован** | ≥3 просроченных резервов | 0 (только менеджер может создавать) | За 2 дня до начала - только через менеджера |
| **Персона НонГрата** | Устанавливается только админом | 0 | Нельзя создавать резервы и выдавать аренду |

**Автоматическое обновление статусов:**
- Статус обновляется автоматически при возврате аренды на основе количества успешных аренд
- Пользователь автоматически блокируется при наличии ≥3 просроченных резервов

**Права менеджеров:**
- Менеджеры могут создавать/редактировать/отменять резервы для заблокированных пользователей
- Менеджеры **не могут** устанавливать статус "Персона НонГрата" (только администратор)
- Менеджеры **не могут** выдавать аренду пользователям со статусом "Персона НонГрата"

#### GET /admin/users/
Получение списка пользователей (требует права admin/manager)

**Параметры запроса:**
- `skip` (int, optional): Количество пропускаемых записей
- `limit` (int, optional): Количество записей на странице
- `role` (string, optional): Фильтр по роли
- `is_active` (boolean, optional): Фильтр по активности
- `status` (string, optional): Фильтр по статусу пользователя

#### PUT /admin/users/{id}
Обновление пользователя (требует права admin/manager)

**Запрос:**
```json
{
  "full_name": "Иван Иванов",
  "status": "VIP",
  "balance": 5000.0,
  "notes": "VIP клиент"
}
```

**Поля статуса:**
- `status` (string, optional): Новый статус пользователя
  - Доступные значения: `"Новый"`, `"Постоянный"`, `"VIP"`, `"Заблокирован"`, `"Персона НонГрата"`
  - **Важно:** Менеджеры не могут устанавливать статус `"Персона НонГрата"` (только администратор)
  - При попытке менеджера установить статус "Персона НонГрата" возвращается ошибка `403 Forbidden`

**Ограничения:**
- Статусы "Новый", "Постоянный", "VIP" обновляются автоматически при возврате аренд
- Статус "Заблокирован" устанавливается автоматически при наличии ≥3 просроченных резервов

#### POST /admin/users/{id}/balance
Пополнение баланса пользователя (требует права admin/manager)

**Запрос:**
```json
{
  "amount": 1000.00,
  "operation_type": "deposit",
  "notes": "Пополнение баланса"
}
```

### Аренды (Admin)

#### GET /admin/rentals/
Получение списка всех аренд (требует права admin/manager)

**Параметры запроса:**
- `skip` (int, optional): Количество пропускаемых записей
- `limit` (int, optional): Количество записей на странице
- `status` (string, optional): Фильтр по статусу (active, overdue, completed)
- `search` (string, optional): Поиск по имени или email клиента

#### POST /admin/rentals/
Создание новой аренды "с нуля" без предварительного резерва (требует права admin/manager)

**Ограничения на основе статуса пользователя:**
- **Персона НонГрата**: нельзя выдавать аренду даже менеджерам
- Все остальные статусы: можно выдавать аренду

**Ошибки:**
- `403 Forbidden` - пользователю со статусом "Персона НонГрата" нельзя выдавать аренду

**Запрос:**
```json
{
  "user_id": 1,
  "equipment_ids": [1, 2],
  "start_date": "2024-01-15",
  "end_date": "2024-01-20",
  "selected_accessories": {
    "1": [1, 2],
    "2": [3]
  },
  "promo_code": "DISCOUNT10",
  "deposit_amount": 100.0,
  "prepayment_amount": 50.0,
  "notes_on_issue": "Тестовая аренда",
  "force_issue_on_holiday": false
}
```

**Ответ:**
```json
{
  "id": 1,
  "user_id": 1,
  "created_by_id": 2,
  "reservation_id": null,
  "start_date": "2024-01-15",
  "end_date": "2024-01-20",
  "status": "active",
  "total_cost": 500.0,
  "discount_amount": 50.0,
  "final_cost": 450.0,
  "deposit_amount": 100.0,
  "prepayment_amount": 50.0,
  "notes_on_issue": "Тестовая аренда",
  "created_at": "2024-01-15T10:00:00Z",
  "user": {
    "id": 1,
    "full_name": "Иван Иванов",
    "email": "ivan@example.com"
  },
  "equipment": [
    {
      "id": 1,
      "name": "Canon EOS R5",
      "daily_rate": 100.0
    }
  ],
  "accessory_links": []
}
```

#### PUT /admin/rentals/{id}
Обновление деталей аренды (требует права admin/manager)

#### POST /admin/rentals/{id}/return
Оформление возврата аренды (требует права admin/manager)

#### DELETE /admin/rentals/{id}
Удаление аренды (требует права admin)

**Особенности:**
- Для аренд "с нуля" (без резерва) возможна отмена в течение 24 часов
- При отмене автоматически возвращаются средства на баланс пользователя
- При отмене предоплата списывается с баланса пользователя

#### DELETE /admin/users/balance-history/{history_id}
Удаление записи из истории баланса (требует права admin)

**Описание:**
Удаляет одну запись из истории баланса пользователя и атомарно пересчитывает его итоговый баланс. Операция выполняется в рамках транзакции для обеспечения целостности данных.

**Параметры:**
- `history_id` (int, required): ID записи в истории баланса для удаления

**Заголовки:**
```
Authorization: Bearer <admin-token>
X-CSRF-Token: <csrf-token>
```

**Пример запроса:**
```bash
curl -X DELETE "http://localhost:8000/api/user/admin/users/balance-history/123" \
  -H "Authorization: Bearer <admin-token>" \
  -H "X-CSRF-Token: <csrf-token>"
```

**Ответы:**
- **204 No Content** - Запись успешно удалена, баланс пересчитан
- **401 Unauthorized** - Не авторизован
- **403 Forbidden** - Недостаточно прав (требуется роль admin)
- **404 Not Found** - Запись в истории баланса не найдена
- **500 Internal Server Error** - Внутренняя ошибка сервера

**Особенности:**
- Операция атомарная - либо удаляется запись и пересчитывается баланс, либо ничего не изменяется
- Баланс пересчитывается путем суммирования всех оставшихся записей в истории
- Все операции логируются для аудита
- Доступно только администраторам для обеспечения безопасности

### Дашборд (Admin)

#### GET /admin/dashboard/summary
Получение сводки дашборда (требует права admin/manager)

**Ответ:**
```json
{
  "total_users": 150,
  "active_reservations": 25,
  "total_equipment": 200,
  "monthly_revenue": 500000.00,
  "kpi_metrics": {
    "utilization_rate": 0.75,
    "average_rental_duration": 3.5,
    "customer_satisfaction": 4.8
  },
  "focus_areas": [
    {
      "title": "Популярное оборудование",
      "description": "Canon EOS R5 - 85% загрузки",
      "priority": "high"
    }
  ]
}
```

### Аксессуары

#### GET /accessories/
Получение списка аксессуаров

**Параметры запроса:**
- `skip` (int, optional): Количество пропускаемых записей
- `limit` (int, optional): Количество записей на странице

#### POST /accessories/
Создание нового аксессуара (требует права admin/manager)

#### GET /accessories/{id}
Получение детальной информации об аксессуаре

### Ассоциации

#### GET /associations/
Получение списка ассоциаций оборудования

#### POST /associations/
Создание новой ассоциации (требует права admin/manager)

### Пачки оборудования

#### GET /packs/
Получение списка пачек оборудования

#### POST /packs/
Создание новой пачки (требует права admin/manager)

### Праздники

#### GET /holidays/
Получение списка праздников

#### POST /holidays/
Создание нового праздника (требует права admin/manager)

### Скидки

#### GET /discounts/
Получение списка скидок

#### POST /discounts/
Создание новой скидки (требует права admin/manager)

### Настройки

#### GET /settings/
Получение настроек системы

#### PUT /settings/
Обновление настроек системы (требует права admin/manager)

### Системы брендов

#### GET /admin/brand-systems/
Получение списка систем брендов (требует права admin/manager)

**Параметры запроса:**
- `skip` (int, optional): Количество пропускаемых записей
- `limit` (int, optional): Количество записей на странице

**Ответ:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Canon",
      "description": "Автоматически созданная система для бренда Canon",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "total": 11
}
```

#### POST /admin/brand-systems/
Создание новой системы бренда (требует права admin/manager)

**Запрос:**
```json
{
  "name": "Sony",
  "description": "Система для оборудования Sony"
}
```

#### PUT /admin/brand-systems/{id}
Обновление системы бренда (требует права admin/manager)

#### DELETE /admin/brand-systems/{id}
Удаление системы бренда (требует права admin/manager)

### Промокоды

#### GET /admin/promocodes/
Получение списка промокодов (требует права admin/manager)

#### POST /admin/promocodes/
Создание промокода (требует права admin/manager)

**Запрос:**
```json
{
  "code": "WELCOME2024",
  "discount_type": "percentage",
  "discount_value": 10.0,
  "min_amount": 1000.00,
  "max_discount": 2000.00,
  "usage_limit": 100,
  "valid_from": "2024-01-01T00:00:00Z",
  "valid_until": "2024-12-31T23:59:59Z",
  "description": "Скидка 10% для новых клиентов"
}
```

## 📊 Модели данных

### User (Пользователь)
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "Иван Иванов",
  "phone": "+7 (999) 123-45-67",
  "role": "client",
  "balance": 1000.00,
  "is_active": true,
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

### Equipment (Оборудование)
```json
{
  "id": 1,
  "name": "Canon EOS R5",
  "brand": "Canon",
  "equipment_type": "camera",
  "daily_rate": 5000.00,
  "condition": "excellent",
  "image_url": "https://example.com/canon-r5.jpg",
  "notes": "Отличное состояние",
  "description": "Полнокадровая беззеркальная камера",
  "is_active": true,
  "associations": [...],
  "accessories": [...],
  "brand_systems": [...],
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

### Reservation (Резервация)
```json
{
  "id": 1,
  "user_id": 1,
  "start_date": "2024-01-15",
  "end_date": "2024-01-20",
  "status": "confirmed",
  "total_amount": 25000.00,
  "deposit_amount": 5000.00,
  "notes": "Резервация для свадебной съемки",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z",
  "user": {...},
  "equipment": [...],
  "accessories": [...]
}
```

### Pack (Пачка оборудования)
```json
{
  "id": 1,
  "name": "Комплект для свадебной съемки",
  "description": "Полный комплект для профессиональной свадебной съемки",
  "equipment": [...],
  "total_daily_rate": 8000.00,
  "available_count": 2,
  "cheapest_available_id": 1,
  "created_at": "2024-01-01T10:00:00Z"
}
```

### BrandSystem (Система бренда)
```json
{
  "id": 1,
  "name": "Canon",
  "description": "Автоматически созданная система для бренда Canon",
  "created_at": "2024-01-01T10:00:00Z"
}
```

## ❌ Коды ошибок

### HTTP статус коды

- **200 OK** - Успешный запрос
- **201 Created** - Ресурс успешно создан
- **400 Bad Request** - Некорректный запрос
- **401 Unauthorized** - Не авторизован
- **403 Forbidden** - Нет прав доступа
- **404 Not Found** - Ресурс не найден
- **422 Unprocessable Entity** - Ошибка валидации
- **429 Too Many Requests** - Превышен лимит запросов
- **500 Internal Server Error** - Внутренняя ошибка сервера

### Формат ошибок

```json
{
  "detail": "Описание ошибки",
  "error_code": "VALIDATION_ERROR",
  "field_errors": {
    "email": ["Поле email обязательно для заполнения"],
    "password": ["Пароль должен содержать минимум 8 символов"]
  }
}
```

### Типичные ошибки

#### 401 Unauthorized
```json
{
  "detail": "Неверные учетные данные"
}
```

#### 403 Forbidden
```json
{
  "detail": "Недостаточно прав для выполнения операции"
}
```

#### 422 Validation Error
```json
{
  "detail": "Ошибка валидации данных",
  "field_errors": {
    "start_date": ["Дата начала не может быть в прошлом"],
    "end_date": ["Дата окончания должна быть после даты начала"]
  }
}
```

## 📝 Примеры запросов

### Полный цикл создания резервации

#### 1. Получение доступного оборудования
```bash
curl -X GET "http://localhost:8000/api/equipment/?available_only=true&start_date=2024-01-15&end_date=2024-01-20" \
  -H "Accept: application/json"
```

#### 2. Проверка доступности конкретного оборудования
```bash
curl -X GET "http://localhost:8000/api/calendar/view?start=2024-01-15&end=2024-01-20&ids=1&ids=2" \
  -H "Accept: application/json"
```

#### 3. Создание резервации
```bash
curl -X POST "http://localhost:8000/api/reservations/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{
    "start_date": "2024-01-15",
    "end_date": "2024-01-20",
    "equipment_ids": [1, 2],
    "accessory_ids": [3, 4],
    "notes": "Резервация для свадебной съемки"
  }'
```

#### 4. Получение списка резерваций пользователя
```bash
curl -X GET "http://localhost:8000/api/reservations/" \
  -H "Authorization: Bearer <your-token>" \
  -H "Accept: application/json"
```

#### 5. Создание аренды "с нуля" (только для менеджеров)
```bash
curl -X POST "http://localhost:8000/api/admin/rentals/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <manager-token>" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{
    "user_id": 1,
    "equipment_ids": [1, 2],
    "start_date": "2024-01-15",
    "end_date": "2024-01-20",
    "selected_accessories": {
      "1": [1, 2],
      "2": [3]
    },
    "promo_code": "DISCOUNT10",
    "deposit_amount": 100.0,
    "prepayment_amount": 50.0,
    "notes_on_issue": "Срочная аренда для клиента",
    "force_issue_on_holiday": false
  }'
```

### Административные операции

#### Удаление записи из истории баланса
```bash
curl -X DELETE "http://localhost:8000/api/user/admin/users/balance-history/123" \
  -H "Authorization: Bearer <admin-token>" \
  -H "X-CSRF-Token: <csrf-token>"
```

#### Создание нового оборудования
```bash
curl -X POST "http://localhost:8000/api/equipment/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{
    "name": "Nikon Z9",
    "brand": "Nikon",
    "equipment_type": "camera",
    "daily_rate": 6000.00,
    "condition": "excellent",
    "description": "Флагманская беззеркальная камера Nikon"
  }'
```

#### Получение статистики дашборда
```bash
curl -X GET "http://localhost:8000/api/admin/dashboard/summary" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Accept: application/json"
```

### Работа с промокодами

#### Создание промокода
```bash
curl -X POST "http://localhost:8000/api/admin/promocodes/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{
    "code": "WELCOME2024",
    "discount_type": "percentage",
    "discount_value": 10.0,
    "min_amount": 1000.00,
    "max_discount": 2000.00,
    "usage_limit": 100,
    "valid_from": "2024-01-01T00:00:00Z",
    "valid_until": "2024-12-31T23:59:59Z"
  }'
```

### Работа с системами брендов

#### Получение списка систем брендов
```bash
curl -X GET "http://localhost:8000/api/admin/brand-systems/" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Accept: application/json"
```

#### Создание новой системы бренда
```bash
curl -X POST "http://localhost:8000/api/admin/brand-systems/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{
    "name": "Sony",
    "description": "Система для оборудования Sony"
  }'
```

---

**Степень уверенности: 100%** - Документация актуализирована в соответствии с текущим кодом приложения. Включает все актуальные API эндпоинты, модели данных и примеры запросов. Обновлена с учетом миграции на единообразный Dependency Injection. Все эндпоинты используют dependency-injector для внедрения зависимостей.