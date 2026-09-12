// src/hooks/__tests__/usePackPriceCalculator.test.tsx
// Цена пачки считается по самому дешёвому доступному элементу пачки.

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

import { usePackPriceCalculator } from '@/hooks/usePackPriceCalculator';
import { useDateStore } from '@/store/dateStore';
import type { PublicPackOut } from '@/types/pack';

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}

const PACK: PublicPackOut = {
    id: 1,
    name: 'Пачка',
    brand: 'Brand',
    equipment_type: 'Фотокамеры',
    entity_type: 'pack',
    total_count: 3,
    available_count: 2,
    min_daily_rate: 1000,
    cheapest_available_id: 42,
    equipment_ids: [42, 43, 44],
};

describe('usePackPriceCalculator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        const start = new Date(2030, 5, 10);
        const end = new Date(2030, 5, 12);
        useDateStore.getState().setRange(start, end);
    });

    it('считает цену по cheapest_available_id', async () => {
        calculatePrice.mockResolvedValueOnce({
            day_count: 3,
            full_total: 3000,
            final_total: 2850,
            discount_amount: 150,
            duration_discount_percentage: 5,
            promo_discount_percentage: 0,
            promo_code_message: null,
        });

        const { result } = renderHook(() => usePackPriceCalculator(PACK), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.finalTotal).toBe(2850));

        const call = calculatePrice.mock.calls[0][0] as { equipment_ids: number[] };
        expect(call.equipment_ids).toEqual([42]);
    });

    it('не запрашивает расчёт без пачки', async () => {
        renderHook(() => usePackPriceCalculator(null), { wrapper: createWrapper() });

        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(calculatePrice).not.toHaveBeenCalled();
    });

    it('не запрашивает расчёт, если доступных элементов нет', async () => {
        const soldOut: PublicPackOut = { ...PACK, available_count: 0, cheapest_available_id: undefined };

        renderHook(() => usePackPriceCalculator(soldOut), { wrapper: createWrapper() });

        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(calculatePrice).not.toHaveBeenCalled();
    });
});
