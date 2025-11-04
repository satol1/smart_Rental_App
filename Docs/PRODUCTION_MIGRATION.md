# 🚀 Руководство по переносу из локальной разработки на продакшн хостинг

Данное руководство описывает все настройки, которые необходимо изменить для переноса Docker контейнеров с локальной машины на продакшн хостинг с поддержкой доступа по доменному имени и IP адресу.

## 📋 Краткая сводка необходимых изменений

### ⚡ Быстрый старт

1. **`.env` (корневой):**
   - `DOMAIN=yourdomain.com`
   - `SSL_EMAIL=your-email@example.com`
   - `DEBUG=False`
   - `SECRET_KEY` и `CSRF_SECRET_KEY` - сгенерируйте криптографически стойкие ключи

2. **`RentalApp_FASTAPI/.env`:**
   - `CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://YOUR_IP_ADDRESS`
   - `DEBUG=False`
   - `CORS_ALLOW_WILDCARD=False`

3. **`rental-app-main/nginx/nginx.conf`:**
   - Замените `${DOMAIN}` на реальный домен в `server_name`
   - При необходимости добавьте IP адрес в `server_name`

4. **DNS:** Настройте A записи для домена

---

## 📋 Обзор изменений

Для успешного переноса необходимо изменить настройки в следующих файлах:
1. **`.env`** (корневой файл проекта) - переменные окружения
2. **`RentalApp_FASTAPI/.env`** - переменные окружения бэкенда (если используется отдельный файл)
3. **`rental-app-main/nginx/nginx.conf`** - конфигурация Nginx для продакшена
4. **`docker-compose.yml`** - настройки портов и сервисов

---

## 🔧 1. Переменные окружения (`.env` в корне проекта)

### 1.1. Доменные настройки и SSL

**Обязательно для продакшена:**

```bash
# Замените yourdomain.com на ваш реальный домен
DOMAIN=yourdomain.com

# Email для получения SSL сертификатов Let's Encrypt
SSL_EMAIL=your-email@example.com
```

**Важно:** 
- `DOMAIN` должен быть без `http://` или `https://`
- Домен должен быть настроен на DNS сервере и указывать на IP адрес вашего сервера
- `SSL_EMAIL` будет использоваться для уведомлений Let's Encrypt о истечении сертификатов

### 1.2. Режим отладки

```bash
# КРИТИЧНО: Отключить для продакшена
DEBUG=False
```

**Почему важно:**
- В продакшене не должны выводиться детальные ошибки
- Валидация CORS требует HTTPS для всех источников (кроме localhost) в production режиме

### 1.3. Секретные ключи

```bash
# ⚠️ КРИТИЧНО: Замените на криптографически стойкие ключи!
# Минимум 32 символа, минимум 16 уникальных символов
# Используйте скрипт: python RentalApp_FASTAPI/scripts/generate_secrets.py

SECRET_KEY=your-super-secret-key-here-minimum-32-chars
CSRF_SECRET_KEY=your-csrf-secret-key-here-minimum-32-chars
```

**Генерация ключей:**
```bash
cd RentalApp_FASTAPI
python scripts/generate_secrets.py
```

---

## 🔧 2. Переменные окружения бэкенда (`RentalApp_FASTAPI/.env`)

### 2.1. CORS настройки - КРИТИЧНО для работы по домену и IP

**Для продакшена добавьте все возможные источники:**

```bash
# Формат: https://domain.com,https://www.domain.com,https://IP_ADDRESS
# ⚠️ ВАЖНО: В production режиме (DEBUG=False) разрешены только HTTPS источники
# Для IP адреса также нужен HTTPS (может потребоваться самоподписанный сертификат)

CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://YOUR_IP_ADDRESS,http://localhost:5173
```

**Примеры:**

```bash
# Если у вас домен example.com и IP 192.168.1.100
CORS_ORIGINS=https://example.com,https://www.example.com,https://192.168.1.100

# Если нужен доступ и по HTTP для IP (не рекомендуется для продакшена)
# Примечание: В production режиме система может заблокировать HTTP для IP
CORS_ORIGINS=https://example.com,https://www.example.com,https://192.168.1.100,http://192.168.1.100
```

**Важно:**
- Все домены и IP должны быть указаны в формате URL (с `http://` или `https://`)
- В production режиме (DEBUG=False) система требует HTTPS для всех источников, кроме localhost
- Если вы хотите разрешить доступ по IP с HTTP, нужно оставить `DEBUG=True` (не рекомендуется для продакшена)

### 2.2. Остальные CORS настройки

```bash
# Разрешить отправку credentials (cookies, Authorization headers)
CORS_ALLOW_CREDENTIALS=True

# Разрешенные HTTP методы
CORS_ALLOW_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS

# Разрешенные заголовки
CORS_ALLOW_HEADERS=Content-Type,Authorization,X-CSRF-Token,Accept

# Заголовки ответа, доступные клиенту
CORS_EXPOSE_HEADERS=X-Total-Count,X-Request-ID

# Время кэширования preflight запросов (секунды)
CORS_MAX_AGE=3600

# КРИТИЧНО: Не использовать wildcard в продакшене!
CORS_ALLOW_WILDCARD=False
```

### 2.3. База данных

```bash
# Убедитесь, что настройки БД корректны для продакшена
POSTGRES_USER=your_production_user
POSTGRES_PASSWORD=your_strong_production_password
POSTGRES_DB=rental_db
DATABASE_URL=postgresql+asyncpg://your_production_user:your_strong_production_password@db:5432/rental_db
```

---

## 🔧 3. Конфигурация Nginx (`rental-app-main/nginx/nginx.conf`)

### 3.1. Поддержка домена и IP адреса

**Важно:** Nginx конфигурация использует переменную `${DOMAIN}`, но nginx сам не поддерживает переменные окружения напрямую. Переменная должна быть заменена вручную или через скрипт перед запуском.

**Вариант 1: Ручная замена переменных (рекомендуется)**

Отредактируйте `rental-app-main/nginx/nginx.conf` и замените `${DOMAIN}` на ваш реальный домен:

```nginx
# HTTP сервер
server {
    listen 80;
    # Замените ${DOMAIN} на ваш домен, добавьте IP если нужно
    server_name yourdomain.com www.yourdomain.com YOUR_IP_ADDRESS;
    
    # ... остальная конфигурация ...
}

# HTTPS сервер
server {
    listen 443 ssl http2;
    # Замените ${DOMAIN} на ваш домен, добавьте IP если нужно
    server_name yourdomain.com www.yourdomain.com YOUR_IP_ADDRESS;
    
    # Также замените в путях к сертификатам
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # ... остальная конфигурация ...
}
```

**Вариант 2: Использование envsubst в Dockerfile (продвинутый)**

Можно модифицировать Dockerfile для автоматической подстановки переменных, но это требует изменения инфраструктуры проекта.

**Важно о IP адресе:**
- Для работы HTTPS с IP адресом может потребоваться самоподписанный сертификат (Let's Encrypt не выдает сертификаты для IP)
- Доступ по IP с HTTPS может быть проблематичен, так как браузеры будут показывать предупреждение о недоверенном сертификате
- Рекомендуется использовать только доменное имя для HTTPS доступа

### 3.2. Альтернатива: Отдельная конфигурация для IP (HTTP только)

Если нужен доступ по IP только по HTTP (без HTTPS), добавьте отдельный server блок в `rental-app-main/nginx/nginx.conf`:

```nginx
# HTTP сервер для IP адреса (без редиректа на HTTPS)
server {
    listen 80;
    server_name YOUR_IP_ADDRESS;
    
    # Корневая папка
    root /usr/share/nginx/html;
    index index.html;
    
    # API проксирование
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cookie_path /api/ /api/;
        proxy_cookie_domain off;
        # ... остальные настройки proxy из основного конфига ...
    }
    
    # SPA роутинг
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Размещение:** Добавьте этот блок перед основными server блоками в файле `nginx.conf`.

---

## 🔧 4. Docker Compose (`docker-compose.yml`)

### 4.1. Порты

Текущая конфигурация использует:
```yaml
frontend:
  ports:
    - "80:80"
    - "443:443"
```

**Это правильно для продакшена** - порты 80 (HTTP) и 443 (HTTPS) открыты.

### 4.2. Запуск с SSL профилем

Для автоматического получения SSL сертификатов запустите с профилем `ssl`:

```bash
docker-compose --profile ssl up -d
```

Или добавьте в конфигурацию для постоянного использования SSL:

```yaml
certbot:
  # Убедитесь, что профиль ssl активен или удалите profiles для постоянного запуска
```

---

## 🔧 5. DNS настройки

Перед запуском убедитесь, что DNS записи настроены:

### 5.1. A запись для домена
```
yourdomain.com     A    YOUR_IP_ADDRESS
www.yourdomain.com A    YOUR_IP_ADDRESS
```

### 5.2. Проверка DNS
```bash
# Проверьте, что домен указывает на правильный IP
nslookup yourdomain.com
dig yourdomain.com
```

---

## 🚀 Пошаговая инструкция по миграции

### Шаг 1: Подготовка переменных окружения

1. Скопируйте `.env.example` в `.env`:
   ```bash
   cp env.example .env
   ```

2. Отредактируйте `.env` файл:
   ```bash
   nano .env
   ```

3. Установите следующие значения:
   ```bash
   DOMAIN=yourdomain.com
   SSL_EMAIL=your-email@example.com
   DEBUG=False
   SECRET_KEY=<генерируйте криптографически стойкий ключ>
   CSRF_SECRET_KEY=<генерируйте криптографически стойкий ключ>
   ```

### Шаг 2: Настройка CORS

1. Откройте `RentalApp_FASTAPI/.env` (или добавьте в корневой `.env`):
   ```bash
   nano RentalApp_FASTAPI/.env
   ```

2. Установите `CORS_ORIGINS`:
   ```bash
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://YOUR_IP_ADDRESS
   CORS_ALLOW_WILDCARD=False
   DEBUG=False
   ```

### Шаг 3: Настройка Nginx (опционально для IP)

Если нужен доступ по IP, отредактируйте `rental-app-main/nginx/nginx.conf` и добавьте IP в `server_name`.

### Шаг 4: Настройка DNS

Настройте A записи для вашего домена на DNS сервере вашего провайдера.

### Шаг 5: Запуск на продакшн сервере

1. Остановите контейнеры (если запущены):
   ```bash
   docker-compose down
   ```

2. Запустите с SSL профилем:
   ```bash
   docker-compose --profile ssl up -d
   ```

3. Проверьте логи:
   ```bash
   docker-compose logs -f
   ```

### Шаг 6: Проверка работы

1. Проверьте доступ по домену:
   ```bash
   curl -I https://yourdomain.com
   ```

2. Проверьте доступ по IP:
   ```bash
   curl -I http://YOUR_IP_ADDRESS
   ```

3. Проверьте API:
   ```bash
   curl https://yourdomain.com/api/health
   ```

---

## ⚠️ Важные замечания

### Безопасность

1. **Никогда не используйте `CORS_ALLOW_WILDCARD=True` в продакшене**
2. **Всегда используйте криптографически стойкие ключи для `SECRET_KEY` и `CSRF_SECRET_KEY`**
3. **Отключите `DEBUG=True` в продакшене**
4. **Используйте HTTPS для всех источников в CORS_ORIGINS (кроме специальных случаев)**

### Работа по IP адресу

1. **HTTPS с IP адресом:**
   - Let's Encrypt не выдает сертификаты для IP адресов
   - Для HTTPS с IP нужен самоподписанный сертификат
   - Браузеры будут показывать предупреждение о недоверенном сертификате
   - Рекомендуется использовать только доменное имя для HTTPS

2. **HTTP с IP адресом:**
   - Работает без проблем
   - Можно добавить в `CORS_ORIGINS` как `http://YOUR_IP_ADDRESS`
   - Но в production режиме (DEBUG=False) система требует HTTPS
   - Решение: использовать `http://YOUR_IP_ADDRESS` в CORS_ORIGINS только с DEBUG=True (не рекомендуется)

### Рекомендации

1. **Используйте доменное имя** как основной способ доступа
2. **IP адрес** используйте только для временного доступа или внутренней сети
3. **Настройте SSL** для доменного имени через Let's Encrypt
4. **Мониторьте логи** после переноса для выявления проблем

---

## 🔍 Проверка конфигурации

### Чек-лист перед запуском:

- [ ] `DOMAIN` установлен в `.env`
- [ ] `SSL_EMAIL` установлен в `.env`
- [ ] `DEBUG=False` в `.env`
- [ ] `SECRET_KEY` и `CSRF_SECRET_KEY` сгенерированы и установлены
- [ ] `CORS_ORIGINS` содержит домен и IP (если нужно)
- [ ] `CORS_ALLOW_WILDCARD=False`
- [ ] DNS записи настроены для домена
- [ ] Nginx конфигурация обновлена (если нужен доступ по IP)
- [ ] Порты 80 и 443 открыты в firewall
- [ ] База данных настроена с сильными паролями

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте логи: `docker-compose logs -f`
2. Проверьте CORS настройки: просмотрите логи бэкенда при старте
3. Проверьте DNS: `nslookup yourdomain.com`
4. Проверьте SSL сертификаты: `docker-compose exec frontend ls -la /etc/letsencrypt/live/`

---

**Последнее обновление:** 2025-01-XX  
**Версия документа:** 1.0

