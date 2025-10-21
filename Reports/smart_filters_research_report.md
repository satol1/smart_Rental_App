# Отчет об исследовании умных фильтров на главной странице приложения

## Обзор

Проведено качественное исследование работы умных фильтров на главной странице приложения. Выявлены критические проблемы в логике обратных зависимостей между фильтрами, которые приводят к путанице пользователей.

## Архитектура умных фильтров

### Текущая структура

1. **Frontend компоненты:**
   - `FilterPanel` - основной компонент панели фильтров
   - `TypeFilter` - фильтр по типам оборудования
   - `BrandFilter` - фильтр по брендам
   - `AssociationFilter` - фильтр по подборкам/ассоциациям

2. **Хуки и сторы:**
   - `useAppFilters` - объединяет состояние из трех сторов
   - `useServerFilters` - серверная умная фильтрация
   - `useFilterStore` - хранилище состояния фильтров
   - `useBrandSystems` - получение всех систем брендов

3. **Backend API:**
   - `EquipmentServiceApi.get_paginated_equipment()` - основной метод фильтрации
   - `EquipmentFilterService.calculate_available_filters()` - расчет доступных опций
   - Репозитории для получения отфильтрованных данных

## Выявленные проблемы

### 1. Критическая проблема с фильтром брендов

**Проблема:** `BrandFilter` использует хук `useBrandSystems()`, который получает ВСЕ системы брендов из базы данных, игнорируя текущие активные фильтры.

**Код проблемы:**
```typescript
// src/components/BrandFilter.tsx
const { data: brandSystemsResponse, isLoading } = useBrandSystems();
const availableSystems = brandSystemsResponse?.items ?? [];
```

**Последствия:**
- При выборе типа "Камера" показываются ВСЕ бренды, включая те, в которых нет камер
- При выборе подборки показываются ВСЕ бренды, включая те, которых нет в этой подборке
- Нарушается принцип умной фильтрации

### 2. Проблема с обратными зависимостями

**Сценарий проблемы:**
1. Пользователь выбирает подборку "Студийное освещение"
2. В фильтре брендов показываются ВСЕ бренды (проблема #1)
3. Пользователь выбирает бренд "Canon" (которого нет в подборке)
4. Сервер возвращает пустой список подборок (так как Canon не связан с "Студийным освещением")
5. Пользователь видит только "Все подборки", но бренд Canon остается выбранным и неактивным
6. Пользователь не может понять, почему бренд выбран, но неактивен

**Корень проблемы:** Отсутствие автоматического сброса конфликтующих фильтров при изменении зависимых фильтров.

### 3. Несогласованность в использовании availableFilters

**Правильно работает:**
- `TypeFilter` использует `availableTypes` из `useServerFilters`
- `AssociationFilter` использует `availableAssociations` из `useServerFilters`

**Неправильно работает:**
- `BrandFilter` игнорирует `availableFilters.brands` и использует `useBrandSystems()`

## Техническая архитектура

### Backend логика

Backend правильно реализует умную фильтрацию:

```python
# api/services/equipment_filter_service.py
async def calculate_available_filters(self, ...):
    # Вычисляет доступные опции на основе текущих фильтров
    available_types = await self._get_available_types(base_conditions, brand_system_id, association_id)
    available_brands = await self._get_available_brands(base_conditions, type, association_id)
    available_associations = await self._get_available_associations(base_conditions, type, brand_system_id)
```

### Frontend логика

Frontend частично использует серверную логику:

```typescript
// src/hooks/features/useServerFilters.ts
const result = useMemo(() => {
    return {
        combinedItems,
        availableTypes: firstPage.availableFilters?.types || [],
        availableAssociations: firstPage.availableFilters?.associations || [],
        // ❌ availableBrands игнорируется!
    };
}, [equipmentPages, ...]);
```

## Рекомендации по исправлению

### 1. Исправить BrandFilter

**Требуется:**
- Передать `availableBrands` из `useServerFilters` в `BrandFilter`
- Удалить использование `useBrandSystems()` в `BrandFilter`
- Обновить интерфейс `FilterPanelProps`

**Код исправления:**
```typescript
// src/components/FilterPanel.tsx
interface FilterPanelProps {
    availableTypes: string[];
    availableBrands: string[]; // ✅ Добавить
    availableAssociations: Association[];
    hasActiveFilters: boolean;
}

// src/components/BrandFilter.tsx
interface BrandFilterProps {
    availableBrands: string[]; // ✅ Добавить
}

function BrandFilter({ availableBrands }: BrandFilterProps) {
    // ✅ Использовать availableBrands вместо useBrandSystems()
}
```

### 2. Добавить логику автоматического сброса конфликтующих фильтров

**Требуется:**
- При изменении фильтра проверять совместимость с другими фильтрами
- Автоматически сбрасывать конфликтующие фильтры
- Показывать уведомление пользователю о сбросе

**Логика:**
```typescript
// В useFilterStore или отдельном хуке
const validateAndResetConflictingFilters = (newFilter: FilterChange) => {
    // Проверяем совместимость
    // Сбрасываем конфликтующие фильтры
    // Уведомляем пользователя
};
```

### 3. Улучшить UX при конфликтах фильтров

**Требуется:**
- Показывать индикаторы неактивных фильтров
- Добавить подсказки о причинах неактивности
- Предлагать альтернативные варианты

### 4. Добавить тестирование

**Требуется:**
- Unit тесты для логики фильтрации
- Integration тесты для API
- E2E тесты для пользовательских сценариев

## Приоритеты исправления

1. **Высокий приоритет:** Исправить BrandFilter для использования availableBrands
2. **Высокий приоритет:** Добавить автоматический сброс конфликтующих фильтров
3. **Средний приоритет:** Улучшить UX при конфликтах
4. **Низкий приоритет:** Добавить тестирование

## Заключение

Умные фильтры имеют правильную архитектуру на backend, но критическая проблема в frontend нарушает принцип умной фильтрации. Основная проблема - `BrandFilter` игнорирует серверную логику и показывает все бренды независимо от активных фильтров.

Исправление требует минимальных изменений в коде, но значительно улучшит пользовательский опыт и соответствие принципам умной фильтрации.

**Степень уверенности: 95%**

Дата исследования: 15 января 2025
Исследователь: AI Assistant
