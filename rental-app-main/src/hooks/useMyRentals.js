import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentUser } from "./useProfile";
const MY_RENTALS_KEY = "myRentals";
export function useMyRentals(params, limit = 10) {
    const { data: user } = useCurrentUser();
    return useInfiniteQuery({
        queryKey: [MY_RENTALS_KEY, params],
        queryFn: async ({ pageParam = 0 }) => {
            try {
                const skip = pageParam * limit;
                const response = await api.get("/user/rentals", {
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
            }
            catch (error) {
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
