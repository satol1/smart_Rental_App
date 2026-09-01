// src/core/services/BrandSystemService.ts

import { api } from "@/lib/api";
import type { BrandSystem, BrandSystemCreate, BrandSystemUpdate, BrandSystemListResponse } from "@/types/brandSystem";

export class BrandSystemService {
    static async getAll(): Promise<BrandSystemListResponse> {
        const response = await api.get<BrandSystemListResponse>("/admin/brand-systems/");
        return response.data;
    }

    static async create(data: BrandSystemCreate): Promise<BrandSystem> {
        const response = await api.post<BrandSystem>("/admin/brand-systems/", data);
        return response.data;
    }

    static async update({ id, data }: { id: number; data: BrandSystemUpdate }): Promise<BrandSystem> {
        const response = await api.put<BrandSystem>(`/admin/brand-systems/${id}`, data);
        return response.data;
    }

    static async delete(id: number): Promise<void> {
        await api.delete(`/admin/brand-systems/${id}`);
    }
}
