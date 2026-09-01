// src/store/viewModeStore.ts

import { create } from "zustand";

// Используем 'default' и 'compact' для единообразия
export type ViewMode = 'default' | 'compact';

type ViewState = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
};

export const useViewModeStore = create<ViewState>((set) => ({
  viewMode: 'default', // Исходное состояние
  // Более явный метод установки, который понадобится для ToggleGroup
  setViewMode: (mode) => set({ viewMode: mode }),
}));