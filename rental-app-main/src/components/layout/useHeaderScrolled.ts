// src/components/layout/useHeaderScrolled.ts

import { useSyncExternalStore } from 'react';

/** Высота шапки в потоке: раскрытая / компактная (должна совпадать с h-20/h-16 в Header.tsx) */
export const HEADER_HEIGHT_EXPANDED = 80;
export const HEADER_HEIGHT_COMPACT = 64;

// Гистерезис: сжатие после 64px скролла, раскрытие только у самого верха (<16px).
// Мёртвая зона (48px) заведомо больше изменения высоты шапки (16px), поэтому
// сдвиг контента от самой шапки не может вернуть scrollY за порог — осцилляция
// невозможна. Состояние одно на приложение: Header и StickyDateBar переключаются
// в один кадр и анимируются синхронно.
const COMPACT_AT = HEADER_HEIGHT_COMPACT;
const EXPAND_AT = 16;

let compact = false;
let listening = false;
const listeners = new Set<() => void>();

function recompute() {
  const y = window.scrollY;
  const next = compact ? y > EXPAND_AT : y > COMPACT_AT;
  if (next !== compact) {
    compact = next;
    for (const listener of listeners) listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!listening) {
    listening = true;
    window.addEventListener('scroll', recompute, { passive: true });
    window.addEventListener('resize', recompute);
    // Перезагрузка страницы в середине скролла — сразу синхронизируем состояние
    recompute();
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return compact;
}

/** Компактное состояние шапки: общее для всех потребителей, с гистерезисом. */
export function useHeaderScrolled() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
