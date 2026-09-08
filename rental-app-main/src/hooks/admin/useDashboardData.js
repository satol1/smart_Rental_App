// src/hooks/admin/useDashboardData.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
export const useDashboardData = () => {
    return useQuery({
        queryKey: ['admin', 'dashboardSummary'],
        queryFn: async () => {
            const response = await api.get('/admin/dashboard-summary');
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 минут
        refetchInterval: 2 * 60 * 1000, // 2 минуты
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
};
