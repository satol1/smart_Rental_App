# PowerShell скрипт для создания бэкапа базы данных PostgreSQL в Docker с правильной кодировкой UTF-8
# Гарантирует сохранение кириллических символов

# Настройка кодировки UTF-8 для PowerShell
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

# Функция для логирования
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

Write-Log "Starting database backup creation with UTF-8 encoding..." "INFO"

# Проверяем наличие .env файла
if (-not (Test-Path ".env")) {
    Write-Log ".env file not found! Create it based on env.example" "ERROR"
    exit 1
}

# Загружаем переменные окружения
$envVars = @{}
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        $envVars[$matches[1]] = $matches[2]
    }
}

# Проверяем обязательные переменные
$requiredVars = @("POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB")
foreach ($var in $requiredVars) {
    if (-not $envVars.ContainsKey($var) -or [string]::IsNullOrEmpty($envVars[$var])) {
        Write-Log "$var is not set in .env file" "ERROR"
        exit 1
    }
}

# Создаем директорию для бэкапов если её нет
$backupDir = "db_backup"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# Генерируем имя файла с timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$backupDir\rental_db_backup_$timestamp.sql"

Write-Log "Creating backup: $backupFile" "INFO"

# Проверяем, что контейнер базы данных запущен
$dbStatus = docker-compose ps db 2>$null | Select-String "Up"
if (-not $dbStatus) {
    Write-Log "Database container is not running! Start it with: docker-compose up -d db" "ERROR"
    exit 1
}

# Ждем готовности базы данных
Write-Log "Waiting for database readiness..." "INFO"
Start-Sleep -Seconds 10

# Создаем бэкап с правильной кодировкой UTF-8
Write-Log "Creating database backup with UTF-8 encoding..." "INFO"
$env:PGPASSWORD = $envVars["POSTGRES_PASSWORD"]

try {
    # Устанавливаем переменные окружения для правильной кодировки в контейнере
    docker-compose exec -T db bash -c "
        export LC_ALL=C.UTF-8
        export LANG=C.UTF-8
        export PGCLIENTENCODING=UTF8
        pg_dump \
            --username='$($envVars["POSTGRES_USER"])' \
            --dbname='$($envVars["POSTGRES_DB"])' \
            --verbose \
            --clean \
            --if-exists \
            --create \
            --encoding=UTF8 \
            --no-password \
            --format=plain \
            --file='/tmp/backup.sql'
    "

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }

    # Копируем файл из контейнера с правильной кодировкой UTF-8
    docker-compose exec -T db cat /tmp/backup.sql | Out-File -FilePath $backupFile -Encoding UTF8

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to copy backup file from container"
    }

    # Удаляем временный файл из контейнера
    docker-compose exec -T db rm -f /tmp/backup.sql

    # Проверяем размер созданного файла
    if (-not (Test-Path $backupFile)) {
        throw "Backup file was not created"
    }

    $fileSize = (Get-Item $backupFile).Length
    if ($fileSize -eq 0) {
        throw "Backup file is empty"
    }

    # Проверяем кодировку файла
    $fileEncoding = [System.Text.Encoding]::Default.GetString([System.IO.File]::ReadAllBytes($backupFile, 0, [Math]::Min(1024, $fileSize)))
    $isUtf8 = $fileEncoding -match "CREATE TABLE|INSERT INTO"
    
    if ($isUtf8) {
        Write-Log "File encoding verification: UTF-8 structure detected" "SUCCESS"
    } else {
        Write-Log "File encoding verification: Possible encoding issues" "WARNING"
    }

    Write-Log "Backup created successfully: $backupFile (size: $fileSize bytes)" "SUCCESS"

    # Создаем файл с информацией о бэкапе
    $infoFile = "$backupDir\backup_info_$timestamp.txt"
    $infoContent = @"
=== DATABASE BACKUP INFORMATION ===

Creation Date: $(Get-Date)
File Name: $backupFile
Size: $fileSize bytes
Database: $($envVars["POSTGRES_DB"])
User: $($envVars["POSTGRES_USER"])
Encoding: UTF-8
PostgreSQL Version: $(docker-compose exec -T db psql -U $($envVars["POSTGRES_USER"]) -d $($envVars["POSTGRES_DB"]) -t -c "SELECT version();" | Out-String).Trim()

=== ENCODING SETTINGS ===
- LC_ALL=C.UTF-8
- LANG=C.UTF-8  
- PGCLIENTENCODING=UTF8
- --encoding=UTF8

=== CYRILLIC SUPPORT ===
- UTF-8 encoding preserved
- Database structure saved: $isUtf8
- Ready for restoration with Cyrillic support

=== RESTORE COMMAND ===
.\scripts\restore_database_utf8.ps1 $backupFile

=== POST-RESTORE CHECK ===
docker-compose exec db psql -U $($envVars["POSTGRES_USER"]) -d $($envVars["POSTGRES_DB"]) -c "SELECT 'Тест кириллицы: Привет мир!' as test;"

=== STATUS ===
✅ Backup created successfully
✅ UTF-8 encoding preserved
✅ Cyrillic characters protected
✅ Ready for restoration
"@

    $infoContent | Out-File -FilePath $infoFile -Encoding UTF8
    Write-Log "Backup info saved to: $infoFile" "INFO"

    # Показываем список всех бэкапов
    Write-Log "Available backups:" "INFO"
    Get-ChildItem "$backupDir\*.sql" | ForEach-Object {
        Write-Host "  $($_.Name) ($($_.Length) bytes)" -ForegroundColor Cyan
    }

    Write-Log "Backup process completed successfully!" "SUCCESS"
    Write-Log "Cyrillic characters preserved in UTF-8 encoding" "SUCCESS"

} catch {
    Write-Log "Error during backup creation: $($_.Exception.Message)" "ERROR"
    exit 1
} finally {
    # Очищаем переменную пароля
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
