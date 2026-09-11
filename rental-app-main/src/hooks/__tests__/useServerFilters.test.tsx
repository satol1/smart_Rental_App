import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EquipmentFilterParams, EquipmentListResponse } from '@/core/services/EquipmentService';
import { useServerFilters } from '@/hooks/features/useServerFilters';
import { useFilterStore } from '@/store/filterStore';
import { useSearchStore } from '@/store/searchStore';
import { useDateStore } from '@/store/dateStore';

const mocks = vi.hoisted(() => ({
  getAllEquipment: vi.fn(),
  filteredRequest: vi.fn(),
  associations: [{ id: 12, name: 'Портретная съёмка', sort_order: 1, equipment_ids: [42, 43] }],
}));
vi.mock('@/core/services/EquipmentService', () => ({ EquipmentService: { getAllEquipment: mocks.getAllEquipment } }));
vi.mock('@/hooks/useAssociations', () => ({ useAssociations: () => ({ data: mocks.associations }) }));
vi.mock('@/hooks/useDebounce', () => ({ useDebounce: (value: unknown) => value }));

const metadata: EquipmentListResponse = {
  items: [], total: 200,
  availableFilters: {
    types: ['Фотокамеры', 'Объективы'],
    brands: [{ id: 1, name: 'Canon' }, { id: 2, name: 'Sony' }],
    associations: [{ id: 12, name: 'Портретная съёмка', sort_order: 1 }],
  },
};
const emptyResponse: EquipmentListResponse = {
  items: [], total: 0,
  availableFilters: { types: [], brands: [], associations: [] },
};
// Пачки приходят внутри items (union CatalogItem), отдельного поля packs больше нет
const sonyResponse: EquipmentListResponse = {
  items: [
    { id: 42, entity_type: 'equipment', name: 'Sony A7 IV', brand: 'Sony', equipment_type: 'Фотокамеры', condition: 'good', daily_rate: 2000, accessories: [] },
    { id: 7, entity_type: 'pack', name: 'Базовый набор Sony', equipment_type: 'Фотокамеры', brand: 'Sony', total_count: 3, available_count: 2, min_daily_rate: 1500, equipment_ids: [42, 43] },
  ],
  total: 2,
  availableFilters: { types: ['Фотокамеры'], brands: [{ id: 2, name: 'Sony' }], associations: [] },
};

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  useFilterStore.getState().reset();
  useFilterStore.getState().setBrandSystemId(2);
  useSearchStore.getState().setQuery('');
  useDateStore.getState().setRange(new Date(2030, 5, 10), new Date(2030, 5, 11));
  mocks.filteredRequest.mockResolvedValue(sonyResponse);
  mocks.getAllEquipment.mockImplementation((_skip: number, _limit: number, filters: EquipmentFilterParams) => {
    return filters.startDate ? mocks.filteredRequest(filters) : Promise.resolve(metadata);
  });
});

describe('persistent server filter options', () => {
  it('keeps the selected Sony option and all types and associations after an empty search', async () => {
    const { result } = renderHook(() => useServerFilters(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.combinedItems).toHaveLength(2);
    mocks.filteredRequest.mockResolvedValue(emptyResponse);
    act(() => useSearchStore.getState().setQuery('нет-такого-оборудования'));
    await waitFor(() => expect(result.current.totalCount).toBe(0));
    expect(result.current.combinedItems).toEqual([]);
    expect(result.current.availableBrands).toEqual(metadata.availableFilters.brands);
    expect(result.current.availableBrands.find(brand => brand.id === useFilterStore.getState().brandSystemId)?.name).toBe('Sony');
    expect(result.current.availableTypes).toEqual(metadata.availableFilters.types);
    expect(result.current.availableAssociations).toEqual(mocks.associations);
    expect(result.current.hasActiveFilters).toBe(true);
    const metadataCalls = mocks.getAllEquipment.mock.calls.filter(([, , filters]) => !filters.startDate);
    expect(metadataCalls).toHaveLength(1);
    expect(metadataCalls[0][0]).toBe(0);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('keeps options and active selection during a date-change request without changing result pagination', async () => {
    const { result } = renderHook(() => useServerFilters(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let finishRequest: ((response: EquipmentListResponse) => void) | undefined;
    mocks.filteredRequest.mockReturnValue(new Promise<EquipmentListResponse>(resolve => { finishRequest = resolve; }));
    act(() => useDateStore.getState().setRange(new Date(2030, 5, 20), new Date(2030, 5, 21)));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.availableBrands).toEqual(metadata.availableFilters.brands);
    expect(result.current.availableTypes).toEqual(metadata.availableFilters.types);
    expect(result.current.availableAssociations[0].equipment_ids).toEqual([42, 43]);
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.combinedItems).toEqual([]);
    await act(async () => finishRequest?.(emptyResponse));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalCount).toBe(0);
    expect(mocks.getAllEquipment.mock.calls.filter(([, , filters]) => !filters.startDate)).toHaveLength(1);
    expect(mocks.getAllEquipment.mock.calls.every(([skip]) => skip === 0)).toBe(true);
  });

  it('reports active filters before any result is available', () => {
    mocks.filteredRequest.mockReturnValue(new Promise<EquipmentListResponse>(() => undefined));
    const { result } = renderHook(() => useServerFilters(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasActiveFilters).toBe(true);
  });
});
