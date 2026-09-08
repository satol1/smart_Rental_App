import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/shared/DatePickerField.tsx
import { useState } from "react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DayPicker } from 'react-day-picker';
import { ru } from 'date-fns/locale';
import { format } from 'date-fns';
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { DateService } from "@/core/services/DateService";
import { cn } from "@/lib/utils";
/**
 * Переиспользуемый компонент для выбора даты с поддержкой выходных дней
 * и валидации. Заменяет дублированную логику в CreateReservationStep1Details,
 * DateRangeSelector и HolidayManager.
 */
export default function DatePickerField({ name, control, label, placeholder = "Выберите дату", error, holidayError, minDate, maxDate, disabled = false, holidays = [], onHolidaySelect, className }) {
    const [isOpen, setIsOpen] = useState(false);
    const handleDateSelect = (date, onChange) => {
        if (!date)
            return;
        const dateStr = DateService.formatDateForAPI(date);
        // Проверяем, является ли дата выходным днем
        if (DateService.isHoliday(date, holidays) && onHolidaySelect) {
            onHolidaySelect(dateStr);
        }
        else {
            onChange(dateStr);
        }
        setIsOpen(false);
    };
    const getDisabledDays = () => {
        const disabled = [];
        if (minDate) {
            disabled.push({ before: minDate });
        }
        if (maxDate) {
            disabled.push({ after: maxDate });
        }
        return disabled;
    };
    return (_jsxs("div", { className: cn("space-y-1", className), children: [_jsx(Label, { htmlFor: name, children: label }), _jsx(Controller, { name: name, control: control, render: ({ field }) => (_jsxs(Popover, { open: isOpen, onOpenChange: setIsOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", className: cn("w-full justify-start text-left font-normal", (error || holidayError) && "border-red-500", disabled && "opacity-50 cursor-not-allowed"), disabled: disabled, children: [_jsx(CalendarIcon, { className: "mr-2 h-4 w-4" }), field.value ? format(new Date(field.value), "dd.MM.yyyy", { locale: ru }) : placeholder] }) }), _jsx(PopoverContent, { className: "w-auto p-0", align: "start", children: _jsx(DayPicker, { mode: "single", locale: ru, selected: field.value ? new Date(field.value) : undefined, onSelect: (date) => handleDateSelect(date, field.onChange), disabled: getDisabledDays(), modifiers: { holiday: holidays }, classNames: {
                                    day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
                                    selected: 'bg-sky-600 text-white hover:bg-sky-600 hover:text-white focus:bg-sky-600 focus:text-white',
                                    disabled: 'text-muted-foreground opacity-50 cursor-not-allowed',
                                }, modifiersClassNames: {
                                    holiday: 'text-red-600 bg-red-50 border-red-200 font-bold',
                                } }) })] })) }), error && (_jsx("p", { className: "text-xs text-red-600", children: error })), holidayError && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(AlertTriangle, { className: "h-3 w-3 text-red-500" }), _jsx("p", { className: "text-xs text-red-600", children: holidayError })] }))] }));
}
