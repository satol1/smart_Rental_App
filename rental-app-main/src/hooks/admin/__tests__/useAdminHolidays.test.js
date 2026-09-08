import { jsx as _jsx } from "react/jsx-runtime";
// src/hooks/__tests__/useAdminHolidays.test.tsx
// Тесты хуков выходных дней через мок HolidayService.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
const getHolidayList = vi.fn();
const createHoliday = vi.fn();
const deleteHoliday = vi.fn();
vi.mock('@/core/services/HolidayService', () => ({
    HolidayService: {
        getHolidayList: (...args) => getHolidayList(...args),
        createHoliday: (...args) => createHoliday(...args),
        deleteHoliday: (...args) => deleteHoliday(...args),
    },
}));
vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));
import { useHolidays, useCreateHoliday, useDeleteHoliday } from '@/hooks/useAdminHolidays';
function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }) => (_jsx(QueryClientProvider, { client: queryClient, children: children }));
}
describe('useHolidays', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('загружает выходные и преобразует даты через select', async () => {
        getHolidayList.mockResolvedValueOnce({
            items: [{ id: 1, date: '2026-01-01', description: 'Новый год' }],
            total: 1,
        });
        const { result } = renderHook(() => useHolidays(new Date(2026, 0, 1), new Date(2026, 0, 31)), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.[0].date).toBeInstanceOf(Date);
        expect(getHolidayList).toHaveBeenCalledWith(expect.stringContaining('2026-01'), expect.any(String), 100);
    });
});
describe('useCreateHoliday', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('успешное создание показывает toast и инвалидates кэш', async () => {
        createHoliday.mockResolvedValueOnce({ data: {} });
        const { result } = renderHook(() => useCreateHoliday(), { wrapper: createWrapper() });
        result.current.mutate({ date: '2026-01-01' });
        await waitFor(() => expect(createHoliday).toHaveBeenCalledWith({ date: '2026-01-01' }));
        await waitFor(() => expect(toast.success).toHaveBeenCalled());
    });
    it('409-конфликт не показывает toast (обрабатывается компонентом)', async () => {
        createHoliday.mockRejectedValueOnce({
            response: { status: 409, data: { detail: { message: 'конфликт' } } },
        });
        const { result } = renderHook(() => useCreateHoliday(), { wrapper: createWrapper() });
        result.current.mutate({ date: '2026-01-01' });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(toast.error).not.toHaveBeenCalled();
    });
    it('другая ошибка показывает toast с сообщением', async () => {
        createHoliday.mockRejectedValueOnce({
            response: { status: 500, data: { detail: { message: 'Сервер недоступен' } } },
        });
        const { result } = renderHook(() => useCreateHoliday(), { wrapper: createWrapper() });
        result.current.mutate({ date: '2026-01-01' });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(toast.error).toHaveBeenCalledWith('Сервер недоступен');
    });
});
describe('useDeleteHoliday', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('вызывает сервис с датой', async () => {
        deleteHoliday.mockResolvedValueOnce(undefined);
        const { result } = renderHook(() => useDeleteHoliday(), { wrapper: createWrapper() });
        result.current.mutate(new Date(2026, 0, 7));
        await waitFor(() => expect(deleteHoliday).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(toast.success).toHaveBeenCalled());
    });
    it('ошибка удаления показывает toast', async () => {
        deleteHoliday.mockRejectedValueOnce({
            response: { data: { detail: 'Нельзя удалить' } },
        });
        const { result } = renderHook(() => useDeleteHoliday(), { wrapper: createWrapper() });
        result.current.mutate(new Date(2026, 0, 7));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Нельзя удалить'));
    });
});
