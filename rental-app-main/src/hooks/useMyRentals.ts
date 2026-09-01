import { useInfiniteQuery, type QueryFunctionContext } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { RentalListResponse } from "@/types/rental";
import { useCurrentUser } from "./useProfile";

const MY_RENTALS_KEY = "myRentals";

interface UseMyRentalsParams {
    search?: string;
    status?: string;
    sort?: string;
}

export function useMyRentals(params?: UseMyRentalsParams, limit: number = 10) {
    const { data: user } = useCurrentUser();

    return useInfiniteQuery<RentalListResponse, Error>({
        queryKey: [MY_RENTALS_KEY, params],
        queryFn: async ({ pageParam = 0 }: QueryFunctionContext) => {
            try {
                const skip = (pageParam as number) * limit;
                const response = await api.get<RentalListResponse>("/user/rentals", {
                    params: { skip, limit, ...params },
                });
                // Защита от undefined данных и проверка структуры
                const data = response.data;
                if (!data || typeof data !== 'object') {
                    return { items: [], total: 0 };
                }
                if (!Array.isArray(data.items)) {
                    return { items: [], total: data.total || 0 };
                }
                return data;
            } catch (error) {
                console.error('Error fetching user rentals:', error);
                return { items: [], total: 0 };
            }
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const loadedItems = allPages.reduce((acc, page) => acc + (page?.items?.length || 0), 0);
            if (loadedItems < (lastPage?.total || 0)) {
                return allPages.length;
            }
            return undefined;
        },
        enabled: !!user, // Выполнять запрос только если пользователь авторизован
    });
}
