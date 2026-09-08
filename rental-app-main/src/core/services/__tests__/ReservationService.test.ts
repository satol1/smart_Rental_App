// src/core/services/__tests__//ReservationService.test.ts
// Тесты ReservationService: расчёт цены, создание резерва с user_id, маппинг имён.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiPost = vi.fn();

vi.mock('@/lib/api', () => ({
    api: {
        post: (...args: unknown[]) => apiPost(...args),
    },
}));

import { ReservationService } from '../ReservationService';
import type { Equipment } from '@/types/equipment';

describe('ReservationService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('calculatePrice', () => {
        it('отправляет payload с аксессуарами и промокодом', async () => {
            apiPost.mockResolvedValueOnce({ data: { day_count: 2, final_total: 1000 } });

            await ReservationService.calculatePrice({
                start_date: '2026-09-10',
                end_date: '2026-09-12',
                equipment_ids: [1],
                selected_accessories: { 1: [10] },
                promo_code: 'SAVE10',
            });

            expect(apiPost).toHaveBeenCalledWith('/reservations/calculate', {
                start_date: '2026-09-10',
                end_date: '2026-09-12',
                equipment_ids: [1],
                selected_accessories: { 1: [10] },
                promo_code: 'SAVE10',
            });
        });

        it('пустой промокод превращается в null', async () => {
            apiPost.mockResolvedValueOnce({ data: {} });

            await ReservationService.calculatePrice({
                start_date: '2026-09-10',
                end_date: '2026-09-12',
                equipment_ids: [1],
                selected_accessories: {},
                promo_code: '',
            });

            expect(apiPost).toHaveBeenCalledWith(
                '/reservations/calculate',
                expect.objectContaining({ promo_code: null }),
            );
        });
    });

    describe('createReservation', () => {
        it('добавляет user_id в payload при наличии', async () => {
            apiPost.mockResolvedValueOnce({ data: { id: 9 } });

            await ReservationService.createReservation({
                user_id: 7,
                start_date: '2026-09-10',
                end_date: '2026-09-12',
                equipment_ids: [1],
                selected_accessories: {},
            });

            expect(apiPost).toHaveBeenCalledWith(
                '/reservations/',
                expect.objectContaining({ user_id: 7 }),
            );
        });

        it('без user_id поле не добавляется', async () => {
            apiPost.mockResolvedValueOnce({ data: { id: 9 } });

            await ReservationService.createReservation({
                start_date: '2026-09-10',
                end_date: '2026-09-12',
                equipment_ids: [1],
                selected_accessories: {},
            });

            const payload = apiPost.mock.calls[0][1];
            expect(payload).not.toHaveProperty('user_id');
        });
    });

    describe('createReservationsWithNames', () => {
        const equipmentMap: Record<number, Equipment> = {
            1: {
                id: 1,
                equipment_type: 'Камера',
                brand: 'Canon',
                name: 'R5',
                serial_number: 'SN1',
                condition: 'excellent',
                daily_rate: 1000,
            } as Equipment,
        };

        it('добавляет имена оборудования к резерву', () => {
            const result = ReservationService.createReservationsWithNames(
                [{
                    id: 1,
                    equipment_ids: [1],
                    start_date: '2026-09-10',
                    end_date: '2026-09-12',
                    status: 'active',
                }],
                equipmentMap,
            );

            expect(result[0].equipment_names).toEqual(['Камера Canon R5']);
        });

        it('пропускает отсутствующее в map оборудование', () => {
            const result = ReservationService.createReservationsWithNames(
                [{
                    id: 1,
                    equipment_ids: [999],
                    start_date: '2026-09-10',
                    end_date: '2026-09-12',
                    status: 'active',
                }],
                equipmentMap,
            );

            expect(result[0].equipment_names).toEqual([]);
        });

        it('пустой список даёт пустой результат', () => {
            expect(ReservationService.createReservationsWithNames([], equipmentMap)).toEqual([]);
        });
    });
});
