import { create } from "zustand"
import { useCallback } from "react"
import { useShallow } from "zustand/react/shallow"
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

export const ORDER_CONTEXTS: OrderContext[] = [
    "user-reservations",
    "user-rentals",
    "admin-reservations",
    "admin-rentals",
]

type ContextFilters = {
    searchQuery: string
    statusFilter: string | null
    sortOption: SortOption
    periodType: PeriodType | null
    periodOffset: number
}

const defaultFilters = (context: OrderContext): ContextFilters => ({
    searchQuery: "",
    // Для пользовательских страниц скрываем завершенные, для админских — только активные
    statusFilter: context.startsWith("admin") ? "active" : "hide-completed",
    sortOption: "id_desc",
    periodType: null,
    periodOffset: 0,
})

type OrderFilterState = {
    /** Фильтры изолированы по контексту (этап 5.6): поиск/сортировка «Мои резервы»
     *  больше не протекают в админ-списки и наоборот */
    contexts: Record<OrderContext, ContextFilters>
    setSearchQuery: (context: OrderContext, query: string) => void
    setStatusFilter: (context: OrderContext, filter: string | null) => void
    setSortOption: (context: OrderContext, option: SortOption) => void
    setPeriodType: (context: OrderContext, type: PeriodType | null) => void
    setPeriodOffset: (context: OrderContext, offset: number) => void
    resetFilters: (context: OrderContext) => void
    getDefaultStatusFilter: (context: OrderContext) => string
}

export const useOrderFilterStore = create<OrderFilterState>()((set) => ({
    contexts: Object.fromEntries(
        ORDER_CONTEXTS.map((context) => [context, defaultFilters(context)]),
    ) as Record<OrderContext, ContextFilters>,
    setSearchQuery: (context, query) =>
        set((state) => ({ contexts: { ...state.contexts, [context]: { ...state.contexts[context], searchQuery: query } } })),
    setStatusFilter: (context, filter) =>
        set((state) => ({ contexts: { ...state.contexts, [context]: { ...state.contexts[context], statusFilter: filter } } })),
    setSortOption: (context, option) =>
        set((state) => ({ contexts: { ...state.contexts, [context]: { ...state.contexts[context], sortOption: option } } })),
    setPeriodType: (context, type) =>
        set((state) => ({ contexts: { ...state.contexts, [context]: { ...state.contexts[context], periodType: type } } })),
    setPeriodOffset: (context, offset) =>
        set((state) => ({ contexts: { ...state.contexts, [context]: { ...state.contexts[context], periodOffset: offset } } })),
    resetFilters: (context) =>
        set((state) => ({ contexts: { ...state.contexts, [context]: defaultFilters(context) } })),
    getDefaultStatusFilter: (context) => defaultFilters(context).statusFilter as string,
}))

/**
 * Контекстный селектор: компонент подписывается только на свой срез фильтров.
 *
 * ВАЖНО (блокер аудита этапа 5): в shallow-селекторе допустимы ТОЛЬКО данные.
 * Замыкания вида `(q) => state.setSearchQuery(context, q)` внутри useShallow
 * меняют идентичность на каждый вызов -> useSyncExternalStore зацикливает
 * ре-рендеры (React 19, Maximum update depth exceeded). Экшены zustand стабильны
 * сами по себе — берём их отдельными селекторами и привязываем контекст
 * через стабильный useCallback.
 */
export function useOrderFilters(context: OrderContext) {
    const slice = useOrderFilterStore(
        useShallow((state) => {
            const { searchQuery, statusFilter, sortOption, periodType, periodOffset } = state.contexts[context]
            return { searchQuery, statusFilter, sortOption, periodType, periodOffset }
        }),
    )

    const setSearchQueryAction = useOrderFilterStore((s) => s.setSearchQuery)
    const setStatusFilterAction = useOrderFilterStore((s) => s.setStatusFilter)
    const setSortOptionAction = useOrderFilterStore((s) => s.setSortOption)
    const setPeriodTypeAction = useOrderFilterStore((s) => s.setPeriodType)
    const setPeriodOffsetAction = useOrderFilterStore((s) => s.setPeriodOffset)
    const resetFiltersAction = useOrderFilterStore((s) => s.resetFilters)
    const getDefaultStatusFilterAction = useOrderFilterStore((s) => s.getDefaultStatusFilter)

    const setSearchQuery = useCallback((query: string) => setSearchQueryAction(context, query), [setSearchQueryAction, context])
    const setStatusFilter = useCallback((filter: string | null) => setStatusFilterAction(context, filter), [setStatusFilterAction, context])
    const setSortOption = useCallback((option: SortOption) => setSortOptionAction(context, option), [setSortOptionAction, context])
    const setPeriodType = useCallback((type: PeriodType | null) => setPeriodTypeAction(context, type), [setPeriodTypeAction, context])
    const setPeriodOffset = useCallback((offset: number) => setPeriodOffsetAction(context, offset), [setPeriodOffsetAction, context])
    const resetFilters = useCallback(() => resetFiltersAction(context), [resetFiltersAction, context])
    const getDefaultStatusFilter = useCallback(() => getDefaultStatusFilterAction(context), [getDefaultStatusFilterAction, context])

    return {
        ...slice,
        setSearchQuery,
        setStatusFilter,
        setSortOption,
        setPeriodType,
        setPeriodOffset,
        resetFilters,
        getDefaultStatusFilter,
    }
}
