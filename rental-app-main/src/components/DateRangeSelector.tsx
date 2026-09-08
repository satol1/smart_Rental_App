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
        <div className="mb-4 border border-border/80 rounded-2xl p-5 bg-card text-card-foreground shadow-sm transition-all duration-200">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <h2 className="text-sm font-semibold text-foreground tracking-tight">Период аренды фототехники</h2>
                </div>
                <button
                    type="button"
                    onClick={() => setInternalCollapsed(!internalCollapsed)}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-accent/80 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                    title={collapsed ? "Развернуть календарь" : "Свернуть календарь"}
                >
                    <span>{collapsed ? "Развернуть календарь" : "Свернуть"}</span>
                    {collapsed ? <ChevronsDown className="w-4 h-4" /> : <ChevronsUp className="w-4 h-4" />}
                </button>
            </div>

            {showInitialCards ? (
                    <div
                        className="flex justify-center items-center gap-4 sm:gap-6 mt-3 cursor-pointer group select-none py-2"
                        onClick={() => setInternalCollapsed(false)}
                        title="Нажмите, чтобы развернуть календарь и изменить даты"
                    >
                        <div className="text-center p-4 rounded-xl bg-pastel-sky/50 border border-sky-200/70 w-36 sm:w-44 transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-md group-hover:-translate-y-0.5">
                            <div className="text-xs font-semibold text-pastel-sky-fg uppercase tracking-wider mb-1">Начало аренды</div>
                            <div className="text-3xl sm:text-4xl font-extrabold text-foreground leading-none my-1 tracking-tight">{format(startDate, "dd")}</div>
                            <div className="text-sm sm:text-base font-medium text-foreground/80 capitalize">{format(startDate, "LLLL", { locale: ru })}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{format(startDate, "yyyy")}</div>
                        </div>
                        <div className="text-2xl font-light text-muted-foreground/50 pb-4">→</div>
                        <div className={`text-center p-4 rounded-xl w-36 sm:w-44 transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 ${
                            isAutoUpdating
                                ? 'bg-pastel-mint/60 border border-emerald-300/80 animate-pulse'
                                : 'bg-pastel-sky/50 border border-sky-200/70 group-hover:border-primary/50'
                        }`}>
                            <div className="text-xs font-semibold text-pastel-sky-fg uppercase tracking-wider mb-1">
                                {isAutoUpdating ? 'Обновляется...' : 'Окончание'}
                            </div>
                            <div className="text-3xl sm:text-4xl font-extrabold text-foreground leading-none my-1 tracking-tight">{format(endDate, "dd")}</div>
                            <div className="text-sm sm:text-base font-medium text-foreground/80 capitalize">{format(endDate, "LLLL", { locale: ru })}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{format(endDate, "yyyy")}</div>
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
                                    months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-6 sm:space-y-0',
                                    month: 'space-y-4',
                                    table: 'w-full border-collapse space-y-1',
                                    head_row: 'flex',
                                    head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                                    row: 'flex w-full mt-2',
                                    cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-pastel-sky/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                                    day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md transition-colors hover:bg-accent',
                                    nav: 'space-x-1 flex items-center',
                                    caption: 'flex justify-center pt-1 relative items-center',
                                    caption_label: 'text-sm font-semibold tracking-tight',
                                    nav_button: 'h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 hover:bg-accent rounded-md transition-all'
                                }}
                                modifiersClassNames={{
                                    today: 'bg-accent font-semibold text-accent-foreground',
                                    selected: 'bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90 focus:bg-primary',
                                    range_start: 'rounded-l-full',
                                    range_end: 'rounded-r-full',
                                    range_middle: 'aria-selected:bg-pastel-sky aria-selected:text-pastel-sky-fg',
                                    outside: 'day-outside text-muted-foreground opacity-40',
                                    disabled: 'text-muted-foreground opacity-30 cursor-not-allowed',
                                    holiday: 'text-destructive bg-pastel-coral/60 border border-destructive/20 font-semibold',
                                }}
                            />
                        </div>
                        <CalendarDateInputRange />
                    </>
                ) : null}
        </div>
    );
}