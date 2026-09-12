#!/bin/sh
# scripts/backup_restore_test.sh
# Регулярный тест-рестор бэкапов (этап 6.2 аудита 2026-09-12, правило 3-2-1).
# Берёт самый свежий дамп из /backups (или EXTERNAL_BACKUP_DIR, если указан),
# поднимает его в одноразовую базу rental_restore_test внутри того же postgres,
# проверяет целостность ключевых таблиц и удаляет тестовую базу.
#
# БЕЗОПАСНОСТЬ: дамп делается pg_dump --create/--clean и ссылается на имя
# прод-базы в нескольких местах (DROP DATABASE / CREATE DATABASE / \connect /
# ALTER DATABASE). Подменяем КАЖДОЕ вхождение имени на тестовое и выполняем
# дамп из служебной базы postgres, позволяя ему самому создать тестовую базу —
# иначе DROP/CONNECT уводили бы выполнение в прод-базу.
#
# Запуск: docker compose --profile backup-test run --rm backup-restore-test
# (или вручную из контейнера db-backup: sh /backup_restore_test.sh)
set -u

: "${DB_HOST:=db}"
: "${POSTGRES_USER:=myuser}"
: "${POSTGRES_DB:=rental_db}"
: "${BACKUP_ENCRYPTION_KEY:=}"
: "${EXTERNAL_BACKUP_DIR:=}"
RESTORE_DB="rental_restore_test"

if [ "$RESTORE_DB" = "$POSTGRES_DB" ]; then
    echo "ТЕСТ-РЕСТОР ПРОВАЛЕН: имя тестовой базы совпадает с прод-базой (запрещено)"
    exit 1
fi

# Ищем самый свежий дамп: сначала на внешнем носителе (проверяем правило 3-2-1),
# затем в локальном каталоге
latest_dump=""
for dir in "$EXTERNAL_BACKUP_DIR" /backups; do
    [ -d "$dir" ] || continue
    found=$(ls -1t "$dir"/db_*.sql.gz.enc "$dir"/db_*.sql.gz 2>/dev/null | head -n 1)
    if [ -n "$found" ]; then
        latest_dump="$found"
        break
    fi
done

if [ -z "$latest_dump" ]; then
    echo "ТЕСТ-РЕСТОР ПРОВАЛЕН: дампы не найдены ни в $EXTERNAL_BACKUP_DIR, ни в /backups"
    exit 1
fi
echo "Тест-рестор дампа: $latest_dump"

tmp_sql="/tmp/restore_test_$$.sql"
case "$latest_dump" in
    *.enc)
        if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
            echo "ТЕСТ-РЕСТОР ПРОВАЛЕН: дамп зашифрован, но BACKUP_ENCRYPTION_KEY не задан"
            exit 1
        fi
        if ! openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass "env:BACKUP_ENCRYPTION_KEY" \
             -in "$latest_dump" | gzip -d > "$tmp_sql"; then
            echo "ТЕСТ-РЕСТОР ПРОВАЛЕН: расшифровка/распаковка дампа ($latest_dump)"
            rm -f "$tmp_sql"
            exit 1
        fi
        ;;
    *.sql.gz)
        if ! gzip -dc "$latest_dump" > "$tmp_sql"; then
            echo "ТЕСТ-РЕСТОР ПРОВАЛЕН: распаковка дампа ($latest_dump)"
            rm -f "$tmp_sql"
            exit 1
        fi
        ;;
esac

# Подменяем КАЖДОЕ вхождение имени прод-базы на тестовое (экранируя спецсимволы
# для sed-регекса). Дамп сам DROP/CREATE тестовую базу и \connect в неё.
esc_prod=$(printf '%s' "$POSTGRES_DB" | sed 's/[.[\*^$/]/\\&/g')
sed "s/$esc_prod/$RESTORE_DB/g" "$tmp_sql" > "$tmp_sql.2"
rm -f "$tmp_sql"

# Страховка: после подмены в sql не должно остаться упоминаний прод-базы
if grep -q "$esc_prod" "$tmp_sql.2"; then
    echo "ТЕСТ-РЕСТОР ПРОВАЛЕН: в дампе остались ссылки на прод-базу $POSTGRES_DB"
    rm -f "$tmp_sql.2"
    exit 1
fi

cleanup() {
    psql -h "$DB_HOST" -U "$POSTGRES_USER" -d postgres \
        -c "DROP DATABASE IF EXISTS $RESTORE_DB" >/dev/null 2>&1
    rm -f "$tmp_sql.2"
}
trap cleanup EXIT

# Выполняем дамп ИЗ служебной базы postgres: он сам создаёт тестовую базу
# (CREATE DATABASE + \connect). Предварительно роняем возможный остаток.
if ! psql -h "$DB_HOST" -U "$POSTGRES_USER" -d postgres \
        -v ON_ERROR_STOP=1 \
        -c "DROP DATABASE IF EXISTS $RESTORE_DB" \
        -f "$tmp_sql.2" >/dev/null 2>&1; then
    echo "ТЕСТ-РЕСТОР ПРОВАЛЕН: применение дампа в $RESTORE_DB завершилось с ошибками"
    exit 1
fi

# Sanity-проверки: ключевые таблицы существуют и читаются
check_table() {
    count=$(psql -h "$DB_HOST" -U "$POSTGRES_USER" -d "$RESTORE_DB" -tAc "SELECT count(*) FROM $1" 2>/dev/null)
    if [ $? -ne 0 ]; then
        echo "ТЕСТ-РЕСТОР ПРОВАЛЕН: таблица $1 недоступна после рестора"
        exit 1
    fi
    echo "  $1: $count строк"
}

echo "Рестор применён, проверка ключевых таблиц:"
check_table users
check_table equipment
check_table reservations

echo "ТЕСТ-РЕСТОР ПРОЙДЕН: $latest_dump восстанавливается, ключевые таблицы читаются"
