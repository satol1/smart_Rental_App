// src/hooks/reservation/submission/useReservationFormData.ts

import { useReserveStore } from "@/store/reserveStore";
import { useDateStore } from "@/store/dateStore";
import { usePromoCodeStore } from "@/store/promoCodeStore";
import { useCurrentUser } from "@/hooks/useProfile";

/**
 * Хук-агрегатор для сбора данных из различных хранилищ (Zustand).
 * Собирает и возвращает единый объект со всеми необходимыми данными для страницы оформления.
 */
export const useReservationFormData = () => {
    // Получение данных из всех сторов
    const { data: user } = useCurrentUser();
    const { startDate, endDate, setStartDate, setEndDate, dayCount } = useDateStore();
    const { 
        items, 
        selectedAccessories, 
        remove: removeItemFromStore, 
        clear: clearReserveStore, 
        isAccessorySelected, 
        toggleAccessory 
    } = useReserveStore();
    const { 
        promoCodeInput, 
        appliedPromoCode,
        setPromoCodeInput, 
        applyPromoCode,
        removePromoCode 
    } = usePromoCodeStore();

    return {
        // Данные пользователя
        user,
        
        // Данные дат
        startDate,
        endDate,
        dayCount,
        
        // Данные резерва
        items,
        selectedAccessories,
        
        // Промокод
        promoCodeInput,
        appliedPromoCode,
        
        // Функции управления датами
        setStartDate,
        setEndDate,
        
        // Функции управления резервом
        removeItemFromStore,
        clearReserveStore,
        isAccessorySelected,
        toggleAccessory,
        
        // Функции управления промокодом
        setPromoCodeInput,
        applyPromoCode,
        removePromoCode,
    };
};
