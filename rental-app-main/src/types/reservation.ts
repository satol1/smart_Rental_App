// src/types/reservation.ts

import type { UserOut } from "./user";
import type { Accessory } from "./accessory";
import type { AdminRentalOut } from "./rental";
import type { OrderStatus } from '@/constants/statusConstants';

export interface AccessoryLink {
    equipment_id: number;
    accessory: Accessory;
}

export interface Reservation {
    id: number;
    equipment_ids: number[];
    start_date: string;
    end_date: string;
    status: OrderStatus;
    total_cost?: number;
    discount_amount?: number;
    promo_code?: string | null;
    selected_accessories?: Record<number, number[]>;
    accessory_links?: AccessoryLink[];
    rental_id?: number | null;
}

export interface ReservationWithNames extends Reservation {
    equipment_names: string[];
}

export interface ReservationListResponse {
    items: Reservation[];
    total: number;
}

/* // Закомментированный интерфейс
export interface ReservationItem {
    id: number;
    user_id: number;
    equipment_ids: number[];
    start_date: string;
    end_date: string;
    status: OrderStatus;
    selected_accessories?: Record<number, number[]>;
    total_cost?: number;
    discount_amount?: number;
    promo_code?: string | null;
    rental_id?: number | null;
}
*/

export interface AdminReservationOut {
    id: number;
    user_id: number;
    equipment_ids: number[];
    start_date: string;
    end_date: string;
    status: OrderStatus;
    selected_accessories?: Record<number, number[]>;
    accessory_links?: AccessoryLink[];
    user_info: UserOut;
    total_cost?: number;
    discount_amount?: number;
    promo_code?: string | null;
    rental_id?: number | null;
}

export interface AdminReservationListResponse {
    items: AdminReservationOut[];
    total: number;
}

// Интерфейс для ответа API деталей события календаря
export interface CalendarEventDetailsResponse {
    order: AdminReservationOut | AdminRentalOut | any; // any для публичной версии
    is_owner: boolean;
    has_extended_access: boolean;
}