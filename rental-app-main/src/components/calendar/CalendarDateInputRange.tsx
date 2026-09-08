// src/components/calendar/CalendarDateInputRange.tsx

import { useDateStore } from "@/store/dateStore";
import { useDateRange } from "@/hooks/useDateRange";
import { useHolidayStore } from "@/store/holidayStore";
import { useSandboxCalculatorStore } from "@/store/sandboxCalculatorStore";
import { useUnifiedDateValidation } from "@/hooks/useUnifiedDateValidation";
import { formatDate, cn } from "@/lib/utils";

interface CalendarDateInputRangeProps {
  onRangeChange?: (startDate: Date, endDate: Date, source?: 'calendar' | 'slider' | 'manual') => void;
  className?: string;
  compact?: boolean;
}

export default function CalendarDateInputRange({ 
  onRangeChange, 
  className = "",
  compact = false
}: CalendarDateInputRangeProps) {
  const { startDate, endDate, setRange } = useDateStore();
  const { holidays } = useHolidayStore();
  const { syncWithDateStore } = useSandboxCalculatorStore();
  
  // Валидация выходных дней
  const {
    startDateError,
    endDateError,
    isRangeValid,
    suggestedStartDate,
    suggestedEndDate
  } = useUnifiedDateValidation({
    startDate,
    endDate,
    validateStartDate: true,
    validateEndDate: true
  });

  const handleRangeChange = (newStart: Date, newEnd: Date, source?: 'calendar' | 'slider' | 'manual') => {
    setRange(newStart, newEnd, source, holidays);
    
    // Синхронизируем с калькулятором, если не используется слайдер
    if (source !== 'slider') {
      syncWithDateStore();
    }
    
    // Вызываем внешний колбэк, если он передан
    onRangeChange?.(newStart, newEnd, source);
  };

  const {
    localStartDate,
    localEndDate,
    handleStartDateChange,
    handleEndDateChange,
  } = useDateRange({
    startDate,
    endDate,
    onRangeChange: handleRangeChange,
    holidays
  });

  function formatDateForInput(date: Date): string {
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

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5 sm:gap-3", className)}>
        <div className="flex items-center gap-1">
          <label className="text-[11px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap">
            С:
          </label>
          <input
            type="date"
            value={localStartDate}
            onChange={handleStartDateChange}
            className={cn(
              "h-8 max-w-[124px] sm:max-w-none px-1.5 sm:px-2.5 py-1 text-xs sm:text-sm rounded-lg border bg-background text-foreground transition-all shadow-sm",
              startDateError 
                ? "border-destructive focus:ring-2 focus:ring-destructive/20 focus:border-destructive" 
                : "border-border hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            )}
            min={formatDateForInput(new Date())}
            title={startDateError || undefined}
          />
        </div>

        <div className="flex items-center gap-1">
          <label className="text-[11px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap">
            По:
          </label>
          <input
            type="date"
            value={localEndDate}
            onChange={handleEndDateChange}
            className={cn(
              "h-8 max-w-[124px] sm:max-w-none px-1.5 sm:px-2.5 py-1 text-xs sm:text-sm rounded-lg border bg-background text-foreground transition-all shadow-sm",
              endDateError 
                ? "border-destructive focus:ring-2 focus:ring-destructive/20 focus:border-destructive" 
                : "border-border hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            )}
            min={minEndDate}
            title={endDateError || undefined}
          />
        </div>

        {!isRangeValid && (
          <span
            className="hidden lg:inline-flex text-xs font-medium text-pastel-amber-fg bg-pastel-amber px-2.5 py-0.5 rounded-full border border-amber-200/60"
            title="Выбранные даты содержат выходные дни"
          >
            ⚠️ Выходные
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
            Дата начала:
          </label>
          <input
            type="date"
            value={localStartDate}
            onChange={handleStartDateChange}
            className={cn(
              "h-10 border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground shadow-sm transition-all",
              startDateError 
                ? "border-destructive focus:ring-2 focus:ring-destructive/20 focus:border-destructive" 
                : "border-border hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            )}
            min={formatDateForInput(new Date())}
          />
          {startDateError && (
            <div className="text-xs text-destructive mt-1.5 font-medium">
              <p>{startDateError}</p>
              {suggestedStartDate && (
                <p className="text-primary mt-0.5">
                  Следующий рабочий день: {formatDate(suggestedStartDate)}
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
            Дата окончания:
          </label>
          <input
            type="date"
            value={localEndDate}
            onChange={handleEndDateChange}
            className={cn(
              "h-10 border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground shadow-sm transition-all",
              endDateError 
                ? "border-destructive focus:ring-2 focus:ring-destructive/20 focus:border-destructive" 
                : "border-border hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            )}
            min={minEndDate}
          />
          {endDateError && (
            <div className="text-xs text-destructive mt-1.5 font-medium">
              <p>{endDateError}</p>
              {suggestedEndDate && (
                <p className="text-primary mt-0.5">
                  Следующий рабочий день: {formatDate(suggestedEndDate)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {!isRangeValid && (
        <div className="text-xs text-pastel-amber-fg bg-pastel-amber p-2.5 rounded-lg border border-amber-200/60 font-medium text-center">
          ⚠️ Выбранные даты содержат выходные дни. Рекомендуется выбрать рабочие дни для выдачи и возврата.
        </div>
      )}
    </div>
  );
}