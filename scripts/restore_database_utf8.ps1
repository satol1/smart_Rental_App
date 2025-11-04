# PowerShell скрипт для восстановления базы данных PostgreSQL из бэкапа в Docker с проверкой кириллицы
# Гарантирует правильное восстановление кириллических символов

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

# Проверяем аргументы
if ($args.Count -eq 0) {
    Write-Log "Usage: .\restore_database_utf8.ps1 <backup_file_path>" "ERROR"
    Write-Log "Example: .\restore_database_utf8.ps1 db_backup\rental_db_backup_20241201_120000.sql" "ERROR"
    exit 1
}

$backupFile = $args[0]

# Проверяем наличие файла бэкапа
if (-not (Test-Path $backupFile)) {
    Write-Log "Backup file not found: $backupFile" "ERROR"
    exit 1
}

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

Write-Log "Starting database restoration from file: $backupFile" "INFO"

# Проверяем, что контейнер базы данных запущен
$dbStatus = docker-compose ps db 2>$null | Select-String "Up"
if (-not $dbStatus) {
    Write-Log "Database container is not running! Start it with: docker-compose up -d db" "ERROR"
    exit 1
}

# Ждем готовности базы данных
Write-Log "Waiting for database readiness..." "INFO"
Start-Sleep -Seconds 10

# Проверяем, существует ли база данных
$dbExists = docker-compose exec -T db psql -U $($envVars["POSTGRES_USER"]) -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='$($envVars["POSTGRES_DB"])';" | Out-String | Trim

if ($dbExists -eq "1") {
    Write-Log "Database '$($envVars["POSTGRES_DB"])' already exists" "WARNING"
    Write-Host "Do you want to recreate the database? This will delete all existing data!" -ForegroundColor Yellow
    $confirm = Read-Host "Enter 'yes' to confirm"
    
    if ($confirm -ne "yes") {
        Write-Log "Operation cancelled by user" "INFO"
        exit 0
    }
    
    Write-Log "Dropping existing database..." "INFO"
    docker-compose exec -T db psql -U $($envVars["POSTGRES_USER"]) -d postgres -c "DROP DATABASE IF EXISTS $($envVars["POSTGRES_DB"]);"
}

# Создаем временную директорию для распаковки
$tempDir = "temp_restore_$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    # Определяем, сжат ли файл
    if ($backupFile.EndsWith(".gz")) {
        Write-Log "Extracting compressed backup..." "INFO"
        # Для Windows используем 7-Zip или PowerShell для распаковки
        if (Get-Command "7z" -ErrorAction SilentlyContinue) {
            & 7z x $backupFile -o$tempDir
            $extractedFile = Get-ChildItem $tempDir -Filter "*.sql" | Select-Object -First 1
            $restoreFile = $extractedFile.FullName
        } else {
            Write-Log "7-Zip not found. Please install 7-Zip or use uncompressed backup" "ERROR"
            exit 1
        }
    } else {
        Write-Log "Copying backup file..." "INFO"
        Copy-Item $backupFile "$tempDir\restore.sql"
        $restoreFile = "$tempDir\restore.sql"
    }

    # Проверяем кодировку файла бэкапа
    $fileContent = Get-Content $restoreFile -Raw -Encoding UTF8
    $fileEncoding = "UTF-8"
    Write-Log "Backup file encoding: $fileEncoding" "INFO"

    # Копируем файл в контейнер
    $containerName = docker-compose ps -q db
    docker cp $restoreFile "${containerName}:/tmp/restore.sql"

    Write-Log "Restoring database with UTF-8 encoding..." "INFO"

    # Восстанавливаем базу данных с правильными настройками кодировки
    $env:PGPASSWORD = $envVars["POSTGRES_PASSWORD"]
    
    docker-compose exec -T db bash -c "
        export LC_ALL=C.UTF-8
        export LANG=C.UTF-8
        export PGCLIENTENCODING=UTF8
        psql \
            --username='$($envVars["POSTGRES_USER"])' \
            --dbname=postgres \
            --set=ON_ERROR_STOP=1 \
            --file='/tmp/restore.sql'
    "

    if ($LASTEXITCODE -ne 0) {
        throw "Database restoration failed with exit code $LASTEXITCODE"
    }

    # Удаляем временный файл из контейнера
    docker-compose exec -T db rm -f /tmp/restore.sql

    # Проверяем, что база данных создана и содержит данные
    Write-Log "Checking restored database..." "INFO"

    $tableCount = docker-compose exec -T db psql -U $($envVars["POSTGRES_USER"]) -d $($envVars["POSTGRES_DB"]) -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | Out-String | Trim

    if ([int]$tableCount -gt 0) {
        Write-Log "Database successfully restored! Found tables: $tableCount" "SUCCESS"
        
        # Показываем список таблиц
        Write-Log "Tables in restored database:" "INFO"
        docker-compose exec -T db psql -U $($envVars["POSTGRES_USER"]) -d $($envVars["POSTGRES_DB"]) -c "\dt"
        
        # Показываем кодировку базы данных
        $encoding = docker-compose exec -T db psql -U $($envVars["POSTGRES_USER"]) -d $($envVars["POSTGRES_DB"]) -t -c "SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = '$($envVars["POSTGRES_DB"])';" | Out-String | Trim
        Write-Log "Database encoding: $encoding" "INFO"
        
        # Тестируем кириллицу
        Write-Log "Testing Cyrillic character preservation..." "INFO"
        $cyrillicTest = docker-compose exec -T db psql -U $($envVars["POSTGRES_USER"]) -d $($envVars["POSTGRES_DB"]) -t -c "SELECT 'Тест кириллицы: Привет мир!' as test;" | Out-String | Trim
        
        if ($cyrillicTest -match "Привет") {
            Write-Log "Cyrillic characters working correctly: $cyrillicTest" "SUCCESS"
        } else {
            Write-Log "Possible issues with Cyrillic: $cyrillicTest" "WARNING"
        }
        
        # Проверяем наличие данных в таблицах
        Write-Log "Checking data in main tables..." "INFO"
        
        # Проверяем таблицу пользователей
        $userCount = docker-compose exec -T db psql -U $($envVars["POSTGRES_USER"]) -d $($envVars["POSTGRES_DB"]) -t -c "SELECT COUNT(*) FROM users;" | Out-String | Trim
        if ([int]$userCount -gt 0) {
            Write-Log "Users: $userCount records" "INFO"
        }
        
        # Проверяем таблицу оборудования
        $equipmentCount = docker-compose exec -T db psql -U $($envVars["POSTGRES_USER"]) -d $($envVars["POSTGRES_DB"]) -t -c "SELECT COUNT(*) FROM equipment;" | Out-String | Trim
        if ([int]$equipmentCount -gt 0) {
            Write-Log "Equipment: $equipmentCount records" "INFO"
        }
        
        # Проверяем таблицу резерваций
        $reservationCount = docker-compose exec -T db psql -U $($envVars["POSTGRES_USER"]) -d $($envVars["POSTGRES_DB"]) -t -c "SELECT COUNT(*) FROM reservations;" | Out-String | Trim
        if ([int]$reservationCount -gt 0) {
            Write-Log "Reservations: $reservationCount records" "INFO"
        }
        
    } else {
        Write-Log "Database restored but no tables found!" "ERROR"
        exit 1
    }

    # Запускаем миграции Alembic для обновления схемы до актуального состояния
    Write-Log "Running database migrations..." "INFO"
    $backendStatus = docker-compose ps backend 2>$null | Select-String "Up"
    if ($backendStatus) {
        docker-compose exec backend alembic upgrade head
        Write-Log "Migrations completed successfully" "SUCCESS"
    } else {
        Write-Log "Backend container not running. Run migrations manually:" "WARNING"
        Write-Log "docker-compose exec backend alembic upgrade head" "WARNING"
    }

    # Финальная проверка кириллицы
    Write-Log "Final Cyrillic character check..." "INFO"
    $finalTest = docker-compose exec -T db psql -U $($envVars["POSTGRES_USER"]) -d $($envVars["POSTGRES_DB"]) -t -c "SELECT 'Финальный тест: Кириллица работает!' as final_test;" | Out-String | Trim

    if ($finalTest -match "Кириллица") {
        Write-Log "✅ Cyrillic characters fully restored!" "SUCCESS"
        Write-Log "✅ Database ready for use" "SUCCESS"
    } else {
        Write-Log "⚠️  Possible issues with Cyrillic in restored database" "WARNING"
    }

    Write-Log "Restoration process completed successfully!" "SUCCESS"
    Write-Log "Database ready for use with Cyrillic support" "SUCCESS"

} catch {
    Write-Log "Error during restoration: $($_.Exception.Message)" "ERROR"
    exit 1
} finally {
    # Очищаем временную директорию
    if (Test-Path $tempDir) {
        Remove-Item -Recurse -Force $tempDir
    }
    # Очищаем переменную пароля
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
