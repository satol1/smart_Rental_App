// src/core/services/BrandSystemService.ts
import { api } from "@/lib/api";
export class BrandSystemService {
    static async getAll() {
        const response = await api.get("/admin/brand-systems/");
        return response.data;
    }
    static async create(data) {
        const response = await api.post("/admin/brand-systems/", data);
        return response.data;
    }
    static async update({ id, data }) {
        const response = await api.put(`/admin/brand-systems/${id}`, data);
        return response.data;
    }
    static async delete(id) {
        await api.delete(`/admin/brand-systems/${id}`);
    }
}
