import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/DateRangeSelector.tsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { DayPicker } from 'react-day-picker';
import { ru } from 'date-fns/locale';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronsDown, ChevronsUp } from "lucide-react";
import { useDateStore } from "@/store/dateStore";
import { useSandboxCalculatorStore } from "@/store/sandboxCalculatorStore";
import { useHolidayStore } from "@/store/holidayStore";
import { DateService } from '@/core/services/DateService';
import CalendarDateInputRange from '@/components/calendar/CalendarDateInputRange';
import { cn } from '@/lib/utils';
export default function DateRangeSelector({ containerRef, collapsed: externalCollapsed, isSticky = false }) {
    const { startDate, endDate, setRange } = useDateStore();
    const { isCalculatorVisible, syncWithDateStore, refreshCalculator } = useSandboxCalculatorStore();
    const [internalCollapsed, setInternalCollapsed] = useState(true);
    // Используем внешнее состояние collapsed, если оно передано, иначе внутреннее
    const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
    // Определяем, что показывать в зависимости от состояния
    const showInitialCards = collapsed && !isSticky; // Изначальные крупные карточки
    const showExpandedCalendar = !collapsed && !isSticky; // Развернутый календарь
    const hideMainBlock = isSticky; // Скрываем основной блок при показе липкой полоски
    const [month, setMonth] = useState(startDate);
    const lastChangeSource = useRef(null);
    const [isAutoUpdating, setIsAutoUpdating] = useState(false);
    const { holidays, fetchHolidays } = useHolidayStore();
    useEffect(() => {
        const firstDayToFetch = startOfMonth(addMonths(month, -1));
        const lastDayToFetch = endOfMonth(addMonths(month, 2));
        void fetchHolidays(firstDayToFetch, lastDayToFetch);
    }, [month, fetchHolidays]);
    // ✅ НОВОЕ: Синхронизируем калькулятор при изменении выходных дней
    useEffect(() => {
        if (holidays.length > 0) {
            refreshCalculator();
        }
    }, [holidays, refreshCalculator]);
    // ✅ НОВОЕ: Синхронизируем калькулятор при изменении количества дней
    useEffect(() => {
        const { dayCount } = useDateStore.getState();
        if (dayCount > 0) {
            syncWithDateStore();
        }
    }, [startDate, endDate, syncWithDateStore]);
    const handleRangeChange = useCallback((newStart, newEnd, source) => {
        lastChangeSource.current = source || 'manual';
        if (source === 'slider') {
            setIsAutoUpdating(true);
            setTimeout(() => setIsAutoUpdating(false), 1000);
        }
        setRange(newStart, newEnd, source, holidays);
        if (source !== 'slider') {
            syncWithDateStore();
        }
    }, [holidays, setRange, syncWithDateStore]);
    useEffect(() => {
        if (lastChangeSource.current === 'slider') {
            lastChangeSource.current = null;
            return;
        }
        lastChangeSource.current = null;
    }, [startDate, endDate]);
    // Удаляем useDateRange, так как теперь используем CalendarDateInputRange
    const handleSelect = (selectedRange) => {
        if (!selectedRange?.from)
            return;
        const selectionStartDate = selectedRange.from;
        const finalEndDate = selectedRange.to ?? DateService.findNextWorkingDay(selectionStartDate, holidays, 1);
        const finalRange = { from: selectionStartDate, to: finalEndDate };
        if (finalRange.from && finalRange.to) {
            const { dayCount } = useDateStore.getState();
            const willCalculatorAppear = !isCalculatorVisible && dayCount >= 4;
            if (willCalculatorAppear && containerRef.current) {
                containerRef.current.style.overflowAnchor = 'none';
            }
            handleRangeChange(finalRange.from, finalRange.to, 'calendar');
            if (willCalculatorAppear && containerRef.current) {
                setTimeout(() => {
                    if (containerRef.current)
                        containerRef.current.style.overflowAnchor = 'auto';
                }, 0);
            }
        }
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const disabledDays = [
        ...holidays,
        { before: today }
    ];
    // Удаляем функции форматирования, так как они теперь в CalendarDateInputRange
    return (_jsxs("div", { className: cn("mb-4 border rounded-md p-4 bg-white shadow-sm transition-all duration-300 ease-in-out", hideMainBlock ? "opacity-0 max-h-0 overflow-hidden p-0 mb-0" : "opacity-100"), children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx("h2", { className: "text-base font-semibold text-gray-700", children: "\u0412\u044B\u0431\u0438\u0440\u0430\u0439\u0442\u0435 \u0434\u0430\u0442\u044B \u043D\u0430\u0447\u0430\u043B\u0430 \u0438 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0430\u0440\u0435\u043D\u0434\u044B:" }), _jsx("button", { onClick: () => setInternalCollapsed(!internalCollapsed), className: "text-gray-600 hover:text-gray-800 transition p-1", title: collapsed ? "Развернуть календарь" : "Свернуть календарь", children: collapsed ? _jsx(ChevronsDown, { className: "w-5 h-5" }) : _jsx(ChevronsUp, { className: "w-5 h-5" }) })] }), showInitialCards ? (_jsxs("div", { className: "flex justify-center items-center gap-4 mt-4 cursor-pointer group", onClick: () => setInternalCollapsed(false), title: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0434\u0430\u0442\u044B", children: [_jsxs("div", { className: "text-center p-3 rounded-lg bg-sky-50 border-2 border-sky-200 w-40 transition-all group-hover:border-sky-400 group-hover:shadow-lg", children: [_jsx("div", { className: "text-sm font-medium text-sky-700", children: "\u041D\u0430\u0447\u0430\u043B\u043E" }), _jsx("div", { className: "text-4xl font-bold text-sky-900 leading-tight", children: format(startDate, "dd") }), _jsx("div", { className: "text-lg font-semibold text-sky-800 capitalize", children: format(startDate, "LLLL", { locale: ru }) }), _jsx("div", { className: "text-sm text-sky-600", children: format(startDate, "yyyy") })] }), _jsx("div", { className: "text-3xl font-light text-gray-300 pb-8", children: "-" }), _jsxs("div", { className: `text-center p-3 rounded-lg w-40 transition-all group-hover:shadow-lg ${isAutoUpdating
                            ? 'bg-green-50 border-2 border-green-300 animate-pulse'
                            : 'bg-sky-50 border-2 border-sky-200 group-hover:border-sky-400'}`, children: [_jsx("div", { className: "text-sm font-medium text-sky-700", children: isAutoUpdating ? 'Обновляется...' : 'Окончание' }), _jsx("div", { className: "text-4xl font-bold text-sky-900 leading-tight", children: format(endDate, "dd") }), _jsx("div", { className: "text-lg font-semibold text-sky-800 capitalize", children: format(endDate, "LLLL", { locale: ru }) }), _jsx("div", { className: "text-sm text-sky-600", children: format(endDate, "yyyy") })] })] })) : showExpandedCalendar ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx(DayPicker, { mode: "range", locale: ru, selected: { from: startDate, to: endDate }, onSelect: handleSelect, month: month, onMonthChange: setMonth, showOutsideDays: true, numberOfMonths: 2, disabled: disabledDays, min: 2, modifiers: { holiday: holidays }, classNames: {
                                months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                                month: 'space-y-4',
                                table: 'w-full border-collapse space-y-1',
                                head_row: 'flex',
                                head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                                row: 'flex w-full mt-2',
                                cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                                day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
                                nav: 'space-x-1 flex items-center',
                                caption: 'flex justify-center pt-1 relative items-center',
                                caption_label: 'text-sm font-medium',
                                nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
                            }, modifiersClassNames: {
                                today: 'bg-accent text-accent-foreground',
                                selected: 'bg-sky-600 text-white hover:bg-sky-600 hover:text-white focus:bg-sky-600 focus:text-white',
                                range_start: 'rounded-l-full',
                                range_end: 'rounded-r-full',
                                range_middle: 'aria-selected:bg-sky-100 aria-selected:text-sky-900',
                                outside: 'day-outside text-muted-foreground opacity-50',
                                disabled: 'text-muted-foreground opacity-50 cursor-not-allowed',
                                holiday: 'text-red-600 bg-red-50 border-red-200 font-bold',
                            } }) }), _jsx(CalendarDateInputRange, {})] })) : null] }));
}
