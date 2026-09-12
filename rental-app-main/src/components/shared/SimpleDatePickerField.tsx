// src/components/shared/SimpleDatePickerField.tsx

import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SimpleDatePickerFieldProps<TFieldValues extends FieldValues = FieldValues> {
  // Основные пропсы
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  
  // Валидация и ошибки
  error?: string;
  holidayError?: string;
  
  // Ограничения дат
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  
  // Обработчики
  onChange?: (value: string) => void;
  
  // Стилизация
  className?: string;
  inputClassName?: string;
}

/**
 * Унифицированный компонент для выбора даты с использованием простых HTML input полей.
 * Основан на дизайне страницы /reserve/create для единообразия интерфейса.
 * Заменяет сложный DayPicker на простые input поля с сохранением всей функциональности.
 */
export default function SimpleDatePickerField<TFieldValues extends FieldValues = FieldValues>({
  name,
  control,
  label,
  error,
  holidayError,
  minDate,
  maxDate,
  disabled = false,
  onChange,
  className,
  inputClassName
}: SimpleDatePickerFieldProps<TFieldValues>) {

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
        render={({ field }) => (
          <div className="space-y-1">
            <input
              id={name}
              type="date"
              className={cn(
                "border rounded px-3 py-1 text-sm shadow-sm w-full focus:ring-primary focus:border-primary",
                (error || holidayError) && "border-destructive focus:ring-destructive focus:border-destructive",
                disabled && "opacity-50 cursor-not-allowed bg-muted",
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
          </div>
        )}
      />
      
      {/* Отображение ошибок */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {holidayError && (
        <p className="text-xs text-destructive">{holidayError}</p>
      )}
    </div>
  );
}
