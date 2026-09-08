// path: rental-app-main/src/hooks/reservation/useReservationData.ts

import { useMemo, useEffect } from "react";
import { usePriceCalculator } from "./usePriceCalculator";
import { useAvailabilityCheck } from "@/hooks/useAvailabilityCheck";
import type { EditState } from "./useReservationState";
import type { Reservation } from "@/types/reservation";
import { usePromoCodeStore } from "@/store/promoCodeStore";
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
};

export function useReservationData(reservation: Reservation, state: EditState) {
    // Используем все состояния и действия из обновленного стора
    const {
        promoCodeInput,
        appliedPromoCode,
        setPromoCodeInput,
        applyPromoCode: applyPromoCodeFromStore,
        removePromoCode,
        initializeFromReservation
    } = usePromoCodeStore();

    // Инициализируем стор данными из резерва при первом рендере
    useEffect(() => {
        const discountPercentage = reservation.total_cost && reservation.discount_amount
            ? (reservation.discount_amount / (reservation.total_cost + reservation.discount_amount)) * 100
            : 0;
        initializeFromReservation(reservation.promo_code, discountPercentage);
    }, [reservation.id, reservation.promo_code, reservation.total_cost, reservation.discount_amount, initializeFromReservation]);


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
        if (!priceDetails) {
            return { ...emptyFinancials, promoCode: appliedPromoCode };
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
            promoCode: appliedPromoCode,
        };
    }, [priceCalculator.priceDetails, appliedPromoCode]);

    const applyPromoCode = () => {
        if (!promoCodeInput) {
            toast.info("Введите промокод для применения.");
            return;
        }
        applyPromoCodeFromStore();
    };

    return {
        availabilityMap,
        hasConflicts,
        isCheckingAvailability,
        isCalculatingPrice: priceCalculator.isCalculatingPrice,
        financials,
        promoCode: promoCodeInput,
        setPromoCode: setPromoCodeInput,
        applyPromoCode,
        removePromoCode,
        appliedPromoCode,
        priceDetails: priceCalculator.priceDetails,
    };
}