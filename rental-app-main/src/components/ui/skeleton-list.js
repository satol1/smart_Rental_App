import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/ui/skeleton-list.tsx
// Переиспользуемые скелетоны для списков и таблиц.
// Работают в обеих темах (bg-muted / bg-card из CSS-токенов).
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
/**
 * Скелетон карточки каталога: превью, пара строк текста, «кнопка».
 * Похож по пропорциям на EquipmentCard/PackCard.
 */
export function SkeletonCard({ compact, className, ...rest }) {
    return (_jsxs("div", { "data-testid": rest["data-testid"] ?? "skeleton-card", className: cn("rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden", compact ? "p-3 space-y-2" : "p-4 space-y-3", className), children: [_jsx(Skeleton, { className: cn("w-full rounded-md", compact ? "h-28" : "h-40") }), _jsxs("div", { className: "space-y-2", children: [_jsx(Skeleton, { className: "h-4 w-3/4" }), _jsx(Skeleton, { className: "h-3 w-1/2" })] }), _jsxs("div", { className: "flex items-center justify-between pt-1", children: [_jsx(Skeleton, { className: "h-5 w-16" }), _jsx(Skeleton, { className: cn("rounded-md", compact ? "h-8 w-20" : "h-9 w-24") })] })] }));
}
/**
 * Сетка скелетон-карточек для состояний загрузки списков.
 */
export function SkeletonList({ count = 8, compact, className, columns = "catalog", testId, }) {
    return (_jsx("div", { className: cn("grid gap-4", columns === "single" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className), "data-testid": "skeleton-list", children: Array.from({ length: count }).map((_, index) => (_jsx(SkeletonCard, { compact: compact, "data-testid": testId }, index))) }));
}
/**
 * Скелетон таблицы: заголовочная строка + строки с шиммером.
 * Для админ-таблиц.
 */
export function SkeletonTable({ rows = 8, columns = 5, className }) {
    return (_jsxs("div", { className: cn("w-full space-y-2", className), "data-testid": "skeleton-table", children: [_jsx("div", { className: "flex items-center gap-4 border-b pb-2", children: Array.from({ length: columns }).map((_, index) => (_jsx(Skeleton, { className: "h-4 flex-1" }, index))) }), Array.from({ length: rows }).map((_, rowIndex) => (_jsx("div", { className: "flex items-center gap-4 py-2.5", children: Array.from({ length: columns }).map((_, colIndex) => (_jsx(Skeleton, { className: cn("h-4 flex-1", colIndex === 0 && "max-w-[180px]") }, colIndex))) }, rowIndex)))] }));
}
