// src/hooks/admin/useAdminReservationCalculator.ts

import { useMemo } from "react";
import type { UseFormWatch } from "react-hook-form";
import { usePromoCodeStore } from "@/store/promoCodeStore";
import { usePriceCalculator } from "../reservation/usePriceCalculator";
import type { CreateReservationFormData } from "./create-reservation/useCreateReservationForm";
import type { Equipment } from "@/types/equipment";

/**
 * Хук для расчета стоимости резерва в админ-панели.
 * Использует централизованный usePriceCalculator как единый источник правды.
 */
export function useAdminReservationCalculator(
    watch: UseFormWatch<CreateReservationFormData>,
    allEquipment: Equipment[] = []
) {
    const watchedStartDateStr = watch("start_date");
    const watchedEndDateStr = watch("end_date");
    const watchedEquipmentIds = watch("equipment_ids");
    const watchedSelectedAccessories = watch("selected_accessories") || {};

    const { 
        promoCodeInput: promoCode, 
        setPromoCodeInput: setPromoCode, 
        appliedPromoCode,
        applyPromoCode: storeApplyPromoCode,
        removePromoCode: storeRemovePromoCode,
        promoCodeMessage 
    } = usePromoCodeStore();

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

    const applyPromoCode = () => {
        storeApplyPromoCode(); // Применяем промокод из стора
    };

    const removePromoCode = () => {
        storeRemovePromoCode(); // Удаляем промокод из стора
    };

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
        
        // Состояния загрузки
        isApplyingPromoCode: priceCalculator.isApplyingPromoCode,
        isCalculatingPrice: priceCalculator.isCalculatingPrice,
        isFetchingPrice: priceCalculator.isFetchingPrice,
    };
}