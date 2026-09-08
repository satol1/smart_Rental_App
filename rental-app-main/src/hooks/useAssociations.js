// src/hooks/useAssociations.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
const ASSOCIATIONS_QUERY_KEY = ["associations"];
export function useAssociations() {
    // ИЗМЕНЕНИЕ: Хук теперь ожидает Association[] как конечный результат для компонента
    return useQuery({
        queryKey: ASSOCIATIONS_QUERY_KEY,
        queryFn: async () => {
            // Запрашиваем у API объект AssociationListResponse
            const response = await api.get("/associations/");
            // А возвращаем только массив `items`
            return response.data.items;
        },
        staleTime: 5 * 60 * 1000, // 5 минут
    });
}
