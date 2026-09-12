// src/store/__tests__/sandboxCalculatorStore.test.ts
// Логика песочницы-калькулятора: выбор тира скидки, видимость, загрузка тиров.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSandboxCalculatorStore } from '@/store/sandboxCalculatorStore';
import { useDateStore } from '@/store/dateStore';
import type { DurationDiscount } from '@/types/discount';

const apiGet = vi.fn();

vi.mock('@/lib/api', () => ({
    api: {
        get: (...args: unknown[]) => apiGet(...args),
    },
}));

// Мокаем не-React кэш праздников: слайдер дат передаёт их в dateStore
vi.mock('@/hooks/useHolidays', () => ({
    getCachedHolidays: () => [],
}));

const TIERS: DurationDiscount[] = [
    { id: 1, min_days: 4, discount_percentage: 5 },
    { id: 2, min_days: 7, discount_percentage: 10 },
    { id: 3, min_days: 14, discount_percentage: 20 },
];

function resetStore(tiers: DurationDiscount[] = []) {
    useSandboxCalculatorStore.setState({
        durationDiscountTiers: tiers,
        durationDiscountPercentage: 0,
        isLoadingTiers: false,
        isCalculatorVisible: false,
    });
}

describe('sandboxCalculatorStore', () => {
    beforeEach(() => {
        // restoreAllMocks: снимает и spyOn с useDateStore.getState (clearAllMocks
        // оставляет шпион активным и ломает чтение dayCount в других тестах)
        vi.restoreAllMocks();
        vi.clearAllMocks();
        resetStore();
    });

    describe('_calculateDurationDiscount', () => {
        it('выбирает максимальный применимый тир', () => {
            resetStore(TIERS);
            useSandboxCalculatorStore.getState()._calculateDurationDiscount(7);
            expect(useSandboxCalculatorStore.getState().durationDiscountPercentage).toBe(10);
        });

        it('берёт самый большой тир при большом сроке', () => {
            resetStore(TIERS);
            useSandboxCalculatorStore.getState()._calculateDurationDiscount(30);
            expect(useSandboxCalculatorStore.getState().durationDiscountPercentage).toBe(20);
        });

        it('возвращает 0, если срок меньше минимального тира', () => {
            resetStore(TIERS);
            useSandboxCalculatorStore.getState()._calculateDurationDiscount(3);
            expect(useSandboxCalculatorStore.getState().durationDiscountPercentage).toBe(0);
        });

        it('возвращает 0 без тиров', () => {
            useSandboxCalculatorStore.getState()._calculateDurationDiscount(10);
            expect(useSandboxCalculatorStore.getState().durationDiscountPercentage).toBe(0);
        });
    });

    describe('setDaysFromCalendar', () => {
        it('показывает калькулятор при днях >= 4', () => {
            useSandboxCalculatorStore.getState().setDaysFromCalendar(5);
            expect(useSandboxCalculatorStore.getState().isCalculatorVisible).toBe(true);
        });

        it('не показывает калькулятор при днях < 4', () => {
            useSandboxCalculatorStore.getState().setDaysFromCalendar(3);
            expect(useSandboxCalculatorStore.getState().isCalculatorVisible).toBe(false);
        });

        it('пересчитывает процент при загруженных тирах', () => {
            resetStore(TIERS);
            useSandboxCalculatorStore.getState().setDaysFromCalendar(14);
            expect(useSandboxCalculatorStore.getState().durationDiscountPercentage).toBe(20);
        });
    });

    describe('setDaysFromSlider', () => {
        it('передаёт количество дней в dateStore', () => {
            const setDayCount = vi.fn();
            vi.spyOn(useDateStore, 'getState').mockReturnValue({
                ...useDateStore.getState(),
                setDayCount,
            } as ReturnType<typeof useDateStore.getState>);

            useSandboxCalculatorStore.getState().setDaysFromSlider(5);
            expect(setDayCount).toHaveBeenCalledWith(5, []);
            expect(useSandboxCalculatorStore.getState().isCalculatorVisible).toBe(true);
        });
    });

    describe('toggleCalculator', () => {
        it('переключает видимость', () => {
            expect(useSandboxCalculatorStore.getState().isCalculatorVisible).toBe(false);
            useSandboxCalculatorStore.getState().toggleCalculator();
            expect(useSandboxCalculatorStore.getState().isCalculatorVisible).toBe(true);
            useSandboxCalculatorStore.getState().toggleCalculator();
            expect(useSandboxCalculatorStore.getState().isCalculatorVisible).toBe(false);
        });
    });

    describe('fetchDiscountTiers', () => {
        it('грузит тиры с limit=100 и считает скидку по dayCount', async () => {
            useDateStore.setState({ dayCount: 7 });
            apiGet.mockResolvedValueOnce({ data: { items: TIERS, total: TIERS.length } });

            await useSandboxCalculatorStore.getState().fetchDiscountTiers();

            expect(apiGet).toHaveBeenCalledWith('/discounts/', { params: { limit: 100 } });
            expect(useSandboxCalculatorStore.getState().durationDiscountTiers).toEqual(TIERS);
            expect(useSandboxCalculatorStore.getState().durationDiscountPercentage).toBe(10);
        });

        it('не делает повторный запрос при уже загруженных тирах', async () => {
            resetStore(TIERS);
            await useSandboxCalculatorStore.getState().fetchDiscountTiers();
            expect(apiGet).not.toHaveBeenCalled();
        });
    });
});
