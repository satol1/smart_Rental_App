# 🏗️ Архитектура системы

Подробное описание архитектуры системы аренды фототехники.

## 🔧 Текущее состояние

**Версия**: 5.0 (модернизация 2026-09)  
**Статус**: ✅ Полностью функциональна и готова к продакшену

### Дополнение v5.0 (поверх описанного ниже)
- **Redis 7** (новый слой): rate limiting (slowapi storage), brute-force защита, denylist refresh-токенов, кэш агрегатов дашборда (TTL 60с + инвалидация по мутациям). Все хранилища — с graceful fallback в in-memory при недоступности Redis (`api/services/redis_client.py`, `cache_service.py`)
- **Аутентификация**: PyJWT (HS256) с типизацией токенов (`type: access|refresh`) и `jti`; refresh ротация; logout → denylist
- **Фронтенд-архитектура**: React.lazy по страницам + Suspense; manualChunks (react-vendor/radix/query/charts); слой motion-токенов `src/lib/motion.ts`; тема через `themeStore` + `.dark`-токены; i18n-слой `src/i18n/`; общие примитивы отображения сущностей (StatusBadge/RoleBadge/MoneyText) над shadcn/ui
- **Процесс**: Spec-Driven Development (GitHub SpecKit) — `.specify/` + `specs/`; конституция главенствует над архитектурными решениями
- **CI**: GitHub Actions — ruff+pytest (backend), eslint+tsc+vitest+build (frontend), docker build обоих образов

### Ключевые архитектурные решения
- **Repository Pattern**: Полностью внедрен строгий паттерн репозиториев для всех сервисов
- **Dependency Injection**: Единообразный DI-контейнер для всех компонентов системы
- **Изоляция сессий**: Решена критическая проблема с конкурентными запросами через contextvars
- **Система мониторинга**: Health check эндпоинты и диагностические скрипты для мониторинга производительности
- **Комплексное тестирование**: 111+ тестов покрывают все компоненты системы
- **Полная совместимость**: Все тесты используют PostgreSQL (как в продакшене)
- **Модульная архитектура**: Четкое разделение на сервисы, репозитории и API
- **Промокоды**: Полностью интегрированы в архитектуру с соблюдением всех принципов


## 📋 Содержание

- [Обзор архитектуры](#обзор-архитектуры)
- [Диаграммы системы](#диаграммы-системы)
- [Архитектурные принципы](#архитектурные-принципы)
- [Паттерны проектирования](#паттерны-проектирования)
- [Слои архитектуры](#слои-архитектуры)
- [Потоки данных](#потоки-данных)

## 🎯 Обзор архитектуры

Система построена по принципу **микросервисной архитектуры** с четким разделением ответственности между компонентами:

- **Frontend** - React приложение с TypeScript
- **Backend** - FastAPI приложение с Python
- **Database** - PostgreSQL база данных
- **Infrastructure** - Docker контейнеры

## 📊 Диаграммы системы

### Общая архитектура системы

```
┌─────────────────────────────────────────────────────────────────┐
│                        Пользователи                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Клиенты   │  │  Менеджеры  │  │ Администраторы │          │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    Frontend Layer                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                React Application                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │   Pages     │  │ Components  │  │    Hooks    │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │   Store     │  │  Services   │  │    Types    │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTP/HTTPS
┌─────────────────────▼───────────────────────────────────────────┐
│                    Backend Layer                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                FastAPI Application                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │    API      │  │  Services   │  │ Repository  │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │   Models    │  │   Schemas   │  │  Security   │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ SQL
┌─────────────────────▼───────────────────────────────────────────┐
│                   Database Layer                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                PostgreSQL Database                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │   Users     │  │ Equipment   │  │Reservations │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │   Packs     │  │ Accessories │  │   Rentals   │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Детальная архитектура Backend

```
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  auth_api   │  │equipment_api│  │reservation_ │            │
│  └─────────────┘  └─────────────┘  │    api      │            │
│  ┌─────────────┐  ┌─────────────┐  └─────────────┘            │
│  │calendar_api │  │admin_*_api  │  ┌─────────────┐            │
│  │             │  │             │  │promo_code_  │            │
│  └─────────────┘  └─────────────┘  │    api      │            │
│                                    └─────────────┘            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                   Service Layer                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Facade Services                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │Availability │  │  Dashboard  │  │ Financial   │    │   │
│  │  │  Service    │  │  Service    │  │  Service    │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Specialized Services                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │EquipmentCRUD│  │Reservation  │  │    User     │    │   │
│  │  │  Service    │  │  Service    │  │  Service    │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │RentalLife   │  │ PromoCode   │  │  Calendar   │    │   │
│  │  │cycleService │  │  Service    │  │  Service    │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                 Repository Layer                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Data Access Layer                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │   Order     │  │ Equipment   │  │    User     │    │   │
│  │  │ Repository  │  │ Repository  │  │ Repository  │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │  │ Accessory   │  │Association  │  │    Pack     │    │   │
│  │  │  │ Repository  │  │ Repository  │  │ Repository  │    │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │  │Reservation  │  │Reservation  │  │Reservation  │    │   │
│  │  │  │   Query     │  │  Filter     │  │Availability │    │   │
│  │  │  │ Repository  │  │ Repository  │  │ Repository  │    │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │  │Statistics   │  │   Holiday   │  │BrandSystem  │    │   │
│  │  │  │ Repository  │  │ Repository  │  │ Repository  │    │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │  │BalanceHistory│  │  Discount   │  │   Setting   │    │   │
│  │  │  │ Repository  │  │ Repository  │  │ Repository  │    │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                   Model Layer                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                SQLAlchemy Models                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │    User     │  │ Equipment   │  │Reservation  │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │    Pack     │  │ Accessory   │  │   Rental    │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │Association  │  │   Holiday   │  │  Discount   │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ PromoCode   │  │  Setting    │  │BalanceHistory│    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  ┌─────────────┐  ┌─────────────┐                      │   │
│  │  │BrandSystem  │  │  Payment    │                      │   │
│  │  └─────────────┘  └─────────────┘                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Архитектура Frontend

```
┌─────────────────────────────────────────────────────────────────┐
│                      Presentation Layer                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Pages                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │   Home      │  │   Reserve   │  │   Profile   │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │  Calendar   │  │   Admin     │  │MyReservations│    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                   Component Layer                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                UI Components                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ Equipment   │  │ Reservation │  │    User     │    │   │
│  │  │   Card      │  │    Card     │  │   Form      │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │   Filter    │  │  Calendar   │  │   Admin     │    │   │
│  │  │   Panel     │  │ Component   │  │ Components  │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │   Shared    │  │   Shared    │  │   Shared    │    │   │
│  │  │ Components  │  │ Components  │  │ Components  │    │   │
│  │  │ (DatePicker │  │ (UserSelect │  │ (Equipment  │    │   │
│  │  │  Field)     │  │   or)       │  │  Selector)  │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    Logic Layer                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Custom Hooks                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ useEquipment│  │useReservation│  │  useAuth    │    │   │
│  │  │             │  │             │  │             │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │useAllEquip. │  │ useCalendar │  │useCoreFilter│    │   │
│  │  │(Admin Only) │  │             │  │ingLogic     │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                   Service Layer                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                API Services                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ Equipment   │  │ Reservation │  │    User     │    │   │
│  │  │  Service    │  │  Service    │  │  Service    │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │  Calendar   │  │   Admin     │  │  PromoCode  │    │   │
│  │  │  Service    │  │  Service    │  │  Service    │    │   │
│  │  │             │  │             │  │             │    │   │
│  │  │  Date       │  │  Holiday    │  │  Accessory  │    │   │
│  │  │  Service    │  │  Service    │  │  Service    │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                   State Layer                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                State Management                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ TanStack    │  │   Zustand   │  │   React     │    │   │
│  │  │   Query     │  │   Stores    │  │   Context   │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Схема базы данных

```
┌─────────────────────────────────────────────────────────────────┐
│                    Database Schema                              │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │    Users    │    │ Equipment   │    │Reservations │        │
│  │─────────────│    │─────────────│    │─────────────│        │
│  │ id (PK)     │    │ id (PK)     │    │ id (PK)     │        │
│  │ email       │    │ name        │    │ user_id (FK)│        │
│  │ full_name   │    │ brand       │    │ start_date  │        │
│  │ phone       │    │ type        │    │ end_date    │        │
│  │ role        │    │ daily_rate  │    │ status      │        │
│  │ balance     │    │ condition   │    │ total_amount│        │
│  │ is_active   │    │ is_active   │    │ created_at  │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                   │                   │              │
│         │                   │                   │              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Packs     │    │ Accessories │    │   Rentals   │        │
│  │─────────────│    │─────────────│    │─────────────│        │
│  │ id (PK)     │    │ id (PK)     │    │ id (PK)     │        │
│  │ name        │    │ name        │    │reservation_id│       │
│  │ description │    │ daily_rate  │    │ status      │        │
│  │ created_at  │    │ equipment_id│    │ actual_start│        │
│  └─────────────┘    └─────────────┘    │ actual_end  │        │
│         │                   │          └─────────────┘        │
│         │                   │                   │              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │Associations │    │ PromoCodes  │    │BalanceHistory│        │
│  │─────────────│    │─────────────│    │─────────────│        │
│  │ id (PK)     │    │ id (PK)     │    │ id (PK)     │        │
│  │ name        │    │ code        │    │ user_id (FK)│        │
│  │sort_order   │    │discount_type│    │ amount      │        │
│  └─────────────┘    │discount_value│   │operation_type│       │
│                     │valid_from   │    │ created_at  │        │
│                     │valid_until  │    └─────────────┘        │
│                     └─────────────┘                           │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  Holidays   │    │  Discounts  │    │  Settings   │        │
│  │─────────────│    │─────────────│    │─────────────│        │
│  │ id (PK)     │    │ id (PK)     │    │ id (PK)     │        │
│  │ name        │    │ name        │    │ key         │        │
│  │ date        │    │ type        │    │ value       │        │
│  │ is_recurring│    │ value       │    │ description │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
│  ┌─────────────┐                                              │
│  │BrandSystems │                                              │
│  │─────────────│                                              │
│  │ id (PK)     │                                              │
│  │ name        │                                              │
│  │ description │                                              │
│  │ created_at  │                                              │
│  └─────────────┘                                              │
│                                                                 │
│  Many-to-Many Relationships:                                   │
│  • Equipment ↔ Associations                                    │
│  • Equipment ↔ Accessories                                     │
│  • Packs ↔ Equipment                                           │
│  • Reservations ↔ Equipment                                    │
│  • Reservations ↔ Accessories                                  │
│  • Equipment ↔ BrandSystems                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 🏛️ Архитектурные принципы

### 1. Разделение ответственности (Separation of Concerns)

Каждый слой имеет четко определенную ответственность:

- **Presentation Layer** - отображение данных и взаимодействие с пользователем
- **Business Logic Layer** - бизнес-правила и логика приложения
- **Data Access Layer** - работа с данными и их хранение

### 2. Dependency Inversion Principle

Высокоуровневые модули не зависят от низкоуровневых. Оба зависят от абстракций.

```python
# Высокоуровневый модуль
class ReservationService:
    def __init__(self, repository: ReservationRepository):
        self.repository = repository  # Зависит от абстракции

# Низкоуровневый модуль
class SQLReservationRepository(ReservationRepository):
    def save(self, reservation: Reservation):
        # Реализация сохранения в БД
```

### 3. Single Responsibility Principle

Каждый класс имеет только одну причину для изменения:

- `EquipmentService` - только работа с оборудованием
- `ReservationService` - только работа с резервациями
- `FinancialService` - только финансовые расчеты

### 4. Open/Closed Principle

Классы открыты для расширения, но закрыты для модификации:

```python
# Базовый класс
class DiscountCalculator:
    def calculate(self, amount: Decimal) -> Decimal:
        pass

# Расширение без модификации базового класса
class PercentageDiscountCalculator(DiscountCalculator):
    def calculate(self, amount: Decimal) -> Decimal:
        return amount * self.percentage / 100
```

## 🎨 Паттерны проектирования

### 1. Facade Pattern

Сервисы-фасады предоставляют упрощенный интерфейс для сложных подсистем:

```python
class AvailabilityService:
    """Фасад для всех операций с доступностью"""
    
    def __init__(self):
        self.conflict_service = ConflictService()
        self.calendar_service = CalendarService()
        self.status_service = StatusService()
    
    async def check_availability(self, equipment_ids, start_date, end_date):
        # Координирует работу всех подсервисов
        conflicts = await self.conflict_service.get_conflicts(...)
        calendar = await self.calendar_service.get_view(...)
        statuses = await self.status_service.get_statuses(...)
        return self._combine_results(conflicts, calendar, statuses)
```

### 2. Repository Pattern

**СТРОГО ВНЕДРЕН** - Все сервисы используют репозитории для доступа к данным. Прямые SQL-запросы в сервисах полностью устранены.

```python
# СЕРВИСЫ НЕ ДОЛЖНЫ ИСПОЛЬЗОВАТЬ ПРЯМЫЕ SQL-ЗАПРОСЫ
class BalanceService:
    def __init__(self, db: AsyncSession, user_repo: UserRepository):
        self.db = db
        self.user_repo = user_repo  # ✅ Используем репозиторий
    
    async def process_payment(self, user_id: int, amount: Decimal):
        # ✅ ПРАВИЛЬНО: Используем метод репозитория
        user = await self.user_repo.get_by_id_for_update(user_id)
        
        # ❌ НЕПРАВИЛЬНО: Прямой SQL-запрос
        # result = await self.db.execute(select(User).filter(User.id == user_id).with_for_update())

# СПЕЦИАЛИЗИРОВАННЫЕ РЕПОЗИТОРИИ
class UserRepository(BaseRepository):
    async def get_by_id_for_update(self, user_id: int) -> Optional[User]:
        """Получение пользователя с блокировкой для обновления баланса"""
        result = await self.db.execute(
            select(User).filter(User.id == user_id).with_for_update(skip_locked=True)
        )
        return result.scalars().first()

class EquipmentRepository(BaseRepository):
    async def get_all_with_details(self) -> List[Equipment]:
        """Получение всего оборудования с предзагрузкой связей"""
        from sqlalchemy.orm import joinedload
        result = await self.db.execute(
            select(Equipment).options(
                joinedload(Equipment.accessories),
                joinedload(Equipment.associations)
            )
        )
        return result.unique().scalars().all()

class RentalRepository(BaseRepository):
    async def get_overlapping_for_availability_check(
        self, equipment_ids: List[int], start_date: date, end_date: date
    ) -> List[Rental]:
        """Оптимизированная проверка пересекающихся аренд с EXISTS"""
        from sqlalchemy import exists, and_
        query = select(Rental).options(selectinload(Rental.equipment)).filter(
            Rental.end_date > start_date,
            Rental.start_date < end_date,
            Rental.status.in_([OrderStatus.ACTIVE, OrderStatus.OVERDUE])
        ).where(
            exists().where(
                and_(
                    rental_equipment_association.c.rental_id == Rental.id,
                    rental_equipment_association.c.equipment_id.in_(equipment_ids)
                )
            )
        )
        result = await self.db.execute(query)
        return result.unique().scalars().all()
```

**Строгие принципы Repository Pattern:**
- **ЗАПРЕТ**: Сервисы НЕ МОГУТ использовать `db.execute(select(...))` напрямую
- **ОБЯЗАТЕЛЬНО**: Все SQL-запросы инкапсулированы в методах репозиториев
- **Специализация**: Каждый репозиторий отвечает за свою доменную область
- **Оптимизация**: Использование EXISTS вместо ANY, предзагрузка связей
- **Безопасность**: Блокировки для предотвращения race conditions

**Специализированные репозитории:**
- **StatisticsRepository**: Специализированный репозиторий для KPI и статистических запросов
  - `get_user_count()`, `get_active_users_count()`, `get_equipment_count()`
  - `get_revenue_today()`, `get_revenue_this_month()`, `get_occupancy_rate()`
  - `get_avg_rental_duration()`, `get_active_reservations_count()`, `get_rentals_count()`
  - `get_active_rentals_count()`, `get_overdue_rentals_count()`, `get_accessories_count()`, `get_associations_count()`
- **PromoCodeRepository**: Репозиторий для работы с промокодами с методом `delete`
- **HolidayRepository**: Методы `is_holiday()`, `get_holidays_in_range()`, `find_next_working_day()`
- **BrandSystemRepository**: Метод `get_name_by_id()`
- **BalanceHistoryRepository**: Метод `get_user_balance_sum()`
- **EquipmentRepository**: Методы `get_similar_equipment()`, `get_by_ids()`
- **AccessoryRepository**: Метод `get_by_ids()` для получения аксессуаров по списку ID

### 3. Command Query Separation (CQS)

Разделение команд (изменяющих состояние) и запросов (только читающих):

```python
# Команды (Commands)
class ReservationService:
    async def create_reservation(self, data: ReservationCreate) -> Reservation:
        # Изменяет состояние системы
        pass

# Запросы (Queries)
class ReservationQueryService:
    async def get_user_reservations(self, user_id: int) -> List[Reservation]:
        # Только читает данные
        pass
```

### 4. Dependency Injection

**ПОЛНОСТЬЮ ВНЕДРЕН** - Все сервисы и репозитории управляются через единый DI-контейнер с устранением циклических зависимостей.

```python
# В API эндпоинте
@router.post("/reservations/")
@inject
async def create_reservation(
    data: ReservationCreate,
    service: ReservationService = Depends(Provide[Container.reservation_service])
):
    return await service.create_reservation(data)

# СЕРВИСЫ С РЕПОЗИТОРИЯМИ
@router.post("/admin/balance/{user_id}/add-payment")
@inject
async def add_payment_to_user(
    user_id: int,
    amount: Decimal,
    balance_service: BalanceService = Depends(Provide[Container.balance_service])
):
    return await balance_service.process_payment(user_id, amount)

# AVAILABILITY СЕРВИСЫ С ПРАВИЛЬНЫМИ ЗАВИСИМОСТЯМИ
@router.get("/api/equipment/available")
@inject
async def check_equipment_availability(
    equipment_ids: List[int],
    start_date: date,
    end_date: date,
    availability_service: AvailabilityService = Depends(Provide[Container.availability_service])
):
    return await availability_service.check_availability(equipment_ids, start_date, end_date)
```

**DI-контейнер (containers.py) - Решенные проблемы:**
```python
# РЕШЕНИЕ ЦИКЛИЧЕСКИХ ЗАВИСИМОСТЕЙ
# 1. Создаем rental_repo для availability сервисов
rental_repo_temp = providers.Factory(RentalRepository, db=db_session, financial_service=None)

# 2. Availability сервисы используют репозиторий
availability_status_service = providers.Factory(
    AvailabilityStatusService, 
    db=db_session, 
    reservation_repo=reservation_repo, 
    rental_repo=rental_repo_temp  # ✅ Исправлено
)

# 3. Создаем основной rental_repo после financial_service
rental_repo = providers.Factory(RentalRepository, db=db_session, financial_service=financial_service)

# 4. Обновляем сервисы, которым нужен полный rental_repo
rental_lifecycle_service = providers.Factory(
    RentalLifecycleService,
    rental_repo=rental_repo,  # ✅ С правильной зависимостью
    # ... другие зависимости
)
```

**Строгие принципы DI в проекте:**
- **ОБЯЗАТЕЛЬНО**: Все сервисы получаются через `@inject` и `Provide[Container.service_name]`
- **ЗАПРЕТ**: Ручное создание экземпляров сервисов в эндпоинтах
- **Циклические зависимости**: Решены через временные провайдеры и правильный порядок создания
- **Repository injection**: Все репозитории инжектируются в сервисы через DI-контейнер
- **Тестируемость**: Легкое мокирование через переопределение провайдеров

### 5. Observer Pattern

Для уведомлений и событий:

```python
class ReservationCreatedEvent:
    def __init__(self, reservation: Reservation):
        self.reservation = reservation

class NotificationService:
    async def handle_reservation_created(self, event: ReservationCreatedEvent):
        # Отправка уведомлений
        pass
```

## 📚 Слои архитектуры

### Backend слои

#### 1. API Layer
- **Ответственность**: Обработка HTTP запросов, валидация входных данных
- **Компоненты**: FastAPI роутеры, middleware, exception handlers
- **Middleware**: `DIContainerMiddleware`, `LoggingMiddleware`, `SecureHeadersMiddleware`, `CORSMiddleware`
- **Exception Handlers**: `ErrorHandlerService`, `global_exception_handler`, `csrf_protect_exception_handler`
- **Примеры**: `auth_api.py`, `equipment_api.py`, `reservation_api.py`, `admin_rental_api.py`, `admin_user_api.py`, `admin_dashboard_api.py`

#### 2. Service Layer
- **Ответственность**: Бизнес-логика, координация между компонентами
- **Компоненты**: Сервисы-фасады, специализированные сервисы
- **Сервисы-фасады**: `AvailabilityService`, `DashboardService`, `FinancialService`
- **Специализированные сервисы**: `ReservationLifecycleService`, `RentalLifecycleService` (фасад), `EquipmentCRUDService`, `UserService`, `PackService`
- **Модульные сервисы аренд**: `RentalCreationService`, `RentalReturnService`, `RentalUpdateService`, `RentalCancellationService`
- **Примеры**: `AvailabilityService`, `FinancialService`, `ReservationLifecycleService`, `RentalLifecycleService`, `EquipmentCRUDService`

#### 3. Repository Layer
- **Ответственность**: Доступ к данным, инкапсуляция SQL запросов
- **Компоненты**: Repository классы, специализированные репозитории
- **Базовые репозитории**: `BaseRepository`, `EquipmentBaseRepository`, `RentalBaseRepository`, `ReservationBaseRepository`
- **Специализированные репозитории**: `EquipmentQueryRepository`, `EquipmentCommandRepository`, `ReservationAvailabilityRepository`
- **Примеры**: `EquipmentRepository`, `ReservationRepository`, `RentalRepository`, `UserRepository`, `StatisticsRepository`, `HolidayRepository`, `BrandSystemRepository`, `PromoCodeRepository`

#### 4. Model Layer
- **Ответственность**: Представление данных, связи между сущностями
- **Компоненты**: SQLAlchemy модели, ассоциативные таблицы
- **Основные модели**: `User`, `Equipment`, `Reservation`, `Rental`, `Accessory`, `Pack`
- **Справочные модели**: `BrandSystem`, `Holiday`, `PromoCode`, `DurationDiscount`, `Association`
- **Служебные модели**: `BalanceHistory`, `Payment`, `Setting`
- **Примеры**: `User`, `Equipment`, `Reservation`, `Rental`, `Accessory`, `BrandSystem`, `BalanceHistory`, `Payment`, `Holiday`

### Frontend слои

#### 1. Presentation Layer
- **Ответственность**: Отображение UI, взаимодействие с пользователем
- **Компоненты**: React компоненты, страницы, shared компоненты
- **Страницы**: `HomePage`, `ReservePage`, `ProfilePage`, `CalendarPage`, `MyReservationsPage`
- **Компоненты**: `EquipmentCard`, `ReservationCard`, `PackCard`, `FilterPanel`, `DateRangeSelector`
- **Shared компоненты**: `DatePickerField`, `UserSelector`, `EquipmentSelector`, `ConflictIndicator`
- **Примеры**: `HomePage`, `EquipmentCard`, `ReserveEquipmentCard`, `MyReservationList`

#### 2. Logic Layer
- **Ответственность**: Бизнес-логика UI, управление состоянием компонентов
- **Компоненты**: Custom hooks, ViewModels, Context providers
- **Data hooks**: `useEquipment`, `useAllEquipment`, `useReservations`, `useAuth`
- **Feature hooks**: `useCoreFilteringLogic`, `useServerFilters`, `useCalendarNavigation`
- **ViewModel hooks**: `useEquipmentCardViewModel`, `usePackCardViewModel`, `useReservationListViewModel`
- **Context providers**: `CreateReservationContext`, `ReservationEditContext`
- **Примеры**: `useEquipment`, `useReservations`, `useAuth`, `useEquipmentCardViewModel`, `useCoreFilteringLogic`

#### 3. Service Layer
- **Ответственность**: Взаимодействие с API, обработка данных
- **Компоненты**: API сервисы, утилиты
- **Основные сервисы**: `EquipmentService`, `ReservationService`, `UserService`, `RentalService`
- **Специализированные сервисы**: `CalendarService`, `DateService`, `HolidayService`, `PromoCodeManager`
- **Утилиты**: `AvailabilityService`, `AccessoryService`, `BrandSystemService`
- **Примеры**: `EquipmentService`, `ReservationService`, `UserService`, `CalendarService`, `DateService`

#### 4. State Layer
- **Ответственность**: Управление глобальным состоянием
- **Компоненты**: Zustand stores, TanStack Query, React Context
- **Основные stores**: `authStore`, `reserveStore`, `filterStore`, `dateStore`
- **Специализированные stores**: `calendarSelectionStore`, `promoCodeStore`, `searchStore`, `viewModeStore`
- **Административные stores**: `adminReservationSelectionStore`, `orderFilterStore`, `rentalReceiptStore`
- **TanStack Query**: Кэширование серверных данных, управление состоянием загрузки
- **Примеры**: `authStore`, `reserveStore`, `filterStore`, `calendarSelectionStore`, `promoCodeStore`

## 📊 Разделение логики получения данных

### Проблема и решение

**Проблема**: Единый хук `useEquipment` использовался как для публичного каталога, так и для административной панели. Это приводило к тому, что настройки группировки с главной страницы влияли на отображение данных в админке.

**Решение**: Создано четкое разделение между двумя типами получения данных:

#### 1. Публичный каталог - `useEquipment`
- **Назначение**: Только для главной страницы и публичных разделов
- **Особенности**: 
  - Поддерживает пагинацию с `useInfiniteQuery`
  - Применяет фильтры из `useFilterStore` (включая `groupSimilar`)
  - Использует debounce для поисковых запросов (350ms)
  - Кэшируется на 5 минут
  - Поддерживает все типы фильтров: `query`, `type`, `brandSystemId`, `associationId`, `availableOnly`, `startDate`, `endDate`, `groupSimilar`
- **Используется в**: `HomePage` (через `useEquipmentData`), `useEquipmentData`, `useServerFilters`

#### 2. Административная панель - `useAllEquipment`
- **Назначение**: Только для админ-панели и внутренних компонентов
- **Особенности**:
  - Загружает ВСЕ оборудование (до 1000 записей)
  - **ВСЕГДА** использует `groupSimilar: false`
  - Кэшируется на долгое время (1 час, gcTime: 2 часа)
  - Не зависит от глобальных фильтров
  - Не перезагружается при фокусе окна (`refetchOnWindowFocus: false`)
  - Возвращает только массив оборудования (`response.items`)
- **Используется в**: 
  - `EquipmentManagementPage`
  - `PromoCodeDialog`
  - `AssociationTable`
  - `PackDialog`
  - `BrandSystemTable`

### Архитектурная диаграмма разделения

```
┌─────────────────────────────────────────────────────────────────┐
│                    Data Fetching Strategy                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Public Catalog                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ useEquipment│  │useEquipmentData│ │useServerFilters│ │   │
│  │  │             │  │             │  │             │    │   │
│  │  │ • Pagination│  │ • Availability│ │ • Smart Filters│ │   │
│  │  │ • Grouping  │  │ • Daily Data │  │ • Server-side │  │   │
│  │  │ • Filters   │  │ • Equipment  │  │ • Combined   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Administrative Panel                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │useAllEquipment│ │useAllEquipment│ │useAllEquipment│ │   │
│  │  │             │  │             │  │             │    │   │
│  │  │ • All Items │  │ • PromoCodes│  │ • Associations│  │   │
│  │  │ • No Group  │  │ • Equipment │  │ • Equipment  │  │   │
│  │  │ • Long Cache│  │ • Selection │  │ • Selection  │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Ключевые принципы разделения

1. **Изоляция контекстов**: Публичная и административная части не влияют друг на друга
2. **Специализация хуков**: Каждый хук оптимизирован для своего контекста использования
3. **Предсказуемость**: Админ-панель всегда показывает полный список оборудования
4. **Производительность**: Долгое кэширование для админ-данных, быстрая пагинация для публичных

## 🔄 Потоки данных

### Поток создания резервации

```
1. User Input (Frontend)
   ↓
2. Form Validation (React Hook Form + Zod)
   ↓
3. API Call (ReservationService.createReservation)
   ↓
4. HTTP Request (Axios)
   ↓
5. API Endpoint (reservation_api.py)
   ↓
6. Request Validation (Pydantic)
   ↓
7. Business Logic (ReservationLifecycleService)
   ↓
8. Data Access (ReservationRepository)
   ↓
9. Database (PostgreSQL)
   ↓
10. Response (SQLAlchemy → Pydantic → JSON)
    ↓
11. State Update (TanStack Query)
    ↓
12. UI Update (React Components)
```

### Поток проверки доступности

```
1. Date Selection (Frontend)
   ↓
2. Equipment Selection (Frontend)
   ↓
3. Availability Check (AvailabilityService.getStatuses)
   ↓
4. API Call (calendar_api.py)
   ↓
5. Availability Service (AvailabilityService)
   ↓
6. Conflict Detection (AvailabilityConflictsService)
   ↓
7. Status Check (AvailabilityStatusService)
   ↓
8. Calendar Query (AvailabilityCalendarService)
   ↓
9. Database Queries (ReservationRepository, RentalRepository)
   ↓
10. Results Combination (AvailabilityService)
    ↓
11. Response (JSON)
    ↓
12. UI Update (AvailabilityStrip)
```

### Поток аутентификации

```
1. Login Form (Frontend)
   ↓
2. Credentials Validation (Zod)
   ↓
3. API Call (UserService.login)
   ↓
4. HTTP Request (auth_api.py)
   ↓
5. Credential Verification (AuthService.authenticate_user)
   ↓
6. JWT Generation (Python-JOSE)
   ↓
7. Response (Token + User Data)
   ↓
8. Token Storage (localStorage)
   ↓
9. State Update (authStore)
   ↓
10. Route Protection (RequireAuth)
    ↓
11. UI Update (Authenticated Layout)
```

## 🔒 Безопасность и мониторинг

### Аутентификация и авторизация

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Layer                               │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   JWT       │    │   CSRF      │    │   Rate      │        │
│  │   Auth      │    │ Protection  │    │  Limiting   │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Role      │    │   Input     │    │   Secure    │        │
│  │   Based     │    │ Validation  │    │  Headers    │        │
│  │   Access    │    │             │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Защита данных

- **Хеширование паролей** - bcrypt
- **JWT токены** - для аутентификации
- **CSRF защита** - для предотвращения атак
- **Rate limiting** - ограничение частоты запросов
- **Input validation** - валидация всех входных данных
- **SQL injection защита** - через ORM

### Система мониторинга

- **Health Check** - эндпоинт `/health` для проверки состояния системы
- **Middleware Stats** - эндпоинт `/monitoring/stats` для мониторинга производительности
- **Диагностические скрипты** - `deep_diagnostic_test.py` для глубокой диагностики
- **Race Condition тесты** - `test_race_condition_simple.py` для проверки конкурентности
- **Логирование** - централизованное логирование всех операций

## 🛠️ Руководство для разработчика: Расширение функционала

### Пошаговое руководство для добавления новой сущности

В этом разделе показано, как добавить новую сущность в систему, следуя архитектурным принципам проекта. В качестве примера рассмотрим создание сущности "Поставщики" (Suppliers).

### 🗺️ Навигация по архитектуре

#### Backend (FastAPI)

**1. Модель данных** → `api/models/`
- Создайте SQLAlchemy модель в `api/models/your_entity.py`
- Изучите существующие модели: `api/models/equipment.py`, `api/models/user.py`
- Следуйте паттернам: Base класс, индексы, timestamps, `__repr__`

**2. Pydantic схемы** → `shared/schemas/`
- Создайте схемы в `shared/schemas/your_entity.py`
- Изучите примеры: `shared/schemas/equipment.py`, `shared/schemas/user.py`
- Создайте: `Base`, `Create`, `Update`, `Response` схемы

**3. Репозиторий** → `api/repositories/`
- Создайте репозиторий в `api/repositories/your_entity_repository.py`
- Изучите примеры: `api/repositories/equipment_repository.py`
- Наследуйтесь от `BaseRepository`, добавьте специфичные методы

**4. Сервис** → `api/services/`
- Создайте сервис в `api/services/your_entity_service.py`
- Изучите примеры: `api/services/equipment_crud_service.py`
- Реализуйте бизнес-логику, валидацию, транзакции

**5. DI-контейнер** → `containers.py`
- Добавьте провайдеры для репозитория и сервиса
- Обновите `wiring_config` с новым модулем
- Изучите существующие провайдеры

**6. API эндпоинты** → `api/`
- Создайте файл `api/your_entity_api.py`
- Изучите примеры: `api/equipment_api.py`, `api/user_profile_api.py`, `api/admin_rental_api.py`, `api/admin_user_api.py`, `api/admin_dashboard_api.py`
- Используйте DI-контейнер для получения сервисов
- Для админских функций используйте `require_manager` или `require_admin`

**7. Роутер** → `api/router.py`
- Подключите новый роутер к основному приложению
- Добавьте префикс `/api`

**8. Миграции** → `migrations/`
```bash
cd RentalApp_FASTAPI
alembic revision --autogenerate -m "Add your_entity table"
alembic upgrade head
```

#### Frontend (React/TypeScript)

**1. API сервис** → `rental-app-main/src/core/services/`
- Создайте `YourEntityService.ts`
- Изучите примеры: `EquipmentService.ts`, `UserService.ts`
- Реализуйте CRUD операции через axios

**2. TypeScript типы** → `rental-app-main/src/types/`
- Создайте интерфейсы для сущности
- Изучите примеры: `equipment.ts`, `user.ts`

**3. Хуки** → `rental-app-main/src/hooks/`
- Создайте `useYourEntity.ts`
- Изучите примеры: `useEquipment.ts`, `useUsers.ts`
- Используйте TanStack Query для кэширования

**4. Компоненты** → `rental-app-main/src/components/`
- Создайте компоненты для отображения и управления
- Изучите примеры: `EquipmentCard.tsx`, `UserForm.tsx`
- Следуйте паттернам: разделение на UI и логику
- **Используйте shared компоненты**: `DatePickerField`, `UserSelector`, `EquipmentSelector`, `ConflictIndicator`

**5. Страницы** → `rental-app-main/src/pages/`
- Создайте страницы для управления сущностью
- Изучите примеры: `EquipmentManagementPage.tsx`

### 🧩 Shared компоненты (Переиспользуемые UI компоненты)

#### Принципы создания shared компонентов:
1. **DRY (Don't Repeat Yourself)** - устранение дублирования кода
2. **Single Responsibility** - каждый компонент отвечает за одну область
3. **Reusability** - компоненты можно использовать в разных местах
4. **Type Safety** - полная типизация TypeScript
5. **Centralized Services** - использование централизованных сервисов

#### Доступные shared компоненты:

**1. DatePickerField** → `src/components/shared/DatePickerField.tsx`
- Универсальный компонент для выбора дат
- Поддержка выходных дней и валидации
- Интеграция с `DateService` и `useHolidayValidation`
- Заменяет дублированную логику в 3 местах

**2. SimpleDatePickerField** → `src/components/shared/SimpleDatePickerField.tsx`
- Упрощенная версия DatePickerField
- Для случаев, когда не нужна сложная валидация

**3. UserSelector** → `src/components/shared/UserSelector.tsx`
- Компонент для выбора пользователей с поиском
- Использует Command компонент для удобного поиска
- Полная типизация с `UserOut` типом

**4. EquipmentSelector** → `src/components/shared/EquipmentSelector.tsx`
- Компонент для выбора оборудования с группировкой
- Отображение конфликтов доступности
- Интеграция с `ConflictIndicator`

**5. ConflictIndicator** → `src/components/shared/ConflictIndicator.tsx`
- Компонент для отображения конфликтов доступности
- Поддержка разных вариантов отображения
- Интеграция с `AvailabilityInfo` типом

**6. FinancialSummaryBlock** → `src/components/shared/FinancialSummaryBlock.tsx`
- Универсальный компонент для финансовой сводки
- Поддержка промокодов и скидок
- Интеграция с `usePriceCalculator`

**7. FinancialInfoBlock** → `src/components/shared/FinancialInfoBlock.tsx`
- Компонент для отображения финансовой информации
- Используется в различных формах и диалогах

**8. OrderFinalizationSummary** → `src/components/shared/OrderFinalizationSummary.tsx`
- Компонент для финального подтверждения заказа
- Отображает итоговую информацию перед созданием

**9. OrderToolbar** → `src/components/shared/OrderToolbar.tsx`
- Панель инструментов для управления заказами
- Используется в админ-панели

**10. StatusBadge** → `src/components/shared/StatusBadge.tsx`
- Компонент для отображения статусов
- Поддержка разных цветов и стилей

**11. InfiniteScrollTrigger** → `src/components/shared/InfiniteScrollTrigger.tsx`
- Компонент для бесконечной прокрутки
- Используется в списках с пагинацией

**12. AuthDialog** → `src/components/shared/AuthDialog.tsx`
- Диалог аутентификации
- Модальное окно для входа/регистрации

**13. ContactDialog** → `src/components/shared/ContactDialog.tsx`
- Диалог контактной информации
- Для отображения контактов

**14. EquipmentWithAccessoriesList** → `src/components/shared/EquipmentWithAccessoriesList.tsx`
- Список оборудования с аксессуарами
- Отображает связанные аксессуары

#### Использование shared компонентов:

```typescript
// Импорт
import { 
  DatePickerField, 
  UserSelector, 
  EquipmentSelector, 
  ConflictIndicator,
  FinancialSummaryBlock,
  StatusBadge,
  InfiniteScrollTrigger
} from '@/components/shared';

// Использование
<DatePickerField
  name="start_date"
  control={control}
  label="Дата начала"
  minDate={new Date()}
  holidays={holidays}
  error={errors.start_date?.message}
/>

<UserSelector
  name="user_id"
  control={control}
  label="Пользователь"
  users={users}
  isLoading={isLoadingUsers}
  error={errors.user_id?.message}
/>

<EquipmentSelector
  name="equipment_ids"
  control={control}
  label="Оборудование"
  multiple={true}
  error={errors.equipment_ids?.message}
/>

<ConflictIndicator
  availability={availabilityInfo}
  showDetails={true}
/>

<FinancialSummaryBlock
  total={totalAmount}
  discount={discountAmount}
  finalTotal={finalAmount}
/>

<StatusBadge
  status={orderStatus}
  variant="success"
/>

<InfiniteScrollTrigger
  hasNextPage={hasNextPage}
  isFetchingNextPage={isFetchingNextPage}
  fetchNextPage={fetchNextPage}
/>
```


## 🎯 Архитектурные принципы и правила

### Backend архитектурные принципы

#### 1. Dependency Injection (DI)
- **Принцип**: Все сервисы и репозитории получаются через DI-контейнер
- **Реализация**: `@inject` + `Depends(Provide[Container.service_name])` в эндпоинтах
- **Пример**: `balance_service: BalanceService = Depends(Provide[Container.balance_service])`
- **Преимущества**: Устранение циклических зависимостей, тестируемость, единообразие

#### 2. Repository Pattern
- **Принцип**: Инкапсуляция доступа к данным, наследование от `BaseRepository`
- **Правило**: Сервисы НЕ МОГУТ напрямую вызывать `db.execute(select(...))`
- **Обязательно**: Использование методов соответствующих репозиториев
- **Пример**: `EquipmentRepository` с методами `get_by_brand()`, `search_by_name()`

#### 3. Service Layer (Фасад)
- **Принцип**: Для каждой бизнес-области существует один главный сервис-фасад
- **Правило**: Всегда используй главный сервис, а не внутренние под-сервисы
- **Примеры**: `AvailabilityService`, `DashboardService`, `FinancialService`
- **Координация**: Фасад координирует работу специализированных сервисов

#### 4. CQS (Command Query Separation)
- **Принцип**: Разделение логики на команды и запросы
- **Команды**: Методы, изменяющие состояние (create, update, delete)
- **Запросы**: Методы, только читающие данные (get, search, list)
- **Правило**: Не смешивай логику чтения и записи в одном сервисе
- **Пример**: `ReservationLifecycleService` (команды) vs `ReservationQueryService` (запросы)

#### 5. Централизованные финансовые расчеты
- **Принцип**: Все расчеты с деньгами через `FinancialService`
- **Правило**: Стоимость аренды, скидки, штрафы - только через `FinancialService`
- **Преимущества**: Консистентность, единое место финансовой логики

#### 6. Централизованное управление балансом
- **Принцип**: Все изменения баланса через `BalanceService`
- **Правило**: Списание, начисление - только через `BalanceService`
- **Преимущества**: Атомарность транзакций, ведение истории

#### 7. SOLID принципы
- **SRP**: Каждый класс имеет одну ответственность
- **OCP**: Открыт для расширения, закрыт для модификации
- **DIP**: Зависимости от абстракций, не от конкретных реализаций

### 📚 Изучение существующих примеров

#### Для понимания паттернов изучите:

**Backend:**
- `api/models/equipment.py` - модель с ассоциациями
- `api/models/promo_code.py` - модель промокодов с связями
- `api/repositories/equipment_repository.py` - репозиторий с поиском
- `api/repositories/promo_code_repository.py` - репозиторий промокодов с методом delete
- `api/services/equipment_crud_service.py` - CRUD сервис
- `api/services/equipment_filter_service.py` - сервис фильтрации
- `api/services/equipment_pack_service.py` - сервис пачек оборудования
- `api/services/promo_code/promo_code_manager.py` - фасад для промокодов
- `api/equipment_api.py` - API эндпоинты
- `api/promo_code_api.py` - API эндпоинты промокодов
- `containers.py` - DI-контейнер

**Frontend:**
- `src/core/services/EquipmentService.ts` - API сервис
- `src/core/services/PromoCodeService.ts` - API сервис промокодов
- `src/hooks/useEquipment.ts` - хуки для данных
- `src/hooks/usePromoCodes.ts` - хуки для промокодов
- `src/components/equipment/EquipmentCard.tsx` - компонент отображения
- `src/components/admin/PromoCodeDialog.tsx` - диалог управления промокодами
- `src/pages/EquipmentManagementPage.tsx` - страница управления
- `src/stores/promoCodeStore.ts` - Zustand store для промокодов

### Frontend архитектурные принципы

#### 8. Централизованные API-сервисы
- **Принцип**: Все взаимодействия с API инкапсулированы в классах-сервисах
- **Расположение**: `src/core/services`
- **Правило**: Компоненты НЕ должны напрямую использовать `axios` или `api.ts`
- **Пример**: `ReservationService.createReservation(...)`, `EquipmentService.getAllEquipment(...)`, `PromoCodeService.createPromoCode(...)`

#### 9. Пользовательские хуки (Custom Hooks)
- **Принцип**: Логика инкапсулирована в хуках по назначению
- **Data-fetching hooks**: Получение данных с сервера, кэширование (TanStack Query)
- **UI/ViewModel hooks**: Управление состоянием компонентов (`useEquipmentCardViewModel`)
- **Feature hooks**: Специфичная логика фич (`useServerFilters`, `usePromoCodes`)
- **Правило**: Компоненты остаются "глупыми" и занимаются только отображением

#### 10. Модульные хранилища состояний (Zustand)
- **Принцип**: Глобальное состояние разделено на независимые stores по доменам
- **Правило**: Избегай создания одного монолитного стора
- **Примеры**: `authStore`, `filterStore`, `dateStore`, `reserveStore`, `promoCodeStore`

#### 11. ViewModel-хуки для устранения Prop Drilling
- **Принцип**: Сложные компоненты используют ViewModel-хуки
- **Правило**: Инкапсуляция логики компонента в упрощенный интерфейс
- **Пример**: `useEquipmentCardViewModel` - 2-3 пропса вместо 12+
- **Результат**: Компонент становится "глупым" и занимается только отображением

#### 12. React Context для глубоко вложенных компонентов
- **Принцип**: Для диалогов и сложных форм используй React Context
- **Правило**: Передача данных и функций через контекст, а не пропсы
- **Пример**: `CreateReservationContext` для диалога создания резерва
- **Реализация**: Provider оборачивает корневой компонент, дочерние используют `useContext`

#### 13. FormProvider для устранения Prop Drilling в формах
- **Принцип**: Сложные формы используют `FormProvider` из `react-hook-form`
- **Правило**: Централизованное управление состоянием формы
- **Пример**: `EquipmentForm` оборачивает содержимое в `<FormProvider>`
- **Результат**: Дочерние компоненты используют `useFormContext()`

#### 14. Централизованные типы данных
- **Принцип**: Все типы для API определены в `src/types/`
- **Правило**: Типы должны соответствовать схемам бэкенда
- **Пример**: `RentalCreateFromScratchData` соответствует `RentalCreateFromScratchRequest`

#### 15. Shared компоненты (DRY принцип)
- **Принцип**: Переиспользуемые UI компоненты в `src/components/shared`
- **Правило**: Устранение дублирования кода, Single Responsibility
- **Примеры**: `DatePickerField`, `UserSelector`, `EquipmentSelector`, `ConflictIndicator`, `PromoCodeDialog`
- **Преимущества**: Консистентность, поддерживаемость, переиспользование



### 💡 Советы по разработке

#### Backend разработка

1. **Следуйте архитектурным принципам** - используйте DI, Repository Pattern, CQS
2. **Начните с модели** - определите структуру данных в `api/models/`
3. **Создайте репозиторий** - инкапсулируйте доступ к данным в `api/repositories/`
4. **Реализуйте сервис** - бизнес-логика в `api/services/` с использованием фасадов
5. **Добавьте API эндпоинты** - в `api/` с использованием `@inject` и `Depends(Provide[...])`
6. **Настройте DI-контейнер** - добавьте провайдеры в `containers.py`
7. **Создайте миграции** - `alembic revision --autogenerate -m "Add table"`
8. **Напишите тесты** - юнит-тесты для сервисов, интеграционные для API

#### Frontend разработка

1. **Создайте API сервис** - в `src/core/services/` для взаимодействия с бэкендом
2. **Определите типы** - в `src/types/` соответствующие схемам бэкенда
3. **Реализуйте хуки** - data-fetching, UI/ViewModel, feature хуки в `src/hooks/`
4. **Создайте компоненты** - используйте shared компоненты из `src/components/shared`
5. **Используйте ViewModel-хуки** - для устранения Prop Drilling
6. **Применяйте React Context** - для глубоко вложенных компонентов
7. **Настройте Zustand stores** - модульные хранилища по доменам
8. **Следуйте DRY принципу** - переиспользуйте существующие компоненты
9. **Изучите примеры промокодов** - `PromoCodeService`, `usePromoCodes`, `PromoCodeDialog`

#### Общие принципы

1. **Изучайте существующие примеры** - не изобретайте велосипед
2. **Тестируйте каждый слой** - от модели до UI компонентов
3. **Документируйте изменения** - обновляйте API документацию
4. **Следуйте принципам SOLID** - Single Responsibility, Open/Closed, Dependency Inversion
5. **Используйте TypeScript** - полная типизация для безопасности типов
6. **Применяйте Docker** - все тесты должны проходить в контейнерах
7. **Соблюдайте архитектурную консистентность** - методы delete в специализированных репозиториях, а не в базовых
