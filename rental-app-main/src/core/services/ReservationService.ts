// src/core/services/ReservationService.ts

import { api } from "@/lib/api";
import type { Equipment } from "@/types/equipment";
import type { Reservation, ReservationWithNames, ReservationListResponse, AdminReservationOut } from "@/types/reservation";

// Тип для ответа API расчета стоимости
export interface PriceDetails {
    day_count: number;
    full_total: number;
    final_total: number;
    discount_amount: number;
    duration_discount_percentage: number;
    promo_discount_percentage: number;
    promo_code_message?: string | null;
}

// Единый тип для создания резерва, который будет использоваться везде
export interface ReservationCreateInput {
    user_id?: number;
    start_date: string;
    end_date: string;
    equipment_ids: number[];
    selected_accessories: Record<number, number[]>;
    promo_code?: string;
}

export interface ReservationUpdateInput {
    id: number;
    start_date: string;
    end_date: string;
    equipment_ids: number[];
    /** Отсутствие аксессуаров валидно — сервис подставит {} */
    selected_accessories?: Record<number, number[]>;
    /** API хранит null, когда промокод не применён */
    promo_code?: string | null;
    isAdminContext?: boolean;
    confirm_date_adjustment?: boolean;
}

/** Payload создания резерва через админку (см. CreateReservationFormData) */
export interface AdminReservationCreatePayload {
    user_id: number;
    start_date: string;
    end_date: string;
    equipment_ids: number[];
    selected_accessories?: Record<string, number[]>;
    deposit_amount?: number;
    prepayment_amount?: number;
    notes_on_issue?: string;
    promo_code?: string;
}

export class ReservationService {
    /**
     * Рассчитывает стоимость резерва
     */
    static async calculatePrice(input: Omit<ReservationCreateInput, 'user_id'>): Promise<PriceDetails> {
        const payload = {
            ...input,
            selected_accessories: input.selected_accessories || {},
            promo_code: input.promo_code || null,
        };

        const response = await api.post("/reservations/calculate", payload);
        return response.data;
    }

    /**
     * Создает новый резерв
     * 
     * Примечание: Бэкенд автоматически проверяет:
     * - Статус пользователя (не может быть "Персона НонГрата")
     * - Лимит одновременных резервов по статусу пользователя
     * - Если статус "Заблокирован", резерв может создать только менеджер
     * 
     * В случае ошибки бэкенд вернет соответствующее сообщение.
     */
    static async createReservation(input: ReservationCreateInput) {
        const { user_id, ...payload } = input;
        const finalPayload = user_id !== undefined ? { user_id, ...payload } : payload;

        const response = await api.post("/reservations/", finalPayload);
        return response.data;
    }

    /**
     * Обновляет существующий резерв
     */
    static async updateReservation(input: ReservationUpdateInput) {
        const { isAdminContext, id, ...payload } = input;
        const url = isAdminContext
            ? `/admin/reservations/${id}`
            : `/reservations/${id}`;

        const response = await api.put(url, payload);
        return response.data;
    }

    /**
     * Отменяет резерв
     */
    static async cancelReservation(id: number) {
        const response = await api.delete(`/reservations/${id}`);
        return response.data;
    }

    /**
     * Получает страницу резервов пользователя (для infinite-пагинации «Мои резервы»)
     */
    static async getUserReservationsPage(
        params: { search?: string; status?: string; sort?: string },
        skip: number,
        limit: number,
    ): Promise<ReservationListResponse> {
        const response = await api.get<ReservationListResponse>("/reservations/", {
            params: {
                search: params.search,
                status: params.status,
                sort: params.sort,
                skip,
                limit,
            }
        });
        return response.data;
    }

    /**
     * Получает все резервы (для админа)
     */
    static async getAllReservations() {
        // Примечание: этот метод не используется для пагинации, но оставлен для совместимости.
        // Для пагинированного списка админа используется /admin/reservations
        const response = await api.get("/reservations/");
        return response.data;
    }

    /**
     * Получает список резерваций для админки
     */
    static async getAdminReservations(params: {
        status?: string | null;
        search?: string;
        periodType?: string;
        periodOffset?: number;
        skip?: number;
        limit?: number;
    }) {
        const response = await api.get("/admin/reservations/", { params });
        return response.data;
    }

    /**
     * Создает резервацию через админку
     */
    static async createAdminReservation(data: AdminReservationCreatePayload) {
        const response = await api.post<AdminReservationOut>("/admin/reservations/", data);
        return response.data;
    }

    /**
     * Удаляет резервацию через админку
     */
    static async deleteAdminReservation(reservationId: number) {
        const response = await api.delete(`/admin/reservations/${reservationId}`);
        return response.data;
    }

    /**
     * Массовое удаление резерваций через админку
     */
    static async bulkDeleteAdminReservations(reservationIds: number[]) {
        const payload = { reservation_ids: reservationIds };
        const response = await api.post("/admin/reservations/delete-many", payload);
        return response.data;
    }

    /**
     * Преобразует резервы, добавляя имена оборудования
     */
    static createReservationsWithNames(
        reservationsData: Reservation[],
        equipmentMap: Record<number, Equipment>
    ): ReservationWithNames[] {
        if (!reservationsData || reservationsData.length === 0) {
            return [];
        }

        return reservationsData.map((r: Reservation) => ({
            ...r,
            equipment_names: r.equipment_ids
                .map((id: number) => equipmentMap[id])
                .filter((eq): eq is Equipment => Boolean(eq))
                .map((eq: Equipment) => `${eq.equipment_type} ${eq.brand} ${eq.name}`),
        }));
    }
}