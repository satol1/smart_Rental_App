// path: rental-app-main/src/core/services/HolidayService.ts
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
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
    static async getHolidays(start, end) {
        const formattedStart = formatDate(start);
        const formattedEnd = formatDate(end);
        const response = await api.get('/holidays/', {
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
    static async getHolidayList(startDate, endDate, limit = 100) {
        const response = await api.get('/holidays/', {
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
    static async createHoliday(data) {
        const response = await api.post('/holidays/', data);
        return response;
    }
    /**
     * Удаляет выходной день по дате.
     */
    static async deleteHoliday(date) {
        await api.delete(`/holidays/${formatDate(date)}`);
    }
}
