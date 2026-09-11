#!/bin/sh
# scripts/backup_loop.sh
# Планировщик бэкапов для сервиса db-backup (docker-compose --profile backup).
# Каждые BACKUP_INTERVAL_SECONDS секунд:
#   1) дамп БД (UTF-8, --clean/--create) в /backups/db_<ts>.sql.gz
#   2) архив тома uploads (фото оборудования) в /backups/uploads_<ts>.tar.gz
#   3) ротация: файлы старше BACKUP_RETENTION_DAYS дней удаляются
set -u

: "${DB_HOST:=db}"
: "${POSTGRES_USER:=myuser}"
: "${POSTGRES_DB:=rental_db}"
: "${BACKUP_INTERVAL_SECONDS:=86400}"
: "${BACKUP_RETENTION_DAYS:=14}"

echo "Планировщик бэкапов: интервал ${BACKUP_INTERVAL_SECONDS}с, ротация ${BACKUP_RETENTION_DAYS} дн."

while true; do
    ts=$(date +%Y%m%d_%H%M%S)
    tmp_dump="/backups/.db_${ts}.sql"

    echo "[$(date '+%F %T')] Бэкап БД..."
    # Дамп пишем в файл и проверяем статус pg_dump отдельно:
    # пайплайн "pg_dump | gzip" в POSIX sh вернул бы статус gzip и
    # маскировал бы упавший дамп пустым .gz
    if PGCLIENTENCODING=UTF8 pg_dump -h "$DB_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        --clean --if-exists --create --encoding=UTF8 \
        --file="$tmp_dump"; then
        if gzip -c "$tmp_dump" > /backups/db_"$ts".sql.gz && gzip -t /backups/db_"$ts".sql.gz; then
            rm -f "$tmp_dump"
            echo "OK: db_${ts}.sql.gz"
        else
            rm -f "$tmp_dump" /backups/db_"$ts".sql.gz
            echo "ОШИБКА сжатия дампа"
        fi
    else
        rm -f "$tmp_dump"
        echo "ОШИБКА бэкапа БД (pg_dump)"
    fi

    echo "[$(date '+%F %T')] Бэкап uploads..."
    if tar czf /backups/uploads_"$ts".tar.gz -C /uploads . 2>/dev/null; then
        echo "OK: uploads_${ts}.tar.gz"
    else
        rm -f /backups/uploads_"$ts".tar.gz
        echo "ОШИБКА бэкапа uploads (том пуст или недоступен)"
    fi

    # Ротация охватывает и ручные архивы из scripts/backup_database.sh
    find /backups -maxdepth 1 -name 'db_*.sql.gz' -mtime "+$BACKUP_RETENTION_DAYS" -delete
    find /backups -maxdepth 1 -name 'uploads_*.tar.gz' -mtime "+$BACKUP_RETENTION_DAYS" -delete
    find /backups -maxdepth 1 -name 'rental_db_backup_*.sql.gz' -mtime "+$BACKUP_RETENTION_DAYS" -delete

    sleep "$BACKUP_INTERVAL_SECONDS"
done
