// src/components/calendar/CalendarDateInputRange.tsx

import { useDateStore } from "@/store/dateStore";
import { useDateRange } from "@/hooks/useDateRange";
import { useHolidayStore } from "@/store/holidayStore";
import { useSandboxCalculatorStore } from "@/store/sandboxCalculatorStore";
import { useUnifiedDateValidation } from "@/hooks/useUnifiedDateValidation";
import { formatDate } from "@/lib/utils";

interface CalendarDateInputRangeProps {
  onRangeChange?: (startDate: Date, endDate: Date, source?: 'calendar' | 'slider' | 'manual') => void;
  className?: string;
}

export default function CalendarDateInputRange({ 
  onRangeChange, 
  className = "" 
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