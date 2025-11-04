# Руководство по бэкапу базы данных с поддержкой кириллицы

## Обзор

Данное руководство описывает процесс создания и восстановления бэкапов базы данных PostgreSQL в Docker с гарантированным сохранением кириллических символов.

## Проблема с кодировкой

При стандартном создании бэкапов через PowerShell или другие инструменты кириллические символы могут отображаться как `????` после восстановления. Это происходит из-за неправильных настроек кодировки.

## Решение

Созданы специальные скрипты с правильными настройками кодировки UTF-8:

### Настройки кодировки
- `LC_ALL=C.UTF-8`
- `LANG=C.UTF-8`
- `PGCLIENTENCODING=UTF8`
- `--encoding=UTF8`

## Доступные скрипты

### 1. Создание бэкапа

#### Linux/macOS
```bash
./scripts/backup_database_utf8.sh
```

#### Windows PowerShell
```powershell
.\scripts\backup_database_utf8.ps1
```

#### Windows Batch
```cmd
scripts\backup_database.bat
```

### 2. Восстановление из бэкапа

#### Linux/macOS
```bash
./scripts/restore_database_utf8.sh db_backup/rental_db_backup_20241201_120000.sql.gz
```

#### Windows PowerShell
```powershell
.\scripts\restore_database_utf8.ps1 db_backup\rental_db_backup_20241201_120000.sql
```

### 3. Тестирование бэкапа

```bash
./scripts/test_backup_utf8.sh
```

## Пошаговое руководство

### Шаг 1: Подготовка

1. Убедитесь, что Docker контейнеры запущены:
   ```bash
   docker-compose up -d db
   ```

2. Проверьте наличие файла `.env` с настройками базы данных:
   ```bash
   cat .env
   ```

### Шаг 2: Создание бэкапа

1. **Linux/macOS:**
   ```bash
   chmod +x scripts/backup_database_utf8.sh
   ./scripts/backup_database_utf8.sh
   ```

2. **Windows PowerShell:**
   ```powershell
   .\scripts\backup_database_utf8.ps1
   ```

3. **Windows Batch:**
   ```cmd
   scripts\backup_database.bat
   ```

### Шаг 3: Проверка бэкапа

Бэкап будет создан в директории `db_backup/` с именем вида:
```
rental_db_backup_YYYYMMDD_HHMMSS.sql.gz
```

Проверьте:
- Размер файла (не должен быть 0 байт)
- Кодировку файла (должна быть UTF-8)
- Наличие кириллических символов в файле

### Шаг 4: Тестирование (рекомендуется)

Перед использованием в продакшене протестируйте бэкап:

```bash
chmod +x scripts/test_backup_utf8.sh
./scripts/test_backup_utf8.sh
```

Тест создаст тестовую базу данных, добавит кириллические данные, сделает бэкап и восстановит их.

### Шаг 5: Восстановление

⚠️ **ВНИМАНИЕ:** Восстановление удалит существующую базу данных!

1. **Linux/macOS:**
   ```bash
   chmod +x scripts/restore_database_utf8.sh
   ./scripts/restore_database_utf8.sh db_backup/rental_db_backup_20241201_120000.sql.gz
   ```

2. **Windows PowerShell:**
   ```powershell
   .\scripts\restore_database_utf8.ps1 db_backup\rental_db_backup_20241201_120000.sql
   ```

### Шаг 6: Проверка восстановления

После восстановления проверьте:

1. **Количество таблиц:**
   ```bash
   docker-compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "\dt"
   ```

2. **Кириллические символы:**
   ```bash
   docker-compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 'Тест кириллицы: Привет мир!' as test;"
   ```

3. **Данные в таблицах:**
   ```bash
   docker-compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT COUNT(*) FROM users;"
   docker-compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT COUNT(*) FROM equipment;"
   ```

## Автоматизация

### Ежедневные бэкапы

Создайте cron задачу для автоматических бэкапов:

```bash
# Добавьте в crontab
0 2 * * * cd /path/to/project && ./scripts/backup_database_utf8.sh
```

### Мониторинг бэкапов

Проверяйте размер и дату создания бэкапов:

```bash
ls -la db_backup/*.gz
```

## Устранение проблем

### Проблема: Кириллица отображается как ????

**Причина:** Неправильная кодировка при создании бэкапа

**Решение:**
1. Используйте только скрипты с суффиксом `_utf8`
2. Проверьте настройки кодировки в Docker контейнере
3. Убедитесь, что база данных создана с кодировкой UTF-8

### Проблема: Бэкап пустой или поврежден

**Причина:** Ошибки при создании бэкапа

**Решение:**
1. Проверьте, что контейнер базы данных запущен
2. Убедитесь, что база данных содержит данные
3. Проверьте права доступа к директории `db_backup/`

### Проблема: Ошибки при восстановлении

**Причина:** Несовместимость версий или поврежденный бэкап

**Решение:**
1. Проверьте версию PostgreSQL в бэкапе и текущей системе
2. Убедитесь, что бэкап создан корректно
3. Проверьте логи восстановления

## Лучшие практики

1. **Регулярные бэкапы:** Создавайте бэкапы ежедневно
2. **Тестирование:** Всегда тестируйте бэкапы перед использованием в продакшене
3. **Хранение:** Храните бэкапы в безопасном месте
4. **Мониторинг:** Следите за размером и качеством бэкапов
5. **Документирование:** Ведите журнал бэкапов и восстановлений

## Структура файлов

```
scripts/
├── backup_database_utf8.sh      # Linux/macOS бэкап
├── backup_database_utf8.ps1     # Windows PowerShell бэкап
├── restore_database_utf8.sh     # Linux/macOS восстановление
├── restore_database_utf8.ps1     # Windows PowerShell восстановление
└── test_backup_utf8.sh          # Тестирование бэкапа

db_backup/
├── rental_db_backup_*.sql.gz    # Сжатые бэкапы
├── backup_info_*.txt           # Информация о бэкапах
└── test_utf8/                  # Тестовые бэкапы
```

## Контакты

При возникновении проблем с бэкапами обращайтесь к администратору системы.

---

**Дата создания:** $(date)  
**Версия:** 1.0  
**Автор:** AI Assistant
