// src/components/DateRangeSelector.tsx

import { useState, type RefObject, useCallback, useEffect, useRef, useId } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { ru } from 'date-fns/locale';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ArrowRight, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { useDateStore } from "@/store/dateStore";
import { useSandboxCalculatorStore } from "@/store/sandboxCalculatorStore";
import { useHolidayStore } from "@/store/holidayStore";
import { DateService } from '@/core/services/DateService';
import CalendarDateInputRange from '@/components/calendar/CalendarDateInputRange';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface DateRangeSelectorProps {
    containerRef: RefObject<HTMLDivElement | null>;
    collapsed?: boolean;
    isSticky?: boolean;
}

export default function DateRangeSelector({ containerRef, collapsed: externalCollapsed }: DateRangeSelectorProps) {
    const { t } = useTranslation();
    const calendarId = useId();
    const { startDate, endDate, dayCount, setRange } = useDateStore();
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
    const [numberOfMonths, setNumberOfMonths] = useState(() =>
        typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches ? 2 : 1
    );

    useEffect(() => {
        const media = window.matchMedia('(min-width: 640px)');
        const updateMonthCount = () => setNumberOfMonths(media.matches ? 2 : 1);
        updateMonthCount();
        media.addEventListener('change', updateMonthCount);
        return () => media.removeEventListener('change', updateMonthCount);
    }, []);

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
        <section className="mb-4 rounded-2xl border border-primary/25 bg-card px-4 py-3 text-card-foreground sm:px-5" aria-labelledby={`${calendarId}-title`}>
            <div className="mb-2 flex items-center justify-between gap-3">
                <h2 id={`${calendarId}-title`} className="flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
                    <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
                    {t('shell.period')}
                </h2>
                <Button
                    type="button" variant="ghost"
                    onClick={() => setInternalCollapsed(!internalCollapsed)}
                    className="h-11 gap-2 bg-pastel-sky px-2 text-sm text-pastel-sky-fg hover:bg-pastel-sky/75 hover:text-pastel-sky-fg sm:px-3"
                    aria-expanded={!collapsed} aria-controls={`${calendarId}-picker`}
                >
                    <span>{collapsed ? t('shell.expandCalendar') : t('shell.collapseCalendar')}</span>
                    {collapsed ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronUp className="h-4 w-4" aria-hidden="true" />}
                </Button>
            </div>
            {showInitialCards ? (
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
                    <button
                        type="button"
                        className="group grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring sm:gap-6 md:max-w-xl"
                        onClick={() => setInternalCollapsed(false)}
                        aria-label={t('shell.expandCalendar')}
                        aria-expanded={false} aria-controls={`${calendarId}-picker`}
                    >
                        <span className="min-w-0">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('shell.pickup')}</span>
                            <time dateTime={format(startDate, 'yyyy-MM-dd')} className="block whitespace-nowrap text-xl font-semibold tracking-tight text-primary">
                                {format(startDate, 'd MMM', { locale: ru })}
                            </time>
                            <span className="mt-1 block text-xs text-muted-foreground">{format(startDate, 'EEEE, yyyy', { locale: ru })}</span>
                        </span>
                        <ArrowRight className="h-5 w-5 text-muted-foreground/70" aria-hidden="true" />
                        <span className="min-w-0">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">{isAutoUpdating ? t('shell.updating') : t('shell.return')}</span>
                            <time dateTime={format(endDate, 'yyyy-MM-dd')} className="block whitespace-nowrap text-xl font-semibold tracking-tight text-primary">
                                {format(endDate, 'd MMM', { locale: ru })}
                            </time>
                            <span className="mt-1 block text-xs text-muted-foreground">{format(endDate, 'EEEE, yyyy', { locale: ru })}</span>
                        </span>
                    </button>
                    <p className="w-fit shrink-0 rounded-md bg-pastel-sky px-2 py-0.5 text-sm font-medium text-pastel-sky-fg" aria-live="polite">{t('shell.rentalDays', { count: dayCount })}</p>
                </div>
            ) : showExpandedCalendar ? (
                <div id={`${calendarId}-picker`} className="space-y-5">
                    <div className="flex justify-center">
                        <DayPicker
                            mode="range" locale={ru}
                            selected={{ from: startDate, to: endDate }}
                            onSelect={handleSelect} month={month} onMonthChange={setMonth}
                            showOutsideDays numberOfMonths={numberOfMonths}
                            disabled={disabledDays} min={2}
                            modifiers={{ holiday: holidays }}
                            labels={{
                                labelPrevious: () => t('shell.previousMonth'),
                                labelNext: () => t('shell.nextMonth'),
                                labelNav: () => t('shell.monthNavigation'),
                                labelDayButton: (date, modifiers) => [
                                    format(date, 'PPPP', { locale: ru }),
                                    modifiers.today ? t('shell.today') : null,
                                    modifiers.selected ? t('shell.selectedDate') : null,
                                ].filter(Boolean).join(', '),
                            }}
                            classNames={{
                                root: 'relative w-full max-w-[42rem]',
                                months: 'relative grid gap-6 sm:grid-cols-2 sm:gap-8',
                                month: 'min-w-0',
                                month_caption: 'flex h-11 items-center justify-center mb-2',
                                caption_label: 'text-sm font-semibold capitalize',
                                nav: 'absolute inset-x-0 top-0 z-10 flex justify-between pointer-events-none',
                                button_previous: 'pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40',
                                button_next: 'pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40',
                                chevron: 'h-4 w-4 fill-current text-muted-foreground',
                                month_grid: 'w-full table-fixed border-collapse',
                                weekdays: 'text-muted-foreground',
                                weekday: 'h-9 text-xs font-medium',
                                week: 'h-11',
                                day: 'relative h-11 p-0 text-center text-sm',
                                day_button: 'flex h-11 w-full items-center justify-center rounded-lg outline-none hover:bg-secondary focus-visible:relative focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring',
                                today: '[&_button]:font-bold [&_button]:underline [&_button]:underline-offset-4',
                                selected: '[&_button]:font-semibold',
                                range_start: 'rounded-l-lg bg-pastel-sky [&_button]:bg-primary [&_button]:text-primary-foreground',
                                range_end: 'rounded-r-lg bg-pastel-sky [&_button]:bg-primary [&_button]:text-primary-foreground',
                                range_middle: 'bg-pastel-sky text-pastel-sky-fg [&_button]:rounded-none',
                                outside: 'text-muted-foreground/50',
                                disabled: '[&_button]:cursor-not-allowed [&_button]:text-muted-foreground/40 [&_button]:hover:bg-transparent',
                                hidden: 'invisible',
                            }}
                            modifiersClassNames={{ holiday: '[&_button]:text-destructive [&_button]:line-through' }}
                        />
                    </div>
                    <div className="border-t border-border pt-5">
                        <CalendarDateInputRange />
                    </div>
                </div>
            ) : null}
        </section>
    );
}
