// path: rental-app-main/src/core/services/HolidayService.ts

import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Holiday, HolidayListResponse } from "@/types/holiday";

// Создадим новый тип для внутреннего использования сервисом
export interface HolidayWithDate extends Omit<Holiday, 'date'> {
    date: Date;
}

/** Payload создания выходного дня (конфликт 409 подтверждается флагом force) */
export interface HolidayCreatePayload {
    date: string; // YYYY-MM-DD
    description?: string;
    force?: boolean;
}

/** Информация об автоматическом продлении аренд/резервов при создании выходного */
export interface HolidayAutoExtensionInfo {
    message: string;
    next_working_day: string;
    extended_rentals: Array<{ id: number; old_end_date: string; new_end_date: string }>;
    extended_reservations: Array<{ id: number; old_end_date: string; new_end_date: string }>;
}

/** Данные ответа создания выходного дня (может содержать автопродление резервов) */
export interface HolidayCreateResultData {
    auto_extension?: HolidayAutoExtensionInfo;
}

/** Ответ создания выходного дня (структура как у axios: { data }) */
export interface HolidayCreateResult {
    data: HolidayCreateResultData;
}

/** Структура ошибки конфликта от API (HTTP 409) */
export interface HolidayConflictErrorData {
    detail: {
        message: string;
        conflicting_reservation_ids: number[];
    };
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

    /**
     * Получает сырой список выходных в диапазоне дат (без преобразования дат).
     * Используется хуками, которым нужен исходный ответ API.
     */
    static async getHolidayList(startDate: string, endDate: string, limit = 100): Promise<HolidayListResponse> {
        const response = await api.get<HolidayListResponse>('/holidays/', {
            params: {
                start_date: startDate,
                end_date: endDate,
                limit,
            },
        });
        return response.data;
    }

    /**
     * Создаёт выходной день.
     * При конфликте с резервами API возвращает 409 — вызов возвращается
     * компоненту для показа диалога подтверждения (force).
     * Формат ответа ({ data }) сохранён как в исходном api.post.
     */
    static async createHoliday(data: HolidayCreatePayload): Promise<HolidayCreateResult> {
        const response = await api.post<HolidayCreateResultData>('/holidays/', data);
        return response;
    }

    /**
     * Удаляет выходной день по дате.
     */
    static async deleteHoliday(date: Date): Promise<void> {
        await api.delete(`/holidays/${formatDate(date)}`);
    }
}
