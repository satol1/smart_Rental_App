import { create } from "zustand";
export const useSearchStore = create((set) => ({
    query: "",
    setQuery: (value) => set({ query: value })
}));
