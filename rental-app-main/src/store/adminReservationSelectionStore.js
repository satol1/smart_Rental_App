// src/store/adminReservationSelectionStore.ts
import { create } from 'zustand';
export const useAdminReservationSelectionStore = create((set) => ({
    selectedIds: [],
    toggleId: (id) => set((state) => ({
        selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((selectedId) => selectedId !== id)
            : [...state.selectedIds, id],
    })),
    setSelectedIds: (ids) => set({ selectedIds: ids }),
    clearSelection: () => set({ selectedIds: [] }),
}));
