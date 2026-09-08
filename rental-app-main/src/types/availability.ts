// src/types/availability.ts

export type EquipmentStatus = "available" | "reserved" | "rented";

export interface AvailabilityInfo {
  equipment_id: number;
  status: EquipmentStatus;
  start_date?: string | null;
  end_date?: string | null;
  details: string;
}

// ДОБАВЬТЕ ЭТОТ ИНТЕРФЕЙС
// Он описывает структуру ответа от /calendar/view
export interface AvailabilityListResponse {
  items: AvailabilityInfo[];
  total: number;
}


export interface ConflictDetail {
  type: 'reservation' | 'rental';
  id: number;
  user_name?: string; // Имя клиента в конфликте
  start_date: string;
  end_date: string;
}

export interface EquipmentConflictInfo {
  equipment_id: number;
  conflicts: ConflictDetail[];
}

/** Посуточные статусы оборудования: { equipmentId: { "DD.MM.YYYY": DayStatus } } */
export type DailyAvailabilityData = Record<number, Record<string, DayStatus>>;

export interface DayStatus {
  status: EquipmentStatus;
  group_id: string | null;
  is_user_reservation: boolean;
  user_id?: number;
  order_type?: 'reservation' | 'rental';
}