// src/hooks/useHolidayValidation.ts
import { useEffect, useMemo, useState } from "react";
import { useHolidays } from "@/hooks/useHolidays";
import { DateService } from "@/core/services/DateService";

/**
 * Хук для предзагрузки выходных и валидации выбранных дат.
 * Отвечает только за работу с выходными (Single Responsibility) и может переиспользоваться в разных формах.
 */
export function useHolidayValidation(startDate: Date, endDate: Date) {
  // Скользящее окно на год вперёд (дефолт useHolidays) закрывает потребности валидации
  const { data: holidays = [] } = useHolidays();
  const [startDateError, setStartDateError] = useState<string | undefined>(undefined);
  const [endDateError, setEndDateError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (DateService.isHoliday(startDate, holidays)) {
      setStartDateError("Дата начала не может быть выходным днем.");
    } else {
      setStartDateError(undefined);
    }
  }, [startDate, holidays]);

  useEffect(() => {
    if (DateService.isHoliday(endDate, holidays)) {
      setEndDateError("Дата окончания не может быть выходным днем.");
    } else {
      setEndDateError(undefined);
    }
  }, [endDate, holidays]);

  const isHolidayValid = useMemo(() => {
    return !startDateError && !endDateError;
  }, [startDateError, endDateError]);

  return {
    holidays,
    startDateError,
    endDateError,
    isHolidayValid,
  } as const;
}
