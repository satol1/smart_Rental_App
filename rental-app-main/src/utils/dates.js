// src/utils/dates.ts
/**
 * Единая точка вычисления «сколько дней до даты».
 * Обе даты нормализуются к полуночи локального времени — без этого
 * разные компоненты считали дни по-разному (сырой now + Math.ceil)
 * и на границе суток UI расходился с бэкендом.
 */
export function daysUntilDate(target, now = new Date()) {
    const targetDate = typeof target === "string" ? new Date(target) : new Date(target);
    if (isNaN(targetDate.getTime()))
        return NaN;
    const normalizedTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const normalizedNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((normalizedTarget.getTime() - normalizedNow.getTime()) / (1000 * 60 * 60 * 24));
}
