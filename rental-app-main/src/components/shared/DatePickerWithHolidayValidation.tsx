// src/components/shared/DatePickerWithHolidayValidation.tsx

import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useHolidayValidation } from "@/hooks/useHolidayValidation";
import { DateService } from "@/core/services";

interface DatePickerWithHolidayValidationProps {
  // Основные пропсы
  name: string;
  control: any; // UseFormReturn<any>['control']
  label: string;
  
  // Валидация и ошибки
  error?: string;
  
  // Ограничения дат
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  
  // Обработчики
  onChange?: (value: string) => void;
  
  // Стилизация
  className?: string;
  inputClassName?: string;
  
  // Для валидации выходных - нужна вторая дата для контекста
  contextDate?: Date; // Дата начала для валидации даты окончания или наоборот
  isEndDate?: boolean; // true если это дата окончания
}

/**
 * Унифицированный компонент для выбора даты с встроенной валидацией выходных дней.
 * Автоматически проверяет, не является ли выбранная дата выходным днем.
 * Показывает ошибки валидации и предлагает следующий рабочий день.
 */
export default function DatePickerWithHolidayValidation({
  name,
  control,
  label,
  error,
  minDate,
  maxDate,
  disabled = false,
  onChange,
  className,
  inputClassName,
  contextDate,
  isEndDate = false
}: DatePickerWithHolidayValidationProps) {

  const formatDateForInput = (date: Date) => {
    return formatDate(date);
  };

  const getMinDate = () => {
    return minDate ? formatDateForInput(minDate) : undefined;
  };

  const getMaxDate = () => {
    return maxDate ? formatDateForInput(maxDate) : undefined;
  };

  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={name}>{label}</Label>
      
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          // Создаем даты для валидации
          const currentDate = field.value ? new Date(field.value) : new Date();
          const validationStartDate = isEndDate && contextDate ? contextDate : currentDate;
          const validationEndDate = isEndDate ? currentDate : (contextDate || currentDate);
          
          // Используем валидацию выходных
          const { 
            startDateError, 
            endDateError, 
            isHolidayValid 
          } = useHolidayValidation(validationStartDate, validationEndDate);
          
          const holidayError = isEndDate ? endDateError : startDateError;
          
          return (
            <div className="space-y-1">
              <input
                id={name}
                type="date"
                className={cn(
                  "border rounded px-3 py-1 text-sm shadow-sm w-full focus:ring-sky-500 focus:border-sky-500",
                  (error || holidayError) && "border-red-500 focus:ring-red-500 focus:border-red-500",
                  disabled && "opacity-50 cursor-not-allowed bg-gray-100",
                  inputClassName
                )}
                value={field.value ? formatDateForInput(new Date(field.value)) : ""}
                onChange={(e) => {
                  const dateValue = e.target.value;
                  if (dateValue) {
                    const date = new Date(dateValue);
                    if (!isNaN(date.getTime())) {
                      const formattedDate = formatDateForInput(date);
                      field.onChange(formattedDate);
                      onChange?.(formattedDate);
                    }
                  } else {
                    field.onChange("");
                    onChange?.("");
                  }
                }}
                min={getMinDate()}
                max={getMaxDate()}
                disabled={disabled}
              />
              
              {/* Отображение ошибок */}
              {error && (
                <p className="text-xs text-red-600">{error}</p>
              )}
              
              {holidayError && (
                <div className="text-xs text-red-600">
                  <p>{holidayError}</p>
                  {field.value && (
                    <p className="text-blue-600 mt-1">
                      Следующий рабочий день: {formatDateForInput(
                        DateService.findNextWorkingDay(new Date(field.value), [])
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
