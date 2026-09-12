// Скриншоты ключевых публичных страниц в обеих темах для визуальной приёмки.
// Запуск: node scripts/visual-check-design-tokens.mjs  (dev-сервер на 5175)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5175";
const OUT = "../Reports/design-system-centralization";
mkdirSync(OUT, { recursive: true });

const PAGES = [
  { path: "/", name: "home", full: true },
  { path: "/rules", name: "rules", full: true },
  { path: "/how-it-works", name: "how-it-works", full: true },
  { path: "/calendar", name: "calendar", full: true },
];

const browser = await chromium.launch();
for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ru-RU",
  });
  // zustand persist: JSON-обёртка { state, version }, partialize хранит только theme
  await context.addInitScript((value) => {
    localStorage.setItem("theme", JSON.stringify({ state: { theme: value }, version: 0 }));
  }, theme);
  const page = await context.newPage();
  for (const target of PAGES) {
    await page.goto(BASE + target.path, { waitUntil: "networkidle" });
    // Принять cookie-баннер, чтобы не перекрывал контент
    const consent = page.getByRole("button", { name: /принять|соглас|accept/i }).first();
    if (await consent.count()) await consent.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(700);
    await page.screenshot({
      path: `${OUT}/${target.name}-${theme}.png`,
      fullPage: target.full,
    });
    console.log(`✓ ${target.name}-${theme}.png`);
  }
  // Карточка оборудования: клик по первому тайлу каталога
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const tile = page.locator("a[href*='/equipment/'], [class*='equipment-tile']").first();
  if (await tile.count()) {
    await tile.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/equipment-${theme}.png`, fullPage: false });
    console.log(`✓ equipment-${theme}.png`);
  }
  await context.close();
}
await browser.close();
console.log("Готово:", OUT);
