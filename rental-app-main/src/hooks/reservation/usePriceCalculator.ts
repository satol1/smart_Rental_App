// src/hooks/reservation/usePriceCalculator.ts

import { useQuery } from "@tanstack/react-query";
import { ReservationService, type PriceDetails } from "@/core/services";
import { formatDate } from "@/lib/utils";
import { combinedDiscountPercentage } from "@/constants/discount";

interface UsePriceCalculatorInput {
    equipmentIds: number[];
    startDate: Date;
    endDate: Date;
    selectedAccessories: Record<number, number[]>;
    promoCode?: string;
    enabled?: boolean;
}

export { type PriceDetails };

/**
 * Единый хук для расчета стоимости резерва.
 * Является единственным источником правды для всех финансовых расчетов в приложении.
 */
export const usePriceCalculator = ({
    equipmentIds, 
    startDate, 
    endDate, 
    selectedAccessories, 
    promoCode, 
    enabled = true
}: UsePriceCalculatorInput) => {

    const queryKey = [
        "priceCalculation",
        [...equipmentIds].sort(),
        formatDate(startDate),
        formatDate(endDate),
        JSON.stringify(selectedAccessories),
        promoCode || ""
    ];

    const query = useQuery<PriceDetails>({
        queryKey: queryKey,
        queryFn: async () => {
            return ReservationService.calculatePrice({
                equipment_ids: equipmentIds,
                start_date: formatDate(startDate),
                end_date: formatDate(endDate),
                selected_accessories: selectedAccessories,
                promo_code: promoCode
            });
        },
        enabled: enabled && equipmentIds.length > 0 && !!startDate && !!endDate && startDate < endDate,
        staleTime: 5000,
    });

    // Возвращаем расширенный объект с дополнительными вычисляемыми полями
    return {
        ...query,
        // Основные данные из API
        priceDetails: query.data,
        
        // Вычисляемые поля для удобства использования
        dayCount: query.data?.day_count ?? 0,
        fullTotal: query.data?.full_total ?? 0,
        finalTotal: query.data?.final_total ?? 0,
        discountAmount: query.data?.discount_amount ?? 0,
        durationDiscountPercentage: query.data?.duration_discount_percentage ?? 0,
        promoDiscountPercentage: query.data?.promo_discount_percentage ?? 0,
        totalDiscountPercentage: combinedDiscountPercentage(query.data?.duration_discount_percentage ?? 0, query.data?.promo_discount_percentage ?? 0),
        promoCodeMessage: query.data?.promo_code_message ?? "",
        
        // Состояния загрузки
        isCalculatingPrice: query.isLoading,
        isFetchingPrice: query.isFetching,
        isApplyingPromoCode: query.isFetching && !!promoCode,
    };
};