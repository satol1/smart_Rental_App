// src/hooks/admin/useAdminReservationCalculator.ts

import { useCallback, useMemo } from "react";
import type { UseFormWatch } from "react-hook-form";
import { usePromoCodeStore, ADMIN_CREATE_RESERVATION_PROMO_SCOPE, EMPTY_PROMO_SCOPE_STATE } from "@/store/promoCodeStore";
import { usePriceCalculator } from "../reservation/usePriceCalculator";
import type { CreateReservationFormData } from "./create-reservation/useCreateReservationForm";
import type { Equipment } from "@/types/equipment";

/**
 * Хук для расчета стоимости резерва в админ-панели.
 * Использует централизованный usePriceCalculator как единый источник правды.
 */
export function useAdminReservationCalculator(
    watch: UseFormWatch<CreateReservationFormData>,
    allEquipment: Equipment[] = [],
    // Скоуп промокода: диалог создания резерва и диалог создания аренды с нуля —
    // независимые флоу и не должны делить промокод (задача 1.2 аудита)
    promoScope: string = ADMIN_CREATE_RESERVATION_PROMO_SCOPE
) {
    const watchedStartDateStr = watch("start_date");
    const watchedEndDateStr = watch("end_date");
    const watchedEquipmentIds = watch("equipment_ids");
    const watchedSelectedAccessories = watch("selected_accessories") || {};

    // Читаем селектором только свой скоуп
    const {
        promoCodeInput: promoCode,
        appliedPromoCode,
        promoCodeMessage,
    } = usePromoCodeStore((s) => s.scopes[promoScope] ?? EMPTY_PROMO_SCOPE_STATE);
    const setPromoCodeInputAction = usePromoCodeStore((s) => s.setPromoCodeInput);
    const storeApplyPromoCode = usePromoCodeStore((s) => s.applyPromoCode);
    const storeRemovePromoCode = usePromoCodeStore((s) => s.removePromoCode);

    const startDate = useMemo(() => watchedStartDateStr ? new Date(watchedStartDateStr) : new Date(), [watchedStartDateStr]);
    const endDate = useMemo(() => watchedEndDateStr ? new Date(watchedEndDateStr) : new Date(), [watchedEndDateStr]);

    const equipmentForCalc = useMemo(() =>
            allEquipment.filter(e => watchedEquipmentIds.includes(e.id)),
        [allEquipment, watchedEquipmentIds]
    );

    // Используем расширенный usePriceCalculator
    const priceCalculator = usePriceCalculator({
        equipmentIds: equipmentForCalc.map(i => i.id),
        startDate,
        endDate,
        selectedAccessories: watchedSelectedAccessories,
        promoCode: appliedPromoCode, // Используем appliedPromoCode вместо promoCodeInput
        enabled: watchedEquipmentIds.length > 0 && !!watchedStartDateStr && !!watchedEndDateStr
    });

    // Привязываем действия стора к скоупу диалога
    const setPromoCode = useCallback(
        (code: string) => setPromoCodeInputAction(promoScope, code),
        [setPromoCodeInputAction, promoScope]
    );

    const applyPromoCode = useCallback(() => {
        storeApplyPromoCode(promoScope); // Применяем промокод из стора
    }, [storeApplyPromoCode, promoScope]);

    const removePromoCode = useCallback(() => {
        storeRemovePromoCode(promoScope); // Удаляем промокод из стора
    }, [storeRemovePromoCode, promoScope]);

    // Возвращаем данные из централизованного хука
    return {
        // Основные данные из usePriceCalculator
        priceDetails: priceCalculator.priceDetails,
        
        // Финансовые данные из usePriceCalculator
        dayCount: priceCalculator.dayCount,
        fullTotal: priceCalculator.fullTotal,
        finalTotal: priceCalculator.finalTotal,
        discountAmount: priceCalculator.discountAmount,
        totalDiscountPercentage: priceCalculator.totalDiscountPercentage,
        durationDiscountPercentage: priceCalculator.durationDiscountPercentage,
        promoDiscountPercentage: priceCalculator.promoDiscountPercentage,
        
        // Промокод
        promoCode,
        setPromoCode,
        applyPromoCode,
        removePromoCode,
        appliedPromoCode, // Добавляем для использования в payload
        promoCodeMessage: priceCalculator.promoCodeMessage || promoCodeMessage,
        // Структурный флаг успеха: примененный код + скидка из расчета бэкенда (задача 1.5)
        promoCodeValid: Boolean(appliedPromoCode) && priceCalculator.promoDiscountPercentage > 0,
        
        // Состояния загрузки
        isApplyingPromoCode: priceCalculator.isApplyingPromoCode,
        isCalculatingPrice: priceCalculator.isCalculatingPrice,
        isFetchingPrice: priceCalculator.isFetchingPrice,
    };
}