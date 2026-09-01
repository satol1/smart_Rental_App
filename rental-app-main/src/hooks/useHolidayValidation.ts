// src/hooks/useHolidayValidation.ts
import { useEffect, useMemo, useState } from "react";
import { useHolidayStore } from "@/store/holidayStore";
import { DateService } from "@/core/services/DateService";

/**
 * Хук для предзагрузки выходных и валидации выбранных дат.
 * Отвечает только за работу с выходными (Single Responsibility) и может переиспользоваться в разных формах.
 */
export function useHolidayValidation(startDate: Date, endDate: Date) {
  const { holidays, fetchHolidays } = useHolidayStore();
  const [startDateError, setStartDateError] = useState<string | undefined>(undefined);
  const [endDateError, setEndDateError] = useState<string | undefined>(undefined);

  // Предзагружаем выходные на год вперед (можно параметризовать при необходимости)
  useEffect(() => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(today.getFullYear() + 1);
    fetchHolidays(today, futureDate);
  }, [fetchHolidays]);

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
