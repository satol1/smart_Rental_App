import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/shared/SimpleDatePickerField.tsx
import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
/**
 * Унифицированный компонент для выбора даты с использованием простых HTML input полей.
 * Основан на дизайне страницы /reserve/create для единообразия интерфейса.
 * Заменяет сложный DayPicker на простые input поля с сохранением всей функциональности.
 */
export default function SimpleDatePickerField({ name, control, label, error, holidayError, minDate, maxDate, disabled = false, onChange, className, inputClassName }) {
    const formatDateForInput = (date) => {
        return formatDate(date);
    };
    const getMinDate = () => {
        return minDate ? formatDateForInput(minDate) : undefined;
    };
    const getMaxDate = () => {
        return maxDate ? formatDateForInput(maxDate) : undefined;
    };
    return (_jsxs("div", { className: cn("space-y-1", className), children: [_jsx(Label, { htmlFor: name, children: label }), _jsx(Controller, { name: name, control: control, render: ({ field }) => (_jsx("div", { className: "space-y-1", children: _jsx("input", { id: name, type: "date", className: cn("border rounded px-3 py-1 text-sm shadow-sm w-full focus:ring-sky-500 focus:border-sky-500", (error || holidayError) && "border-red-500 focus:ring-red-500 focus:border-red-500", disabled && "opacity-50 cursor-not-allowed bg-gray-100", inputClassName), value: field.value ? formatDateForInput(new Date(field.value)) : "", onChange: (e) => {
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
                        }, min: getMinDate(), max: getMaxDate(), disabled: disabled }) })) }), error && (_jsx("p", { className: "text-xs text-red-600", children: error })), holidayError && (_jsx("p", { className: "text-xs text-red-600", children: holidayError }))] }));
}
