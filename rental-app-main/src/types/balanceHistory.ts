// src/types/balanceHistory.ts

export interface BalanceHistoryEntry {
    id: number;
    user_id: number;
    rental_id: number | null;
    amount: number;
    operation_type: string;
    description: string | null;
    created_at: string; // Дата в формате ISO-строки
}

export interface BalanceHistoryListResponse {
    items: BalanceHistoryEntry[];
    total: number;
}