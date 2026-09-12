// Фотосессия для дизайн-ревью: mobile + dark theme
import pw from 'file:///F:/S_Project_Docker/rental-app-main/node_modules/playwright/index.js';
const { chromium } = pw;
const DIR = 'F:/S_Project_Docker/Reports/header-shake-fix';
const URL = 'http://[::1]:5191/';

const browser = await chromium.launch();

// Mobile 375x812
const m = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
await m.goto(URL, { waitUntil: 'networkidle' });
await m.waitForSelector('#main-date-range-selector');
await m.waitForTimeout(800);
await m.screenshot({ path: `${DIR}/shot-4-mobile-top.png` });
const sel = await m.evaluate(() => {
  const r = document.getElementById('main-date-range-selector').getBoundingClientRect();
  return r.top + window.scrollY + r.height;
});
await m.evaluate((y) => window.scrollTo(0, y + 60), sel);
await m.waitForTimeout(900);
await m.screenshot({ path: `${DIR}/shot-5-mobile-compact-bar.png` });
await m.close();

// Desktop dark
const d = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await d.goto(URL, { waitUntil: 'networkidle' });
await d.waitForSelector('#main-date-range-selector');
await d.evaluate(() => {
  document.documentElement.classList.add('dark');
  document.documentElement.style.colorScheme = 'dark';
});
await d.waitForTimeout(600);
await d.screenshot({ path: `${DIR}/shot-6-dark-top.png` });
const selD = await d.evaluate(() => {
  const r = document.getElementById('main-date-range-selector').getBoundingClientRect();
  return r.top + window.scrollY + r.height;
});
await d.evaluate((y) => window.scrollTo(0, y + 60), selD);
await d.waitForTimeout(900);
await d.screenshot({ path: `${DIR}/shot-7-dark-compact-bar.png` });
await d.close();

await browser.close();
console.log('SHOTS_OK');
