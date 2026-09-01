-- Миграция для добавления критически важных индексов
-- Решает проблему медленных запросов к associations и rentals

-- 1. Индексы для таблицы associations
-- Для запроса: SELECT DISTINCT associations.id, associations.name, associations.description, associations.sort_order
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_associations_sort_order 
ON associations (sort_order);

-- Для JOIN с equipment
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_associations_equipment_id 
ON associations_equipment (association_id, equipment_id);

-- 2. Индексы для таблицы rentals
-- Для запросов по датам и статусу
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rentals_dates_status 
ON rentals (start_date, end_date, status) 
WHERE status IN ('ACTIVE', 'OVERDUE');

-- Для JOIN с equipment
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rentals_equipment_id 
ON rentals_equipment (rental_id, equipment_id);

-- 3. Индексы для таблицы equipment
-- Для фильтрации по типу
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_type 
ON equipment (equipment_type);

-- Для фильтрации по brand_system_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_brand_system 
ON equipment (brand_system_id);

-- 4. Индексы для таблицы reservations (аналогично rentals)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_dates_status 
ON reservations (start_date, end_date, status) 
WHERE status = 'ACTIVE';

-- Для JOIN с equipment
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_equipment_id 
ON reservations_equipment (reservation_id, equipment_id);

-- 5. Составные индексы для сложных запросов
-- Для equipment с associations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_associations_composite 
ON equipment (id, equipment_type, brand_system_id);

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
ANALYZE associations_equipment;
ANALYZE rentals_equipment;
ANALYZE reservations_equipment;
