-- Исправленная миграция для добавления критически важных индексов
-- Решает проблему медленных запросов к associations и rentals

-- 1. Индексы для таблицы associations
-- Для запроса: SELECT DISTINCT associations.id, associations.name, associations.description, associations.sort_order
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_associations_sort_order 
ON associations (sort_order);

-- Для JOIN с equipment (правильное название таблицы)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_association_equipment_association_id 
ON association_equipment_association (association_id, equipment_id);

-- 2. Индексы для таблицы rentals
-- Для запросов по датам и статусу
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rentals_dates_status 
ON rentals (start_date, end_date, status) 
WHERE status IN ('ACTIVE', 'OVERDUE');

-- Для JOIN с equipment (правильное название таблицы)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rental_equipment_id 
ON rental_equipment (rental_id, equipment_id);

-- 3. Индексы для таблицы equipment
-- Для фильтрации по типу (уже существует, но добавим составной)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_type_brand 
ON equipment (equipment_type, brand);

-- 4. Индексы для таблицы reservations (аналогично rentals)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_dates_status 
ON reservations (start_date, end_date, status) 
WHERE status = 'ACTIVE';

-- Для JOIN с equipment (правильное название таблицы)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservation_equipment_id 
ON reservation_equipment (reservation_id, equipment_id);

-- 5. Составные индексы для сложных запросов
-- Для equipment с associations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_associations_composite 
ON equipment (id, equipment_type, brand);

-- Для rentals с equipment и датами
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rentals_equipment_dates_composite 
ON rentals (status, start_date, end_date) 
WHERE status IN ('ACTIVE', 'OVERDUE');

-- 6. Индексы для brand_systems
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_systems_name 
ON brand_systems (name);

-- Анализируем таблицы для обновления статистики
ANALYZE associations;
ANALYZE rentals;
ANALYZE equipment;
ANALYZE reservations;
ANALYZE brand_systems;
ANALYZE association_equipment_association;
ANALYZE rental_equipment;
ANALYZE reservation_equipment;
