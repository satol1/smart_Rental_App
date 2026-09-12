#!/bin/sh
# scripts/backup_loop.sh
# Планировщик бэкапов для сервиса db-backup (docker-compose --profile backup).
# Каждые BACKUP_INTERVAL_SECONDS секунд:
#   1) дамп БД (UTF-8, --clean/--create) в /backups/db_<ts>.sql.gz[.enc]
#   2) архив тома uploads (фото оборудования) в /backups/uploads_<ts>.tar.gz
#   3) копия (при EXTERNAL_BACKUP_DIR) на внешний носитель — правило 3-2-1
#   4) ротация: файлы старше BACKUP_RETENTION_DAYS дней удаляются
#
# Шифрование (этап 6.2 аудита 2026-09-12): при заданном BACKUP_ENCRYPTION_KEY
# дамп БД шифруется openssl (aes-256-cbc + pbkdf2) в db_<ts>.sql.gz.enc —
# в db_backup/*.sql больше нет открытых хэшей паролей и ПД.
set -u

: "${DB_HOST:=db}"
: "${POSTGRES_USER:=myuser}"
: "${POSTGRES_DB:=rental_db}"
: "${BACKUP_INTERVAL_SECONDS:=86400}"
: "${BACKUP_RETENTION_DAYS:=14}"
# Внешний носитель (внешний диск/NFS/rclone-mount, проброшенный в контейнер).
# Пусто — копия наружу не выполняется (только локальные копии).
: "${EXTERNAL_BACKUP_DIR:=}"
# Пароль шифрования дампов. Пусто — дампы хранятся открытыми (не рекомендуется).
: "${BACKUP_ENCRYPTION_KEY:=}"

echo "Планировщик бэкапов: интервал ${BACKUP_INTERVAL_SECONDS}с, ротация ${BACKUP_RETENTION_DAYS} дн., шифрование: $([ -n "$BACKUP_ENCRYPTION_KEY" ] && echo вкл || echo выкл), внешний носитель: $([ -n "$EXTERNAL_BACKUP_DIR" ] && echo "$EXTERNAL_BACKUP_DIR" || echo нет)"

# Шифрует stdin в файл $1 (aes-256-cbc). pbkdf2 с 600k итераций: дефолтные
# 10k итераций openssl брутфорсятся на GPU — а .enc-копии уходят наружу (3-2-1).
OPENSSL_ENC_ARGS="-aes-256-cbc -pbkdf2 -iter 600000 -salt -pass env:BACKUP_ENCRYPTION_KEY"

encrypt_to_file() {
    openssl enc $OPENSSL_ENC_ARGS -out "$1"
}

copy_to_external() {
    # $1 — файл; копия только когда носитель смонтирован и доступен на запись
    [ -n "$EXTERNAL_BACKUP_DIR" ] || return 0
    if [ -d "$EXTERNAL_BACKUP_DIR" ] && [ -w "$EXTERNAL_BACKUP_DIR" ]; then
        cp -p "$1" "$EXTERNAL_BACKUP_DIR/" && echo "3-2-1: копия $(basename "$1") -> ${EXTERNAL_BACKUP_DIR}"
    else
        echo "ВНИМАНИЕ: внешний носитель $EXTERNAL_BACKUP_DIR недоступен — копия НЕ создана"
    fi
}

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
        if [ -n "$BACKUP_ENCRYPTION_KEY" ]; then
            db_archive="/backups/db_${ts}.sql.gz.enc"
            if gzip -c "$tmp_dump" | encrypt_to_file "$db_archive" \
               && openssl enc -d $OPENSSL_ENC_ARGS -in "$db_archive" > /tmp/.verify_${ts}.gz                && gzip -t /tmp/.verify_${ts}.gz; then
                rm -f "$tmp_dump" /tmp/.verify_${ts}.gz
                echo "OK: db_${ts}.sql.gz.enc (зашифрован)"
            else
                rm -f "$tmp_dump" "$db_archive" /tmp/.verify_${ts}.gz
                echo "ОШИБКА шифрования дампа"
                db_archive=""
            fi
        else
            db_archive="/backups/db_${ts}.sql.gz"
            if gzip -c "$tmp_dump" > "$db_archive" && gzip -t "$db_archive"; then
                rm -f "$tmp_dump"
                echo "OK: db_${ts}.sql.gz"
            else
                rm -f "$tmp_dump" "$db_archive"
                echo "ОШИБКА сжатия дампа"
                db_archive=""
            fi
        fi
        # Правило 3-2-1: копия дампа на внешний носитель
        [ -n "$db_archive" ] && copy_to_external "$db_archive"
    else
        rm -f "$tmp_dump"
        echo "ОШИБКА бэкапа БД (pg_dump)"
    fi

    echo "[$(date '+%F %T')] Бэкап uploads..."
    if tar czf /backups/uploads_"$ts".tar.gz -C /uploads . 2>/dev/null; then
        echo "OK: uploads_${ts}.tar.gz"
        copy_to_external "/backups/uploads_${ts}.tar.gz"
    else
        rm -f /backups/uploads_"$ts".tar.gz
        echo "ОШИБКА бэкапа uploads (том пуст или недоступен)"
    fi

    # Ротация охватывает и ручные архивы из scripts/backup_database.sh
    find /backups -maxdepth 1 -name 'db_*.sql.gz' -mtime "+$BACKUP_RETENTION_DAYS" -delete
    find /backups -maxdepth 1 -name 'db_*.sql.gz.enc' -mtime "+$BACKUP_RETENTION_DAYS" -delete
    find /backups -maxdepth 1 -name 'uploads_*.tar.gz' -mtime "+$BACKUP_RETENTION_DAYS" -delete
    find /backups -maxdepth 1 -name 'rental_db_backup_*.sql.gz' -mtime "+$BACKUP_RETENTION_DAYS" -delete
    if [ -n "$EXTERNAL_BACKUP_DIR" ] && [ -d "$EXTERNAL_BACKUP_DIR" ]; then
        find "$EXTERNAL_BACKUP_DIR" -maxdepth 1 -name 'db_*.sql.gz*' -mtime "+$BACKUP_RETENTION_DAYS" -delete
        find "$EXTERNAL_BACKUP_DIR" -maxdepth 1 -name 'uploads_*.tar.gz' -mtime "+$BACKUP_RETENTION_DAYS" -delete
    fi

    sleep "$BACKUP_INTERVAL_SECONDS"
done
