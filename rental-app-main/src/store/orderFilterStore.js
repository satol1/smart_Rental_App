import { create } from "zustand";
export const useOrderFilterStore = create()((set, get) => ({
    searchQuery: "",
    statusFilter: "hide-completed", // По умолчанию скрываем завершенные для пользовательских страниц
    sortOption: "id_desc",
    periodType: null,
    periodOffset: 0,
    setSearchQuery: (query) => set({ searchQuery: query }),
    setStatusFilter: (filter) => set({ statusFilter: filter }),
    setSortOption: (option) => set({ sortOption: option }),
    setPeriodType: (type) => set({ periodType: type }),
    setPeriodOffset: (offset) => set({ periodOffset: offset }),
    getDefaultStatusFilter: (context) => {
        // Для админских страниц по умолчанию показываем только активные
        if (context === "admin-reservations" || context === "admin-rentals") {
            return "active";
        }
        // Для пользовательских страниц скрываем завершенные
        return "hide-completed";
    },
    resetFilters: (context) => {
        const defaultFilter = context ? get().getDefaultStatusFilter(context) : "hide-completed";
        set({
            searchQuery: "",
            statusFilter: defaultFilter,
            sortOption: "id_desc",
            periodType: null,
            periodOffset: 0
        });
    },
}));
