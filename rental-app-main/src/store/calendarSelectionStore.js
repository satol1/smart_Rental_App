// src/store/calendarSelectionStore.ts
import { create } from "zustand";
export const useCalendarSelectionStore = create((set) => ({
    selectedGroupId: null,
    setSelectedGroupId: (id) => set({ selectedGroupId: id }),
}));
