// src/types/rental.ts

import type { UserOut } from "./user";
import type { Equipment } from "./equipment";
import type { Accessory } from "./accessory";
import type { OrderStatus } from '@/constants/statusConstants';
import type { ApiRentalOut } from "@/types/api/schemas";

export interface RentalAccessoryDetail {
    id?: number;
    rental_id?: number;
    equipment_id: number;
    accessory: Accessory;
}

export interface RentalItem {
    id?: number;
    rental_id?: number;
    equipment_id: number;
    status: 'rented' | 'returned' | 'lost' | string;
    actual_return_date?: string | null;
    daily_rate?: number | null;
    equipment?: Equipment | null;
}

export interface RentalReturnRequest {
    actual_return_date: string; // Формат 'YYYY-MM-DD'
    notes_on_return?: string;
    accessories_returned_confirmation: boolean;
    equipment_ids?: number[];
    deposit_action?: 'refund' | 'retain' | 'partial_retain' | 'held' | string;
    deposit_retained_amount?: number;
    deposit_notes?: string;
    lost_accessory_ids?: number[];
    lost_accessories_cost?: number;
    payment_amount?: number;
    payment_method?: string;
    payment_description?: string;
}

export interface RentalAddItemsRequest {
    equipment_ids: number[];
    selected_accessories?: Record<number, number[]>;
    start_date?: string;
}

/**
 * Аренда из API. База — сгенерированная схема RentalOut (codegen), поверх —
 * уточнения приложения: статус сужен до union OrderStatus, вложенное
 * оборудование/аксессуары приведены к прикладным типам (они надмножество схемных).
 */
export type AdminRentalOut = Omit<ApiRentalOut,
    "status" | "user" | "created_by" | "equipment" | "accessory_links"
> & {
    status: OrderStatus;
    user: UserOut;
    created_by: UserOut;
    equipment: Equipment[];
    accessory_links: RentalAccessoryDetail[];
    rental_items?: RentalItem[];
    deposit_status?: string | null;
    deposit_refunded_amount?: number | null;
    deposit_retained_amount?: number | null;
    deposit_notes?: string | null;
};

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