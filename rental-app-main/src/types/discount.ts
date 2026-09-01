// src/types/discount.ts

// Тип для скидки, как она приходит от API
export interface DurationDiscount {
    id: number;
    min_days: number;
    discount_percentage: number;
}

// Тип для данных, отправляемых на API для создания скидки
export type DiscountPayload = Omit<DurationDiscount, 'id'>;

// Тип для ответа от API со списком скидок
export interface DiscountListResponse {
    items: DurationDiscount[];
    total: number;
}