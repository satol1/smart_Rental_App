// path: rental-app-main/src/hooks/reservation/useReservationData.ts

import { useMemo, useEffect, useCallback } from "react";
import { usePriceCalculator } from "./usePriceCalculator";
import { useAvailabilityCheck } from "@/hooks/useAvailabilityCheck";
import type { EditState } from "./useReservationState";
import type { Reservation } from "@/types/reservation";
import { usePromoCodeStore, editReservationPromoScope, EMPTY_PROMO_SCOPE_STATE } from "@/store/promoCodeStore";
import { toast } from "sonner";
import { MAX_COMBINED_DISCOUNT_PERCENT } from "@/constants/discount";

const emptyFinancials = {
    dayCount: 0,
    fullTotal: 0,
    finalTotal: 0,
    discountAmount: 0,
    durationDiscountAmount: 0,
    durationDiscountPercentage: 0,
    promoDiscountAmount: 0,
    promoCodePercentage: 0,
    promoCodeMessage: "",
    promoCodeValid: false,
};

export function useReservationData(reservation: Reservation, state: EditState) {
    // Скоуп промокода привязан к конкретному резерву: параллельно открытые
    // карточки редактирования не перезаписывают промокоды друг друга
    const promoScopeKey = useMemo(() => editReservationPromoScope(reservation.id), [reservation.id]);
    // Читаем селектором только свой скоуп
    const {
        promoCodeInput,
        appliedPromoCode,
    } = usePromoCodeStore((s) => s.scopes[promoScopeKey] ?? EMPTY_PROMO_SCOPE_STATE);
    const setPromoCodeInputAction = usePromoCodeStore((s) => s.setPromoCodeInput);
    const applyPromoCodeAction = usePromoCodeStore((s) => s.applyPromoCode);
    const removePromoCodeAction = usePromoCodeStore((s) => s.removePromoCode);
    const initializeFromReservationAction = usePromoCodeStore((s) => s.initializeFromReservation);

    // Инициализируем скоуп данными из резерва при первом рендере
    useEffect(() => {
        const discountPercentage = reservation.total_cost && reservation.discount_amount
            ? (reservation.discount_amount / (reservation.total_cost + reservation.discount_amount)) * 100
            : 0;
        initializeFromReservationAction(promoScopeKey, reservation.promo_code, discountPercentage);
    }, [promoScopeKey, reservation.promo_code, reservation.total_cost, reservation.discount_amount, initializeFromReservationAction]);


    const { availabilityMap, hasConflicts, isLoading: isCheckingAvailability } = useAvailabilityCheck({
        equipmentIds: state.currentEquipmentDetails.map(eq => eq.id),
        startDate: state.startDate,
        endDate: state.endDate,
        excludeReservationId: reservation.id,
    });

    const priceCalculator = usePriceCalculator({
        equipmentIds: state.currentEquipmentDetails.map(i => i.id),
        startDate: state.startDate,
        endDate: state.endDate,
        selectedAccessories: state.localSelectedAccessories,
        promoCode: appliedPromoCode,
        enabled: true
    });

    const financials = useMemo(() => {
        const priceDetails = priceCalculator.priceDetails;
        // Валидность промокода вычисляем структурно по результату расчета бэкенда:
        // примененный код + фактическая скидка больше нуля (задача 1.5)
        const promoCodeValid = Boolean(appliedPromoCode) && (priceDetails?.promo_discount_percentage ?? 0) > 0;
        if (!priceDetails) {
            return { ...emptyFinancials, promoCode: appliedPromoCode, promoCodeValid };
        }
        // При срабатывании потолка 75% компоненты скидки пропорционально
        // масштабируем, чтобы их сумма сходилась с фактическим discount_amount
        const rawPct = priceDetails.duration_discount_percentage + priceDetails.promo_discount_percentage;
        const cappedPct = Math.min(rawPct, MAX_COMBINED_DISCOUNT_PERCENT);
        const scale = rawPct > 0 ? cappedPct / rawPct : 0;
        const durationDiscountAmount = priceDetails.full_total * (priceDetails.duration_discount_percentage * scale / 100);
        const promoDiscountAmount = priceDetails.full_total * (priceDetails.promo_discount_percentage * scale / 100);
        return {
            dayCount: priceDetails.day_count,
            fullTotal: priceDetails.full_total,
            finalTotal: priceDetails.final_total,
            discountAmount: priceDetails.discount_amount,
            durationDiscountAmount,
            durationDiscountPercentage: priceDetails.duration_discount_percentage,
            promoDiscountAmount,
            promoCodePercentage: priceDetails.promo_discount_percentage,
            promoCodeMessage: priceDetails.promo_code_message ?? "",
            promoCodeValid,
            promoCode: appliedPromoCode,
        };
    }, [priceCalculator.priceDetails, appliedPromoCode]);

    // Привязываем действия стора к скоупу этого резерва
    const setPromoCode = useCallback(
        (code: string) => setPromoCodeInputAction(promoScopeKey, code),
        [setPromoCodeInputAction, promoScopeKey]
    );

    const applyPromoCode = () => {
        if (!promoCodeInput) {
            toast.info("Введите промокод для применения.");
            return;
        }
        applyPromoCodeAction(promoScopeKey);
    };

    const removePromoCode = useCallback(
        () => removePromoCodeAction(promoScopeKey),
        [removePromoCodeAction, promoScopeKey]
    );

    return {
        availabilityMap,
        hasConflicts,
        isCheckingAvailability,
        isCalculatingPrice: priceCalculator.isCalculatingPrice,
        financials,
        promoCode: promoCodeInput,
        setPromoCode,
        applyPromoCode,
        removePromoCode,
        appliedPromoCode,
        priceDetails: priceCalculator.priceDetails,
    };
}