// src/store/adminReservationSelectionStore.ts

import { create } from 'zustand';

type SelectionState = {
    selectedIds: number[];
    toggleId: (id: number) => void;
    setSelectedIds: (ids: number[]) => void;
    clearSelection: () => void;
};

export const useAdminReservationSelectionStore = create<SelectionState>((set) => ({
    selectedIds: [],
    toggleId: (id) =>
        set((state) => ({
            selectedIds: state.selectedIds.includes(id)
                ? state.selectedIds.filter((selectedId) => selectedId !== id)
                : [...state.selectedIds, id],
        })),
    setSelectedIds: (ids) => set({ selectedIds: ids }),
    clearSelection: () => set({ selectedIds: [] }),
}));