# Дизайн-система RentalApp

Дизайн централизован: внешний вид всего приложения описан токенами в одном файле.
Перекрасить тему целиком = править один блок CSS; изменить кнопку/бейдж = править
один вариант в `ui/`. Этот документ — карта системы и правила её расширения.

## Архитектура: 4 слоя

```
src/index.css          ← ЕДИНСТВЕННЫЙ источник токенов (CSS-переменные)
tailwind.config.js     ← все цвета/тени/радиусы/длительности читают var(--…)
src/components/ui/*    ← shadcn-примитивы: внешний вид в cva-вариантах
feature-компоненты     ← только семантические классы (bg-card, text-muted-foreground…)
```

Правило потока: feature-код никогда не описывает цвет/тень/радиус сам — он выбирает
семантический класс. Всё конкретное живёт в слоях выше.

## Токены (src/index.css)

Все токены — HSL-тройки без обёртки `hsl()`: потребляются как `hsl(var(--token) / alpha)`.

| Группа | Токены |
|---|---|
| Базовые | `--background` `--foreground` `--card(-foreground)` `--popover(-foreground)` |
| Бренд | `--brand` `--brand-ink` `--brand-paper` `--brand-sheen` (блик кнопок) |
| Интерактив | `--primary(-foreground/-hover)` `--secondary(-foreground)` `--muted(-foreground)` `--accent(-foreground)` `--destructive(-foreground)` `--input` `--border` `--ring` `--overlay` |
| Статусы | `--success(-soft)` `--warning(-soft)` `--danger-soft` `--info-soft` `--reserved(-soft/-foreground)` |
| Палитры-скейлы 50–950 | `--blue-*` `--sage-*` `--sand-*` `--red-*` `--neutral-*` (канонические имена; `gray/slate/zinc → neutral`, `green/emerald/teal → sage`, `amber/orange/yellow → sand`, `sky/cyan/indigo → blue` — алиасы в tailwind.config.js) |
| Pastel-пары | `--pastel-{sky,mint,amber,coral,lavender}(-fg)` — мягкая заливка + читаемый текст |
| Графики | `--chart-1..5` |
| Особые поверхности | `--surface-photo` — фото-зона карточек, всегда белый в обеих темах (не переопределяется в `.dark`; вместо `@apply bg-white`, который протекает через `.dark .bg-white`) |
| Форма | `--radius`, `--radius-control` |
| Тени | `--shadow-sm/popover/dialog/button-hover`, `--shadow-color` |
| Motion | `--duration-fast/base/slow`, `--ease-out` (+ JS-двойники в `src/lib/motion.ts`) |

Три контекста значений: `:root` (светлая тема), `.dark` (тёмная), `@media print →
.print-container` (бланк — бумажный документ с фиксированной палитрой; здесь
разрешены цветовые литералы).

## Типографика

Шкала: `text-3xs` (10px) · `text-2xs` (11px) · `text-xs … text-5xl` (Tailwind) ·
`text-4.5xl` (2.75rem, дисплейные заголовки). Произвольные `text-[Npx]` запрещены
(eslint). Шрифт — `--font-sans` (Onest), единственный `@font-face` в index.css.

## Как выполнять типовые задачи

**Перекрасить всё приложение** (ребрендинг): править значения `:root` и `.dark` в
`src/index.css` — в первую очередь `--brand/--primary/--blue-*` и нейтрали.
UI-код трогать не нужно.

**Перекрасить отдельный компонент**: править cva-вариант в
`src/components/ui/<component>.tsx`. Маппинг «статус → цвет» — в
`ui/status-badge.tsx`; анимации — `src/lib/motion.ts`.

**Добавить новый цвет**: сначала спросить себя, не выражается ли он через
существующие (`*-soft` фон + семантический текст). Если нет — добавить HSL-тройку
в `:root` и `.dark`, прописать в `tailwind.config.js`, упомянуть здесь.

**Добавить ступень типографики**: `fontSize` в `tailwind.config.js` (строка без
line-height — как остальные кастомные ступени), затем класс по всему коду.

## Запреты и гейты

- **eslint `no-restricted-syntax`** (eslint.config.js): hex-литералы, `rgb()/hsl()`
  без `var()`, произвольные цветовые классы `bg-[#…]`, размеры `text-[Npx]` — ошибки.
- **`npm run check:design-tokens`** (scripts/check-design-tokens.mjs, шаг в CI):
  в CSS вне `src/index.css` цветовых литералов нет вообще; в index.css — только
  внутри `@media print`.
- Тёмная тема: новые токены обязаны иметь значение в `.dark` (кроме явно
  темо-стабильных, как `--surface-photo`).
- Печатный бланк (`@media print` в index.css) — единственное место, где допустимы
  литералы: документ должен печататься одинаково при любой теме. Цвет плашки —
  `hsl(var(--brand))`.

## К чему стремиться (известные допущения)

- ~32 файла используют raw `<button>` помимо `ui/button.tsx` — многие легитимны
  (radix-триггеры, иконки-кнопки, ячейки календаря); при изменении сырой кнопки
  сверяйся с вариантами `ui/button.tsx`.
- Плагин-шим в tailwind.config.js (`.dark .text-{family}-{step}` → семантические
  токены) существует для совместимости; новый код должен использовать семантические
  классы напрямую.
