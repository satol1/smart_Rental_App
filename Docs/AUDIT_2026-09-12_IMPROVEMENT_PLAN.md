# Полный аудит RentalApp №2 и план поэтапного внедрения улучшений

**Дата:** 12.09.2026 · **Ветка:** `feat/rental-design-system-v2` (HEAD `7cb02d5`) · **Охват:** бэкенд (API/сервисы/репозитории/миграции), фронтенд (436 TS/TSX), контракт фронт↔бэк, UI/UX (26 страниц), безопасность/инфраструктура.

Аудит второго цикла: проведён после внедрения всех этапов 0–5 плана [AUDIT_2026-09-11](AUDIT_2026-09-11_IMPROVEMENT_PLAN.md). Пять параллельных направлений; все находки уровня «критично»/«высокая» перепроверены вручную по коду. Пути фронтенда — от `rental-app-main/src`, бэкенда — от `RentalApp_FASTAPI`.

> **Статус внедрения (12.09.2026, ветка feat/rental-design-system-v2):**
> - **Этап 0 — выполнен** (`de70461`): очистка кэша при logout, nginx `^~ /api/`, сортировки списков, limit справочников, дашборд type, инвалидации availability, useMyRentals ошибки, хаускипинг. 0.3 (хардкод пароля админа) — отложено решением владельца.
> - **Этап 1 — выполнен** (`6a9579c`): applicable_to_* сквозно, счётчик usages (миграция 577db0f26ebd, max_uses_per_user > 1 работает), revert освобождает лишний usage, min_order_amount по final_total, баланс под FOR UPDATE, скоупы promoCodeStore, структурный флаг успеха промокода, подтверждение списаний.
> - **Этап 2 — выполнен** (`5a4f833`): продление при выходном через OrderValidator (анти-овербукинг закрыт), побочные эффекты после commit (middleware-механизм), фолбэк админ-списка, мины фасада удалены, GET без мутаций (set_committed_value), guard удаления пользователя, TZ добит (прод уже имел Europe/Astrakhan — находка аудита была частично ложной).
> - **Этап 3 — выполнен** (`9d7f8bd`): пагинация каталога в SQL (пачки+оборудование, без выборки 10k), count_for_admin без eager, selectinload календаря, батчи праздников/уведомлений.
> - **Этапы 4–6 — не начаты.**
>
> Тесты на момент завершения: бэкенд 1371 passed, фронтенд 347 passed, eslint/tsc чисто.

---

## 1. Резюме

Предыдущий цикл держится: подтверждены реализованными Decimal-деньги, один head миграций, ретраи Telegram, N+1-фиксы фильтр-репозиториев, CSRF на мутациях, привязка порта 8000 к 127.0.0.1, пин certbot в основном compose, автоматический backup-loop. Новые проблемы сконцентрированы в четырёх зонах:

1. **Кэш и состояние фронта** — react-query переживает logout (данные одного аккаунта показываются другому); 9 инвалидаций `["availability"]` — no-op (реальные ключи другие); глобальный `promoCodeStore` на 4 флоу перезаписывает промокоды между формами.
2. **Молчащие поломки функций** — сортировки «Мои резервы/Аренды» не работают (расхождение имён значений), ограничение промокода «только на X» не действует (бэк выбрасывает поля), прод-nginx отдаёт 404 на все загруженные фото оборудования, публичный фильтр каталога режется до 10 ассоциаций.
3. **Производительность главного эндпоинта** — каталог тянет до 10 000 записей с eager-связями и строит Pydantic для каждой, пагинация в Python.
4. **Хвосты прошлого плана живы** — промокоды (пагинация/применимость/max_uses_per_user), продление при создании выходного мимо анти-овербукинга (TODO в коде), codegen-типы не используются (0 импортов).

Обнаружено **3 критические находки** (все проверены вручную) и ~20 высоких.

---

## 2. Критические находки (проверены вручную)

| # | Проблема | Где | Последствие |
|---|----------|-----|-------------|
| К1 | `logout()` инвалидирует только `["current_user"]`; `queryClient.clear()/removeQueries` не вызывается нигде в приложении. Ключи `["reservations", params]`, `["myRentals"]`, `["balanceHistory","me"]` не содержат user-id | `src/store/authStore.ts:116-129`, `src/lib/queryClient.ts` | Вход пользователя Б после А в пределах staleTime (1–5 мин) показывает Б **резервы, аренды и баланс А без перезапроса** — утечка ПД между аккаунтами на одном устройстве |
| К2 | Прод-nginx: regex-location `~* \.(jpg\|png\|...)$` (статика SPA, `try_files $uri =404`) выигрывает у префиксного `location /api/` — запросы `/api/uploads/images/*.jpg` не доходят до бэкенда. В dev-конфиге regex-location нет, поэтому в разработке не видно | `nginx/nginx.conf:159` vs `:121` | **Все фото, загруженные менеджерами через админку, отдают 404 в проде** (бэкенд генерирует именно такие URL, `main_api.py:412-416`) |
| К3 | Хардкод email+пароля администратора в закоммиченном скрипте развёртывания: `ADMIN_EMAIL = "admin@rentalapp.com"`, `ADMIN_PASSWORD = "AdminRental2024!"` | `deploy/create_admin.py:14-15` | Любой с доступом к репо знает креды админа, созданного по `deploy/DEPLOYMENT_GUIDE.md` → полный доступ к балансам и ПД. Корневой `create_admin.py` уже делает правильно (argv→env→random) |

---

## 3. Находки по направлениям

### 3.1 Бэкенд: деньги и промокоды

| Sev | Проблема | Где |
|-----|----------|-----|
| высокая | `applicable_to_equipment/_types`: фронт отправляет и отображает (MultiSelect в диалоге), бэк **принимает при создании, но нигде не пишет** в association-таблицы; ORM-геттеры закомментированы → `PromoCodeOut` всегда `null`; в `PromoCodeUpdate` поля закомментированы → применимость нельзя изменить. При этом валидатор УЧИТЫВАЕТ эти таблицы (там всегда пусто) — «промокод только на вспышки» реально действует на всё | `src/components/admin/PromoCodeDialog.tsx:171,178` ↔ `shared/schemas/promo_code_schema.py:19-20,36-37`, `api/models/promo_code.py:83-90`, `api/services/promo_code/promo_code_manager.py` |
| высокая | Смена промокода A→B на аренде, созданной из резерва: старый usage не освобождается (принадлежит резерву), новый пишется всегда; revert/удаление аренды промокод аренды вообще не освобождает → `times_used` по B навсегда завышен | `api/services/order/rental_update_service.py:194-201`, `rental_cancellation_service.py:43-97` |
| средняя | `max_uses_per_user > 1` физически невозможен: PK `promo_code_usages (user_id, promo_code_id)` = ровно одна запись; повторное применение → IntegrityError→`PromoCodeUserUsageLimitError` независимо от лимита | `api/models/promo_code.py:11-17`, `promo_code_repository.py:148-156` |
| средняя | Порог `min_order_amount` в `/calculate` сравнивается с `full_total` (без скидки за длительность), при создании — с `final_total`: промокод может пройти в превью и отвалиться 409 при создании | `api/reservation_api.py:131` ↔ `api/services/order/reservation_service.py:95` |
| средняя | Пересчёт баланса при удалении записи истории — единственный незалоченный писатель баланса: читает сумму и пишет `user.balance` без `FOR UPDATE` (параллельный платёж теряется — lost update на деньгах) | `api/services/user_service.py:282-321` vs `balance_service.py:33-36` |
| низкая | `POST /promocodes/validate` без CSRF-зависимости (read-only, риск перебора чужим сайтом) | `api/promo_code_api.py:157-164` |

### 3.2 Бэкенд: заказы, данные, транзакции

| Sev | Проблема | Где |
|-----|----------|-----|
| высокая | Создание выходного авто-продлевает аренды/резервы прямым `UPDATE` **без анти-овербукинга** — единственный живой обход advisory-локов; TODO в коде признаёт (пережиток хвоста 2.7) | `api/services/holiday_service.py:203-266` → `rental_repository.py:209-245` (`update_rental_end_date`), `reservation_repository.py:123-160` |
| средняя | Побочные эффекты до commit: telegram-уведомление и инвалидация кэша срабатывают до коммита middleware — при падении коммита менеджер получает уведомление о несуществующем резерве | `api/services/order/reservation_service.py:299-304`, `main_api.py:324-327` |
| средняя | Молчаливое выпадение резервов из админ-списка: `continue` при ошибке обогащения/отсутствии user — страница короче `total`, записи исчезают без следа | `api/services/reservation_query_service.py:88-97` |
| средняя | Фасад аренд: обёртки `update_rental/cancel_rental/delete_rental` вызывают **несуществующие** методы сервисов → AttributeError; живы только потому, что прод их не зовёт (тесты с моками маскируют) | `api/services/order/rental_service.py:110-120` |
| средняя | Обёртки reservation-сервиса «для совместимости с тестами»: `update_reservation(reservation_id, update_data)` выполняет действие от имени `reservation.user` без какой-либо авторизации | `api/services/order/reservation_service.py:530-558` |
| средняя | GET-путь мутирует БД: «починка» дефолтных полей оборудования на персистентных ORM-объектах в каталоге — middleware коммитит после каждого запроса, включая GET; логика задублирована в двух сервисах | `api/services/equipment_filter_service.py:289-297`, `equipment_crud_service.py:138-146` |
| средняя | Жёсткое удаление пользователя: CASCADE стирает `balance_history`/`payments` (аудит-след денег), проверки активных аренд нет | `api/services/user_service.py:267-280` |
| низкая | Часовой пояс бэка не задан: все «сегодня» (`date.today()`) в UTC — для MSK с 00:00 до 03:00 статусные фильтры, периоды и «Сегодня в фокусе» используют вчерашнюю дату | `reservation_filter_repository.py:182,195`, `rental_query_repository.py:56`, `shared/services/period_service.py:44`; TZ не задан в Dockerfile/compose |
| низкая | `calendar_service` протекает `str(e)` в detail; стаб-уведомления о продлении ходят в БД впустую (N+1) | `api/services/calendar_service.py:54`, `notification_service.py:44-122` |

### 3.3 Бэкенд: производительность

| Sev | Проблема | Где |
|-----|----------|-----|
| высокая | **Каталог — главный публичный эндпоинт**: `get_paginated_equipment(0, 10000, ...)` тянет всё с selectinload, `EquipmentOut.model_validate` для каждой записи, пагинация `combined_items[skip:skip+limit]` в Python | `api/services/equipment_service_api.py:59-87` |
| средняя | `GET /admin/reservations` делает весь список дважды: count через `get_paginated_for_admin(skip=0, limit=1)` с полным eager, затем страница снова | `api/admin_reservation_api.py:71-84`, `reservation_query_service.py:61-72` |
| низкая | joinedload коллекций в календарном запросе (декартово произведение); N+1 в генерации праздников и уведомлений; пагинация праздников без ORDER BY; пагинации без tie-breaker `id` | `reservation_query_repository.py:145-150`, `holiday_service.py:113-126`, `holiday_repository.py:33-34` |

### 3.4 Контракт фронт↔бэк (молча не работает)

| Sev | Проблема | Где |
|-----|----------|-----|
| высокая | Сортировки «Мои резервы/Аренды»: фронт шлёт `start_asc/start_desc/end_asc/end_desc/count_*/id_asc`, бэк понимает только `start_date_*/end_date_*/created_at_*` (прочее → default «сначала новые»). Все опции, кроме случайного `id_desc`, — молча не работают; docstring обещает нереализованные `count_*` | `src/store/orderFilterStore.ts:3-12` ↔ `api/repositories/reservation_filter_repository.py:227-245`, `rental_query_repository.py:206-225` |
| высокая | Публичный фильтр каталога и админ-справочник ассоциаций: фронт без `limit`, бэк default 10 → 11-я и далее ассоциации невидимы | `src/hooks/useAssociations.ts:15`, `useAdminAssociations.ts:20` ↔ `api/association_api.py:25` |
| средняя | Правила выходных в админке: без limit, бэк default 10 → при >10 правилах старые нельзя увидеть/удалить, хотя они продолжают генерировать выходные | `src/hooks/useAdminHolidayRules.ts:41` ↔ `api/holiday_api.py:86` |
| средняя | Дашборд: фронт читает `activity.type`, бэк отдаёт `activity_type`, и набор значений уже (`rental_started/user_registered`) → вся лента — дефолтные иконки и подпись «Событие» | `src/hooks/admin/useDashboardData.ts:67-74` ↔ `shared/schemas/dashboard_schema.py:29-36` |
| средняя | «Мои резервы» без пагинации: бэк режет до 100 (hard cap) — у активного клиента старые записи молча пропадают; client-side фильтр «скрыть завершённые» работает по обрезанному списку | `src/core/services/ReservationService.ts:111-122` ↔ `api/reservation_api.py:73` |
| средняя | Диалог «создать резерв» видит только первые 15 пользователей (flatten infinite query, `fetchNextPage` не вызывается) — клиент вне первых 15 недоступен менеджеру | `src/hooks/admin/create-reservation/useCreateReservationData.ts:29-34` |
| средняя | Промокоды в админке: limit=100 (max) без пагинации → 101-й код невидим, но действует | `src/hooks/useAdminPromoCodes.ts:28-30` ↔ `api/promo_code_api.py:59` |
| низкая | Песочница-калькулятор: GET /discounts/ без limit → максимум 10 тиров (заниженная скидка при >10 уровнях, расхождение «калькулятор ≠ чек») | `src/store/sandboxCalculatorStore.ts:62` ↔ `api/discount_api.py:24` |
| низкая | `RegisterResponse` описывает поля, которых бэк не возвращает (`id, is_active, created_at`); мёртвый `PromoCodeService.getAllPromoCodes` типизирован как массив, а эндпоинт отдаёт `{items,total}` + режет до 10 | `src/core/services/AuthService.ts:13-20`, `PromoCodeService.ts:22-25` |
| низкая | `formatDate` парсит date-only как UTC — сдвиг дня для отрицательных таймзон (для MSK безопасно, латентно) | `src/lib/utils.ts:55-63` |
| низкая | Codegen-типы этапа 4 (`src/types/api/schema.d.ts`, 6256 строк) — **0 импортов**: ручные типы продолжают дрейфовать, CI ловит только дрейф openapi↔schema.d.ts | `src/types/api/schema.d.ts` |

### 3.5 Фронтенд: кэш, сторы, код

| Sev | Проблема | Где |
|-----|----------|-----|
| высокая | 9 инвалидаций `["availability"]` в 5 файлах — no-op: реальные ключи `["availability-check"]`, `["daily-availability"]`, `["equipment-availability"]`. После любых мутаций резервов занятость в каталоге/календаре протухает на staleTime (до 5 мин) | `useReservations.ts:17`, `useEditReservation.ts:124`, `useAdminRentals.ts:101,160`, `useAdminEquipment.ts:39,61,89`, `useUpdateEquipmentDetails.ts:52` |
| высокая | `promoCodeStore` — глобальный синглтон на 4 независимых флоу (резерв, редактирование резерва, админ-создание, аренда с нуля): параллельно смонтированные формы (edit-карточка + диалог) перезаписывают ввод и `appliedPromoCode` друг друга — чужой промокод в payload и цене | `src/store/promoCodeStore.ts` + `useReservationData.ts:26-41`, `useAdminReservationCalculator.ts:23-30`, `useCreateRentalFromScratchDialog.ts:60-67` |
| средняя | Админ-мутации справочников не инвалидируют публичный каталог: паки/аксессуары/бренды (staleTime 1 час)/ассоциации/метаданные фильтров — каталог и фильтры пользователя не обновляются до часа | `useAdminPacks.ts:31,50,69`, `useAdminAccessories.ts:53,69,98`, `useAdminBrandSystems.ts:10`, `useAdminAssociations.ts:10` |
| средняя | Праздники: мутации инвалидируют react-query, а пользовательские виджеты читают zustand-стор с кэшем по диапазону (`lastFetchedRange`) — правки выходных не доходят до календарей до смены диапазона | `src/store/holidayStore.ts:19-46`, `useAdminHolidays.ts:58,79` |
| средняя | Финансовые мутации пропускают `["balanceHistory"]` (конвертация в аренду, возврат); `useMyRentals` глотает ошибки API (`catch → return []`, isError никогда не true) | `useAdminRentals.ts:65-66`, `useRentalReturnForm.ts:105-106`, `useMyRentals.ts:33-36` |
| средняя | `orderFilterStore` один на 4 контекста: `searchQuery`/`sortOption` протекают между «Мои резервы» и админ-страницами (поиск «Иван» молча применяется к админ-арендам); сортировка в админ-страницах рендерится, но не читается страницами и не поддержана бэком | `src/store/orderFilterStore.ts:19`, `OrderToolbar.tsx:28-31`, `AllReservationsManagementPage.tsx:60-66` |
| средняя | 17 хуков обходят сервисный слой raw `api.*` (дубль `getDailyStatuses` закодирован дважды); контексты `ReservationEditProvider/CreateReservationProvider` пересоздают value каждый рендер + содержат фейковые поля контракта; `useReservationState` не ресинхронизируется с новыми `initialValues` после мутации | `useAdminEquipment.ts:33+`, `ReservationEditProvider.tsx:167-206`, `useReservationState.ts:39-46` |
| средняя | Формы: даты по умолчанию вычислены на загрузке модуля (`today/tomorrow`) — после полуночи долгоживущая вкладка предлагает вчерашний день; поиск в списках без debounce (каждый keystroke → запрос + сброс пагинации); админ-поиск пользователей/аксессуаров client-side по загруженным страницам | `useCreateReservationForm.ts:24-26`, `useReservationListViewModel.ts:45-49`, `useAdminUsers.ts:51-65`, `AccessoryTable.tsx:34-41` |
| средняя | Мёртвый код: компоненты `ReservationList`, `CardShell`, `AdminButton`, `DatePickerWithHolidayValidation`, `PrintableRentalReceipt`, `AssociationFilter`; хуки `useReservationActions`, `useEquipmentMap`, `useErrorHandler`; весь DI-слой `src/core/di/*`; `PromoCodeService` | grep-проверено, 0 импортов |
| низкая | Хрупкий `isUnauthorizedError` (`message.includes("401")`); двойной канал ошибок (toast из queryFn + inline state); `limit` не входит в queryKey; таймер без cleanup; `themeStore` persist без version | `src/lib/queryClient.ts:28`, `queryHelpers.ts:4-12`, `useAdminReservations.ts:25` |
| средняя | Тесты фронта: финансовые расчёты без покрытия — `usePriceCalculator` (включая рескейл скидки при потолке 75%), `usePackPriceCalculator`, `combinedDiscountPercentage`, `sandboxCalculatorStore`, reserve-флоу; e2e — один smoke | `src/**/__tests__`, `e2e/smoke.spec.ts` |

### 3.6 UI/UX

| Sev | Проблема | Где |
|-----|----------|-----|
| высокая | Тёмная тема сломана на ключевых экранах: компактный режим каталога (вся палитра мимо токенов, CSS-шим спасает только фон), пустые состояния «Мои заказы» (`text-gray-900` на тёмном), профиль (3 карточки на легаси-палитре), модалка деталей оборудования (12× `text-gray-*`), 404/403, админ-инфоблоки; ~88 `text-gray-*` по проекту | `CompactEquipmentCard.tsx:28-216`, `EmptyStateWithActions.tsx:34-41`, `ProfilePage.tsx:172,265,326`, `EquipmentDetailsView.tsx:61-179`, `NotFoundPage.tsx`, `ForbiddenPage.tsx` |
| высокая | Диалог оборудования `modal={false}`: нет Esc/клика-вне/focus-trap, фон интерактивен — легко потерять заполненную форму (единственный из 29 диалогов) | `src/components/equipment/EquipmentDialog.tsx:24` |
| высокая | Ни одна админ-таблица не умеет сортировку (заголовки не кликабельны, `aria-sort` отсутствует во всём проекте); таблица оборудования вдобавок без пагинации (рендерит все строки сразу) | `EquipmentTable.tsx:55-65`, `UserTable.tsx:85-93`, `PromoCodeTable.tsx:68-76` и др., `EquipmentManagementPage.tsx:129-133` |
| средняя | Cookie-баннер (`z-50`) перекрывает кнопку «Оформить» (`z-40`) на мобиле — барьер первому заказу нового посетителя | `CookieConsent.tsx:27` + `ReservationFooter.tsx:60` |
| средняя | Денежные операции без финального подтверждения: списание/начисление баланса применяется сразу, диалог остаётся открытым — повторное случайное списание в один клик | `UserPaymentDialog.tsx:85-104` |
| средняя | Успех промокода определяется подстрокой «успешно» в тексте ответа — любая переформулировка бэка молча ломает применение скидки (красный X на применённом коде) | `PromoCodeInput.tsx:52-53` |
| средняя | 12 `window.confirm` вместо единого `ConfirmationDialog` (не стилизуются, ломают тёмную тему/модальность); мелкие таблицы админки без скелетонов/retry; ошибки валидации в липкой панели дат (`sr-only`, предупреждение о выходном не рендерится) | `useEquipmentTableLogic.ts:72,83` и ещё 10 мест, `AccessoryTable.tsx:49-50` и др., `CalendarDateInputRange.tsx:63-81` |
| средняя | Иконки типов каталога — от другого бизнеса (фотокамеры/объективы/микрофоны): ни один лыжный тип не совпадает → фильтры типов вообще без иконок | `TypeFilter.tsx:21-34` |
| низкая | Неавторизованный на «Мои заказы»/профиле — нет кнопки «Войти»; тумблер вида каталога 36px (<44px); поисковые инпуты без aria-label; смешение t()/хардкода; 46 ручных `toLocaleString` при существующем `MoneyText`; loading «Аренды» спиннером вместо SkeletonList | `MyReservationsPage.tsx:98-105`, `ViewModeToggle.tsx:23-27`, `MyRentalsList.tsx:24-31` |

### 3.7 Безопасность и инфраструктура

| Sev | Проблема | Где |
|-----|----------|-----|
| высокая | Бэкапы только на том же хосте, без шифрования (дампы с хэшами паролей и ПД в `db_backup/*.sql`), процедуры тест-рестора нет (последний ручной restore-test — октябрь 2025) | `docker-compose.yml:167-190`, `scripts/backup_loop.sh` |
| средняя | Нет ротации refresh-токена: `/auth/refresh` проверяет и выдаёт только access; refresh-cookie (14 дней) не перевыпускается, jti тот же до логаута — кражу cookie невозможно обнаружить/отозвать; access живёт 60 минут и не проверяется по denylist | `api/auth_api.py:153-177`, `auth_service.py:23`, `token_denylist_service.py` |
| средняя | Всё в одной docker-сети без сегментации: RCE в frontend-контейнере даёт прямой доступ к `db:5432` и `redis:6379` (без пароля — можно стирать denylist/rate-limit ключи) | `docker-compose.yml` (нет секции networks) |
| средняя | GitHub Actions не запинены по SHA (все `actions/*@vN` по мутируемому тегу); certbot не запинен в limited-compose (рассинхрон с основным, где `v2.11.0`) | `.github/workflows/ci.yml:51,54,100,119,125,218,265,284`, `docker-compose.limited-resources.yml:197` |
| низкая | CSRF-cookie без `Secure` (refresh-cookie уже делает `secure=not DEBUG` — паттерн есть); лог-файл без ротации (FileHandler, writable-слой контейнера); ValidationError-хендлер логирует `input` (значения полей) в ERROR; `X-Request-ID` = per-process счётчик (утечка метрик трафика) | `api/auth_api.py:71-87`, `config/logging_config.py:28-30`, `api/main_api.py:90-96,288,331` |
| низкая | `/api/uploads/images/{filename}` отдаётся анонимно навсегда (имена uuid4 — перебор невозможен; зафиксировать осознанно) | `api/main_api.py:412-416` |

Проверено и чисто: секреты в git-истории отсутствуют (39 коммитов просканированы), `.env` не отслеживаются, requirements запинены `==`, порт 8000 → 127.0.0.1, OAuth VK/Яндекс в коде нет (только гайд).

---

## 4. План поэтапного внедрения

Упорядочение: «сначала то, что течёт данными и деньгами сейчас, потом молчащие поломки функций, потом производительность, потом UX, потом архитектура и инфраструктура». Каждый этап — отдельный PR/группа PR.

### Этап 0 — Хотфиксы (1–2 дня, ветка от main)

| Задача | Что делать | Проверка приёмки |
|--------|-----------|------------------|
| 0.1 **Очистка кэша при logout** (К1) | В `authStore.logout()` — `queryClient.clear()` (или `removeQueries` по пользовательским ключам) | Вход А → резервы → logout → вход Б: не видно данных А ни на одном экране без перезапроса |
| 0.2 **Прод-фото 404** (К2) | `nginx.conf`: `location ^~ /api/` (или отдельный `^~ /api/uploads/images/` → proxy на backend). Проверить, что regex-статика больше не перехватывает | `/api/uploads/images/<uuid>.jpg` в прод-конфиге (`nginx -t` + docker) отдаёт 200 |
| 0.3 **Хардкод пароля админа** (К3) | `deploy/create_admin.py`: паттерн корневого скрипта (argv → env → random с печатью). Если скрипт применялся на проде — сменить пароль админа | В репо нет кредов; документация деплоя ссылается на env |
| 0.4 **Сортировки списков заказов** | Бэк: `_apply_sorting` принять `start_asc/start_desc/end_asc/end_desc/id_asc/id_desc` (+`count_*` либо убрать из UI и docstring). Фронт: маппинг или прямые имена | Все опции сортировки в «Мои резервы»/«Мои аренды» реально меняют порядок |
| 0.5 **limit у справочников** | `useAssociations`, `useAdminAssociations`, `useAdminHolidayRules`, `sandboxCalculatorStore` — `limit: 100` | 11+ ассоциаций/правил видны; песочница считает по всем тирам |
| 0.6 **Дашборд-лента** | Бэк: alias `type` для `activity_type` + синхронизировать значения с фронтом (или читать `activity_type` на фронте) | Лента показывает иконку/подпись события по типу |
| 0.7 **Инвалидации availability** | Заменить 9 no-op `["availability"]` на фактические ключи `["availability-check"]`/`["daily-availability"]`/`["equipment-availability"]` | После создания/правки резерва полоски занятости каталога обновляются |
| 0.8 **useMyRentals ошибки** | Убрать `catch → []`: отдавать ошибку в ErrorState | Падение API → страница «Мои аренды» показывает ошибку с retry, не пустой список |
| 0.9 **Хаускипинг** | Закоммитить/убрать незакоммиченные файлы Bukza-синка (`scripts/bukza_scrape_20260912.json`, `seed_bukza_updates_20260912.py`, `82116.jpeg`); проверить, не артефакт ли `receipt-print.pdf` в корне фронта | `git status` чистый |

### Этап 1 — Деньги и промокоды (3–5 дней)

| Задача | Что делать |
|--------|-----------|
| 1.1 **Применимость промокодов — сквозное решение** | Реализовать `applicable_to_*` полностью: create/update → association-таблицы, раскомментировать ORM-геттеры (selectin), вернуть поля в `PromoCodeUpdate`. Валидатор уже читает таблицы — начнёт работать. Альтернатива (если фича не нужна) — убрать из диалога и схем |
| 1.2 **Промокод-состояние — из глобального стора в формы** | `promoCodeStore` → локальный state/RHF-поле в каждом из 4 флоу; селекторы в карточках каталога (`usePromoCodeStore(s => s.promoCodePercentage)`) |
| 1.3 **Освобождение usage при смене/отмене промокода** | `rental_cancellation_service`: при revert/удалении сравнивать промокод аренды с промокодом резерва, освобождать только «лишний»; `times_used` перестаёт накапливаться |
| 1.4 **max_uses_per_user** | Либо убрать поле из UI/схемы (сейчас всегда фактически 1), либо миграция usages: PK + счётчик |
| 1.5 **Структурный флаг успеха промокода** | `PromoCodeInput`: булев флаг из ответа/store вместо `includes("успешно")` |
| 1.6 **Единая точка min_order_amount** | `/calculate` передавать `final_total` (со скидкой за длительность) в валидатор промокода — как при создании |
| 1.7 **Баланс под локом при удалении истории** | `delete_balance_history_entry`: `get_by_id_for_update` + пересчёт в одной транзакции |
| 1.8 **Подтверждение денежных операций** | `UserPaymentDialog`: ConfirmationDialog с суммой и итоговым балансом для списаний; после успеха — закрывать/показывать итог |

### Этап 2 — Целостность заказов и данных (1 неделя)

| Задача | Что делать |
|--------|-----------|
| 2.1 **Закрыть обход анти-овербукинга** (TODO в коде) | `_auto_extend_orders_on_holiday_creation`: новый интервал `[start, next_working_day]` через `OrderValidator.validate_equipment_availability` (advisory-лок, exclude своего id); конфликт → не продлевать, вернуть список в ответе |
| 2.2 **Побочные эффекты после commit** | Telegram/инвалидация кэша из `reservation_service` переносить в after-commit хук (FastAPI BackgroundTask по завершению транзакции) |
| 2.3 **Не терять записи админ-списков** | `reservation_query_service:88-97`: fallback на сырую схему (как `get_my_reservations:53-57`) вместо `continue` |
| 2.4 **Убрать мины фасада** | `rental_service.py:110-120` — делегировать в реальные методы или удалить; `reservation_service.py:530-558` (обёртки без авторизации) — удалить/перенести в тестовые хелперы |
| 2.5 **GET без мутаций** | Дефолты полей оборудования — на уровне схемы ответа, не ORM; дедуплицировать filter/crud-версии |
| 2.6 **Удаление пользователя** | Запрет при активных арендах/резервах (409); финансовую историю не стирать (анонимизация вместо CASCADE) |
| 2.7 **TZ бэкенда** | `TZ=Europe/Moscow` в compose/Dockerfile бэка (или централизованная business_today); прогнать тесты на граничных датах |

### Этап 3 — Производительность каталога и списков (3–5 дней)

| Задача | Что делать |
|--------|-----------|
| 3.1 **Пагинация каталога в SQL** | `equipment_service_api.get_paginated_equipment`: пагинация на уровне запроса; total через существующий `count_filtered_equipment_excluding_ids`; пачки отдельной страницей. Замер до/после на 300+ позициях |
| 3.2 **count без eager для админ-резервов** | Репозиторийный `count_for_admin(...)` вместо `get_paginated_for_admin(limit=1)` с joinedload |
| 3.3 **Хвосты запросов** | Календарный запрос → selectinload; N+1 праздников/уведомлений → батч; `ORDER BY` + tie-breaker `id` везде, где пагинация |

### Этап 4 — UI/UX (1–1,5 недели)

| Задача | Что делать |
|--------|-----------|
| 4.1 **Тёмная тема — остатки** | Один PR по токенам: CompactEquipmentCard/CompactPackCard, EmptyStateWithActions, ProfilePage, EquipmentDetailsView (+EquipmentCopyDialog), NotFound/Forbidden, админ-инфоблоки, CalendarEventDetailsModal, точечные ~88 `text-gray-*` |
| 4.2 **EquipmentDialog** | Убрать `modal={false}` + guard несохранённых изменений |
| 4.3 **Сортировка админ-таблиц** | Общий sortable `TableHead` (клиентская для User/Promo/справочников, серверная для резервов/аренд поверх фикса 0.4); `aria-sort` |
| 4.4 **Поиск** | debounce 300–400мс в OrderToolbar/хУках; серверный поиск пользователей (параметр search уже есть) и аксессуаров; пикер пользователя в диалоге резерва — fetchNextPage/поиск |
| 4.5 **Подтверждения** | Миграция 12 `window.confirm` → ConfirmationDialog |
| 4.6 **Cookie-баннер vs «Оформить»** | Поднимать ReservationFooter выше баннера при выбранных позициях или смещать баннер |
| 4.7 **Иконки типов каталога** | Заменить карту «фотокамера/объектив/…» на зимний инвентарь + fallback `Package` |
| 4.8 **Мелочи UX** | Кнопка «Войти» на guarded-страницах (deep-link уже есть); тумблер вида 44px; aria-label поисковым инпутам; SkeletonList для «Аренды»; `MoneyText` вместо 46 ручных форматирований; ошибки в липкой панели дат (видимый индикатор) |

### Этап 5 — Контракт и архитектура фронта (1–1,5 недели)

| Задача | Что делать |
|--------|-----------|
| 5.1 **Codegen-типы в дело** | Инкрементально переводить сервисы/хуки на `components["schemas"]` из `schema.d.ts` (начать: Reservation/Rental/Dashboard/Auth — там уже найдены расхождения). CI-правило: новые сервисы только на generated-типах |
| 5.2 **Инвалидация публичного каталога** | Админ-мутации паков/аксессуаров/брендов/ассоциаций инвалидируют `["equipment", ...]`, `["brandSystems"]`, `["equipment-filter-metadata"]` |
| 5.3 **Праздники — один слой** | Убрать zustand-дубль `holidayStore` → react-query (или наоборот), инвалидировать `["calendar-grid"]` при правках выходных |
| 5.4 **Пагинация списков** | «Мои резервы» → infinite query (по образцу useMyRentals); промокоды админки → пагинация (total уже приходит) |
| 5.5 **Чистка мёртвого кода** | Компоненты/хуки из п.3.5, DI-слой, PromoCodeService, дубль `getDailyStatuses`; выровнять RegisterResponse |
| 5.6 **Состояние форм** | `orderFilterStore` — изоляция по контексту (search/sort не протекают); контексты `useMemo/useCallback`; `useReservationState` — ресинк с initialValues; `today/tomorrow` при монтировании |
| 5.7 **Тесты финансов фронта** | `usePriceCalculator` (рескейл при потолке 75%), `usePackPriceCalculator`, `combinedDiscountPercentage`, `sandboxCalculatorStore`; e2e: редактирование/отмена резерва |

### Этап 6 — Безопасность и инфраструктура (3–5 дней)

| Задача | Что делать |
|--------|-----------|
| 6.1 **Ротация refresh-токенов** | `/auth/refresh`: новый refresh (новый jti + Set-Cookie), старый в denylist; повторное использование отозванного jti → отзыв всех сессий пользователя; access TTL 10–15 мин |
| 6.2 **Бэкапы 3-2-1** | Выгрузка копии наружу (rclone/S3 + шифрование age/gpg), регулярный тест-рестор в CI или по расписанию |
| 6.3 **Сегментация сетей** | `edge` (frontend↔backend) и `internal` (backend, db, redis, db-backup); frontend больше не видит db/redis |
| 6.4 **Пины версий** | actions по commit SHA; certbot `v2.11.0` в limited-compose тоже |
| 6.5 **Мелочи защиты** | CSRF-cookie `secure=not DEBUG`; RotatingFileHandler/stdout; ValidationError-лог без `input`; `X-Request-ID` = uuid; политика `/uploads` задокументировать |
| 6.6 **Фронтенд-гигиена ошибок** | Один канал ошибок (toast ИЛИ inline); `isUnauthorizedError` по статусу, не подстроке |

---

## 5. Что подтверждено как исправленное ранее (не дублировать в новых задачах)

Decimal-деньги (Numeric(12,2) + миграция), один head миграций, ретраи Telegram (429/5xx/backoff), count без joinedload-коллекций, CSRF-dependency на ~22 мутациях, порт 8000 → 127.0.0.1, backup-loop с проверкой gzip/ротацией, certbot `v2.11.0` в основном compose, пин requirements `==`, безопасность git-истории, периодные фильтры (алиасы), `has_active_reservations`, AdminLayout без тряски, дедуп юрдокументов, reduced-motion повсеместно, печать чека.

**Осознанно отложено ранее и не ухудшено:** ruff-format (361 файл), advisory mypy, ARQ/outbox для Telegram (ретраи теперь есть), rate-limiter memory://.

---

*Аудит: 5 параллельных направлений (бэкенд, фронтенд-код, контракт, UI/UX, безопасность/инфраструктура). Критические и высокие находки перепроверены вручную. Документ обновлять по мере внедрения этапов.*
