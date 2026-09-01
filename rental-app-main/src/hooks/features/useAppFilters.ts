// src/hooks/features/useAppFilters.ts

import { useSearchStore } from "@/store/searchStore";
import { useFilterStore } from "@/store/filterStore";
import { useDateStore } from "@/store/dateStore";

/**
 * Хук для инкапсуляции логики получения всех фильтров приложения
 * Объединяет состояние из трех сторов: поиска, фильтров и дат
 */
export const useAppFilters = () => {
    const search = useSearchStore();
    const filters = useFilterStore();
    const dates = useDateStore();

    return {
        // Поиск
        query: search.query,
        
        // Фильтры
        type: filters.type,
        brand: filters.brand,
        availableOnly: filters.availableOnly,
        associationId: filters.associationId,
        reset: filters.reset,
        
        // Даты
        startDate: dates.startDate,
        endDate: dates.endDate,
    };
};

