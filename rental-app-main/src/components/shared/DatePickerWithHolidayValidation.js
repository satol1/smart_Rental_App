import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/shared/DatePickerWithHolidayValidation.tsx
import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useHolidayValidation } from "@/hooks/useHolidayValidation";
import { DateService } from "@/core/services";
/**
 * Унифицированный компонент для выбора даты с встроенной валидацией выходных дней.
 * Автоматически проверяет, не является ли выбранная дата выходным днем.
 * Показывает ошибки валидации и предлагает следующий рабочий день.
 */
export default function DatePickerWithHolidayValidation({ name, control, label, error, minDate, maxDate, disabled = false, onChange, className, inputClassName, contextDate, isEndDate = false }) {
    const formatDateForInput = (date) => {
        return formatDate(date);
    };
    const getMinDate = () => {
        return minDate ? formatDateForInput(minDate) : undefined;
    };
    const getMaxDate = () => {
        return maxDate ? formatDateForInput(maxDate) : undefined;
    };
    return (_jsxs("div", { className: cn("space-y-1", className), children: [_jsx(Label, { htmlFor: name, children: label }), _jsx(Controller, { name: name, control: control, render: ({ field }) => (_jsx(HolidayValidatedInput, { field: field, inputId: name, error: error, disabled: disabled, onChange: onChange, inputClassName: inputClassName, contextDate: contextDate, isEndDate: isEndDate, getMinDate: getMinDate, getMaxDate: getMaxDate })) })] }));
}
function HolidayValidatedInput({ field, inputId, error, disabled, onChange, inputClassName, contextDate, isEndDate, getMinDate, getMaxDate, }) {
    const formatDateForInput = (date) => formatDate(date);
    // Создаем даты для валидации
    const currentDate = field.value ? new Date(field.value) : new Date();
    const validationStartDate = isEndDate && contextDate ? contextDate : currentDate;
    const validationEndDate = isEndDate ? currentDate : (contextDate || currentDate);
    // Используем валидацию выходных (хук на верхнем уровне компонента)
    const { startDateError, endDateError } = useHolidayValidation(validationStartDate, validationEndDate);
    const holidayError = isEndDate ? endDateError : startDateError;
    return (_jsxs("div", { className: "space-y-1", children: [_jsx("input", { id: inputId, type: "date", className: cn("border rounded px-3 py-1 text-sm shadow-sm w-full focus:ring-sky-500 focus:border-sky-500", (error || holidayError) && "border-red-500 focus:ring-red-500 focus:border-red-500", disabled && "opacity-50 cursor-not-allowed bg-gray-100", inputClassName), value: field.value ? formatDateForInput(new Date(field.value)) : "", onChange: (e) => {
                    const dateValue = e.target.value;
                    if (dateValue) {
                        const date = new Date(dateValue);
                        if (!isNaN(date.getTime())) {
                            const formattedDate = formatDateForInput(date);
                            field.onChange(formattedDate);
                            onChange?.(formattedDate);
                        }
                    }
                    else {
                        field.onChange("");
                        onChange?.("");
                    }
                }, min: getMinDate(), max: getMaxDate(), disabled: disabled }), error && (_jsx("p", { className: "text-xs text-red-600", children: error })), holidayError && (_jsxs("div", { className: "text-xs text-red-600", children: [_jsx("p", { children: holidayError }), field.value ? (_jsxs("p", { className: "text-blue-600 mt-1", children: ["\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0440\u0430\u0431\u043E\u0447\u0438\u0439 \u0434\u0435\u043D\u044C: ", formatDateForInput(DateService.findNextWorkingDay(new Date(field.value), []))] })) : null] }))] }));
}
