// rental-app-main/e2e/smoke.spec.ts
// Playwright smoke-тесты (задача 5.5 аудита) поверх реального бэкенда
// (vite проксирует /api на VITE_API_PROXY_TARGET, по умолчанию :8001).
//
// Данные сидируются скриптом RentalApp_FASTAPI/scripts/seed_e2e_smoke.py:
//   пользователь smoke@rentalapp-test.com / SmokeUser2026!
//   оборудование «Smoke Тест Оборудование 1..3»
//
// Сценарии оформлены ОДНИМ flow-тестом со step'ами (это разрешено ТЗ), потому что:
//   - access-токен приложения живёт только в памяти вкладки: любая полная
//     перезагрузка (новый page/context) восстанавливает сессию через
//     POST /auth/refresh, а бэкенд rate-limiter'ит /auth/token и /auth/refresh
//     по 5/мин с одного IP. Один flow = один вход и ноль перезагрузок;
//   - после входа навигация ТОЛЬКО SPA-ссылками (шапка/меню), без page.goto.
//
// Отмена резерва на бэкенде УДАЛЯЕТ запись — после отмены карточка
// исчезает из «Мои заказы».
//
// Селекторы взяты по факту кода (data-testid в прод-код не добавлялся):
//   - AuthForm: #emailLogin / #passwordLogin (src/components/AuthForm.tsx)
//   - каталог: section#equipment-catalog, .equipment-tile (EquipmentCatalog/EquipmentCard)
//   - ReservePage: #start-date / #end-date (src/pages/ReservePage.tsx)
//   - ProfilePage: #currentPassword / #newPassword / #confirmPassword
//   - UserNav: кнопка аккаунта aria-label «Личный кабинет», меню → «Профиль»
//   - ошибки сервера рендерятся sonner-тостами [data-sonner-toast][data-type="error"]

import { test, expect } from '@playwright/test';

const SMOKE_USER = {
  // .local запрещён pydantic EmailStr (special-use domain) -> 422 на /auth/me
  email: 'smoke@rentalapp-test.com',
  password: 'SmokeUser2026!',
  fullName: 'Smoke Тестовый Пользователь',
};

/** Имя единицы оборудования из сида — по нему ищем карточку в каталоге */
const SMOKE_EQUIPMENT_NAME = 'Smoke Тест Оборудование 1';

/** YYYY-MM-DD со смещением в днях (input type=date) */
function isoDateWithOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

test.describe('Smoke e2e (каталог -> вход -> профиль -> резерв)', () => {
  test('полный пользовательский flow', async ({ page }) => {
    // ---------------------------------------------------------------
    // Сценарий 1: главная страница — каталог оборудования с сид-данными
    // ---------------------------------------------------------------
    await test.step('каталог: главная загружается, оборудование видно', async () => {
      await page.goto('/');

      const catalog = page.locator('#equipment-catalog');
      await expect(catalog).toBeVisible();
      // Заголовок секции (aria-labelledby="catalog-heading")
      await expect(page.locator('#catalog-heading')).toContainText('Каталог');

      // Карточки оборудования из сид-данных загружены (первая страница каталога)
      const cards = catalog.locator('.equipment-tile');
      await expect(cards.first()).toBeVisible({ timeout: 15_000 });
      expect(await cards.count()).toBeGreaterThan(0);

      // Сид-оборудование доступно для резерва
      const smokeCard = catalog
        .locator('.equipment-tile', { hasText: SMOKE_EQUIPMENT_NAME })
        .first();
      await expect(smokeCard).toBeVisible();
    });

    // ---------------------------------------------------------------
    // Сценарий 2: вход через диалог авторизации
    // ---------------------------------------------------------------
    await test.step('вход: AuthDialog из хедера, авторизация успешна', async () => {
      // Кнопка входа в хедере (shell.login). До открытия диалога она единственная.
      await page.getByRole('button', { name: 'Войти', exact: true }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('#emailLogin')).toBeVisible();
      await expect(dialog.locator('#passwordLogin')).toBeVisible();

      await dialog.locator('#emailLogin').fill(SMOKE_USER.email);
      await dialog.locator('#passwordLogin').fill(SMOKE_USER.password);
      // Кнопка сабмита тоже называется «Войти» (auth.submitLogin) — скоупим диалогом
      await dialog.getByRole('button', { name: 'Войти', exact: true }).click();

      // Пользователь авторизован: в шапке появился аккаунт (UserNav),
      // а кнопка «Войти» исчезла; инлайн-ошибки формы нет
      await expect(
        page.getByRole('button', { name: 'Личный кабинет' }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByRole('button', { name: 'Войти', exact: true }),
      ).toHaveCount(0);
      await expect(page.locator('#auth-form-error')).toHaveCount(0);
    });

    // ---------------------------------------------------------------
    // Сценарий 3: профиль — форма смены пароля, ошибка при неверном
    // текущем пароле (400 от бэкенда, а не 500)
    // ---------------------------------------------------------------
    await test.step('профиль: смена пароля с неверным текущим паролем', async () => {
      // SPA-навигация: меню аккаунта -> «Профиль» (без page.goto — см. шапку)
      await page.getByRole('button', { name: 'Личный кабинет' }).click();
      await page.getByRole('button', { name: 'Профиль' }).click();
      await expect(page).toHaveURL(/\/profile$/);

      // Страница профиля открыта
      await expect(
        page.getByRole('heading', { name: 'Редактировать профиль' }),
      ).toBeVisible();

      // Секция смены пароля с тремя полями
      await expect(
        page.getByRole('heading', { name: 'Смена пароля' }),
      ).toBeVisible();
      await expect(page.locator('#currentPassword')).toBeVisible();
      await expect(page.locator('#newPassword')).toBeVisible();
      await expect(page.locator('#confirmPassword')).toBeVisible();

      // Сабмит с НЕверным текущим паролем (валидным по форме — кнопка активна)
      await page.locator('#currentPassword').fill('WrongCurrentPass9');
      await page.locator('#newPassword').fill('NewSmokePass2027!');
      await page.locator('#confirmPassword').fill('NewSmokePass2027!');

      const submitButton = page.getByRole('button', { name: 'Изменить пароль' });
      await expect(submitButton).toBeEnabled();
      await submitButton.click();

      // Бэкенд отвечает 400 «Неверный текущий пароль» -> sonner-тост с ошибкой
      const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
      await expect(errorToast).toBeVisible({ timeout: 15_000 });
      await expect(errorToast).toContainText(/парол/i);

      // Тост об успехе не появился
      await expect(
        page.locator('[data-sonner-toast][data-type="success"]'),
      ).toHaveCount(0);
    });

    // ---------------------------------------------------------------
    // Сценарий 4: резерв оборудования и его отмена
    // ---------------------------------------------------------------
    await test.step('резерв: создание и отмена', async () => {
      // Возврат в каталог SPA-ссылкой из шапки
      await page.getByRole('link', { name: 'Каталог', exact: true }).click();

      // 1. Добавляем сид-оборудование в резерв
      const smokeCard = page
        .locator('#equipment-catalog .equipment-tile', {
          hasText: SMOKE_EQUIPMENT_NAME,
        })
        .first();
      await expect(smokeCard).toBeVisible({ timeout: 15_000 });
      await smokeCard
        .getByRole('button', { name: 'В резерв', exact: true })
        .click();

      // 2. Футер выбора -> оформление
      const selectionFooter = page.locator('aside[aria-label="Ваш выбор"]');
      await expect(selectionFooter).toBeVisible();
      await selectionFooter
        .getByRole('button', { name: 'Оформить резерв' })
        .click();
      await expect(page).toHaveURL(/\/reserve\/create$/);

      // 3. Даты: начало завтра, конец послезавтра (input type=date, YYYY-MM-DD)
      await page.locator('#start-date').fill(isoDateWithOffset(1));
      await page.locator('#end-date').fill(isoDateWithOffset(2));

      // 4. Подтверждение (кнопка ждёт завершения расчёта цены/доступности)
      await page.getByRole('button', { name: 'Подтвердить резерв' }).click();

      // 5. Редирект на «Мои заказы», созданный резерв виден
      await expect(page).toHaveURL(/\/reservations\/my$/, { timeout: 20_000 });
      const reservationTitle = page.getByText(/^Резерв #\d+$/).first();
      await expect(reservationTitle).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(SMOKE_EQUIPMENT_NAME).first()).toBeVisible();

      // 5a. Редактирование резерва (этап 5.7 аудита): сдвигаем дату окончания
      //     и сохраняем — карточка должна показать обновлённый диапазон
      await test.step('резерв: редактирование даты окончания', async () => {
        await page
          .getByRole('button', { name: 'Редактировать', exact: true })
          .first()
          .click();

        // Инпут даты окончания (label «Окончание:» в EditableDateRange)
        const endInput = page.locator('input[type="date"]').last();
        await expect(endInput).toBeVisible();
        const newEnd = isoDateWithOffset(4);
        await endInput.fill(newEnd);

        const saveButton = page.getByRole('button', { name: 'Сохранить', exact: true });
        await expect(saveButton).toBeEnabled({ timeout: 10_000 });
        await saveButton.click();

        // Карточка возвращается в режим просмотра с новой датой окончания
        // (formatDateEuropean: ДД.ММ.ГГГГ)
        const [yy, mm, dd] = newEnd.split('-');
        const europeanDate = `${dd}.${mm}.${yy}`;
        await expect(
          page.getByText(europeanDate).first(),
        ).toBeVisible({ timeout: 20_000 });
        // Режим редактирования закрыт
        await expect(
          page.getByRole('button', { name: 'Сохранить', exact: true }),
        ).toHaveCount(0);
      });

      // 6. Отмена резерва: кнопка «Отменить» в карточке -> диалог подтверждения
      await page.getByRole('button', { name: 'Отменить', exact: true }).click();

      const cancelDialog = page.getByRole('dialog');
      await expect(cancelDialog).toBeVisible();
      await expect(cancelDialog).toContainText('Отмена резерва');
      await cancelDialog
        .getByRole('button', { name: 'Отменить резерв' })
        .click();

      // 7. Резерв удалён (бэкенд удаляет запись при отмене): карточка исчезла,
      //    список пуст — «Нет резервов»
      await expect(page.getByText(SMOKE_EQUIPMENT_NAME)).toHaveCount(0, {
        timeout: 15_000,
      });
      await expect(page.getByText(/^Резерв #\d+$/)).toHaveCount(0);
      await expect(page.getByText('Нет резервов')).toBeVisible();
    });
  });
});
