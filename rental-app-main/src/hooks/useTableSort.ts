// src/hooks/useTableSort.ts

import { useCallback, useState } from "react";
import type { SortDirection } from "@/components/ui/sortable-table-head";

export interface TableSortState {
    column: string;
    direction: SortDirection;
}

/**
 * Клиентская сортировка таблиц: состояние (колонка + направление) и отсортированная копия списка.
 * accessors — карта «ключ колонки → геттер значения»; значения сравниваются численно/локально (ru).
 * null/undefined всегда уходят в конец независимо от направления.
 *
 * Состояние хранится одним объектом и обновляется чистым апдейтером:
 * побочные setState внутри апдейтера ломают StrictMode (двойной вызов → toggle взаимоисключается).
 */
export function useTableSort<T>(
    items: T[] | undefined,
    accessors: Record<string, (item: T) => string | number | null | undefined>,
    initial?: TableSortState,
) {
    const [sort, setSort] = useState<TableSortState | null>(initial ?? null);

    const onSort = useCallback((column: string) => {
        setSort((prev) =>
            prev?.column === column
                ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { column, direction: "asc" },
        );
    }, []);

    const sortColumn = sort?.column ?? null;
    const sortDirection: SortDirection = sort?.direction ?? "asc";

    const sortedItems = (() => {
        const source = items ?? [];
        const accessor = sortColumn ? accessors[sortColumn] : undefined;
        if (!accessor) return source;
        const dir = sortDirection === "asc" ? 1 : -1;
        return [...source].sort((a, b) => {
            const av = accessor(a);
            const bv = accessor(b);
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
            return String(av).localeCompare(String(bv), "ru", { numeric: true, sensitivity: "base" }) * dir;
        });
    })();

    return { sortedItems, sortColumn, sortDirection, onSort };
}
