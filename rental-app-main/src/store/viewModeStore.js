// src/store/viewModeStore.ts
import { create } from "zustand";
export const useViewModeStore = create((set) => ({
    viewMode: 'default', // Исходное состояние
    // Более явный метод установки, который понадобится для ToggleGroup
    setViewMode: (mode) => set({ viewMode: mode }),
}));
