// src/core/services/ReservationService.ts
import { api } from "@/lib/api";
export class ReservationService {
    /**
     * Рассчитывает стоимость резерва
     */
    static async calculatePrice(input) {
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
    static async createReservation(input) {
        const { user_id, ...payload } = input;
        const finalPayload = user_id !== undefined ? { user_id, ...payload } : payload;
        const response = await api.post("/reservations/", finalPayload);
        return response.data;
    }
    /**
     * Обновляет существующий резерв
     */
    static async updateReservation(input) {
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
    static async cancelReservation(id) {
        const response = await api.delete(`/reservations/${id}`);
        return response.data;
    }
    /**
     * Получает список резервов пользователя
     */
    static async getUserReservations(params) {
        // Указываем, что ожидаем объект с пагинацией
        const response = await api.get("/reservations/", {
            params: params ? {
                search: params.search,
                status: params.status,
                sort: params.sort
            } : undefined
        });
        // Возвращаем только массив items
        return response.data.items;
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
    static async getAdminReservations(params) {
        const response = await api.get("/admin/reservations/", { params });
        return response.data;
    }
    /**
     * Создает резервацию через админку
     */
    static async createAdminReservation(data) {
        const response = await api.post("/admin/reservations/", data);
        return response.data;
    }
    /**
     * Удаляет резервацию через админку
     */
    static async deleteAdminReservation(reservationId) {
        const response = await api.delete(`/admin/reservations/${reservationId}`);
        return response.data;
    }
    /**
     * Массовое удаление резерваций через админку
     */
    static async bulkDeleteAdminReservations(reservationIds) {
        const payload = { reservation_ids: reservationIds };
        const response = await api.post("/admin/reservations/delete-many", payload);
        return response.data;
    }
    /**
     * Получает детали резерва по ID
     */
    static async getReservationById(id) {
        const response = await api.get(`/reservations/${id}`);
        return response.data;
    }
    /**
     * Преобразует резервы, добавляя имена оборудования
     */
    static createReservationsWithNames(reservationsData, equipmentMap) {
        if (!reservationsData || reservationsData.length === 0) {
            return [];
        }
        return reservationsData.map((r) => ({
            ...r,
            equipment_names: r.equipment_ids
                .map((id) => equipmentMap[id])
                .filter((eq) => Boolean(eq))
                .map((eq) => `${eq.equipment_type} ${eq.brand} ${eq.name}`),
        }));
    }
}
