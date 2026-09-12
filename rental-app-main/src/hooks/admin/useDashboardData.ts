// src/hooks/admin/useDashboardData.ts

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
    ApiDashboardSummary,
    ApiKpiData,
    ApiActivityFeedItem,
    ApiTodayFocusItem,
    ApiPopularEquipmentItem,
} from "@/types/api/schemas";

/**
 * Типы дашборда выводятся из сгенерированной схемы (npm run gen:api).
 * Уточнения поверх схемы: user_client_status сужен к фактическим значениям бэкенда,
 * type ленты — к известным видам событий (виджеты имеют fallback на неизвестные).
 */
export type ActivityType =
    | 'reservation_created'
    | 'reservation_cancelled'
    | 'rental_started'
    | 'rental_completed'
    | 'user_registered'
    | 'equipment_added';

export type KpiData = ApiKpiData;
export type PickupReturnItem = Omit<ApiTodayFocusItem, "user_client_status"> & {
    user_client_status?: 'new' | 'vip' | null;
};
export type OverdueRentalItem = PickupReturnItem;
export type ActivityFeedItem = Omit<ApiActivityFeedItem, "type"> & {
    type: ActivityType | (string & {});
};
export type PopularEquipmentItem = ApiPopularEquipmentItem;

export type DashboardSummary = Omit<ApiDashboardSummary,
    "pickups_today" | "returns_today" | "overdue_rentals" | "recent_activity"
> & {
    pickups_today: PickupReturnItem[];
    returns_today: PickupReturnItem[];
    overdue_rentals: OverdueRentalItem[];
    recent_activity: ActivityFeedItem[];
};

export const useDashboardData = () => {
    return useQuery({
        queryKey: ['admin', 'dashboardSummary'],
        queryFn: async (): Promise<DashboardSummary> => {
            const response = await api.get<DashboardSummary>('/admin/dashboard-summary');
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 минут
        refetchInterval: 2 * 60 * 1000, // 2 минуты
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
};
