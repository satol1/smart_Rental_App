// src/types/holiday.ts

// Тип для одного выходного дня, как он приходит от API
export interface Holiday {
    date: string; // Формат 'YYYY-MM-DD'
    description: string | null;
    created_at: string;
    created_by_id: number;
}

// Тип для ответа API со списком выходных
export interface HolidayListResponse {
    items: Holiday[];
    total: number;
}