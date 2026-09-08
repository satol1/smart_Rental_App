import { jsx as _jsx } from "react/jsx-runtime";
// src/hooks/__tests__/useEquipment.test.tsx
// Тесты useEquipment: infinite query с моками сервиса.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const getAllEquipment = vi.fn();
vi.mock('@/core/services/EquipmentService', () => ({
    EquipmentService: {
        getAllEquipment: (...args) => getAllEquipment(...args),
    },
}));
import { useEquipment } from '@/hooks/useEquipment';
function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }) => (_jsx(QueryClientProvider, { client: queryClient, children: children }));
}
describe('useEquipment', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('загружает первую страницу', async () => {
        getAllEquipment.mockResolvedValueOnce({
            items: [{ id: 1, name: 'Камера' }],
            total: 1,
        });
        const { result } = renderHook(() => useEquipment(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.pages[0].items).toHaveLength(1);
        expect(getAllEquipment).toHaveBeenCalledTimes(1);
    });
    it('передаёт skip=0 и размер страницы при первой загрузке', async () => {
        getAllEquipment.mockResolvedValueOnce({ items: [], total: 0 });
        renderHook(() => useEquipment(), { wrapper: createWrapper() });
        await waitFor(() => expect(getAllEquipment).toHaveBeenCalled());
        const [skip, limit] = getAllEquipment.mock.calls[0];
        expect(skip).toBe(0);
        expect(typeof limit).toBe('number');
    });
    it('прокидывает фильтры в сервис', async () => {
        getAllEquipment.mockResolvedValueOnce({ items: [], total: 0 });
        renderHook(() => useEquipment({ query: 'камера', type: 'Фото', availableOnly: true }), { wrapper: createWrapper() });
        await waitFor(() => expect(getAllEquipment).toHaveBeenCalled());
        const filters = getAllEquipment.mock.calls[0][2];
        expect(filters.availableOnly).toBe(true);
    });
    it('getNextPageForm возвращает undefined при полной загрузке', async () => {
        getAllEquipment.mockResolvedValueOnce({ items: [{ id: 1 }], total: 1 });
        const { result } = renderHook(() => useEquipment(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.hasNextPage).toBe(false);
    });
    it('hasNextPage=true, если загружено меньше тотала', async () => {
        getAllEquipment.mockResolvedValueOnce({ items: [{ id: 1 }], total: 25 });
        const { result } = renderHook(() => useEquipment(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.hasNextPage).toBe(true);
    });
    it('ошибка сервиса попадает в состояние ошибки', async () => {
        getAllEquipment.mockRejectedValueOnce(new Error('Сеть недоступна'));
        const { result } = renderHook(() => useEquipment(), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe('Сеть недоступна');
    });
});
