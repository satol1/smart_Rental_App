// src/hooks/usePackPriceCalculator.ts
import { usePriceCalculator } from './reservation/usePriceCalculator';
import { useDateStore } from '@/store/dateStore';
import type { PublicPackOut } from '@/types/pack';

/**
 * Хук для расчета цены пачки, основанный на самом дешевом доступном элементе.
 */
export const usePackPriceCalculator = (pack: PublicPackOut | null) => {
    const { startDate, endDate } = useDateStore();

    // ID для расчета - это ID самого дешевого доступного элемента
    const equipmentIdToCalculate = pack?.cheapest_available_id ? [pack.cheapest_available_id] : [];

    const priceCalculator = usePriceCalculator({
        equipmentIds: equipmentIdToCalculate,
        startDate: startDate,
        endDate: endDate,
        selectedAccessories: {}, // Аксессуары для пачки выбираются позже
        enabled: !!pack && equipmentIdToCalculate.length > 0,
    });

    return priceCalculator;
};
