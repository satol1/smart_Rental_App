// path: rental-app-main/src/hooks/reservation/submission/useReserveSubmission.ts
import { useMemo } from "react";
import { toast } from "sonner";
import { useReservations } from "@/hooks/useReservations";
import { useAvailabilityCheck } from "@/hooks/useAvailabilityCheck";
import { reservationCreateSchema } from "@/lib/validationSchemas";
import { usePriceCalculator } from "../usePriceCalculator";
import { formatDate } from "@/lib/utils";
import { useReservationFormData } from "./useReservationFormData";
export function useReserveSubmission() {
    const { user, startDate, endDate, dayCount, items, selectedAccessories, promoCodeInput, appliedPromoCode, setStartDate, setEndDate, removeItemFromStore, clearReserveStore, isAccessorySelected, toggleAccessory, setPromoCodeInput, applyPromoCode: applyPromoCodeFromStore, removePromoCode, } = useReservationFormData();
    const equipmentIds = useMemo(() => items.map(i => i.id), [items]);
    const { availabilityMap, conflictingItemIds, isLoading: isCheckingAvailability } = useAvailabilityCheck({
        equipmentIds, startDate, endDate
    });
    const priceCalculator = usePriceCalculator({
        equipmentIds, startDate, endDate, selectedAccessories, promoCode: appliedPromoCode
    });
    const accessoriesDailyTotal = useMemo(() => {
        return items.reduce((total, item) => {
            const selectedForThisItem = selectedAccessories[item.id] || [];
            return total + (item.accessories?.reduce((accTotal, accessory) => selectedForThisItem.includes(accessory.id) ? accTotal + accessory.price : accTotal, 0) ?? 0);
        }, 0);
    }, [items, selectedAccessories]);
    const { createReservation } = useReservations();
    const { isPending: isSubmitting, isSuccess: reservationSuccess, mutateAsync, error } = createReservation;
    const unavailableIdsFromAPI = useMemo(() => error?.unavailable_ids ?? [], [error]);
    const handleSubmit = async () => {
        if (!user) {
            toast.error("Необходимо авторизоваться для создания резерва.");
            return;
        }
        if (conflictingItemIds.length > 0) {
            toast.error("Некоторые выбранные позиции недоступны. Удалите их или измените даты.");
            return;
        }
        const payload = {
            equipment_ids: items.map(i => i.id),
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            selected_accessories: selectedAccessories,
            promo_code: appliedPromoCode || undefined,
        };
        console.log('[useReserveSubmission] Payload before validation:', JSON.stringify(payload, null, 2));
        const validationResult = reservationCreateSchema.safeParse(payload);
        if (!validationResult.success) {
            const errorMessages = validationResult.error.errors.map(e => e.message).join("\n");
            toast.error(`Ошибка валидации данных:\n${errorMessages}`);
            return;
        }
        try {
            await mutateAsync(validationResult.data);
            // Успешная отправка обработается в хуке useReservations (редирект и очистка)
        }
        catch (e) {
            console.error("Submission failed:", e);
        }
    };
    const applyPromoCode = () => {
        if (!promoCodeInput) {
            toast.info("Введите промокод для применения.");
            return;
        }
        applyPromoCodeFromStore();
    };
    return {
        items,
        user,
        startDate,
        endDate,
        availabilityMap,
        unavailableIdsFromAPI,
        invalidItems: conflictingItemIds,
        isLoadingAvailability: isCheckingAvailability || priceCalculator.isCalculatingPrice,
        isSubmitting,
        isApplyingPromoCode: priceCalculator.isApplyingPromoCode,
        reservationSuccess,
        submitMessage: error?.message,
        selectedAccessories,
        priceDetails: priceCalculator.priceDetails,
        dayCount: priceCalculator.dayCount || dayCount,
        fullTotal: priceCalculator.fullTotal,
        totalDiscountPercentage: priceCalculator.totalDiscountPercentage,
        discountAmount: priceCalculator.discountAmount,
        finalTotal: priceCalculator.finalTotal,
        accessoriesDailyTotal,
        promoCode: promoCodeInput,
        promoCodeMessage: priceCalculator.promoCodeMessage,
        setStartDate,
        setEndDate,
        clearReserveStore,
        removeItemFromStore,
        isAccessorySelected,
        toggleAccessory,
        setPromoCode: setPromoCodeInput,
        applyPromoCode,
        removePromoCode,
        handleSubmit,
    };
}
