import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/reservation/EditableDateRange.tsx
import { CalendarRange } from "lucide-react";
import { useDateRange } from "@/hooks/useDateRange";
import { useHolidayValidation } from "@/hooks/useHolidayValidation";
import { formatDate, formatDateEuropean } from "@/lib/utils";
export default function EditableDateRange({ startDate, endDate, onChange, disabled = false }) {
    const { localStartDate, localEndDate, handleStartDateChange, handleEndDateChange } = useDateRange({
        // ✅ ИСПРАВЛЕНО: Меняем initialStartDate/initialEndDate на startDate/endDate
        startDate: startDate,
        endDate: endDate,
        onRangeChange: onChange
    });
    // ✅ НОВОЕ: Интеграция валидации выходных дней
    const { startDateError, endDateError } = useHolidayValidation(startDate, endDate);
    const today = formatDate(new Date());
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-medium text-gray-700", children: [_jsx(CalendarRange, { className: "w-4 h-4" }), "\u0414\u0430\u0442\u044B \u0440\u0435\u0437\u0435\u0440\u0432\u0430:"] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("label", { htmlFor: "edit-start-date", className: "block text-xs text-gray-600", children: "\u041D\u0430\u0447\u0430\u043B\u043E:" }), _jsx("input", { id: "edit-start-date", type: "date", value: localStartDate, onChange: handleStartDateChange, disabled: disabled, min: today, className: `w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${disabled
                                    ? 'bg-gray-100 cursor-not-allowed'
                                    : 'bg-white hover:border-blue-300'}` }), _jsx("div", { className: "text-xs text-gray-500", children: formatDateEuropean(new Date(localStartDate)) }), startDateError && (_jsx("div", { className: "text-xs text-red-600 mt-1", children: startDateError }))] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { htmlFor: "edit-end-date", className: "block text-xs text-gray-600", children: "\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435:" }), _jsx("input", { id: "edit-end-date", type: "date", value: localEndDate, onChange: handleEndDateChange, disabled: disabled, min: localStartDate, className: `w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${disabled
                                    ? 'bg-gray-100 cursor-not-allowed'
                                    : 'bg-white hover:border-blue-300'}` }), _jsx("div", { className: "text-xs text-gray-500", children: formatDateEuropean(new Date(localEndDate)) }), endDateError && (_jsx("div", { className: "text-xs text-red-600 mt-1", children: endDateError }))] })] })] }));
}
