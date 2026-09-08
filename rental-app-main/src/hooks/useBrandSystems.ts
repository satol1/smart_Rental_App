// src/hooks/useBrandSystems.ts
import { useQuery } from "@tanstack/react-query";
import { BrandSystemService } from "@/core/services/BrandSystemService";

// Переиспользуем типы из админки, так как структура ответа та же


const BRAND_SYSTEMS_QUERY_KEY = ["brandSystems"];

export function useBrandSystems() {
    return useQuery({
        queryKey: BRAND_SYSTEMS_QUERY_KEY,
        queryFn: async () => {
            const response = await BrandSystemService.getAll();
            // Сортируем по имени для консистентного отображения
            response.items.sort((a, b) => a.name.localeCompare(b.name));
            return response;
        },
        staleTime: 60 * 60 * 1000, // 1 час, т.к. системы меняются редко
    });
}
