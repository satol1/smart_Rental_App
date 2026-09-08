// src/components/DateRangeSelector.tsx

import { useState, type RefObject, useCallback, useEffect, useRef } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { ru } from 'date-fns/locale';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronsDown, ChevronsUp } from "lucide-react";
import { useDateStore } from "@/store/dateStore";
import { useSandboxCalculatorStore } from "@/store/sandboxCalculatorStore";
import { useHolidayStore } from "@/store/holidayStore";
import { DateService } from '@/core/services/DateService';
import CalendarDateInputRange from '@/components/calendar/CalendarDateInputRange';

interface DateRangeSelectorProps {
    containerRef: RefObject<HTMLDivElement | null>;
    collapsed?: boolean;
    isSticky?: boolean;
}

export default function DateRangeSelector({ containerRef, collapsed: externalCollapsed, isSticky: _isSticky = false }: DateRangeSelectorProps) {
    const { startDate, endDate, setRange } = useDateStore();
    const { isCalculatorVisible, syncWithDateStore, refreshCalculator } = useSandboxCalculatorStore();

    const [internalCollapsed, setInternalCollapsed] = useState(true);
    
    // Используем внешнее состояние collapsed, если оно передано, иначе внутреннее
    const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

    // Синхронизируем внутреннее состояние при изменении внешнего (например, при скролле вниз)
    useEffect(() => {
        if (externalCollapsed !== undefined) {
            setInternalCollapsed(externalCollapsed);
        }
    }, [externalCollapsed]);
    
    // Определяем, что показывать в зависимости от состояния
    const showInitialCards = collapsed; // Изначальные крупные карточки
    const showExpandedCalendar = !collapsed; // Развернутый календарь
    const [month, setMonth] = useState(startDate);

    const lastChangeSource = useRef<'calendar' | 'slider' | 'manual' | null>(null);
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

    const handleRangeChange = useCallback((newStart: Date, newEnd: Date, source?: 'calendar' | 'slider' | 'manual') => {
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

    const handleSelect = (selectedRange: DateRange | undefined) => {
        if (!selectedRange?.from) return;

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
                    if (containerRef.current) containerRef.current.style.overflowAnchor = 'auto';
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

    return (
        <div className="mb-4 border rounded-md p-4 bg-white dark:bg-card shadow-sm transition-all duration-300 ease-in-out">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">Выбирайте даты начала и окончания аренды:</h2>
                <button
                    type="button"
                    onClick={() => setInternalCollapsed(!internalCollapsed)}
                    className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition p-1 cursor-pointer"
                    title={collapsed ? "Развернуть календарь" : "Свернуть календарь"}
                >
                    {collapsed ? <ChevronsDown className="w-5 h-5" /> : <ChevronsUp className="w-5 h-5" />}
                </button>
            </div>

            {showInitialCards ? (
                    <div
                        className="flex justify-center items-center gap-4 mt-4 cursor-pointer group"
                        onClick={() => setInternalCollapsed(false)}
                        title="Нажмите, чтобы изменить даты"
                    >
                        <div className="text-center p-3 rounded-lg bg-sky-50 border-2 border-sky-200 w-40 transition-all group-hover:border-sky-400 group-hover:shadow-lg">
                            <div className="text-sm font-medium text-sky-700">Начало</div>
                            <div className="text-4xl font-bold text-sky-900 leading-tight">{format(startDate, "dd")}</div>
                            <div className="text-lg font-semibold text-sky-800 capitalize">{format(startDate, "LLLL", { locale: ru })}</div>
                            <div className="text-sm text-sky-600">{format(startDate, "yyyy")}</div>
                        </div>
                        <div className="text-3xl font-light text-gray-300 pb-8">-</div>
                        <div className={`text-center p-3 rounded-lg w-40 transition-all group-hover:shadow-lg ${
                            isAutoUpdating
                                ? 'bg-green-50 border-2 border-green-300 animate-pulse'
                                : 'bg-sky-50 border-2 border-sky-200 group-hover:border-sky-400'
                        }`}>
                            <div className="text-sm font-medium text-sky-700">
                                {isAutoUpdating ? 'Обновляется...' : 'Окончание'}
                            </div>
                            <div className="text-4xl font-bold text-sky-900 leading-tight">{format(endDate, "dd")}</div>
                            <div className="text-lg font-semibold text-sky-800 capitalize">{format(endDate, "LLLL", { locale: ru })}</div>
                            <div className="text-sm text-sky-600">{format(endDate, "yyyy")}</div>
                        </div>
                    </div>
                ) : showExpandedCalendar ? (
                    <>
                        <div className="flex justify-center mb-4">
                            <DayPicker
                                mode="range"
                                locale={ru}
                                selected={{ from: startDate, to: endDate }}
                                onSelect={handleSelect}
                                month={month}
                                onMonthChange={setMonth}
                                showOutsideDays
                                numberOfMonths={2}
                                disabled={disabledDays}
                                min={2}
                                modifiers={{ holiday: holidays }}
                                classNames={{
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
                                }}
                                modifiersClassNames={{
                                    today: 'bg-accent text-accent-foreground',
                                    selected: 'bg-sky-600 text-white hover:bg-sky-600 hover:text-white focus:bg-sky-600 focus:text-white',
                                    range_start: 'rounded-l-full',
                                    range_end: 'rounded-r-full',
                                    range_middle: 'aria-selected:bg-sky-100 aria-selected:text-sky-900',
                                    outside: 'day-outside text-muted-foreground opacity-50',
                                    disabled: 'text-muted-foreground opacity-50 cursor-not-allowed',
                                    holiday: 'text-red-600 bg-red-50 border-red-200 font-bold',
                                }}
                            />
                        </div>
                        <CalendarDateInputRange />
                    </>
                ) : null}
        </div>
    );
}