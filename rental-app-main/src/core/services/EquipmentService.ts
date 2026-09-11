// src/core/services/EquipmentService.ts

import { api } from "@/lib/api";
import type { Equipment } from "@/types/equipment";
import type { CatalogItem } from "@/types/catalog";
import type { AvailabilityInfo, AvailabilityListResponse } from "@/types/availability";
import { formatDate } from "@/lib/utils"; // 1. Убедитесь, что этот импорт присутствует

export interface AvailableFilters {
    types: string[];
    brands: Array<{
        id: number;
        name: string;
    }>;
    associations: Array<{
        id: number;
        name: string;
        sort_order: number;
    }>;
}

export interface EquipmentListResponse {
    // Единый список каталога: оборудование и пачки (union, дискриминатор entity_type)
    items: CatalogItem[];
    total: number;
    availableFilters: AvailableFilters;
}

export interface EquipmentFilterParams {
    query?: string;
    type?: string | null;
    brandSystemId?: number | null;
    associationId?: number | null;
    startDate?: Date | null;
    endDate?: Date | null;
    availableOnly?: boolean;
    groupSimilar?: boolean;
}

export class EquipmentService {
    static async getAllEquipment(
        skip: number,
        limit: number,
        filters: EquipmentFilterParams = {}
    ): Promise<EquipmentListResponse> {
        const params: Record<string, any> = { skip, limit };

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

        const response = await api.get<EquipmentListResponse>("/equipment/", { params });
        return response.data;
    }

    static async checkAvailability(input: { ids: number[]; start: Date | null; end: Date | null; excludeReservationId?: number; }): Promise<AvailabilityInfo[]> {
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

        const response = await api.get<AvailabilityListResponse>(`/calendar/view?${searchParams.toString()}`);
        return response.data.items;
    }

    static filterAndGroupEquipment(
        allEquipment: Equipment[],
        searchQuery: string
    ): { tree: Record<string, Record<string, Equipment[]>>; visibleIds: number[] } {
        const lowerCaseQuery = searchQuery.toLowerCase();
        const filtered = searchQuery
            ? allEquipment.filter(item =>
                item.name.toLowerCase().includes(lowerCaseQuery) ||
                item.brand.toLowerCase().includes(lowerCaseQuery) ||
                item.equipment_type.toLowerCase().includes(lowerCaseQuery)
            )
            : allEquipment;

        const visibleIds = filtered.map(item => item.id);

        const tree: Record<string, Record<string, Equipment[]>> = {};
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

    static filterEquipment(
        equipmentData: Equipment[],
        params: EquipmentFilterParams
    ): Equipment[] {
        let result = equipmentData;
        if (params.query) {
            const lowerCaseQuery = params.query.toLowerCase();
            result = result.filter((item) =>
                item.name.toLowerCase().includes(lowerCaseQuery) ||
                item.brand.toLowerCase().includes(lowerCaseQuery) ||
                item.equipment_type.toLowerCase().includes(lowerCaseQuery)
            );
        }
        if (params.type) {
            result = result.filter((item) => item.equipment_type === params.type);
        }
        // Примечание: brandSystemId фильтрация теперь происходит на сервере
        // Локальная фильтрация по brandSystemId не нужна, так как сервер уже возвращает отфильтрованные данные
        return result;
    }

    static async getEquipmentById(id: number): Promise<Equipment> {
        const response = await api.get(`/equipment/${id}`);
        return response.data;
    }

    static async createEquipment(input: Omit<Equipment, 'id' | 'accessories' | 'associations'>): Promise<Equipment> {
        const response = await api.post("/equipment/", input);
        return response.data;
    }

    static async updateEquipment(id: number, input: Partial<Omit<Equipment, 'id'>>): Promise<Equipment> {
        const response = await api.put(`/equipment/${id}`, input);
        return response.data;
    }

    static async deleteEquipment(id: number): Promise<void> {
        await api.delete(`/equipment/${id}`);
    }

    static async copyEquipment(sourceId: number, copyData: EquipmentCopyRequest): Promise<Equipment> {
        const response = await api.post<Equipment>(`/equipment/${sourceId}/copy`, copyData);
        return response.data;
    }
}

export interface EquipmentCopyRequest {
    name?: string;
    serial_number?: string;
    notes?: string;
}