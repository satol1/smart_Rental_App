// path: rental-app-main/src/core/services/HolidayService.ts

import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Holiday, HolidayListResponse } from "@/types/holiday";

// Создадим новый тип для внутреннего использования сервисом
export interface HolidayWithDate extends Omit<Holiday, 'date'> {
    date: Date;
}

/**
 * Сервис для централизованной работы с API выходных дней.
 */
export class HolidayService {
    /**
     * Получает список выходных в заданном диапазоне и преобразует строки в объекты Date.
     * @param start - Дата начала
     * @param end - Дата окончания
     * @returns Объект с total и массивом items, где date является объектом Date.
     */
    static async getHolidays(start: Date, end: Date): Promise<{ items: HolidayWithDate[], total: number }> {
        const formattedStart = formatDate(start);
        const formattedEnd = formatDate(end);

        const response = await api.get<HolidayListResponse>('/holidays/', {
            params: {
                start_date: formattedStart,
                end_date: formattedEnd,
                limit: 400,
            },
        });

        // Преобразуем строки дат в объекты Date прямо здесь
        const transformedItems = response.data.items.map(holiday => ({
            ...holiday,
            date: new Date(holiday.date),
        }));

        return {
            items: transformedItems,
            total: response.data.total,
        };
    }
}
