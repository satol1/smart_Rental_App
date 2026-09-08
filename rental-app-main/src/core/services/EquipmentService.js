// src/core/services/EquipmentService.ts
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils"; // 1. Убедитесь, что этот импорт присутствует
export class EquipmentService {
    static async getAllEquipment(skip, limit, filters = {}) {
        const params = { skip, limit };
        if (filters.query) {
            params.query = filters.query;
        }
        if (filters.type) {
            params.type = filters.type;
        }
        if (filters.brandSystemId) {
            params.brandSystemId = filters.brandSystemId;
        }
        if (filters.associationId) {
            params.associationId = filters.associationId;
        }
        // ✅ ИСПРАВЛЕНИЕ: Передаем даты всегда, если они есть, для правильного расчета доступности пачек
        if (filters.startDate && filters.endDate) {
            params.startDate = formatDate(filters.startDate);
            params.endDate = formatDate(filters.endDate);
        }
        if (filters.availableOnly) {
            params.availableOnly = true;
        }
        if (filters.groupSimilar !== undefined) {
            params.groupSimilar = filters.groupSimilar;
        }
        const response = await api.get("/equipment/", { params });
        return response.data;
    }
    static async checkAvailability(input) {
        if (!input.start || !input.end || input.ids.length === 0) {
            return [];
        }
        const searchParams = new URLSearchParams();
        // V-- 2. ИСПРАВЛЕНИЕ ЗДЕСЬ --V
        searchParams.append("start", formatDate(input.start));
        searchParams.append("end", formatDate(input.end));
        // ^-- КОНЕЦ ИСПРАВЛЕНИЯ --^
        input.ids.forEach(id => {
            searchParams.append("ids", id.toString());
        });
        if (input.excludeReservationId !== undefined) {
            searchParams.append("exclude_reservation_id", input.excludeReservationId.toString());
        }
        const response = await api.get(`/calendar/view?${searchParams.toString()}`);
        return response.data.items;
    }
    static filterAndGroupEquipment(allEquipment, searchQuery) {
        const lowerCaseQuery = searchQuery.toLowerCase();
        const filtered = searchQuery
            ? allEquipment.filter(item => item.name.toLowerCase().includes(lowerCaseQuery) ||
                item.brand.toLowerCase().includes(lowerCaseQuery) ||
                item.equipment_type.toLowerCase().includes(lowerCaseQuery))
            : allEquipment;
        const visibleIds = filtered.map(item => item.id);
        const tree = {};
        for (const eq of filtered) {
            if (!tree[eq.equipment_type]) {
                tree[eq.equipment_type] = {};
            }
            if (!tree[eq.equipment_type][eq.brand]) {
                tree[eq.equipment_type][eq.brand] = [];
            }
            tree[eq.equipment_type][eq.brand].push(eq);
        }
        return { tree, visibleIds };
    }
    static filterEquipment(equipmentData, params) {
        let result = equipmentData;
        if (params.query) {
            const lowerCaseQuery = params.query.toLowerCase();
            result = result.filter((item) => item.name.toLowerCase().includes(lowerCaseQuery) ||
                item.brand.toLowerCase().includes(lowerCaseQuery) ||
                item.equipment_type.toLowerCase().includes(lowerCaseQuery));
        }
        if (params.type) {
            result = result.filter((item) => item.equipment_type === params.type);
        }
        // Примечание: brandSystemId фильтрация теперь происходит на сервере
        // Локальная фильтрация по brandSystemId не нужна, так как сервер уже возвращает отфильтрованные данные
        return result;
    }
    static async getEquipmentById(id) {
        const response = await api.get(`/equipment/${id}`);
        return response.data;
    }
    static async createEquipment(input) {
        const response = await api.post("/equipment/", input);
        return response.data;
    }
    static async updateEquipment(id, input) {
        const response = await api.put(`/equipment/${id}`, input);
        return response.data;
    }
    static async deleteEquipment(id) {
        await api.delete(`/equipment/${id}`);
    }
    static async copyEquipment(sourceId, copyData) {
        const response = await api.post(`/equipment/${sourceId}/copy`, copyData);
        return response.data;
    }
}
