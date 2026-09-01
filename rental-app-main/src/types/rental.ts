// src/types/rental.ts

import type { UserOut } from "./user";
import type { Equipment } from "./equipment";
import type { Accessory } from "./accessory";
import type { OrderStatus } from '@/constants/statusConstants';

export interface RentalAccessoryDetail {
    equipment_id: number;
    accessory: Accessory;
}

export interface RentalReturnRequest {
    actual_return_date: string; // Формат 'YYYY-MM-DD'
    notes_on_return?: string;
    accessories_returned_confirmation: boolean;
}

export interface AdminRentalOut {
    id: number;
    user_id: number;
    created_by_id: number;
    reservation_id: number | null;
    start_date: string;
    end_date: string;
    actual_return_date: string | null;
    status: OrderStatus;
    total_cost: number;
    discount_amount: number;
    promo_code: string | null;
    final_cost: number | null;
    deposit_amount: number;
    prepayment_amount: number;
    accessories_cost: number;
    remaining_amount: number;
    notes_on_issue: string | null;
    notes_on_return: string | null;
    created_at: string;
    updated_at: string;
    user: UserOut;
    created_by: UserOut;
    equipment: Equipment[];
    // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
    accessory_links: RentalAccessoryDetail[];
    // -------------------------
    days_remaining: number | null;
    overdue_days: number | null;
    overdue_surcharge: number | null;
}

export interface AdminRentalListResponse {
    items: AdminRentalOut[];
    total: number;
}

// Тип для ответа API /user/rentals (обычные аренды пользователя)
export interface RentalListResponse {
    items: AdminRentalOut[]; // Используем тот же тип, что и AdminRentalOut
    total: number;
}

export interface RentalCreateFromScratchData {
    user_id: number;
    equipment_ids: number[];
    start_date: string;
    end_date: string;
    selected_accessories?: Record<number, number[]>;
    promo_code?: string;
    deposit_amount: number;
    prepayment_amount: number;
    notes_on_issue?: string;
    force_issue_on_holiday?: boolean;
}