import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/shared/ConflictIndicator.tsx
import { AlertTriangle } from "lucide-react";
import { formatDateEuropean } from "@/lib/utils";
import { cn } from "@/lib/utils";
/**
 * Переиспользуемый компонент для отображения конфликтов доступности оборудования.
 * Показывает статус (в аренде/в резерве) и детали конфликта.
 */
export default function ConflictIndicator({ availability, showDetails = true, variant = 'inline', className }) {
    const hasConflict = availability.status !== 'available';
    if (!hasConflict) {
        return null;
    }
    const conflictColorClass = availability.status === 'rented' ? 'bg-red-100' : 'bg-amber-100';
    const statusText = availability.status === 'rented' ? 'В аренде' : 'В резерве';
    // Форматируем диапазон дат конфликта
    const formatConflictDateRange = () => {
        if (!availability.start_date || !availability.end_date)
            return null;
        const startDate = formatDateEuropean(availability.start_date);
        const endDate = formatDateEuropean(availability.end_date);
        return `${statusText} с ${startDate} по ${endDate}`;
    };
    const conflictDateRange = formatConflictDateRange();
    if (variant === 'minimal') {
        return (_jsxs("div", { className: cn("flex items-center gap-1", className), children: [_jsx(AlertTriangle, { className: "h-3 w-3 text-red-500" }), _jsx("span", { className: "text-xs font-medium", children: statusText })] }));
    }
    if (variant === 'block') {
        return (_jsx("div", { className: cn("p-2 rounded-md transition-colors", conflictColorClass, className), children: showDetails && conflictDateRange && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(AlertTriangle, { className: "h-3 w-3 text-red-500" }), _jsx("span", { className: "text-xs font-medium", children: conflictDateRange })] })) }));
    }
    // variant === 'inline' (по умолчанию)
    return (_jsxs("div", { className: cn("flex items-center gap-1", className), children: [_jsx(AlertTriangle, { className: "h-3 w-3 text-red-500" }), _jsx("span", { className: "text-xs font-medium", children: statusText }), showDetails && conflictDateRange && (_jsxs("span", { className: "text-xs text-red-600 ml-1", children: ["(", conflictDateRange, ")"] }))] }));
}
