// src/core/services/__tests__/HolidayService.test.ts
// Тесты HolidayService: список выходных, создание (в т.ч. 409-конфликт), удаление.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiDelete = vi.fn();

vi.mock('@/lib/api', () => ({
    api: {
        get: (...args: unknown[]) => apiGet(...args),
        post: (...args: unknown[]) => apiPost(...args),
        delete: (...args: unknown[]) => apiDelete(...args),
    },
}));

import { HolidayService } from '../HolidayService';

describe('HolidayService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getHolidayList', () => {
        it('запрашивает диапазон дат с лимитом', async () => {
            apiGet.mockResolvedValueOnce({
                data: { items: [{ id: 1, date: '2026-01-01', description: 'Новый год' }], total: 1 },
            });

            const result = await HolidayService.getHolidayList('2026-01-01', '2026-01-31');

            expect(apiGet).toHaveBeenCalledWith('/holidays/', {
                params: { start_date: '2026-01-01', end_date: '2026-01-31', limit: 100 },
            });
            expect(result.total).toBe(1);
            expect(result.items[0].date).toBe('2026-01-01');
        });

        it('позволяет переопределить лимит', async () => {
            apiGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });
            await HolidayService.getHolidayList('2026-01-01', '2026-01-31', 400);

            expect(apiGet).toHaveBeenCalledWith('/holidays/', {
                params: expect.objectContaining({ limit: 400 }),
            });
        });
    });

    describe('getHolidays', () => {
        it('преобразует строки дат в объекты Date', async () => {
            apiGet.mockResolvedValueOnce({
                data: {
                    items: [{ id: 1, date: '2026-01-01', description: 'Новый год' }],
                    total: 1,
                },
            });

            const result = await HolidayService.getHolidays(new Date(2026, 0, 1), new Date(2026, 0, 31));

            expect(result.items[0].date).toBeInstanceOf(Date);
            expect(result.total).toBe(1);
        });
    });

    describe('createHoliday', () => {
        it('отправляет payload и возвращает ответ с data', async () => {
            apiPost.mockResolvedValueOnce({
                data: { auto_extension: { message: 'ok', next_working_day: '2026-01-05' } },
            });

            const result = await HolidayService.createHoliday({
                date: '2026-01-01',
                description: 'Новый год',
            });

            expect(apiPost).toHaveBeenCalledWith('/holidays/', {
                date: '2026-01-01',
                description: 'Новый год',
            });
            expect(result.data.auto_extension?.message).toBe('ok');
        });

        it('пробрасывает 409-конфликт вызывающему коду', async () => {
            const conflict = {
                response: {
                    status: 409,
                    data: {
                        detail: {
                            message: 'Конфликт с резервами',
                            conflicting_reservation_ids: [3, 7],
                        },
                    },
                },
            };
            apiPost.mockRejectedValueOnce(conflict);

            await expect(
                HolidayService.createHoliday({ date: '2026-01-01', force: false }),
            ).rejects.toMatchObject({ response: { status: 409 } });
        });
    });

    describe('deleteHoliday', () => {
        it('удаляет по отформатированной дате', async () => {
            apiDelete.mockResolvedValueOnce({ data: {} });
            await HolidayService.deleteHoliday(new Date(2026, 0, 7));

            expect(apiDelete).toHaveBeenCalledWith('/holidays/2026-01-07');
        });
    });
});
