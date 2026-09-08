import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/ReservationFooter.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";
export default function ReservationFooter({ selectedCount, onClick, onReset, isEditingMode, intent, startDate, endDate }) {
    if (selectedCount === 0) {
        return null;
    }
    const buttonText = isEditingMode && intent !== "add_to_new_reservation"
        ? `✔️ Добавить к резерву (${selectedCount})`
        : `📥 Оформить (${selectedCount})`;
    // ✅ Форматирование дат для отображения
    const formatDateForDisplay = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}`;
    };
    const dateRangeText = startDate && endDate
        ? `с ${formatDateForDisplay(startDate)} по ${formatDateForDisplay(endDate)}`
        : '';
    return (_jsx("div", { className: "fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/90 backdrop-blur-sm border-t border-border shadow-[0_-4px_15px_rgba(0,0,0,0.08)]", children: _jsxs("div", { className: "max-w-7xl mx-auto flex justify-between items-center", children: [_jsx("div", { className: "text-sm text-foreground", children: _jsxs("div", { className: "flex flex-col items-start", children: [_jsxs("div", { children: [_jsx("span", { className: "font-semibold", children: "\u0412\u044B\u0431\u0440\u0430\u043D\u043E \u0434\u043B\u044F \u0440\u0435\u0437\u0435\u0440\u0432\u0430:" }), _jsxs("span", { className: "ml-2 font-bold text-lg", children: [selectedCount, " \u043F\u043E\u0437."] })] }), dateRangeText && (_jsx("div", { className: "text-xs text-muted-foreground mt-1", children: dateRangeText }))] }) }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2 items-stretch", children: [_jsxs(Button, { onClick: onReset, variant: "destructive", size: "lg", className: "flex items-center gap-2 order-last sm:order-first", children: [_jsx(X, { className: "h-5 w-5" }), "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0432\u044B\u0431\u043E\u0440"] }), _jsxs(Button, { onClick: onClick, size: "lg", className: "bg-green-600 hover:bg-green-700 text-white shadow-lg flex items-center gap-2", children: [buttonText, _jsx(ArrowRight, { className: "h-5 w-5" })] })] })] }) }));
}
