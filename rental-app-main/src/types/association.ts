// src/types/association.ts

export interface Association {
    id: number;
    name: string;
    description?: string;
    sort_order: number;
    equipment_ids: number[];
}

export type AssociationCreate = Omit<Association, 'id'>;
export type AssociationUpdate = Partial<AssociationCreate>;

// ДОБАВЬТЕ ЭТОТ ЭКСПОРТ
export interface AssociationListResponse {
    items: Association[];
    total: number;
}