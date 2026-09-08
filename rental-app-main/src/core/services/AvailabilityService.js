// src/core/services/AvailabilityService.ts
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
/**
 * Сервис для работы с доступностью оборудования.
 * Централизует все API-запросы, связанные с проверкой доступности.
 */
export class AvailabilityService {
    /**
     * Получает общий статус (available, rented, reserved) для списка оборудования.
     * Вызывает эндпоинт /calendar/view.
     */
    static async getStatuses(params) {
        if (!params.startDate || !params.endDate || params.equipmentIds.length === 0) {
            return [];
        }
        const searchParams = new URLSearchParams();
        searchParams.append("start", formatDate(params.startDate));
        searchParams.append("end", formatDate(params.endDate));
        params.equipmentIds.forEach(id => {
            searchParams.append("ids", id.toString());
        });
        if (params.excludeReservationId !== undefined) {
            searchParams.append("exclude_reservation_id", params.excludeReservationId.toString());
        }
        const response = await api.get(`/calendar/view?${searchParams.toString()}`);
        return response.data.items;
    }
    /**
     * Получает статусы по дням для календаря-полоски.
     * Вызывает эндпоинт /calendar/day-statuses.
     */
    static async getDailyStatuses(params) {
        if (!params.startDate || !params.endDate || params.equipmentIds.length === 0) {
            return {};
        }
        const searchParams = new URLSearchParams();
        searchParams.append("start", formatDate(params.startDate));
        searchParams.append("end", formatDate(params.endDate));
        params.equipmentIds.forEach(id => {
            searchParams.append("ids", id.toString());
        });
        if (params.excludeReservationId !== undefined) {
            searchParams.append("exclude_reservation_id", params.excludeReservationId.toString());
        }
        const response = await api.get(`/calendar/day-statuses?${searchParams.toString()}`);
        return response.data;
    }
    /**
     * Проверяет конфликты для указанного оборудования.
     * Возвращает список ID оборудования с конфликтами.
     * Этот метод может быть опциональным, если getStatuses возвращает достаточно информации.
     */
    static async checkConflicts(params) {
        const statuses = await this.getStatuses(params);
        return statuses
            .filter(info => info.status === "reserved" || info.status === "rented")
            .map(info => info.equipment_id);
    }
}
