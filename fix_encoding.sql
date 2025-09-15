-- Скрипт для исправления всех проблем с кодировкой в базе данных
-- Выполнить: docker exec -i s_project_docker-db-1 psql -U myuser -d rental_db -f /path/to/fix_encoding.sql

-- 1. Исправляем описания оборудования
UPDATE equipment SET description = 'Профессиональная беззеркальная камера с матрицей 40 МП (APS-C), скоростной серийной съемкой, 5-осевой стабилизацией, поддержкой видео 8K и продвинутым автофокусом на основе искусственного интеллекта. Отличный выбор для фото- и видеосъемки высокого качества.' WHERE id = 21;

UPDATE equipment SET description = 'Компактная кино-камера с сенсором APS-C, поддерживающая 4K-видео до 120 кадров/с и профессиональными функциями. Идеальна для видеографов: удобное управление, высокая детализация, S-Cinetone и гибкие настройки цветокоррекции. Легкий корпус подходит для мобильных съемок.' WHERE id = 5;

UPDATE equipment SET description = 'Инновационная EOS R6 использует технологии, которые заставят вас вновь влюбиться в искусство фотографии. Оценивайте и снимайте сюжеты совершенно по-новому, добавьте новое измерение в свои фотоистории!' WHERE id = 7;

UPDATE equipment SET description = 'Aputure Light Storm LS 300X — светодиодный двухцветный проектор постоянного видеосвещения. Производит свет в спектрах Daylight и Tungsten, имеет крепление Bowens для быстрой установки модификаторов Aputure для рассеивания или фокусировки светового пучка' WHERE id = 9;

UPDATE equipment SET description = 'Tri8 — это профессиональная светодиодная панель с высокой яркостью и регулируемой цветовой температурой, идеально подходит для видеосъемки и фотосессий. Обеспечивает мягкий равномерный свет, оснащена гибкими настройками мощности, работает от сети и аккумуляторов. Компактная, удобна для мобильных съемок.' WHERE id = 18;

-- 2. Исправляем имена пользователей (основные)
UPDATE users SET full_name = 'Семен Семенович Семенов' WHERE id = 7;
UPDATE users SET full_name = 'Новый Клиент Интернетович' WHERE id = 5;
UPDATE users SET full_name = 'Сидор Иссидоров Печкин' WHERE id = 6;
UPDATE users SET full_name = 'Елкин Павел Павлович' WHERE id = 9;
UPDATE users SET full_name = 'Иванов Пауль Сергеевич' WHERE id = 10;
UPDATE users SET full_name = 'Антонио Эреас' WHERE id = 15;

-- 3. Исправляем заметки пользователей
UPDATE users SET notes = 'Требует подтверждения' WHERE id = 16;
UPDATE users SET notes = 'Создан автоматически при регистрации' WHERE id = 17;
UPDATE users SET notes = 'Создан автоматически при регистрации' WHERE id = 18;
UPDATE users SET notes = 'Создан администратором 12-09-2025' WHERE id = 19;
UPDATE users SET notes = 'Создан администратором 12-09-2025' WHERE id = 20;
UPDATE users SET notes = 'Создан администратором 12-09-2025' WHERE id = 21;
UPDATE users SET notes = 'Создан администратором 12-09-2025' WHERE id = 22;

-- 4. Исправляем краткие описания оборудования
UPDATE equipment SET short_description = 'Профессиональный беззеркальный фотоаппарат для видео' WHERE id = 5;
UPDATE equipment SET short_description = 'Профессиональная беззеркальная камера. Идеальна для репортажа' WHERE id = 7;
UPDATE equipment SET short_description = 'Профессиональная студийная осветитель' WHERE id = 9;
UPDATE equipment SET short_description = 'Профессиональная студийная осветитель' WHERE id = 18;
UPDATE equipment SET short_description = 'Профессиональная студийная осветитель' WHERE id = 19;

-- 5. Исправляем правила праздников
UPDATE holiday_rules SET description = 'Импорт гос. праздников для RU на 2025 год' WHERE id = 1;
UPDATE holiday_rules SET description = 'Еженедельный выходной: Воскресенье' WHERE id = 6;

-- 6. Исправляем заметки оборудования
UPDATE equipment SET notes = 'В продаже' WHERE id = 17;
UPDATE equipment SET notes = 'Тестовое примечание1' WHERE id = 7;
UPDATE equipment SET notes = 'Тестовое примечание' WHERE id = 26;

-- 7. Исправляем все оставшиеся состояния оборудования
UPDATE equipment SET condition = 'Великолепно' WHERE id IN (1, 2, 5, 7, 9, 10, 12, 13, 16, 18, 19, 20, 21, 26, 27);
UPDATE equipment SET condition = 'Отлично' WHERE id IN (4, 6, 22);
UPDATE equipment SET condition = 'Хорошо' WHERE id IN (14, 15);
UPDATE equipment SET condition = 'Удовлетворительно' WHERE id IN (8, 17);

-- 8. Исправляем все оставшиеся типы оборудования
UPDATE equipment SET equipment_type = 'Фотокамера' WHERE id IN (1, 2, 7, 8, 10, 12, 13, 14, 15, 16, 17, 21, 22, 26, 27);
UPDATE equipment SET equipment_type = 'Объектив' WHERE id IN (4, 6, 22);
UPDATE equipment SET equipment_type = 'Свет' WHERE id IN (9, 18, 19);
UPDATE equipment SET equipment_type = 'Экшн камера' WHERE id IN (26, 27);
UPDATE equipment SET equipment_type = 'Мобильный свет' WHERE id = 20;

COMMIT;
