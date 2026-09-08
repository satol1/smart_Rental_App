// src/core/services/CalendarService.ts
import { api } from "@/lib/api";
export class CalendarService {
    /**
     * Получает статусы дней для календаря
     */
    static async getDayStatuses(startDate, endDate, equipmentIds) {
        if (!startDate || !endDate) {
            console.warn("[CalendarService] getDayStatuses вызван с невалидными датами");
            return {};
        }
        if (equipmentIds.length === 0) {
            console.warn("[CalendarService] getDayStatuses вызван с пустым списком ID оборудования");
            return {};
        }
        try {
            const response = await api.get("/calendar/day-statuses", {
                params: {
                    start: startDate,
                    end: endDate,
                    ids: equipmentIds,
                },
            });
            console.log("[CalendarService] API response for /calendar/day-statuses:", response);
            if (response?.data?.equipment_day_statuses !== undefined) {
                return response.data.equipment_day_statuses;
            }
            else {
                console.error("[CalendarService] API response did not contain 'equipment_day_statuses'", response?.data);
                return {};
            }
        }
        catch (error) {
            console.error("[CalendarService] Error fetching /calendar/day-statuses:", error);
            throw error;
        }
    }
    /**
     * Получает детали события календаря (резерв или аренда)
     */
    static async getEventDetails(orderType, orderId) {
        try {
            const response = await api.get(`/calendar/order-details/${orderType}/${orderId}`);
            return response.data;
        }
        catch (error) {
            console.error(`[CalendarService] Error fetching event details for ${orderType} ${orderId}:`, error);
            throw error;
        }
    }
    /**
     * Создает ключ запроса для кэширования
     */
    static createQueryKey(startDate, endDate, equipmentIds) {
        return [
            "calendar-grid",
            startDate,
            endDate,
            JSON.stringify(equipmentIds.sort((a, b) => a - b)),
        ];
    }
    /**
     * Создает ключ запроса для деталей события
     */
    static createEventDetailsQueryKey(orderType, orderId) {
        return ["calendar-event-details", orderType, orderId.toString()];
    }
}
