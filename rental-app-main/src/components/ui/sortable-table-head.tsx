// src/components/ui/sortable-table-head.tsx

import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
    /** Ключ колонки для сортировки */
    column: string;
    sortColumn: string | null;
    sortDirection: SortDirection;
    onSort: (column: string) => void;
}

/**
 * Кликабельный заголовок таблицы с индикатором порядка и aria-sort.
 * Используется с useTableSort (клиентская) или с серверным состоянием сортировки.
 */
export function SortableTableHead({
    column,
    sortColumn,
    sortDirection,
    onSort,
    className,
    children,
    ...props
}: SortableTableHeadProps) {
    const isSorted = sortColumn === column;
    const Icon = !isSorted ? ArrowUpDown : sortDirection === "asc" ? ArrowUp : ArrowDown;

    return (
        <TableHead
            aria-sort={isSorted ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
            className={cn(isSorted && "text-foreground", className)}
            {...props}
        >
            <button
                type="button"
                onClick={() => onSort(column)}
                className="inline-flex items-center gap-1.5 -mx-1 px-1 rounded-sm font-medium hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {children}
                <Icon className={cn("h-3.5 w-3.5 shrink-0", !isSorted && "opacity-40")} aria-hidden="true" />
            </button>
        </TableHead>
    );
}
