// src/types/brandSystem.ts

export interface BrandSystem {
    id: number;
    name: string;
    description?: string | null;
    equipment_ids: number[];
}

export type BrandSystemCreate = Omit<BrandSystem, 'id'>;
export type BrandSystemUpdate = Partial<BrandSystemCreate>;

export interface BrandSystemListResponse {
    items: BrandSystem[];
    total: number;
}
