// src/store/calendarSelectionStore.ts
import { create } from "zustand";

type CalendarSelectionState = {
    selectedGroupId: string | null;
    setSelectedGroupId: (id: string | null) => void;
};

export const useCalendarSelectionStore = create<CalendarSelectionState>((set) => ({
    selectedGroupId: null,
    setSelectedGroupId: (id) => set({ selectedGroupId: id }),
}));
