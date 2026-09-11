// rental-app-main/playwright.config.ts
// Smoke e2e-тесты (задача 5.5 аудита).
//
// Требования к окружению:
//   - по адресу VITE_API_PROXY_TARGET (по умолчанию http://localhost:8001)
//     должен быть поднят бэкенд RentalApp_FASTAPI с сид-данными
//     scripts/seed_e2e_smoke.py (пользователь smoke@rentalapp.local);
//   - фронт поднимается сам (webServer) на порту 5174, dev-сервер vite
//     проксирует /api на цель из env.

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  /* Общий таймаут одного теста */
  timeout: 30_000,
  expect: {
    /* Таймаут одного expect-утверждения */
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  /* Последовательно: у бэкенда rate-limiter 5/мин на /auth/token и /auth/refresh,
     параллельные входы нескольких воркеров упираются в 429 */
  workers: 1,
  retries: 0,
  reporter: [['list']],

  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    locale: 'ru-RU',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Переопределяется через E2E_API_PROXY_TARGET, если стандартный порт
      // бэкенда (8001) локально занят другим приложением.
      VITE_API_PROXY_TARGET:
        process.env.E2E_API_PROXY_TARGET ?? 'http://localhost:8001',
    },
  },
});
