// src/core/services/AvailabilityService.ts

import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { AvailabilityInfo, AvailabilityListResponse, DailyAvailabilityData } from "@/types/availability";

export interface AvailabilityStatusParams {
    equipmentIds: number[];
    startDate: Date;
    endDate: Date;
    excludeReservationId?: number;
}

export interface DailyStatusParams {
    equipmentIds: number[];
    startDate: Date;
    endDate: Date;
    excludeReservationId?: number;
}

export interface ConflictCheckParams {
    equipmentIds: number[];
    startDate: Date;
    endDate: Date;
    excludeReservationId?: number;
}

/**
 * Сервис для работы с доступностью оборудования.
 * Централизует все API-запросы, связанные с проверкой доступности.
 */
export class AvailabilityService {
    /**
     * Получает общий статус (available, rented, reserved) для списка оборудования.
     * Вызывает эндпоинт /calendar/view.
     */
    static async getStatuses(params: AvailabilityStatusParams): Promise<AvailabilityInfo[]> {
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

        const response = await api.get<AvailabilityListResponse>(`/calendar/view?${searchParams.toString()}`);
        return response.data.items;
    }

    /**
     * Получает статусы по дням для календаря-полоски.
     * Вызывает эндпоинт /calendar/day-statuses.
     * Бэкенд возвращает конверт { equipment_day_statuses: Record<id, Record<date, DayStatus>> }.
     */
    static async getDailyStatuses(params: DailyStatusParams): Promise<DailyAvailabilityData> {
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

        const response = await api.get<{ equipment_day_statuses?: DailyAvailabilityData }>(`/calendar/day-statuses?${searchParams.toString()}`);
        return response.data.equipment_day_statuses ?? {};
    }

    /**
     * Проверяет конфликты для указанного оборудования.
     * Возвращает список ID оборудования с конфликтами.
     * Этот метод может быть опциональным, если getStatuses возвращает достаточно информации.
     */
    static async checkConflicts(params: ConflictCheckParams): Promise<number[]> {
        const statuses = await this.getStatuses(params);
        
        return statuses
            .filter(info => info.status === "reserved" || info.status === "rented")
            .map(info => info.equipment_id);
    }
}
