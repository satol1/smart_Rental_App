/**
 * Компонент фильтра по временным периодам
 */

import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useOrderFilters, type OrderContext } from "@/store/orderFilterStore";
import { PeriodService } from "@/core/services/PeriodService";
import type { PeriodType } from "@/types/period";

interface PeriodFilterProps {
  className?: string;
  /** Контекст фильтров (этап 5.6): периоды резервов и аренд изолированы */
  context?: OrderContext;
}

export function PeriodFilter({ className, context = "admin-reservations" }: PeriodFilterProps) {
  const { periodType, periodOffset, setPeriodType, setPeriodOffset } = useOrderFilters(context);

  const periodOptions = useMemo(() => PeriodService.getPeriodOptions(), []);
  const navigation = useMemo(() =>
    PeriodService.getPeriodNavigation(periodType, periodOffset),
    [periodType, periodOffset]
  );

  const handlePeriodTypeChange = useCallback((value: string) => {
    if (value === "all") {
      setPeriodType(null);
      setPeriodOffset(0);
    } else {
      setPeriodType(value as PeriodType);
      setPeriodOffset(0); // Сбрасываем смещение при смене типа периода
    }
  }, [setPeriodType, setPeriodOffset]);

  const handlePreviousPeriod = useCallback(() => {
    if (periodType) {
      setPeriodOffset(periodOffset - 1);
    }
  }, [periodType, periodOffset, setPeriodOffset]);

  const handleNextPeriod = useCallback(() => {
    if (periodType) {
      setPeriodOffset(periodOffset + 1);
    }
  }, [periodType, periodOffset, setPeriodOffset]);

  const handleCurrentPeriod = useCallback(() => {
    if (periodType) {
      setPeriodOffset(0);
    }
  }, [periodType, setPeriodOffset]);

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      {/* Иконка календаря */}
      <Calendar className="h-4 w-4 text-muted-foreground" />

      {/* Выбор типа периода */}
      <Select value={periodType || "all"} onValueChange={handlePeriodTypeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Период" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все периоды</SelectItem>
          {periodOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Навигация по периодам */}
      {periodType && (
        <>
          {/* Кнопка "Предыдущий период" */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPeriod}
            className="h-8 w-8 p-0"
            title="Предыдущий период"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Текущий период */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCurrentPeriod}
            className="h-8 px-3 text-sm font-medium"
            title="Текущий период"
          >
            {navigation.currentLabel}
          </Button>

          {/* Кнопка "Следующий период" */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPeriod}
            className="h-8 w-8 p-0"
            title="Следующий период"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * Компактная версия фильтра для использования в ограниченном пространстве
 */
export function PeriodFilterCompact({ className, context = "admin-reservations" }: PeriodFilterProps) {
  const { periodType, periodOffset, setPeriodType, setPeriodOffset } = useOrderFilters(context);

  const periodOptions = useMemo(() => PeriodService.getPeriodOptions(), []);

  const handlePeriodTypeChange = useCallback((value: string) => {
    if (value === "all") {
      setPeriodType(null);
      setPeriodOffset(0);
    } else {
      setPeriodType(value as PeriodType);
      setPeriodOffset(0);
    }
  }, [setPeriodType, setPeriodOffset]);

  const handlePreviousPeriod = useCallback(() => {
    if (periodType) {
      setPeriodOffset(periodOffset - 1);
    }
  }, [periodType, periodOffset, setPeriodOffset]);

  const handleNextPeriod = useCallback(() => {
    if (periodType) {
      setPeriodOffset(periodOffset + 1);
    }
  }, [periodType, periodOffset, setPeriodOffset]);

  return (
    <div className={`flex items-center gap-1 ${className || ""}`}>
      <Select value={periodType || "all"} onValueChange={handlePeriodTypeChange}>
        <SelectTrigger className="w-[100px] h-8">
          <SelectValue placeholder="Период" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все</SelectItem>
          {periodOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {periodType && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPeriod}
            className="h-8 w-6 p-0"
            title="Предыдущий период"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPeriod}
            className="h-8 w-6 p-0"
            title="Следующий период"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}
