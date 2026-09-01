// src/lib/utils.ts

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Централизованно рассчитывает количество тарифицируемых дней (ночей), вычитая праздники.
 * @param start - Дата начала
 * @param end - Дата окончания
 * @param holidays - Массив дат, являющихся выходными
 * @returns Количество тарифицируемых дней.
 */
export function calculateDayCount(
    start?: Date | null,
    end?: Date | null,
    holidays: Date[] = []
): number {
  // Проверка на корректность дат
  if (!start || !end || start >= end) {
    return 0;
  }

  // Считаем общее количество "ночей"
  const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (holidays.length === 0) {
    return Math.max(0, totalDays);
  }

  // Создаем множество дат праздников (в формате YYYY-MM-DD) для быстрой проверки
  const holidaySet = new Set(holidays.map(h => formatDate(h)));

  let nonBillableDays = 0;
  // Проверяем каждый день внутри диапазона
  for (let i = 0; i < totalDays; i++) {
    const currentDay = new Date(start);
    currentDay.setDate(start.getDate() + i);

    // Пропускаем сам день начала, так как по правилам он тарифицируется
    if (i === 0) continue;

    if (holidaySet.has(formatDate(currentDay))) {
      nonBillableDays++;
    }
  }

  return Math.max(0, totalDays - nonBillableDays);
}

/**
 * Универсальный форматтер даты (YYYY-MM-DD)
 * Принимает Date или строку, возвращает строку в формате '2024-05-21'
 * Используется для API и input[type="date"]
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Форматтер даты для UI (ДД.ММ.ГГГГ)
 * Принимает Date или строку, возвращает строку в формате '21.05.2024'
 * Используется только для вывода пользователю!
 */
export function formatDateEuropean(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Форматтер диапазона дат для UI (например: 21.05.2024 — 28.05.2024)
 */
export function formatDateRangeEuropean(start?: Date | string | null, end?: Date | string | null): string {
  if (!start || !end) return "";
  return `${formatDateEuropean(start)} — ${formatDateEuropean(end)}`;
}

/**
 * Безопасно форматирует числовое значение в строку с разделителями тысяч
 * @param value - числовое значение для форматирования
 * @param fallback - значение по умолчанию, если value не определено
 * @returns отформатированная строка
 */
export function formatNumber(value: number | null | undefined, fallback: string = "0"): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return value.toLocaleString('ru-RU');
}

/**
 * Утилита объединения классов с поддержкой Tailwind и clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Вычисляет количество дней просрочки для аренды
 * @param dueDate - Дата возврата (строка или Date)
 * @param daysOverdue - Количество дней просрочки с бэкенда (если есть)
 * @returns Количество дней просрочки
 */
export function calculateDaysOverdue(dueDate: string | Date | null | undefined, daysOverdue?: number | null): number {
  // Если бэкенд предоставил количество дней просрочки, используем его
  if (daysOverdue !== undefined && daysOverdue !== null) {
    return daysOverdue;
  }
  
  // Проверяем, что dueDate валиден
  if (!dueDate) {
    return 0;
  }
  
  // Вычисляем на клиенте, если поле не предоставлено
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  
  // Проверяем, что дата валидна
  if (isNaN(due.getTime())) {
    return 0;
  }
  
  const today = new Date();
  
  // Сбрасываем время для корректного сравнения дат
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Преобразует accessory_links в selected_accessories для совместимости с компонентами
 * @param reservation - Объект резерва с accessory_links
 * @returns Объект резерва с добавленным selected_accessories
 */
export function transformAccessoryLinks<T extends { accessory_links?: Array<{ equipment_id: number; accessory: { id: number } }> }>(reservation: T): T & { selected_accessories: Record<number, number[]> } {
  if (!reservation.accessory_links || reservation.accessory_links.length === 0) {
    return { ...reservation, selected_accessories: {} };
  }
  
  const selected_accessories = reservation.accessory_links.reduce((acc, link) => {
    // Добавлена проверка, что link и link.accessory существуют
    if (link && link.accessory && typeof link.equipment_id === 'number') {
      if (!acc[link.equipment_id]) {
        acc[link.equipment_id] = [];
      }
      acc[link.equipment_id].push(link.accessory.id);
    }
    return acc;
  }, {} as Record<number, number[]>);
  
  return { ...reservation, selected_accessories };
}