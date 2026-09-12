// src/hooks/useHolidays.ts

import { useQuery } from "@tanstack/react-query";
import { HolidayService } from "@/core/services/HolidayService";
import { formatDate } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Кэш последнего успешного ответа для не-React потребителей
 * (sandboxCalculatorStore вызывает его из zustand-экшена).
 */
let lastHolidaysCache: Date[] = [];

export function getCachedHolidays(): Date[] {
    return lastHolidaysCache;
}

/**
 * Единый слой данных о выходных (этап 5.3 аудита 2026-09-12): react-query
 * вместо zustand-стора с ручным кэшем по диапазону.
 *
 * Ключ ["holidays", start, end] общий с админ-хуком useAdminHolidays —
 * правки выходных в админке инвалидируют и публичных потребителей.
 * Без аргументов — скользящее окно [сегодня − 1 месяц, сегодня + 13 месяцев].
 */
export function useHolidays(start?: Date, end?: Date) {
    const startKey = start ? formatDate(start) : null;
    const endKey = end ? formatDate(end) : null;

    return useQuery<Date[], Error>({
        queryKey: ["holidays", startKey ?? "rolling", endKey ?? "rolling"],
        queryFn: async () => {
            const from = start ?? new Date(Date.now() - 31 * DAY_MS);
            const to = end ?? new Date(Date.now() + 400 * DAY_MS);
            const { items } = await HolidayService.getHolidays(from, to);
            const dates = items.map(h => h.date);
            lastHolidaysCache = dates;
            return dates;
        },
        staleTime: 10 * 60 * 1000,
    });
}
