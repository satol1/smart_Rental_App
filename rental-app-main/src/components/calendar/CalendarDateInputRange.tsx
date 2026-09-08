import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { useDateStore } from '@/store/dateStore';
import { useDateRange } from '@/hooks/useDateRange';
import { useHolidayStore } from '@/store/holidayStore';
import { useSandboxCalculatorStore } from '@/store/sandboxCalculatorStore';
import { useUnifiedDateValidation } from '@/hooks/useUnifiedDateValidation';
import { Input } from '@/components/ui/input';
import { formatDate, cn } from '@/lib/utils';

interface CalendarDateInputRangeProps {
  onRangeChange?: (startDate: Date, endDate: Date, source?: 'calendar' | 'slider' | 'manual') => void;
  className?: string;
  compact?: boolean;
}

export default function CalendarDateInputRange({ onRangeChange, className, compact = false }: CalendarDateInputRangeProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const { startDate, endDate, setRange } = useDateStore();
  const { holidays } = useHolidayStore();
  const { syncWithDateStore } = useSandboxCalculatorStore();
  const { startDateError, endDateError, isRangeValid, suggestedStartDate, suggestedEndDate } = useUnifiedDateValidation({
    startDate, endDate, validateStartDate: true, validateEndDate: true,
  });

  const handleRangeChange = (newStart: Date, newEnd: Date, source?: 'calendar' | 'slider' | 'manual') => {
    setRange(newStart, newEnd, source, holidays);
    if (source !== 'slider') syncWithDateStore();
    onRangeChange?.(newStart, newEnd, source);
  };

  const { localStartDate, localEndDate, handleStartDateChange, handleEndDateChange } = useDateRange({
    startDate, endDate, onRangeChange: handleRangeChange, holidays,
  });

  function formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const minEndDate = (() => {
    const start = new Date(localStartDate);
    const timezoneOffset = start.getTimezoneOffset() * 60000;
    const startUTC = new Date(start.getTime() + timezoneOffset);
    startUTC.setDate(startUTC.getDate() + 1);
    return formatDateForInput(startUTC);
  })();

  const fields = [
    { key: 'start', label: t('shell.pickup'), value: localStartDate, onChange: handleStartDateChange, min: formatDateForInput(new Date()), error: startDateError, suggestion: suggestedStartDate },
    { key: 'end', label: t('shell.return'), value: localEndDate, onChange: handleEndDateChange, min: minEndDate, error: endDateError, suggestion: suggestedEndDate },
  ];

  return (
    <div className={cn('min-w-0 space-y-3', compact ? 'w-full' : 'mx-auto w-full max-w-lg', className)}>
      <div className={cn('grid min-w-0 grid-cols-2', compact ? 'gap-2' : 'gap-3 sm:gap-4')}>
        {fields.map(({ key, label, value, onChange, min, error, suggestion }) => (
          <div key={key} className="min-w-0">
            <label htmlFor={`${inputId}-${key}`} className={compact ? 'sr-only' : 'mb-2 block text-sm font-medium text-muted-foreground'}>
              {label}
            </label>
            <Input
              id={`${inputId}-${key}`} type="date" value={value} onChange={onChange} min={min}
              aria-invalid={!!error}
              aria-describedby={error ? `${inputId}-${key}-error` : undefined}
              className={cn('min-w-0 max-w-full tabular-nums', compact ? 'h-11 px-2 text-xs sm:px-3 sm:text-sm' : 'px-2 sm:px-3', error && 'border-destructive focus-visible:ring-destructive')}
            />
            {error && (
              <div id={`${inputId}-${key}-error`} className={cn('mt-2 text-xs text-destructive', compact && 'sr-only')} role="status">
                <p>{error}</p>
                {suggestion && <p className="mt-1">{t('shell.nextWorkingDay', { date: formatDate(suggestion) })}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      {!isRangeValid && !compact && (
        <p className="flex items-start gap-2 rounded-lg bg-pastel-amber p-3 text-sm text-pastel-amber-fg" role="status">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('shell.holidayWarning')}
        </p>
      )}
    </div>
  );
}
