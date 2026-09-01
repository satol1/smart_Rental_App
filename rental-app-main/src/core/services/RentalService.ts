// src/core/services/RentalService.ts

import { api } from "@/lib/api";
import type { AdminRentalOut, AdminRentalListResponse, RentalReturnRequest, RentalCreateFromScratchData } from "@/types/rental";
import type { PeriodType } from "@/types/period";

export interface AdminRentalsParams {
    status?: "active" | "overdue" | "completed" | null;
    search?: string;
    skip?: number;
    limit?: number;
    periodType?: PeriodType;
    periodOffset?: number;
}

export interface ConvertReservationPayload {
    reservationId: number;
    data: {
        notes_on_issue?: string;
        deposit_amount: number;
        prepayment_amount?: number;
        force_issue_on_holiday?: boolean;
    };
}

export interface ReturnRentalPayload {
    rentalId: number;
    data: RentalReturnRequest;
}

export interface UpdateRentalPayload {
    rentalId: number;
    data: any;
}

/**
 * Централизованный сервис для работы с арендами.
 * Инкапсулирует все API вызовы, связанные с арендами.
 */
export class RentalService {
    /**
     * Получает список аренд для администратора
     */
    static async getAdminRentals(params: AdminRentalsParams = {}): Promise<AdminRentalListResponse> {
        const { status, search, skip = 0, limit = 10, periodType, periodOffset } = params;
        const response = await api.get<AdminRentalListResponse>("/admin/rentals/", {
            params: { status, search, skip, limit, periodType, periodOffset },
        });
        return response.data;
    }

    /**
     * Конвертирует резервацию в аренду
     */
    static async convertReservationToRental(payload: ConvertReservationPayload): Promise<AdminRentalOut> {
        const response = await api.post<AdminRentalOut>(
            `/admin/reservations/${payload.reservationId}/convert-to-rental`,
            payload.data
        );
        return response.data;
    }

    /**
     * Удаляет аренду
     */
    static async deleteAdminRental(rentalId: number): Promise<void> {
        await api.delete(`/admin/rentals/${rentalId}`);
    }

    /**
     * Возвращает аренду
     */
    static async returnRental(payload: ReturnRentalPayload): Promise<AdminRentalOut> {
        const response = await api.post<AdminRentalOut>(
            `/admin/rentals/${payload.rentalId}/return`,
            payload.data
        );
        return response.data;
    }

    /**
     * Отменяет аренду и возвращает к резервации
     */
    static async revertRentalToReservation(rentalId: number, refundPrepayment: boolean = false): Promise<void> {
        await api.post(`/admin/rentals/${rentalId}/revert-to-reservation`, {
            refund_prepayment: refundPrepayment
        });
    }

    /**
     * Создает аренду с нуля
     */
    static async createRentalFromScratch(data: RentalCreateFromScratchData): Promise<AdminRentalOut> {
        const response = await api.post<AdminRentalOut>("/admin/rentals/", data);
        return response.data;
    }

    /**
     * Обновляет аренду
     */
    static async updateAdminRental(payload: UpdateRentalPayload): Promise<AdminRentalOut> {
        const response = await api.put<AdminRentalOut>(
            `/admin/rentals/${payload.rentalId}`,
            payload.data
        );
        return response.data;
    }
}
