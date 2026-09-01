// src/hooks/admin/useDashboardData.ts

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Типы данных для дашборда
export interface KpiData {
    // --- Существующие поля ---
    total_users: number;
    active_users: number;
    total_equipment: number;
    total_reservations: number;
    revenue_today: number;
    revenue_this_month: number;
    occupancy_rate: number;
    avg_rental_duration: number;

    // +++ НОВЫЕ ПОЛЯ +++
    active_reservations: number;
    total_rentals: number;
    active_rentals: number;
    overdue_rentals: number;
    total_accessories: number;
    total_associations: number;
}

export interface DashboardSummary {
    pickups_today: PickupReturnItem[];
    returns_today: PickupReturnItem[];
    overdue_rentals: OverdueRentalItem[];
    kpi: KpiData;
    recent_activity: ActivityFeedItem[];
    popular_equipment: PopularEquipmentItem[];
}

export interface PickupReturnItem {
    id: number;
    user_name: string;
    user_phone: string | null;
    user_telegram: string | null;
    user_status: string;
    user_balance: number;
    equipment_list: string[];
    user_id: number;
    order_type: string;
    scheduled_time: string | null;
    start_date?: string;
    user_client_status?: 'new' | 'vip' | null;
    is_pending_pickup: boolean;
}

export interface OverdueRentalItem {
    id: number;
    user_name: string;
    user_phone: string | null;
    user_telegram: string | null;
    user_status: string;
    user_balance: number;
    equipment_list: string[];
    user_id: number;
    order_type: string;
    due_date: string | null;
    days_overdue: number | null;
    user_client_status?: 'new' | 'vip' | null;
}

export interface ActivityFeedItem {
    id: number;
    type: 'reservation_created' | 'reservation_cancelled' | 'rental_started' | 'rental_completed' | 'user_registered' | 'equipment_added';
    description: string;
    timestamp: string;
    user_name?: string;
    equipment_name?: string;
}

export interface PopularEquipmentItem {
    equipment_id: number;
    equipment_name: string;
    rental_count: number;
    revenue: number;
}

export const useDashboardData = () => {
    return useQuery({
        queryKey: ['admin', 'dashboardSummary'],
        queryFn: async (): Promise<DashboardSummary> => {
            const response = await api.get('/admin/dashboard-summary');
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 минут
        refetchInterval: 2 * 60 * 1000, // 2 минуты
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
};
