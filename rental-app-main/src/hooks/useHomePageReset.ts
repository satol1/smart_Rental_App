// src/hooks/useHomePageReset.ts

import { useCallback } from "react";
import { useSearchStore } from "@/store/searchStore";
import { useFilterStore } from "@/store/filterStore";
import { useDateStore } from "@/store/dateStore";
import { useReserveStore } from "@/store/reserveStore";
import { useViewModeStore } from "@/store/viewModeStore";
import { useHolidayStore } from "@/store/holidayStore";
import { usePromoCodeStore, RESERVE_PROMO_SCOPE } from "@/store/promoCodeStore";

/**
 * Хук для сброса всех состояний главной страницы к значениям по умолчанию
 */
export const useHomePageReset = () => {
    const searchStore = useSearchStore();
    const filterStore = useFilterStore();
    const dateStore = useDateStore();
    const reserveStore = useReserveStore();
    const viewModeStore = useViewModeStore();
    // Действие стора промокодов получаем селектором — без подписки на чужие скоупы
    const clearPromoCodeAction = usePromoCodeStore((s) => s.clearPromoCode);
    const { holidays } = useHolidayStore();

    const resetHomePage = useCallback(() => {
        // Сбрасываем поиск
        searchStore.setQuery("");
        
        // Сбрасываем фильтры
        filterStore.reset();
        
        // Сбрасываем даты к значениям по умолчанию
        dateStore.initializeDates(holidays);
        
        // Очищаем корзину резерва
        reserveStore.clearItemsOnly();
        
        // Сбрасываем режим отображения
        viewModeStore.setViewMode('default');
        
        // Сбрасываем промокод скоупа страницы оформления (каталог/главная)
        clearPromoCodeAction(RESERVE_PROMO_SCOPE);
    }, [searchStore, filterStore, dateStore, reserveStore, viewModeStore, clearPromoCodeAction, holidays]);

    return { resetHomePage };
};
