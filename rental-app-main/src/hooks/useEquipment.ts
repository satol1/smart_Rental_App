// src/hooks/useEquipment.ts

import { useInfiniteQuery, type QueryFunctionContext } from "@tanstack/react-query";
import { EquipmentService, type EquipmentListResponse, type EquipmentFilterParams } from "@/core/services/EquipmentService";
import { handleQueryError } from "@/lib/queryHelpers";
import { PAGINATION_CONSTANTS } from "@/constants/paginationConstants";
import { formatDate } from "@/lib/utils";
import { useDebounce } from "./useDebounce";

export function useEquipment(filters: EquipmentFilterParams = {}) {
    // Деструктурируем все возможные фильтры
    const { query, type, brandSystemId, associationId, availableOnly, startDate, endDate, groupSimilar } = filters;
    
    // Применяем debounce к поисковому запросу для оптимизации
    const debouncedQuery = useDebounce(query, 350);

    return useInfiniteQuery<EquipmentListResponse, Error>({
        // Добавляем новые параметры в ключ запроса для корректного кэширования
        queryKey: ["equipment", {
            query: debouncedQuery, // Используем debounced query в ключе
            type,
            brandSystemId,
            associationId,
            availableOnly,
            groupSimilar,
            // Используем отформатированные даты в ключе, чтобы избежать проблем с объектами Date
            startDate: startDate ? formatDate(startDate) : undefined,
            endDate: endDate ? formatDate(endDate) : undefined,
        }],

        queryFn: async ({ pageParam = 0 }: QueryFunctionContext): Promise<EquipmentListResponse> => {
            const pageSize = PAGINATION_CONSTANTS.HOME_PAGE_SIZE;
            const skip = (pageParam as number) * pageSize;
            try {
                // Передаем весь объект filters в сервис, но с debounced query
                const filtersWithDebouncedQuery = { ...filters, query: debouncedQuery };
                return await EquipmentService.getAllEquipment(skip, pageSize, filtersWithDebouncedQuery);
            } catch (error) {
                handleQueryError(error);
                throw error; // Пробрасываем ошибку дальше для react-query
            }
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            // ✅ ОБНОВЛЕНО: Теперь все элементы находятся в page.items
            const totalLoadedCount = allPages.reduce((acc, page) => {
                return acc + (page.items?.length || 0);
            }, 0);

            if (totalLoadedCount < lastPage.total) {
                return allPages.length;
            }
            return undefined;
        },
        staleTime: 5 * 60 * 1000, // 5 минут
    });
}