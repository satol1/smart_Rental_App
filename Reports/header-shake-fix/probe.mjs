// Scroll-проба шапки: доказываем отсутствие осцилляции и синхронность StickyDateBar
import pw from 'file:///F:/S_Project_Docker/rental-app-main/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
const { chromium } = pw;

const SHOT_DIR = 'F:/S_Project_Docker/Reports/header-shake-fix';
mkdirSync(SHOT_DIR, { recursive: true });

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`);
};

const headerHeight = (page) =>
  page.evaluate(() => document.getElementById('app-header').getBoundingClientRect().height);

// Сэмплируем высоту в rAF ~duration мс, возвращаем массив значений
const sampleHeights = async (page, duration = 1200) =>
  page.evaluate(
    (dur) =>
      new Promise((resolve) => {
        const out = [];
        const t0 = performance.now();
        const tick = () => {
          out.push(document.getElementById('app-header').getBoundingClientRect().height);
          if (performance.now() - t0 < dur) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      }),
    duration,
  );

// Сколько раз высота сменила направление движения (реверсы > 1px = дрожь)
const reversals = (samples) => {
  let dir = 0;
  let flips = 0;
  for (let i = 1; i < samples.length; i++) {
    const d = samples[i] - samples[i - 1];
    if (Math.abs(d) < 0.5) continue;
    const nd = Math.sign(d);
    if (dir !== 0 && nd !== dir) flips++;
    dir = nd;
  }
  return flips;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://[::1]:5191/', { waitUntil: 'networkidle' });
await page.waitForSelector('#app-header');
await page.waitForSelector('#main-date-range-selector');
await page.waitForTimeout(800);

// --- 1. Верхняя зона (старый баг: порог 12px) — высота не должна меняться вообще
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
for (const y of [10, 30, 5, 25, 12, 40, 8, 35]) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(60);
}
let samples = await sampleHeights(page, 900);
let h = await headerHeight(page);
check(
  '1. Дрожь у верха исчезла (0..40px)',
  Math.abs(h - 81) <= 1.5 && reversals(samples) === 0,
  `height=${h.toFixed(1)} (ожидалось ~81 = 80+border), реверсов=${reversals(samples)}`,
);

// --- 2. Мёртвая зона: осцилляция 20..60 не переключает состояние
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
for (let i = 0; i < 6; i++) {
  await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), i % 2 ? 60 : 20);
  await page.waitForTimeout(80);
}
await page.waitForTimeout(400);
h = await headerHeight(page);
check('2. Мёртвая зона 16..64 держит шапку раскрытой', Math.abs(h - 81) <= 1.5, `height=${h.toFixed(1)}`);

// --- 3. Переход туда-обратно через границу 64: ровно один переход, без откатов
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
await page.evaluate(() => window.scrollTo(0, 300));
const shrink = await sampleHeights(page, 700);
const shrinkRev = reversals(shrink);
h = await headerHeight(page);
check('3a. Сжатие при скролле вниз: 64px, без реверсов', Math.abs(h - 65) <= 1.5 && shrinkRev === 0, `height=${h.toFixed(1)}, реверсов=${shrinkRev}`);
await page.evaluate(() => window.scrollTo(0, 40)); // обратно только в мёртвую зону — должна остаться компактной
await page.waitForTimeout(500);
h = await headerHeight(page);
check('3b. В мёртвой зоне (40px) шапка остаётся компактной', Math.abs(h - 65) <= 1.5, `height=${h.toFixed(1)}`);
await page.evaluate(() => window.scrollTo(0, 0));
const expand = await sampleHeights(page, 700);
const expandRev = reversals(expand);
h = await headerHeight(page);
check('3c. Раскрытие у верха: 80px, без реверсов', Math.abs(h - 81) <= 1.5 && expandRev === 0, `height=${h.toFixed(1)}, реверсов=${expandRev}`);

// --- 4. Колесо мыши вокруг границы сжатия: плавный монотонный переход
await page.evaluate(() => window.scrollTo(0, 30));
await page.waitForTimeout(300);
await page.mouse.move(640, 400);
await page.mouse.wheel(0, 50); // 30 -> 80: crossing 64
samples = await sampleHeights(page, 800);
check('4. Wheel через границу: монотонно, без осцилляции', reversals(samples) <= 1, `реверсов=${reversals(samples)}, final=${samples[samples.length - 1].toFixed(1)}`);

// --- 5. StickyDateBar: появляется под шапкой и прилипает к её фактическому низу
const selBox = await page.evaluate(() => {
  const r = document.getElementById('main-date-range-selector').getBoundingClientRect();
  return { top: r.top + window.scrollY, height: r.height };
});
await page.evaluate((b) => window.scrollTo(0, b.top + b.height + 40), selBox);
await page.waitForTimeout(700);
const barInfo = await page.evaluate(() => {
  const bar = document.querySelector('body > div[role="region"]');
  const header = document.getElementById('app-header').getBoundingClientRect();
  if (!bar) return null;
  const r = bar.getBoundingClientRect();
  return { barTop: r.top, headerBottom: header.bottom, headerHeight: header.height };
});
check(
  '5a. Панель дат видна, когда календарь ушёл под шапку',
  barInfo !== null,
  barInfo ? `barTop=${barInfo.barTop.toFixed(1)}` : 'панель не найдена',
);
if (barInfo) {
  const gap = Math.abs(barInfo.barTop - barInfo.headerBottom);
  check('5b. Панель прилипает ровно к низу шапки (зазор < 2px)', gap < 2, `gap=${gap.toFixed(2)}px, headerH=${barInfo.headerHeight.toFixed(1)}`);
}
await page.screenshot({ path: `${SHOT_DIR}/shot-2-compact-with-bar.png` });

// --- 6. Возврат наверх: панель скрывается, шапка раскрывается
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
await page.waitForTimeout(1500);
const afterTop = await page.evaluate(() => ({
  bar: !!document.querySelector('body > div[role="region"]'),
  h: document.getElementById('app-header').getBoundingClientRect().height,
}));
check('6. Наверху панель скрыта, шапка раскрыта (80px)', !afterTop.bar && Math.abs(afterTop.h - 81) <= 1.5, `bar=${afterTop.bar}, h=${afterTop.h.toFixed(1)}`);
await page.screenshot({ path: `${SHOT_DIR}/shot-1-top-expanded.png` });

// --- 7. Кадр середины перехода (дизайн-ревью)
await page.evaluate(() => window.scrollTo(0, 30));
await page.waitForTimeout(300);
await page.mouse.move(640, 400);
await page.mouse.wheel(0, 60);
await page.waitForTimeout(140); // ~середина 300ms перехода
await page.screenshot({ path: `${SHOT_DIR}/shot-3-mid-transition.png` });
const midH = await headerHeight(page);
console.log(`INFO  середина перехода: height=${midH.toFixed(1)}`);

// --- 8. Reduced motion: переключение мгновенное
const rmPage = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
await rmPage.goto('http://[::1]:5191/', { waitUntil: 'networkidle' });
await rmPage.waitForSelector('#app-header');
await rmPage.waitForTimeout(500);
await rmPage.evaluate(() => window.scrollTo(0, 300));
await rmPage.waitForTimeout(120);
const rmH = await rmPage.evaluate(() => document.getElementById('app-header').getBoundingClientRect().height);
check('8. Reduced motion: компактная высота сразу, без анимации', Math.abs(rmH - 65) <= 1.5, `height=${rmH.toFixed(1)}`);

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
process.exit(failed.length ? 1 : 0);
