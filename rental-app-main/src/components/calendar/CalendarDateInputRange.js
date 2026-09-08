import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/calendar/CalendarDateInputRange.tsx
import { useDateStore } from "@/store/dateStore";
import { useDateRange } from "@/hooks/useDateRange";
import { useHolidayStore } from "@/store/holidayStore";
import { useSandboxCalculatorStore } from "@/store/sandboxCalculatorStore";
import { useUnifiedDateValidation } from "@/hooks/useUnifiedDateValidation";
import { formatDate } from "@/lib/utils";
export default function CalendarDateInputRange({ onRangeChange, className = "" }) {
    const { startDate, endDate, setRange } = useDateStore();
    const { holidays } = useHolidayStore();
    const { syncWithDateStore } = useSandboxCalculatorStore();
    // Валидация выходных дней
    const { startDateError, endDateError, isRangeValid, suggestedStartDate, suggestedEndDate } = useUnifiedDateValidation({
        startDate,
        endDate,
        validateStartDate: true,
        validateEndDate: true
    });
    const handleRangeChange = (newStart, newEnd, source) => {
        setRange(newStart, newEnd, source, holidays);
        // Синхронизируем с калькулятором, если не используется слайдер
        if (source !== 'slider') {
            syncWithDateStore();
        }
        // Вызываем внешний колбэк, если он передан
        onRangeChange?.(newStart, newEnd, source);
    };
    const { localStartDate, localEndDate, handleStartDateChange, handleEndDateChange, } = useDateRange({
        startDate,
        endDate,
        onRangeChange: handleRangeChange,
        holidays
    });
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    const minEndDate = (() => {
        const start = new Date(localStartDate);
        const timezoneOffset = start.getTimezoneOffset() * 60000;
        const startUTC = new Date(start.getTime() + timezoneOffset);
        startUTC.setDate(startUTC.getDate() + 1);
        return formatDateForInput(startUTC);
    })();
    return (_jsxs("div", { className: `flex flex-col gap-4 ${className}`, children: [_jsxs("div", { className: "flex flex-col sm:flex-row gap-4 justify-center", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("label", { className: "text-sm text-gray-700 mb-1", children: "\u0421:" }), _jsx("input", { type: "date", value: localStartDate, onChange: handleStartDateChange, className: `border rounded px-2 py-1 text-sm ${startDateError
                                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                                    : "border-gray-300 focus:ring-sky-500 focus:border-sky-500"}`, min: formatDateForInput(new Date()) }), startDateError && (_jsxs("div", { className: "text-xs text-red-600 mt-1", children: [_jsx("p", { children: startDateError }), suggestedStartDate && (_jsxs("p", { className: "text-blue-600", children: ["\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0440\u0430\u0431\u043E\u0447\u0438\u0439 \u0434\u0435\u043D\u044C: ", formatDate(suggestedStartDate)] }))] }))] }), _jsxs("div", { className: "flex flex-col", children: [_jsx("label", { className: "text-sm text-gray-700 mb-1", children: "\u041F\u043E:" }), _jsx("input", { type: "date", value: localEndDate, onChange: handleEndDateChange, className: `border rounded px-2 py-1 text-sm ${endDateError
                                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                                    : "border-gray-300 focus:ring-sky-500 focus:border-sky-500"}`, min: minEndDate }), endDateError && (_jsxs("div", { className: "text-xs text-red-600 mt-1", children: [_jsx("p", { children: endDateError }), suggestedEndDate && (_jsxs("p", { className: "text-blue-600", children: ["\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0440\u0430\u0431\u043E\u0447\u0438\u0439 \u0434\u0435\u043D\u044C: ", formatDate(suggestedEndDate)] }))] }))] })] }), !isRangeValid && (_jsx("div", { className: "text-xs text-amber-600 bg-amber-50 p-2 rounded", children: "\u26A0\uFE0F \u0412\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0434\u0430\u0442\u044B \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442 \u0432\u044B\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u043D\u0438. \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0440\u0430\u0431\u043E\u0447\u0438\u0435 \u0434\u043D\u0438." }))] }));
}
