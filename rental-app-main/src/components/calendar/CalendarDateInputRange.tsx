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
      <div className={cn("flex items-center gap-2 sm:gap-3", className)}>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <label className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
            С:
          </label>
          <input
            type="date"
            value={localStartDate}
            onChange={handleStartDateChange}
            className={cn(
              "h-8 px-2 py-1 text-xs sm:text-sm rounded border bg-background text-foreground transition-colors",
              startDateError 
                ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
                : "border-input hover:border-sky-400 focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            )}
            min={formatDateForInput(new Date())}
            title={startDateError || undefined}
          />
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <label className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
            По:
          </label>
          <input
            type="date"
            value={localEndDate}
            onChange={handleEndDateChange}
            className={cn(
              "h-8 px-2 py-1 text-xs sm:text-sm rounded border bg-background text-foreground transition-colors",
              endDateError 
                ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
                : "border-input hover:border-sky-400 focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            )}
            min={minEndDate}
            title={endDateError || undefined}
          />
        </div>

        {!isRangeValid && (
          <span
            className="hidden lg:inline-flex text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800"
            title="Выбранные даты содержат выходные дни"
          >
            ⚠️ Выходные
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">
            С:
          </label>
          <input
            type="date"
            value={localStartDate}
            onChange={handleStartDateChange}
            className={`border rounded px-2 py-1 text-sm ${
              startDateError 
                ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
                : "border-gray-300 focus:ring-sky-500 focus:border-sky-500"
            }`}
            min={formatDateForInput(new Date())}
          />
          {startDateError && (
            <div className="text-xs text-red-600 mt-1">
              <p>{startDateError}</p>
              {suggestedStartDate && (
                <p className="text-blue-600">
                  Следующий рабочий день: {formatDate(suggestedStartDate)}
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">
            По:
          </label>
          <input
            type="date"
            value={localEndDate}
            onChange={handleEndDateChange}
            className={`border rounded px-2 py-1 text-sm ${
              endDateError 
                ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
                : "border-gray-300 focus:ring-sky-500 focus:border-sky-500"
            }`}
            min={minEndDate}
          />
          {endDateError && (
            <div className="text-xs text-red-600 mt-1">
              <p>{endDateError}</p>
              {suggestedEndDate && (
                <p className="text-blue-600">
                  Следующий рабочий день: {formatDate(suggestedEndDate)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {!isRangeValid && (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
          ⚠️ Выбранные даты содержат выходные дни. Рекомендуется выбрать рабочие дни.
        </div>
      )}
    </div>
  );
}