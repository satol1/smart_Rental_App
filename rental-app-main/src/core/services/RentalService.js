// src/core/services/RentalService.ts
import { api } from "@/lib/api";
/**
 * Централизованный сервис для работы с арендами.
 * Инкапсулирует все API вызовы, связанные с арендами.
 */
export class RentalService {
    /**
     * Получает список аренд для администратора
     */
    static async getAdminRentals(params = {}) {
        const { status, search, skip = 0, limit = 10, periodType, periodOffset } = params;
        const response = await api.get("/admin/rentals/", {
            params: { status, search, skip, limit, periodType, periodOffset },
        });
        return response.data;
    }
    /**
     * Конвертирует резервацию в аренду
     */
    static async convertReservationToRental(payload) {
        const response = await api.post(`/admin/reservations/${payload.reservationId}/convert-to-rental`, payload.data);
        return response.data;
    }
    /**
     * Удаляет аренду
     */
    static async deleteAdminRental(rentalId) {
        await api.delete(`/admin/rentals/${rentalId}`);
    }
    /**
     * Возвращает аренду
     */
    static async returnRental(payload) {
        const response = await api.post(`/admin/rentals/${payload.rentalId}/return`, payload.data);
        return response.data;
    }
    /**
     * Отменяет аренду и возвращает к резервации
     */
    static async revertRentalToReservation(rentalId, refundPrepayment = false) {
        await api.post(`/admin/rentals/${rentalId}/revert-to-reservation`, {
            refund_prepayment: refundPrepayment
        });
    }
    /**
     * Создает аренду с нуля
     */
    static async createRentalFromScratch(data) {
        const response = await api.post("/admin/rentals/", data);
        return response.data;
    }
    /**
     * Обновляет аренду
     */
    static async updateAdminRental(payload) {
        const response = await api.put(`/admin/rentals/${payload.rentalId}`, payload.data);
        return response.data;
    }
}
