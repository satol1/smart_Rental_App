// src/hooks/useUnifiedDateValidation.ts

import { useMemo } from "react";
import { useHolidayValidation } from "@/hooks/useHolidayValidation";
import { DateService } from "@/core/services";

interface UseUnifiedDateValidationProps {
  startDate: Date;
  endDate: Date;
  validateStartDate?: boolean;
  validateEndDate?: boolean;
}

interface UseUnifiedDateValidationReturn {
  startDateError?: string;
  endDateError?: string;
  isStartDateValid: boolean;
  isEndDateValid: boolean;
  isRangeValid: boolean;
  suggestedStartDate?: Date;
  suggestedEndDate?: Date;
}

/**
 * Унифицированный хук для валидации дат с проверкой выходных дней.
 * Может использоваться в любых компонентах выбора дат.
 */
export function useUnifiedDateValidation({
  startDate,
  endDate,
  validateStartDate = true,
  validateEndDate = true
}: UseUnifiedDateValidationProps): UseUnifiedDateValidationReturn {
  
  const { 
    startDateError, 
    endDateError, 
    isHolidayValid,
    holidays 
  } = useHolidayValidation(startDate, endDate);

  // Вычисляем валидность каждой даты отдельно
  const isStartDateValid = useMemo(() => {
    if (!validateStartDate) return true;
    return !startDateError;
  }, [startDateError, validateStartDate]);

  const isEndDateValid = useMemo(() => {
    if (!validateEndDate) return true;
    return !endDateError;
  }, [endDateError, validateEndDate]);

  const isRangeValid = useMemo(() => {
    return isStartDateValid && isEndDateValid && isHolidayValid;
  }, [isStartDateValid, isEndDateValid, isHolidayValid]);

  // Предлагаем следующие рабочие дни
  const suggestedStartDate = useMemo(() => {
    if (startDateError && validateStartDate) {
      return DateService.findNextWorkingDay(startDate, holidays);
    }
    return undefined;
  }, [startDateError, startDate, holidays, validateStartDate]);

  const suggestedEndDate = useMemo(() => {
    if (endDateError && validateEndDate) {
      return DateService.findNextWorkingDay(endDate, holidays);
    }
    return undefined;
  }, [endDateError, endDate, holidays, validateEndDate]);

  return {
    startDateError: validateStartDate ? startDateError : undefined,
    endDateError: validateEndDate ? endDateError : undefined,
    isStartDateValid,
    isEndDateValid,
    isRangeValid,
    suggestedStartDate,
    suggestedEndDate,
  };
}
