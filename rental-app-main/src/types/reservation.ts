// src/types/reservation.ts

import type { UserOut } from "./user";
import type { Accessory } from "./accessory";
import type { Equipment } from "./equipment";
import type { OrderStatus } from '@/constants/statusConstants';
import type { ApiAdminReservationOut } from "@/types/api/schemas";

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
    /** Момент создания (ISO) — для grace-периода отмены/редактирования */
    created_at?: string | null;
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

/**
 * Админ-резерв из API. База — сгенерированная схема (codegen), поверх — уточнения:
 * статус расширен до OrderStatus приложения, аксессуары приведены к прикладному типу,
 * добавлено write-only поле selected_accessories (в ответ его нет, но фронт его
 * достраивает после GET для формы редактирования).
 */
export type AdminReservationOut = Omit<ApiAdminReservationOut,
    "status" | "user_info" | "accessory_links"
> & {
    status: OrderStatus;
    user_info: UserOut;
    accessory_links?: AccessoryLink[];
    selected_accessories?: Record<number, number[]>;
};

export interface AdminReservationListResponse {
    items: AdminReservationOut[];
    total: number;
}

/**
 * Унифицированное представление заказа (резерв/аренда) для модалки деталей события календаря.
 * Объединяет поля админ-версий (AdminReservationOut/AdminRentalOut) и публичной
 * (ограниченной) версии API; отсутствующие в конкретной версии поля опциональны.
 */
export interface CalendarEventOrder {
    id: number;
    start_date: string;
    end_date: string;
    // Поля админ-версий
    user?: UserOut | null;
    user_info?: UserOut | null;
    equipment?: Equipment[];
    accessory_links?: AccessoryLink[];
    total_cost?: number;
    discount_amount?: number;
    promo_code?: string | null;
    // Поля публичной (ограниченной) версии
    equipment_name?: string | null;
    equipment_type?: string | null;
    equipment_brand?: string | null;
}

// Интерфейс для ответа API деталей события календаря
export interface CalendarEventDetailsResponse {
    order: CalendarEventOrder;
    is_owner: boolean;
    has_extended_access: boolean;
}
