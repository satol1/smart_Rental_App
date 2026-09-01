// src/types/accessory.ts

export interface Accessory {
    id: number;
    name: string;
    accessory_type: string;
    price: number;
    description?: string;
}

// ДОБАВЛЯЕМ ЭТОТ ИНТЕРФЕЙС
export interface AccessoryListResponse {
    items: Accessory[];
    total: number;
}