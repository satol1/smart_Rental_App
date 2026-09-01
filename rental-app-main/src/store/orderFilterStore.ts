import { create } from "zustand"
import type { PeriodType } from "@/types/period"

export type SortOption =
    | "start_asc"
    | "start_desc"
    | "end_asc"
    | "end_desc"
    | "count_asc"
    | "count_desc"
    | "id_asc"
    | "id_desc"

export type OrderContext = 
    | "user-reservations"
    | "user-rentals"
    | "admin-reservations"
    | "admin-rentals"

type OrderFilterState = {
    searchQuery: string
    statusFilter: string | null
    sortOption: SortOption
    periodType: PeriodType | null
    periodOffset: number
    setSearchQuery: (query: string) => void
    setStatusFilter: (filter: string | null) => void
    setSortOption: (option: SortOption) => void
    setPeriodType: (type: PeriodType | null) => void
    setPeriodOffset: (offset: number) => void
    resetFilters: (context?: OrderContext) => void
    getDefaultStatusFilter: (context: OrderContext) => string
}

export const useOrderFilterStore = create<OrderFilterState>()((set, get) => ({
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
    getDefaultStatusFilter: (context: OrderContext) => {
        // Для админских страниц по умолчанию показываем только активные
        if (context === "admin-reservations" || context === "admin-rentals") {
            return "active"
        }
        // Для пользовательских страниц скрываем завершенные
        return "hide-completed"
    },
    resetFilters: (context?: OrderContext) => {
        const defaultFilter = context ? get().getDefaultStatusFilter(context) : "hide-completed"
        set({ 
            searchQuery: "", 
            statusFilter: defaultFilter,
            sortOption: "id_desc",
            periodType: null,
            periodOffset: 0
        })
    },
}))
