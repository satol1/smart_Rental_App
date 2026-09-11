// src/hooks/reservation/submission/useReservationFormData.ts

import { useCallback } from "react";
import { useReserveStore } from "@/store/reserveStore";
import { useDateStore } from "@/store/dateStore";
import { usePromoCodeStore, RESERVE_PROMO_SCOPE, EMPTY_PROMO_SCOPE_STATE } from "@/store/promoCodeStore";
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
    // Промокод читаем селектором только своего скоупа (страница оформления),
    // чтобы изменения чужих флоу не ре-рендерили эту форму
    const {
        promoCodeInput,
        appliedPromoCode,
    } = usePromoCodeStore((s) => s.scopes[RESERVE_PROMO_SCOPE] ?? EMPTY_PROMO_SCOPE_STATE);
    const setPromoCodeInputAction = usePromoCodeStore((s) => s.setPromoCodeInput);
    const applyPromoCodeAction = usePromoCodeStore((s) => s.applyPromoCode);
    const removePromoCodeAction = usePromoCodeStore((s) => s.removePromoCode);

    // Привязываем действия стора к скоупу резерва, потребители работают как раньше
    const setPromoCodeInput = useCallback(
        (code: string) => setPromoCodeInputAction(RESERVE_PROMO_SCOPE, code),
        [setPromoCodeInputAction]
    );
    const applyPromoCode = useCallback(
        () => applyPromoCodeAction(RESERVE_PROMO_SCOPE),
        [applyPromoCodeAction]
    );
    const removePromoCode = useCallback(
        () => removePromoCodeAction(RESERVE_PROMO_SCOPE),
        [removePromoCodeAction]
    );

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
