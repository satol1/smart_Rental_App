// src/hooks/reservation/__tests__/usePriceCalculator.test.tsx
// Единственный источник правды по финансам: расчёт цены, потолок скидки 75%,
// производные поля и гейты enabled.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const calculatePrice = vi.fn();

vi.mock('@/core/services', () => ({
    ReservationService: {
        calculatePrice: (...args: unknown[]) => calculatePrice(...args),
    },
}));

import { usePriceCalculator } from '@/hooks/reservation/usePriceCalculator';
import type { PriceDetails } from '@/core/services';

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}

const BASE_DETAILS: PriceDetails = {
    day_count: 5,
    full_total: 10000,
    final_total: 8500,
    discount_amount: 1500,
    duration_discount_percentage: 10,
    promo_discount_percentage: 5,
    promo_code_message: 'Промокод применён',
};

function makeInput(overrides: Partial<Parameters<typeof usePriceCalculator>[0]> = {}) {
    const start = new Date(2030, 5, 10);
    const end = new Date(2030, 5, 14);
    return {
        equipmentIds: [1, 2],
        startDate: start,
        endDate: end,
        selectedAccessories: { 1: [10] },
        ...overrides,
    };
}

describe('usePriceCalculator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('возвращает данные API и производные поля', async () => {
        calculatePrice.mockResolvedValueOnce(BASE_DETAILS);

        const { result } = renderHook(() => usePriceCalculator(makeInput()), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.priceDetails).toEqual(BASE_DETAILS));

        expect(result.current.dayCount).toBe(5);
        expect(result.current.fullTotal).toBe(10000);
        expect(result.current.finalTotal).toBe(8500);
        expect(result.current.discountAmount).toBe(1500);
        expect(result.current.promoCodeMessage).toBe('Промокод применён');
    });

    it('суммирует скидки ниже потолка', async () => {
        calculatePrice.mockResolvedValueOnce(BASE_DETAILS);

        const { result } = renderHook(() => usePriceCalculator(makeInput()), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.priceDetails).toBeDefined());

        expect(result.current.totalDiscountPercentage).toBe(15); // 10 + 5
    });

    it('режет суммарную скидку на потолке 75% (рескейл как на бэкенде)', async () => {
        calculatePrice.mockResolvedValueOnce({
            ...BASE_DETAILS,
            duration_discount_percentage: 60,
            promo_discount_percentage: 30,
        });

        const { result } = renderHook(() => usePriceCalculator(makeInput()), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.priceDetails).toBeDefined());

        // 60 + 30 = 90, но фронт показывает потолок 75 — ровно то, что спишет бэкенд
        expect(result.current.totalDiscountPercentage).toBe(75);
    });

    it('не запрашивает расчёт без оборудования', async () => {
        const { result } = renderHook(() => usePriceCalculator(makeInput({ equipmentIds: [] })), {
            wrapper: createWrapper(),
        });

        // даём шанс асинхронному запросу уйти
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(calculatePrice).not.toHaveBeenCalled();
        expect(result.current.finalTotal).toBe(0);
    });

    it('не запрашивает расчёт при конце раньше начала', async () => {
        renderHook(
            () =>
                usePriceCalculator(
                    makeInput({
                        startDate: new Date(2030, 5, 14),
                        endDate: new Date(2030, 5, 10),
                    }),
                ),
            { wrapper: createWrapper() },
        );

        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(calculatePrice).not.toHaveBeenCalled();
    });

    it('передаёт промокод в сервис и отражает isApplyingPromoCode', async () => {
        let resolveCalc: (value: PriceDetails) => void = () => {};
        calculatePrice.mockReturnValueOnce(new Promise<PriceDetails>((resolve) => { resolveCalc = resolve; }));

        const { result } = renderHook(() => usePriceCalculator(makeInput({ promoCode: 'WINTER' })), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isFetching).toBe(true));
        expect(result.current.isApplyingPromoCode).toBe(true);

        resolveCalc(BASE_DETAILS);
        await waitFor(() => expect(result.current.isApplyingPromoCode).toBe(false));

        const call = calculatePrice.mock.calls[0][0] as { promo_code?: string };
        expect(call.promo_code).toBe('WINTER');
    });
});
