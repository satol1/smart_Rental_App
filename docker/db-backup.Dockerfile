# docker/db-backup.Dockerfile
# Образ для сервисов бэкапов (db-backup, backup-restore-test).
# postgres:15-alpine НЕ содержит бинарник openssl, а шифрование дампов 3-2-1
# (этап 6.2 аудита 2026-09-12) построено на нём: без этого образа включение
# BACKUP_ENCRYPTION_KEY ломало бы создание дампов целиком.
FROM postgres:15-alpine

RUN apk add --no-cache openssl
